import { escapePowerShellString } from './powershell-utils';

export interface ChocolateyTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface ChocolateyTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: ChocolateyTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const chocolateyTasks: ChocolateyTask[] = [
  {
    id: 'choco-bulk-install',
    name: 'Bulk Install Packages',
    category: 'Bulk Operations',
    description: 'Install multiple software packages via Chocolatey',
    parameters: [
      { id: 'packages', label: 'Package Names (comma-separated)', type: 'textarea', required: true, placeholder: 'googlechrome, firefox, 7zip, vlc' }
    ],
    scriptTemplate: (params) => {
      const packagesRaw = (params.packages as string).split(',').map((n: string) => n.trim());
      
      return `# Chocolatey Bulk Install
# Generated: ${new Date().toISOString()}

try {
    $Packages = @(${packagesRaw.map(p => `"${escapePowerShellString(p)}"`).join(', ')})
    
    foreach ($Package in $Packages) {
        Write-Host "Installing: $Package..." -ForegroundColor Yellow
        choco install $Package -y --no-progress
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Installed: $Package" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $Package" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Bulk installation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Installation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'choco-update-all',
    name: 'Update All Packages',
    category: 'Package Management',
    description: 'Update all installed Chocolatey packages',
    parameters: [],
    scriptTemplate: () => {
      return `# Update All Chocolatey Packages
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Checking for package updates..." -ForegroundColor Cyan
    
    choco upgrade all -y --no-progress
    
    Write-Host ""
    Write-Host "✓ All packages updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Update failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'choco-export-list',
    name: 'Export Installed Packages List',
    category: 'Package Management',
    description: 'Export list of installed packages for backup/migration',
    parameters: [
      { id: 'exportPath', label: 'Export File Path', type: 'path', required: true, placeholder: 'C:\\Backup\\choco-packages.config' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export Chocolatey Packages List
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting installed packages..." -ForegroundColor Cyan
    
    choco export "${exportPath}" -y
    
    Write-Host "✓ Package list exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'winget-bulk-install',
    name: 'WinGet Bulk Install',
    category: 'Bulk Operations',
    description: 'Install multiple applications using Windows Package Manager',
    parameters: [
      { id: 'packages', label: 'Package IDs (comma-separated)', type: 'textarea', required: true, placeholder: 'Microsoft.VisualStudioCode, Google.Chrome, 7zip.7zip' }
    ],
    scriptTemplate: (params) => {
      const packagesRaw = (params.packages as string).split(',').map((n: string) => n.trim());
      
      return `# WinGet Bulk Install
# Generated: ${new Date().toISOString()}

try {
    $Packages = @(${packagesRaw.map(p => `"${escapePowerShellString(p)}"`).join(', ')})
    
    foreach ($Package in $Packages) {
        Write-Host "Installing: $Package..." -ForegroundColor Yellow
        winget install --id $Package --silent --accept-package-agreements --accept-source-agreements
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Installed: $Package" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $Package" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "WinGet bulk installation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Installation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'winget-update-all',
    name: 'WinGet Update All',
    category: 'Package Management',
    description: 'Update all installed applications via WinGet',
    parameters: [],
    scriptTemplate: () => {
      return `# Update All WinGet Packages
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Updating all packages..." -ForegroundColor Cyan
    
    winget upgrade --all --silent --accept-package-agreements --accept-source-agreements
    
    Write-Host ""
    Write-Host "✓ All packages updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Update failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'choco-search-packages',
    name: 'Search for Available Packages',
    category: 'Common Admin Tasks',
    description: 'Search Chocolatey repository for available packages',
    parameters: [
      { id: 'searchTerm', label: 'Search Term', type: 'text', required: true, placeholder: 'browser' },
      { id: 'exactMatch', label: 'Exact Match', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const searchTerm = escapePowerShellString(params.searchTerm);
      const exactMatch = params.exactMatch ? ' --exact' : '';
      
      return `# Search Chocolatey Packages
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Searching for packages matching: ${searchTerm}" -ForegroundColor Cyan
    
    choco search "${searchTerm}"${exactMatch} --limit-output | ForEach-Object {
        $parts = $_ -split '\\|'
        [PSCustomObject]@{
            Name = $parts[0]
            Version = $parts[1]
        }
    } | Format-Table -AutoSize
    
    Write-Host "✓ Search completed" -ForegroundColor Green
    
} catch {
    Write-Error "Search failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-install-package',
    name: 'Install Packages by Name',
    category: 'Common Admin Tasks',
    description: 'Install a specific package with options',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'googlechrome' },
      { id: 'version', label: 'Specific Version (optional)', type: 'text', required: false, placeholder: '120.0.0' },
      { id: 'params', label: 'Install Parameters (optional)', type: 'text', required: false, placeholder: '/NoDesktopShortcut' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const version = params.version ? ` --version="${escapePowerShellString(params.version)}"` : '';
      const installParams = params.params ? ` --params="${escapePowerShellString(params.params)}"` : '';
      
      return `# Install Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Installing package: ${packageName}" -ForegroundColor Cyan
    
    choco install "${packageName}" -y --no-progress${version}${installParams}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Package '${packageName}' installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Installation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Installation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-create-private-repo',
    name: 'Create Private Package Repository',
    category: 'Common Admin Tasks',
    description: 'Set up a private Chocolatey repository',
    parameters: [
      { id: 'repoName', label: 'Repository Name', type: 'text', required: true, placeholder: 'CompanyInternal' },
      { id: 'repoPath', label: 'Repository Path', type: 'path', required: true, placeholder: '\\\\Server\\ChocolateyRepo' },
      { id: 'priority', label: 'Source Priority', type: 'number', required: false, defaultValue: 1 }
    ],
    scriptTemplate: (params) => {
      const repoName = escapePowerShellString(params.repoName);
      const repoPath = escapePowerShellString(params.repoPath);
      const priority = params.priority || 1;
      
      return `# Create Private Chocolatey Repository
# Generated: ${new Date().toISOString()}

try {
    # Create repository directory if it doesn't exist
    if (-not (Test-Path "${repoPath}")) {
        New-Item -Path "${repoPath}" -ItemType Directory -Force
        Write-Host "✓ Created repository directory: ${repoPath}" -ForegroundColor Green
    }
    
    # Add repository source
    choco source add --name="${repoName}" --source="${repoPath}" --priority=${priority}
    
    Write-Host "✓ Private repository '${repoName}' configured!" -ForegroundColor Green
    Write-Host "  Path: ${repoPath}" -ForegroundColor Cyan
    Write-Host "  Priority: ${priority}" -ForegroundColor Cyan
    
    # List all sources
    Write-Host ""
    Write-Host "Current Chocolatey sources:" -ForegroundColor Cyan
    choco source list
    
} catch {
    Write-Error "Repository setup failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-publish-package',
    name: 'Publish Packages to Private Repo',
    category: 'Common Admin Tasks',
    description: 'Publish a Chocolatey package to private repository',
    parameters: [
      { id: 'packagePath', label: 'Package File Path (.nupkg)', type: 'path', required: true, placeholder: 'C:\\Packages\\myapp.1.0.0.nupkg' },
      { id: 'repoSource', label: 'Repository Source Name', type: 'text', required: true, placeholder: 'CompanyInternal' }
    ],
    scriptTemplate: (params) => {
      const packagePath = escapePowerShellString(params.packagePath);
      const repoSource = escapePowerShellString(params.repoSource);
      
      return `# Publish Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    if (-not (Test-Path "${packagePath}")) {
        throw "Package file not found: ${packagePath}"
    }
    
    Write-Host "Publishing package to '${repoSource}'..." -ForegroundColor Cyan
    
    choco push "${packagePath}" --source="${repoSource}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Package published successfully!" -ForegroundColor Green
        Write-Host "  Package: ${packagePath}" -ForegroundColor Cyan
        Write-Host "  Repository: ${repoSource}" -ForegroundColor Cyan
    } else {
        Write-Host "✗ Publish failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Publish failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-approve-updates',
    name: 'Approve or Deny Package Updates',
    category: 'Common Admin Tasks',
    description: 'Manage package update approvals (requires Chocolatey for Business)',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'googlechrome' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Approve', 'Deny'], defaultValue: 'Approve' },
      { id: 'version', label: 'Specific Version (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const action = params.action.toLowerCase();
      const version = params.version ? ` --version="${escapePowerShellString(params.version)}"` : '';
      
      return `# ${params.action} Chocolatey Package Update
# Generated: ${new Date().toISOString()}
# Requires: Chocolatey for Business

try {
    Write-Host "${params.action === 'Approve' ? 'Approving' : 'Denying'} updates for: ${packageName}" -ForegroundColor Cyan
    
    choco ${action} "${packageName}"${version}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Package update ${action === 'approve' ? 'approved' : 'denied'}: ${packageName}" -ForegroundColor Green
    } else {
        Write-Host "✗ Operation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Update approval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-audit-versions',
    name: 'Audit Installed Software Versions',
    category: 'Common Admin Tasks',
    description: 'Generate audit report of installed Chocolatey packages',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Chocolatey-Audit.csv' },
      { id: 'includeOutdated', label: 'Include Outdated Packages Only', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const includeOutdated = params.includeOutdated;
      
      return `# Audit Chocolatey Packages
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Auditing installed packages..." -ForegroundColor Cyan
    
    ${includeOutdated ? `# Get outdated packages only
    $Packages = choco outdated --limit-output | ForEach-Object {` : `# Get all installed packages
    $Packages = choco list --local-only --limit-output | ForEach-Object {`}
        $parts = $_ -split '\\|'
        [PSCustomObject]@{
            Name = $parts[0]
            InstalledVersion = $parts[1]${includeOutdated ? `
            AvailableVersion = $parts[2]
            Pinned = $parts[3]` : ''}
        }
    }
    
    $Packages | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Audit report exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Packages: $($Packages.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Audit failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-schedule-updates',
    name: 'Schedule Automatic Package Updates',
    category: 'Common Admin Tasks',
    description: 'Create scheduled task for automatic package updates',
    parameters: [
      { id: 'scheduleName', label: 'Task Name', type: 'text', required: true, placeholder: 'Chocolatey-AutoUpdate' },
      { id: 'scheduleTime', label: 'Schedule Time (HH:mm)', type: 'text', required: true, placeholder: '03:00' },
      { id: 'frequency', label: 'Frequency', type: 'select', required: true, options: ['Daily', 'Weekly', 'Monthly'], defaultValue: 'Weekly' }
    ],
    scriptTemplate: (params) => {
      const scheduleName = escapePowerShellString(params.scheduleName);
      const scheduleTime = escapePowerShellString(params.scheduleTime);
      const frequency = params.frequency;
      
      return `# Schedule Chocolatey Auto-Updates
# Generated: ${new Date().toISOString()}

try {
    $Action = New-ScheduledTaskAction -Execute "choco" -Argument "upgrade all -y"
    
    $Trigger = New-ScheduledTaskTrigger -${frequency} -At "${scheduleTime}"
    
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
    
    $Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    
    Register-ScheduledTask -TaskName "${scheduleName}" \`
        -Action $Action \`
        -Trigger $Trigger \`
        -Principal $Principal \`
        -Settings $Settings \`
        -Force
    
    Write-Host "✓ Scheduled task '${scheduleName}' created!" -ForegroundColor Green
    Write-Host "  Frequency: ${frequency}" -ForegroundColor Cyan
    Write-Host "  Time: ${scheduleTime}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Scheduling failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-verify-integrity',
    name: 'Verify Package Integrity',
    category: 'Common Admin Tasks',
    description: 'Verify integrity of installed Chocolatey packages',
    parameters: [
      { id: 'packageName', label: 'Package Name (optional - leave blank for all)', type: 'text', required: false },
      { id: 'exportPath', label: 'Export Results (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Package-Integrity.txt' }
    ],
    scriptTemplate: (params) => {
      const packageName = params.packageName ? escapePowerShellString(params.packageName) : '';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Verify Chocolatey Package Integrity
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Verifying package integrity..." -ForegroundColor Cyan
    
    ${packageName ? `$Results = choco info "${packageName}" --verbose` : `$Results = choco list --local-only | ForEach-Object {
        $pkgName = ($_ -split ' ')[0]
        choco info $pkgName --verbose
    }`}
    
    ${exportPath ? `$Results | Out-File -FilePath "${exportPath}" -Encoding UTF8
    Write-Host "✓ Integrity check results saved: ${exportPath}" -ForegroundColor Green` : `$Results | ForEach-Object { Write-Host $_ }`}
    
    Write-Host "✓ Integrity verification completed" -ForegroundColor Green
    
} catch {
    Write-Error "Verification failed: $_"
}`;
    },
    isPremium: true
  }
];
