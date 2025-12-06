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
  // ==================== REPOSITORY MANAGEMENT ====================
  {
    id: 'github-create-repo',
    name: 'Create Repository',
    category: 'Repository Management',
    description: 'Create a new GitHub repository',
    parameters: [
      { id: 'owner', label: 'Owner (User or Org)', type: 'text', required: true },
      { id: 'repoName', label: 'Repository Name', type: 'text', required: true, placeholder: 'my-project' },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'private', label: 'Private Repository', type: 'boolean', required: false, defaultValue: true },
      { id: 'autoInit', label: 'Initialize with README', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repoName = escapePowerShellString(params.repoName);
      const description = escapePowerShellString(params.description || '');
      const isPrivate = params.private ? 'true' : 'false';
      const autoInit = params.autoInit ? 'true' : 'false';
      
      return `# GitHub Create Repository
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    name = "${repoName}"
    description = "${description}"
    private = $${isPrivate}
    auto_init = $${autoInit}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/orgs/${owner}/repos"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -ErrorAction Stop
    
    Write-Host "✓ Repository created: $($Response.full_name)" -ForegroundColor Green
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        $Uri = "https://api.github.com/user/repos"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        Write-Host "✓ Repository created: $($Response.full_name)" -ForegroundColor Green
        Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    } else {
        Write-Error "Failed: $_"
    }
}`;
    },
    isPremium: true
  },
  {
    id: 'github-bulk-create-repos',
    name: 'Bulk Create Repositories',
    category: 'Repository Management',
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
    },
    isPremium: true
  },
  {
    id: 'github-delete-repo',
    name: 'Delete Repository',
    category: 'Repository Management',
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
    category: 'Repository Management',
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
    id: 'github-fork-repo',
    name: 'Fork Repository',
    category: 'Repository Management',
    description: 'Fork a repository to your account or organization',
    parameters: [
      { id: 'owner', label: 'Source Owner', type: 'text', required: true },
      { id: 'repo', label: 'Source Repository', type: 'text', required: true },
      { id: 'targetOrg', label: 'Target Organization (optional)', type: 'text', required: false, placeholder: 'Leave empty for personal' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const targetOrg = escapePowerShellString(params.targetOrg || '');
      
      return `# GitHub Fork Repository
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{}
${targetOrg ? `$Body["organization"] = "${targetOrg}"` : ''}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/forks"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body ($Body | ConvertTo-Json)
    
    Write-Host "✓ Repository forked successfully" -ForegroundColor Green
    Write-Host "  Fork URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-transfer-repo',
    name: 'Transfer Repository',
    category: 'Repository Management',
    description: 'Transfer repository ownership to another user or organization',
    parameters: [
      { id: 'owner', label: 'Current Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'newOwner', label: 'New Owner', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const newOwner = escapePowerShellString(params.newOwner);
      
      return `# GitHub Transfer Repository
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    new_owner = "${newOwner}"
} | ConvertTo-Json

$Confirm = Read-Host "Transfer ${owner}/${repo} to ${newOwner}? Type 'TRANSFER' to confirm"

if ($Confirm -eq 'TRANSFER') {
    try {
        $Uri = "https://api.github.com/repos/${owner}/${repo}/transfer"
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ Repository transfer initiated" -ForegroundColor Green
        Write-Host "  New location: $($Response.html_url)" -ForegroundColor Cyan
        
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
    id: 'github-archive-repo',
    name: 'Archive Repository',
    category: 'Repository Management',
    description: 'Archive or unarchive a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'archive', label: 'Archive', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const archive = params.archive ? 'true' : 'false';
      
      return `# GitHub Archive Repository
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    archived = $${archive}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "✓ Repository ${archive === 'true' ? 'archived' : 'unarchived'}: ${owner}/${repo}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-update-repo-settings',
    name: 'Update Repository Settings',
    category: 'Repository Management',
    description: 'Update repository settings and features',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'description', label: 'New Description', type: 'textarea', required: false },
      { id: 'hasIssues', label: 'Enable Issues', type: 'boolean', required: false, defaultValue: true },
      { id: 'hasWiki', label: 'Enable Wiki', type: 'boolean', required: false, defaultValue: true },
      { id: 'hasProjects', label: 'Enable Projects', type: 'boolean', required: false, defaultValue: true },
      { id: 'defaultBranch', label: 'Default Branch', type: 'text', required: false, placeholder: 'main' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const description = escapePowerShellString(params.description || '');
      const hasIssues = params.hasIssues ? 'true' : 'false';
      const hasWiki = params.hasWiki ? 'true' : 'false';
      const hasProjects = params.hasProjects ? 'true' : 'false';
      const defaultBranch = escapePowerShellString(params.defaultBranch || '');
      
      return `# GitHub Update Repository Settings
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    has_issues = $${hasIssues}
    has_wiki = $${hasWiki}
    has_projects = $${hasProjects}
}

${description ? `$Body["description"] = "${description}"` : ''}
${defaultBranch ? `$Body["default_branch"] = "${defaultBranch}"` : ''}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body ($Body | ConvertTo-Json)
    
    Write-Host "✓ Repository settings updated: ${owner}/${repo}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-repo-info',
    name: 'Get Repository Information',
    category: 'Repository Management',
    description: 'Retrieve detailed repository information',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      
      return `# GitHub Get Repository Information
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Repository Information:" -ForegroundColor Yellow
    Write-Host "  Name: $($Response.full_name)" -ForegroundColor Cyan
    Write-Host "  Description: $($Response.description)" -ForegroundColor Cyan
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    Write-Host "  Default Branch: $($Response.default_branch)" -ForegroundColor Cyan
    Write-Host "  Private: $($Response.private)" -ForegroundColor Cyan
    Write-Host "  Stars: $($Response.stargazers_count)" -ForegroundColor Cyan
    Write-Host "  Forks: $($Response.forks_count)" -ForegroundColor Cyan
    Write-Host "  Open Issues: $($Response.open_issues_count)" -ForegroundColor Cyan
    Write-Host "  Created: $($Response.created_at)" -ForegroundColor Cyan
    Write-Host "  Last Updated: $($Response.updated_at)" -ForegroundColor Cyan
    Write-Host "  Language: $($Response.language)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-list-org-repos',
    name: 'List Organization Repositories',
    category: 'Repository Management',
    description: 'List all repositories in an organization',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'type', label: 'Repository Type', type: 'select', required: false, options: ['all', 'public', 'private', 'forks', 'sources'], defaultValue: 'all' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const type = params.type || 'all';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub List Organization Repositories
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $AllRepos = @()
    $Page = 1
    
    do {
        $Uri = "https://api.github.com/orgs/${org}/repos?type=${type}&per_page=100&page=$Page"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllRepos += $Response
        $Page++
    } while ($Response.Count -eq 100)
    
    $RepoData = $AllRepos | Select-Object \`
        @{N='Name';E={$_.name}},
        @{N='FullName';E={$_.full_name}},
        @{N='Private';E={$_.private}},
        @{N='DefaultBranch';E={$_.default_branch}},
        @{N='Language';E={$_.language}},
        @{N='Stars';E={$_.stargazers_count}},
        @{N='Forks';E={$_.forks_count}},
        @{N='OpenIssues';E={$_.open_issues_count}},
        @{N='Created';E={$_.created_at}},
        @{N='Updated';E={$_.updated_at}}
    
    $RepoData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Repositories exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Repositories: $($RepoData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-configure-webhook',
    name: 'Configure Webhooks',
    category: 'Repository Management',
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
    category: 'Repository Management',
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

  // ==================== USER/TEAM MANAGEMENT ====================
  {
    id: 'github-manage-collaborators',
    name: 'Manage Repository Collaborators',
    category: 'User/Team Management',
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
    id: 'github-create-team',
    name: 'Create Team',
    category: 'User/Team Management',
    description: 'Create a new team in an organization',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'teamName', label: 'Team Name', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'privacy', label: 'Privacy', type: 'select', required: false, options: ['closed', 'secret'], defaultValue: 'closed' }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const teamName = escapePowerShellString(params.teamName);
      const description = escapePowerShellString(params.description || '');
      const privacy = params.privacy || 'closed';
      
      return `# GitHub Create Team
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    name = "${teamName}"
    description = "${description}"
    privacy = "${privacy}"
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/orgs/${org}/teams"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Team created: ${teamName}" -ForegroundColor Green
    Write-Host "  ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Slug: $($Response.slug)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-delete-team',
    name: 'Delete Team',
    category: 'User/Team Management',
    description: 'Delete a team from an organization',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'teamSlug', label: 'Team Slug', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const teamSlug = escapePowerShellString(params.teamSlug);
      
      return `# GitHub Delete Team
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Confirm = Read-Host "Delete team ${teamSlug}? Type 'DELETE' to confirm"

if ($Confirm -eq 'DELETE') {
    try {
        $Uri = "https://api.github.com/orgs/${org}/teams/${teamSlug}"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
        
        Write-Host "✓ Team deleted: ${teamSlug}" -ForegroundColor Green
        
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
    id: 'github-manage-team-member',
    name: 'Manage Team Membership',
    category: 'User/Team Management',
    description: 'Add or remove team members',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'teamSlug', label: 'Team Slug', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' },
      { id: 'role', label: 'Role', type: 'select', required: false, options: ['member', 'maintainer'], defaultValue: 'member' }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const teamSlug = escapePowerShellString(params.teamSlug);
      const username = escapePowerShellString(params.username);
      const action = params.action;
      const role = params.role || 'member';
      
      return `# GitHub Manage Team Membership
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/orgs/${org}/teams/${teamSlug}/memberships/${username}"
    
    ${action === 'Add' ? `
    $Body = @{
        role = "${role}"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    Write-Host "✓ User ${username} added to team ${teamSlug} as ${role}" -ForegroundColor Green
    ` : `
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    Write-Host "✓ User ${username} removed from team ${teamSlug}" -ForegroundColor Green
    `}
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-list-team-members',
    name: 'List Team Members',
    category: 'User/Team Management',
    description: 'List all members of a team',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'teamSlug', label: 'Team Slug', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const teamSlug = escapePowerShellString(params.teamSlug);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub List Team Members
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/orgs/${org}/teams/${teamSlug}/members?per_page=100"
    $Members = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $MemberData = $Members | Select-Object \`
        @{N='Username';E={$_.login}},
        @{N='ID';E={$_.id}},
        @{N='Type';E={$_.type}},
        @{N='SiteAdmin';E={$_.site_admin}},
        @{N='ProfileUrl';E={$_.html_url}}
    
    $MemberData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Team members exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Members: $($MemberData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-list-org-members',
    name: 'List Organization Members',
    category: 'User/Team Management',
    description: 'List all members of an organization',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'role', label: 'Filter by Role', type: 'select', required: false, options: ['all', 'admin', 'member'], defaultValue: 'all' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const role = params.role || 'all';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub List Organization Members
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $AllMembers = @()
    $Page = 1
    
    do {
        $Uri = "https://api.github.com/orgs/${org}/members?role=${role}&per_page=100&page=$Page"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllMembers += $Response
        $Page++
    } while ($Response.Count -eq 100)
    
    $MemberData = $AllMembers | Select-Object \`
        @{N='Username';E={$_.login}},
        @{N='ID';E={$_.id}},
        @{N='Type';E={$_.type}},
        @{N='SiteAdmin';E={$_.site_admin}},
        @{N='ProfileUrl';E={$_.html_url}}
    
    $MemberData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Organization members exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Members: $($MemberData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-invite-org-member',
    name: 'Invite User to Organization',
    category: 'User/Team Management',
    description: 'Invite a user to join an organization',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'email', label: 'User Email', type: 'email', required: true },
      { id: 'role', label: 'Role', type: 'select', required: false, options: ['direct_member', 'admin'], defaultValue: 'direct_member' },
      { id: 'teamIds', label: 'Team IDs (comma-separated)', type: 'text', required: false, placeholder: '123,456' }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const email = escapePowerShellString(params.email);
      const role = params.role || 'direct_member';
      const teamIds = params.teamIds ? (params.teamIds as string).split(',').map((t: string) => parseInt(t.trim())) : [];
      
      return `# GitHub Invite User to Organization
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    email = "${email}"
    role = "${role}"
    ${teamIds.length > 0 ? `team_ids = @(${teamIds.join(', ')})` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/orgs/${org}/invitations"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Invitation sent to ${email}" -ForegroundColor Green
    Write-Host "  Role: ${role}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-manage-teams',
    name: 'Manage Team Repository Access',
    category: 'User/Team Management',
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
      
      return `# GitHub Manage Team Repository Access
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

  // ==================== ACTIONS/CI/CD ====================
  {
    id: 'github-trigger-workflow',
    name: 'Trigger Workflow Dispatch',
    category: 'Actions/CI-CD',
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
      
      return `# GitHub Trigger Workflow Dispatch
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
    id: 'github-manage-actions-workflows',
    name: 'Enable/Disable Workflow',
    category: 'Actions/CI-CD',
    description: 'Enable or disable GitHub Actions workflows',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'workflowId', label: 'Workflow ID or Filename', type: 'text', required: true, placeholder: 'build.yml' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const workflowId = escapePowerShellString(params.workflowId);
      const action = params.action;
      
      return `# GitHub Enable/Disable Workflow
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
    ` : `
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/disable"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers
    Write-Host "✓ Workflow disabled: ${workflowId}" -ForegroundColor Green
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-list-workflow-runs',
    name: 'List Workflow Runs',
    category: 'Actions/CI-CD',
    description: 'List all workflow runs for a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'status', label: 'Filter by Status', type: 'select', required: false, options: ['all', 'completed', 'in_progress', 'queued', 'success', 'failure'], defaultValue: 'all' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const status = params.status !== 'all' ? params.status : '';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub List Workflow Runs
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=100${status ? `&status=${status}` : ''}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $RunData = $Response.workflow_runs | Select-Object \`
        @{N='ID';E={$_.id}},
        @{N='Name';E={$_.name}},
        @{N='Status';E={$_.status}},
        @{N='Conclusion';E={$_.conclusion}},
        @{N='Branch';E={$_.head_branch}},
        @{N='Event';E={$_.event}},
        @{N='Actor';E={$_.actor.login}},
        @{N='Created';E={$_.created_at}},
        @{N='Updated';E={$_.updated_at}},
        @{N='URL';E={$_.html_url}}
    
    $RunData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Workflow runs exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Runs: $($RunData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-cancel-workflow-run',
    name: 'Cancel Workflow Run',
    category: 'Actions/CI-CD',
    description: 'Cancel an in-progress workflow run',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'runId', label: 'Workflow Run ID', type: 'number', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const runId = params.runId;
      
      return `# GitHub Cancel Workflow Run
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/cancel"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "✓ Workflow run cancelled: ${runId}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-rerun-workflow',
    name: 'Re-run Workflow',
    category: 'Actions/CI-CD',
    description: 'Re-run a completed workflow run',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'runId', label: 'Workflow Run ID', type: 'number', required: true },
      { id: 'failedOnly', label: 'Re-run Failed Jobs Only', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const runId = params.runId;
      const failedOnly = params.failedOnly;
      
      return `# GitHub Re-run Workflow
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    ${failedOnly ? `
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs"
    ` : `
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun"
    `}
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers
    
    Write-Host "✓ Workflow run re-triggered: ${runId}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-create-repo-secret',
    name: 'Create Repository Secret',
    category: 'Actions/CI-CD',
    description: 'Create or update a repository secret for Actions',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'secretName', label: 'Secret Name', type: 'text', required: true, placeholder: 'API_KEY' },
      { id: 'secretValue', label: 'Secret Value', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const secretName = escapePowerShellString(params.secretName);
      
      return `# GitHub Create Repository Secret
# Generated: ${new Date().toISOString()}
# Note: This script uses libsodium for encryption

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$SecretValue = Read-Host -AsSecureString -Prompt "Enter Secret Value"
$SecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretValue))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    # Get public key for encryption
    $KeyUri = "https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key"
    $PublicKey = Invoke-RestMethod -Uri $KeyUri -Method Get -Headers $Headers
    
    # Use libsodium for encryption (requires Sodium.Core NuGet package)
    # For production use, install: Install-Package Sodium.Core
    
    Write-Host "Public Key ID: $($PublicKey.key_id)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To complete secret creation, encrypt the value using libsodium:" -ForegroundColor Yellow
    Write-Host "  1. Base64 decode the public key: $($PublicKey.key)" -ForegroundColor Cyan
    Write-Host "  2. Use crypto_box_seal to encrypt the secret value" -ForegroundColor Cyan
    Write-Host "  3. Base64 encode the encrypted value" -ForegroundColor Cyan
    Write-Host ""
    
    # Alternative: Use GitHub CLI if available
    Write-Host "Or use GitHub CLI: gh secret set ${secretName} --repo ${owner}/${repo}" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-list-repo-secrets',
    name: 'List Repository Secrets',
    category: 'Actions/CI-CD',
    description: 'List all secrets in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      
      return `# GitHub List Repository Secrets
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/secrets"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Repository Secrets:" -ForegroundColor Yellow
    Write-Host "  Total: $($Response.total_count)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($Secret in $Response.secrets) {
        Write-Host "  - $($Secret.name)" -ForegroundColor Green
        Write-Host "    Created: $($Secret.created_at)" -ForegroundColor Cyan
        Write-Host "    Updated: $($Secret.updated_at)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-delete-repo-secret',
    name: 'Delete Repository Secret',
    category: 'Actions/CI-CD',
    description: 'Delete a repository secret',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'secretName', label: 'Secret Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const secretName = escapePowerShellString(params.secretName);
      
      return `# GitHub Delete Repository Secret
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Confirm = Read-Host "Delete secret ${secretName}? Type 'DELETE' to confirm"

if ($Confirm -eq 'DELETE') {
    try {
        $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
        
        Write-Host "✓ Secret deleted: ${secretName}" -ForegroundColor Green
        
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
    id: 'github-list-self-hosted-runners',
    name: 'List Self-Hosted Runners',
    category: 'Actions/CI-CD',
    description: 'List self-hosted runners for a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      
      return `# GitHub List Self-Hosted Runners
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/actions/runners"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Self-Hosted Runners:" -ForegroundColor Yellow
    Write-Host "  Total: $($Response.total_count)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($Runner in $Response.runners) {
        Write-Host "  - $($Runner.name) (ID: $($Runner.id))" -ForegroundColor Green
        Write-Host "    OS: $($Runner.os)" -ForegroundColor Cyan
        Write-Host "    Status: $($Runner.status)" -ForegroundColor Cyan
        Write-Host "    Busy: $($Runner.busy)" -ForegroundColor Cyan
        Write-Host "    Labels: $(($Runner.labels | ForEach-Object { $_.name }) -join ', ')" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== ISSUES/PRs ====================
  {
    id: 'github-create-issue',
    name: 'Create Issue',
    category: 'Issues/PRs',
    description: 'Create a new issue in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'title', label: 'Issue Title', type: 'text', required: true },
      { id: 'body', label: 'Issue Body', type: 'textarea', required: false },
      { id: 'labels', label: 'Labels (comma-separated)', type: 'text', required: false, placeholder: 'bug,urgent' },
      { id: 'assignees', label: 'Assignees (comma-separated)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const title = escapePowerShellString(params.title);
      const body = escapePowerShellString(params.body || '');
      const labels = params.labels ? (params.labels as string).split(',').map((l: string) => l.trim()) : [];
      const assignees = params.assignees ? (params.assignees as string).split(',').map((a: string) => a.trim()) : [];
      
      return `# GitHub Create Issue
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    title = "${title}"
    body = "${body}"
    ${labels.length > 0 ? `labels = @(${labels.map(l => `"${escapePowerShellString(l)}"`).join(', ')})` : ''}
    ${assignees.length > 0 ? `assignees = @(${assignees.map(a => `"${escapePowerShellString(a)}"`).join(', ')})` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/issues"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Issue created: #$($Response.number)" -ForegroundColor Green
    Write-Host "  Title: ${title}" -ForegroundColor Cyan
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-close-issue',
    name: 'Close Issue',
    category: 'Issues/PRs',
    description: 'Close an open issue',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'issueNumber', label: 'Issue Number', type: 'number', required: true },
      { id: 'reason', label: 'Close Reason', type: 'select', required: false, options: ['completed', 'not_planned'], defaultValue: 'completed' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const issueNumber = params.issueNumber;
      const reason = params.reason || 'completed';
      
      return `# GitHub Close Issue
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    state = "closed"
    state_reason = "${reason}"
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}"
    Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "✓ Issue #${issueNumber} closed" -ForegroundColor Green
    Write-Host "  Reason: ${reason}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-issues',
    name: 'Retrieve Issue Data',
    category: 'Issues/PRs',
    description: 'Retrieve and export repository issues',
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
      
      return `# GitHub Retrieve Issue Data
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
    
    $IssueData = $Issues | Where-Object { -not $_.pull_request } | Select-Object \`
        @{N='Number';E={$_.number}},
        @{N='Title';E={$_.title}},
        @{N='State';E={$_.state}},
        @{N='Author';E={$_.user.login}},
        @{N='Labels';E={($_.labels | ForEach-Object { $_.name }) -join ', '}},
        @{N='Assignees';E={($_.assignees | ForEach-Object { $_.login }) -join ', '}},
        @{N='Created';E={$_.created_at}},
        @{N='Updated';E={$_.updated_at}},
        @{N='Comments';E={$_.comments}}
    
    $IssueData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Issues exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Issues: $($IssueData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-create-label',
    name: 'Create Label',
    category: 'Issues/PRs',
    description: 'Create a new label in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'labelName', label: 'Label Name', type: 'text', required: true },
      { id: 'color', label: 'Color (hex without #)', type: 'text', required: true, placeholder: 'ff0000' },
      { id: 'description', label: 'Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const labelName = escapePowerShellString(params.labelName);
      const color = escapePowerShellString(params.color);
      const description = escapePowerShellString(params.description || '');
      
      return `# GitHub Create Label
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    name = "${labelName}"
    color = "${color}"
    description = "${description}"
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/labels"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Label created: ${labelName}" -ForegroundColor Green
    Write-Host "  Color: #${color}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-delete-label',
    name: 'Delete Label',
    category: 'Issues/PRs',
    description: 'Delete a label from a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'labelName', label: 'Label Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const labelName = escapePowerShellString(params.labelName);
      
      return `# GitHub Delete Label
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/labels/${labelName}"
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
    
    Write-Host "✓ Label deleted: ${labelName}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-create-milestone',
    name: 'Create Milestone',
    category: 'Issues/PRs',
    description: 'Create a new milestone in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'title', label: 'Milestone Title', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'dueDate', label: 'Due Date (YYYY-MM-DD)', type: 'text', required: false, placeholder: '2024-12-31' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const title = escapePowerShellString(params.title);
      const description = escapePowerShellString(params.description || '');
      const dueDate = params.dueDate ? `${params.dueDate}T00:00:00Z` : '';
      
      return `# GitHub Create Milestone
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    title = "${title}"
    description = "${description}"
    ${dueDate ? `due_on = "${dueDate}"` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/milestones"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Milestone created: ${title}" -ForegroundColor Green
    Write-Host "  Number: $($Response.number)" -ForegroundColor Cyan
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-assign-issue',
    name: 'Assign Issue',
    category: 'Issues/PRs',
    description: 'Add or remove assignees from an issue',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'issueNumber', label: 'Issue Number', type: 'number', required: true },
      { id: 'assignees', label: 'Assignees (comma-separated)', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add', 'Remove'], defaultValue: 'Add' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const issueNumber = params.issueNumber;
      const assignees = (params.assignees as string).split(',').map((a: string) => a.trim());
      const action = params.action;
      
      return `# GitHub Assign Issue
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    assignees = @(${assignees.map(a => `"${escapePowerShellString(a)}"`).join(', ')})
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/assignees"
    ${action === 'Add' ? `
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    Write-Host "✓ Assignees added to issue #${issueNumber}" -ForegroundColor Green
    ` : `
    Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -Body $Body
    Write-Host "✓ Assignees removed from issue #${issueNumber}" -ForegroundColor Green
    `}
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-create-pr',
    name: 'Create Pull Request',
    category: 'Issues/PRs',
    description: 'Create a new pull request',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'title', label: 'PR Title', type: 'text', required: true },
      { id: 'head', label: 'Head Branch', type: 'text', required: true, placeholder: 'feature-branch' },
      { id: 'base', label: 'Base Branch', type: 'text', required: true, placeholder: 'main', defaultValue: 'main' },
      { id: 'body', label: 'PR Description', type: 'textarea', required: false },
      { id: 'draft', label: 'Create as Draft', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const title = escapePowerShellString(params.title);
      const head = escapePowerShellString(params.head);
      const base = escapePowerShellString(params.base);
      const body = escapePowerShellString(params.body || '');
      const draft = params.draft ? 'true' : 'false';
      
      return `# GitHub Create Pull Request
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    title = "${title}"
    head = "${head}"
    base = "${base}"
    body = "${body}"
    draft = $${draft}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/pulls"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Pull request created: #$($Response.number)" -ForegroundColor Green
    Write-Host "  Title: ${title}" -ForegroundColor Cyan
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-merge-pr',
    name: 'Merge Pull Request',
    category: 'Issues/PRs',
    description: 'Merge a pull request',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'prNumber', label: 'PR Number', type: 'number', required: true },
      { id: 'mergeMethod', label: 'Merge Method', type: 'select', required: false, options: ['merge', 'squash', 'rebase'], defaultValue: 'merge' },
      { id: 'commitTitle', label: 'Commit Title', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const prNumber = params.prNumber;
      const mergeMethod = params.mergeMethod || 'merge';
      const commitTitle = escapePowerShellString(params.commitTitle || '');
      
      return `# GitHub Merge Pull Request
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    merge_method = "${mergeMethod}"
    ${commitTitle ? `commit_title = "${commitTitle}"` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge"
    $Response = Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body $Body
    
    Write-Host "✓ Pull request #${prNumber} merged" -ForegroundColor Green
    Write-Host "  Method: ${mergeMethod}" -ForegroundColor Cyan
    Write-Host "  SHA: $($Response.sha)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-request-pr-reviewers',
    name: 'Request PR Reviewers',
    category: 'Issues/PRs',
    description: 'Request reviewers for a pull request',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'prNumber', label: 'PR Number', type: 'number', required: true },
      { id: 'reviewers', label: 'Reviewers (comma-separated)', type: 'text', required: true },
      { id: 'teamReviewers', label: 'Team Reviewers (comma-separated)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const prNumber = params.prNumber;
      const reviewers = (params.reviewers as string).split(',').map((r: string) => r.trim());
      const teamReviewers = params.teamReviewers ? (params.teamReviewers as string).split(',').map((t: string) => t.trim()) : [];
      
      return `# GitHub Request PR Reviewers
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Body = @{
    reviewers = @(${reviewers.map(r => `"${escapePowerShellString(r)}"`).join(', ')})
    ${teamReviewers.length > 0 ? `team_reviewers = @(${teamReviewers.map(t => `"${escapePowerShellString(t)}"`).join(', ')})` : ''}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Reviewers requested for PR #${prNumber}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== CODE MANAGEMENT ====================
  {
    id: 'github-get-commits',
    name: 'Retrieve Commit History',
    category: 'Code Management',
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
    id: 'github-create-branch',
    name: 'Create Branch',
    category: 'Code Management',
    description: 'Create a new branch from an existing ref',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'branchName', label: 'New Branch Name', type: 'text', required: true },
      { id: 'sourceBranch', label: 'Source Branch', type: 'text', required: true, placeholder: 'main', defaultValue: 'main' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const branchName = escapePowerShellString(params.branchName);
      const sourceBranch = escapePowerShellString(params.sourceBranch);
      
      return `# GitHub Create Branch
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    # Get source branch SHA
    $RefUri = "https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${sourceBranch}"
    $SourceRef = Invoke-RestMethod -Uri $RefUri -Method Get -Headers $Headers
    $Sha = $SourceRef.object.sha
    
    # Create new branch
    $Body = @{
        ref = "refs/heads/${branchName}"
        sha = $Sha
    } | ConvertTo-Json
    
    $Uri = "https://api.github.com/repos/${owner}/${repo}/git/refs"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Branch created: ${branchName}" -ForegroundColor Green
    Write-Host "  From: ${sourceBranch}" -ForegroundColor Cyan
    Write-Host "  SHA: $Sha" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-delete-branch',
    name: 'Delete Branch',
    category: 'Code Management',
    description: 'Delete a branch from a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'branchName', label: 'Branch Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const branchName = escapePowerShellString(params.branchName);
      
      return `# GitHub Delete Branch
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$Confirm = Read-Host "Delete branch ${branchName}? Type 'DELETE' to confirm"

if ($Confirm -eq 'DELETE') {
    try {
        $Uri = "https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers
        
        Write-Host "✓ Branch deleted: ${branchName}" -ForegroundColor Green
        
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
    id: 'github-list-branches',
    name: 'List Branches',
    category: 'Code Management',
    description: 'List all branches in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub List Branches
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $AllBranches = @()
    $Page = 1
    
    do {
        $Uri = "https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=$Page"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
        $AllBranches += $Response
        $Page++
    } while ($Response.Count -eq 100)
    
    $BranchData = $AllBranches | Select-Object \`
        @{N='Name';E={$_.name}},
        @{N='SHA';E={$_.commit.sha.Substring(0,7)}},
        @{N='Protected';E={$_.protected}}
    
    $BranchData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Branches exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Branches: $($BranchData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-create-release',
    name: 'Create Release',
    category: 'Code Management',
    description: 'Create a new GitHub release',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'tag', label: 'Tag Name', type: 'text', required: true, placeholder: 'v1.0.0' },
      { id: 'name', label: 'Release Name', type: 'text', required: true, placeholder: 'Version 1.0.0' },
      { id: 'body', label: 'Release Notes', type: 'textarea', required: true },
      { id: 'draft', label: 'Draft Release', type: 'boolean', required: false, defaultValue: false },
      { id: 'prerelease', label: 'Pre-release', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const tag = escapePowerShellString(params.tag);
      const name = escapePowerShellString(params.name);
      const body = escapePowerShellString(params.body);
      const draft = params.draft ? 'true' : 'false';
      const prerelease = params.prerelease ? 'true' : 'false';
      
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
    draft = $${draft}
    prerelease = $${prerelease}
} | ConvertTo-Json

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/releases"
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Release created: ${tag}" -ForegroundColor Green
    Write-Host "  URL: $($Response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-list-tags',
    name: 'List Tags',
    category: 'Code Management',
    description: 'List all tags in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      
      return `# GitHub List Tags
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/tags?per_page=100"
    $Tags = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Repository Tags:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Tag in $Tags) {
        Write-Host "  - $($Tag.name)" -ForegroundColor Green
        Write-Host "    SHA: $($Tag.commit.sha.Substring(0,7))" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Total Tags: $($Tags.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-create-tag',
    name: 'Create Tag',
    category: 'Code Management',
    description: 'Create a new tag in a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'tagName', label: 'Tag Name', type: 'text', required: true, placeholder: 'v1.0.0' },
      { id: 'message', label: 'Tag Message', type: 'text', required: true },
      { id: 'sha', label: 'Commit SHA', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const tagName = escapePowerShellString(params.tagName);
      const message = escapePowerShellString(params.message);
      const sha = escapePowerShellString(params.sha);
      
      return `# GitHub Create Tag
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    # Create annotated tag object
    $TagBody = @{
        tag = "${tagName}"
        message = "${message}"
        object = "${sha}"
        type = "commit"
    } | ConvertTo-Json
    
    $TagUri = "https://api.github.com/repos/${owner}/${repo}/git/tags"
    $TagObj = Invoke-RestMethod -Uri $TagUri -Method Post -Headers $Headers -Body $TagBody
    
    # Create ref pointing to tag
    $RefBody = @{
        ref = "refs/tags/${tagName}"
        sha = $TagObj.sha
    } | ConvertTo-Json
    
    $RefUri = "https://api.github.com/repos/${owner}/${repo}/git/refs"
    Invoke-RestMethod -Uri $RefUri -Method Post -Headers $Headers -Body $RefBody
    
    Write-Host "✓ Tag created: ${tagName}" -ForegroundColor Green
    Write-Host "  SHA: ${sha}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-compare-commits',
    name: 'Compare Commits',
    category: 'Code Management',
    description: 'Compare two commits, branches, or tags',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'base', label: 'Base (branch/tag/SHA)', type: 'text', required: true, placeholder: 'main' },
      { id: 'head', label: 'Head (branch/tag/SHA)', type: 'text', required: true, placeholder: 'feature-branch' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const base = escapePowerShellString(params.base);
      const head = escapePowerShellString(params.head);
      
      return `# GitHub Compare Commits
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Comparison: ${base}...${head}" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Status: $($Response.status)" -ForegroundColor Cyan
    Write-Host "  Ahead by: $($Response.ahead_by) commits" -ForegroundColor Cyan
    Write-Host "  Behind by: $($Response.behind_by) commits" -ForegroundColor Cyan
    Write-Host "  Total Commits: $($Response.total_commits)" -ForegroundColor Cyan
    Write-Host "  Files Changed: $($Response.files.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Changed Files:" -ForegroundColor Yellow
    
    foreach ($File in $Response.files) {
        Write-Host "  $($File.status): $($File.filename)" -ForegroundColor Green
        Write-Host "    +$($File.additions) -$($File.deletions)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-search-code',
    name: 'Search Code',
    category: 'Code Management',
    description: 'Search for code across repositories',
    parameters: [
      { id: 'query', label: 'Search Query', type: 'text', required: true, placeholder: 'function className language:javascript' },
      { id: 'owner', label: 'Owner (optional)', type: 'text', required: false },
      { id: 'repo', label: 'Repository (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const query = escapePowerShellString(params.query);
      const owner = params.owner ? escapePowerShellString(params.owner) : '';
      const repo = params.repo ? escapePowerShellString(params.repo) : '';
      
      return `# GitHub Search Code
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$SearchQuery = "${query}"
${owner && repo ? `$SearchQuery += " repo:${owner}/${repo}"` : owner ? `$SearchQuery += " user:${owner}"` : ''}

try {
    $Uri = "https://api.github.com/search/code?q=$([System.Web.HttpUtility]::UrlEncode($SearchQuery))&per_page=30"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Search Results:" -ForegroundColor Yellow
    Write-Host "  Total: $($Response.total_count)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($Item in $Response.items) {
        Write-Host "  $($Item.repository.full_name)/$($Item.path)" -ForegroundColor Green
        Write-Host "    URL: $($Item.html_url)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },

  // ==================== SECURITY ====================
  {
    id: 'github-configure-dependabot',
    name: 'Configure Dependabot',
    category: 'Security',
    description: 'Set up Dependabot alerts and auto-updates',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'ecosystem', label: 'Package Ecosystem', type: 'select', required: true, options: ['npm', 'pip', 'maven', 'gradle', 'docker', 'github-actions', 'nuget', 'composer'], defaultValue: 'npm' },
      { id: 'updateSchedule', label: 'Update Schedule', type: 'select', required: true, options: ['daily', 'weekly', 'monthly'], defaultValue: 'weekly' },
      { id: 'enableAlerts', label: 'Enable Security Alerts', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const ecosystem = params.ecosystem;
      const updateSchedule = params.updateSchedule;
      
      return `# GitHub Configure Dependabot
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    # Enable vulnerability alerts
    $AlertsUri = "https://api.github.com/repos/${owner}/${repo}/vulnerability-alerts"
    Invoke-RestMethod -Uri $AlertsUri -Method Put -Headers $Headers
    Write-Host "✓ Vulnerability alerts enabled" -ForegroundColor Green
    
    # Enable automated security fixes
    $SecurityFixesUri = "https://api.github.com/repos/${owner}/${repo}/automated-security-fixes"
    Invoke-RestMethod -Uri $SecurityFixesUri -Method Put -Headers $Headers
    Write-Host "✓ Automated security fixes enabled" -ForegroundColor Green
    
    # Create dependabot.yml configuration
    $DependabotConfig = @"
version: 2
updates:
  - package-ecosystem: "${ecosystem}"
    directory: "/"
    schedule:
      interval: "${updateSchedule}"
    open-pull-requests-limit: 10
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
    
    Write-Host "✓ Dependabot configuration created" -ForegroundColor Green
    Write-Host "  Ecosystem: ${ecosystem}" -ForegroundColor Cyan
    Write-Host "  Schedule: ${updateSchedule}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-security-alerts',
    name: 'Get Security Vulnerability Alerts',
    category: 'Security',
    description: 'List security vulnerability alerts for a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'state', label: 'Alert State', type: 'select', required: false, options: ['open', 'dismissed', 'fixed'], defaultValue: 'open' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const state = params.state || 'open';
      
      return `# GitHub Get Security Vulnerability Alerts
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/dependabot/alerts?state=${state}&per_page=100"
    $Alerts = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Security Vulnerability Alerts (${state}):" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Alert in $Alerts) {
        $Severity = $Alert.security_advisory.severity
        $Color = switch ($Severity) {
            'critical' { 'Red' }
            'high' { 'Magenta' }
            'medium' { 'Yellow' }
            'low' { 'Cyan' }
            default { 'White' }
        }
        
        Write-Host "  [$Severity] $($Alert.security_advisory.summary)" -ForegroundColor $Color
        Write-Host "    Package: $($Alert.dependency.package.name)" -ForegroundColor Cyan
        Write-Host "    Vulnerable: $($Alert.dependency.manifest_path)" -ForegroundColor Cyan
        Write-Host "    CVE: $($Alert.security_advisory.cve_id)" -ForegroundColor Cyan
        Write-Host ""
    }
    
    Write-Host "Total Alerts: $($Alerts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-enable-code-scanning',
    name: 'Enable Code Scanning',
    category: 'Security',
    description: 'Enable GitHub code scanning with CodeQL',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'languages', label: 'Languages (comma-separated)', type: 'text', required: true, placeholder: 'javascript,typescript,python' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const languages = (params.languages as string).split(',').map((l: string) => l.trim());
      
      return `# GitHub Enable Code Scanning
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$WorkflowContent = @"
name: "CodeQL"

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ ${languages.map(l => `'${l}'`).join(', ')} ]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: \${{ matrix.language }}

    - name: Autobuild
      uses: github/codeql-action/autobuild@v3

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        category: "/language:\${{ matrix.language }}"
"@

try {
    $ConfigContent = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($WorkflowContent))
    
    # Check if file exists
    try {
        $ExistingFileUri = "https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/codeql.yml"
        $ExistingFile = Invoke-RestMethod -Uri $ExistingFileUri -Method Get -Headers $Headers
        $Sha = $ExistingFile.sha
    } catch {
        $Sha = $null
    }
    
    $Body = @{
        message = "Enable CodeQL code scanning"
        content = $ConfigContent
        branch = "main"
    }
    
    if ($Sha) {
        $Body.sha = $Sha
    }
    
    $Uri = "https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/codeql.yml"
    Invoke-RestMethod -Uri $Uri -Method Put -Headers $Headers -Body ($Body | ConvertTo-Json)
    
    Write-Host "✓ CodeQL code scanning enabled" -ForegroundColor Green
    Write-Host "  Languages: ${params.languages}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-code-scanning-alerts',
    name: 'Get Code Scanning Alerts',
    category: 'Security',
    description: 'List code scanning alerts for a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'state', label: 'Alert State', type: 'select', required: false, options: ['open', 'dismissed', 'fixed'], defaultValue: 'open' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const state = params.state || 'open';
      
      return `# GitHub Get Code Scanning Alerts
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/code-scanning/alerts?state=${state}&per_page=100"
    $Alerts = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Code Scanning Alerts (${state}):" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Alert in $Alerts) {
        $Severity = $Alert.rule.security_severity_level
        $Color = switch ($Severity) {
            'critical' { 'Red' }
            'high' { 'Magenta' }
            'medium' { 'Yellow' }
            'low' { 'Cyan' }
            default { 'White' }
        }
        
        Write-Host "  [$Severity] $($Alert.rule.description)" -ForegroundColor $Color
        Write-Host "    File: $($Alert.most_recent_instance.location.path)" -ForegroundColor Cyan
        Write-Host "    Line: $($Alert.most_recent_instance.location.start_line)" -ForegroundColor Cyan
        Write-Host "    Tool: $($Alert.tool.name)" -ForegroundColor Cyan
        Write-Host ""
    }
    
    Write-Host "Total Alerts: $($Alerts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-get-audit-log',
    name: 'Get Organization Audit Log',
    category: 'Security',
    description: 'Retrieve organization audit log entries',
    parameters: [
      { id: 'org', label: 'Organization Name', type: 'text', required: true },
      { id: 'phrase', label: 'Search Phrase (optional)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const org = escapePowerShellString(params.org);
      const phrase = escapePowerShellString(params.phrase || '');
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# GitHub Get Organization Audit Log
# Generated: ${new Date().toISOString()}
# Note: Requires Organization admin access

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/orgs/${org}/audit-log?per_page=100${phrase ? `&phrase=${phrase}` : ''}"
    $AuditLog = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $LogData = $AuditLog | Select-Object \`
        @{N='Timestamp';E={$_.'@timestamp'}},
        @{N='Action';E={$_.action}},
        @{N='Actor';E={$_.actor}},
        @{N='Repository';E={$_.repo}},
        @{N='User';E={$_.user}},
        @{N='Country';E={$_.actor_location.country_code}}
    
    $LogData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Audit log exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Entries: $($LogData.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'github-secret-scanning-alerts',
    name: 'Get Secret Scanning Alerts',
    category: 'Security',
    description: 'List secret scanning alerts for a repository',
    parameters: [
      { id: 'owner', label: 'Repository Owner', type: 'text', required: true },
      { id: 'repo', label: 'Repository Name', type: 'text', required: true },
      { id: 'state', label: 'Alert State', type: 'select', required: false, options: ['open', 'resolved'], defaultValue: 'open' }
    ],
    scriptTemplate: (params) => {
      const owner = escapePowerShellString(params.owner);
      const repo = escapePowerShellString(params.repo);
      const state = params.state || 'open';
      
      return `# GitHub Get Secret Scanning Alerts
# Generated: ${new Date().toISOString()}

$Token = Read-Host -AsSecureString -Prompt "Enter GitHub Personal Access Token"
$TokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))

$Headers = @{
    "Authorization" = "token $TokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    $Uri = "https://api.github.com/repos/${owner}/${repo}/secret-scanning/alerts?state=${state}&per_page=100"
    $Alerts = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "Secret Scanning Alerts (${state}):" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Alert in $Alerts) {
        Write-Host "  [ALERT #$($Alert.number)] $($Alert.secret_type_display_name)" -ForegroundColor Red
        Write-Host "    State: $($Alert.state)" -ForegroundColor Cyan
        Write-Host "    Created: $($Alert.created_at)" -ForegroundColor Cyan
        Write-Host "    URL: $($Alert.html_url)" -ForegroundColor Cyan
        Write-Host ""
    }
    
    Write-Host "Total Alerts: $($Alerts.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed: $_"
}`;
    },
    isPremium: true
  }
];
