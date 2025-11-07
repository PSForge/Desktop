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
  }
];
