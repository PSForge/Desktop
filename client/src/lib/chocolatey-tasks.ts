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
            Write-Host "[SUCCESS] Installed: $Package" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Failed: $Package" -ForegroundColor Red
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
    Write-Host "[SUCCESS] All packages updated successfully!" -ForegroundColor Green
    
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
    
    Write-Host "[SUCCESS] Package list exported: ${exportPath}" -ForegroundColor Green
    
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
            Write-Host "[SUCCESS] Installed: $Package" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Failed: $Package" -ForegroundColor Red
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
    Write-Host "[SUCCESS] All packages updated successfully!" -ForegroundColor Green
    
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
    
    Write-Host "[SUCCESS] Search completed" -ForegroundColor Green
    
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
        Write-Host "[SUCCESS] Package '${packageName}' installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Installation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
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
        Write-Host "[SUCCESS] Created repository directory: ${repoPath}" -ForegroundColor Green
    }
    
    # Add repository source
    choco source add --name="${repoName}" --source="${repoPath}" --priority=${priority}
    
    Write-Host "[SUCCESS] Private repository '${repoName}' configured!" -ForegroundColor Green
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
        Write-Host "[SUCCESS] Package published successfully!" -ForegroundColor Green
        Write-Host "  Package: ${packagePath}" -ForegroundColor Cyan
        Write-Host "  Repository: ${repoSource}" -ForegroundColor Cyan
    } else {
        Write-Host "[FAILED] Publish failed with exit code: $LASTEXITCODE" -ForegroundColor Red
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
        Write-Host "[SUCCESS] Package update ${action === 'approve' ? 'approved' : 'denied'}: ${packageName}" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Operation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
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
    
    Write-Host "[SUCCESS] Audit report exported: ${exportPath}" -ForegroundColor Green
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
    
    Write-Host "[SUCCESS] Scheduled task '${scheduleName}' created!" -ForegroundColor Green
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
    Write-Host "[SUCCESS] Integrity check results saved: ${exportPath}" -ForegroundColor Green` : `$Results | ForEach-Object { Write-Host $_ }`}
    
    Write-Host "[SUCCESS] Integrity verification completed" -ForegroundColor Green
    
} catch {
    Write-Error "Verification failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-install-with-params',
    name: 'Install Package with Custom Parameters',
    category: 'Package Management',
    description: 'Install a package with advanced installation parameters and options',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'googlechrome' },
      { id: 'installArgs', label: 'Install Arguments', type: 'text', required: false, placeholder: '/SILENT /NORESTART' },
      { id: 'packageParams', label: 'Package Parameters', type: 'text', required: false, placeholder: '/NoDesktopIcon /NoQuickLaunch' },
      { id: 'installDir', label: 'Install Directory (optional)', type: 'path', required: false, placeholder: 'C:\\Program Files\\MyApp' },
      { id: 'ignoreChecksum', label: 'Ignore Checksum', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const installArgs = params.installArgs ? ` --install-arguments="${escapePowerShellString(params.installArgs)}"` : '';
      const packageParams = params.packageParams ? ` --params="${escapePowerShellString(params.packageParams)}"` : '';
      const installDir = params.installDir ? ` --install-directory="${escapePowerShellString(params.installDir)}"` : '';
      const ignoreChecksum = params.ignoreChecksum ? ' --ignore-checksums' : '';
      
      return `# Install Chocolatey Package with Custom Parameters
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Installing package with custom parameters: ${packageName}" -ForegroundColor Cyan
    
    choco install "${packageName}" -y --no-progress${installArgs}${packageParams}${installDir}${ignoreChecksum}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Package '${packageName}' installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Installation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Installation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-upgrade-outdated',
    name: 'Upgrade All Outdated Packages',
    category: 'Package Management',
    description: 'Identify and upgrade only outdated packages with detailed reporting',
    parameters: [
      { id: 'excludePackages', label: 'Exclude Packages (comma-separated)', type: 'textarea', required: false, placeholder: 'firefox, vlc' },
      { id: 'preRelease', label: 'Include Pre-release Versions', type: 'boolean', required: false, defaultValue: false },
      { id: 'logPath', label: 'Log File Path (optional)', type: 'path', required: false, placeholder: 'C:\\Logs\\choco-upgrade.log' }
    ],
    scriptTemplate: (params) => {
      const excludePackages = params.excludePackages 
        ? (params.excludePackages as string).split(',').map((n: string) => `--except="${escapePowerShellString(n.trim())}"`).join(' ')
        : '';
      const preRelease = params.preRelease ? ' --pre' : '';
      const logPath = params.logPath ? escapePowerShellString(params.logPath) : '';
      
      return `# Upgrade All Outdated Chocolatey Packages
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Checking for outdated packages..." -ForegroundColor Cyan
    
    # Get list of outdated packages first
    $Outdated = choco outdated --limit-output | ForEach-Object {
        $parts = $_ -split '\\|'
        [PSCustomObject]@{
            Name = $parts[0]
            CurrentVersion = $parts[1]
            AvailableVersion = $parts[2]
            Pinned = $parts[3]
        }
    }
    
    Write-Host "Found $($Outdated.Count) outdated package(s)" -ForegroundColor Yellow
    $Outdated | Format-Table -AutoSize
    
    if ($Outdated.Count -gt 0) {
        Write-Host ""
        Write-Host "Upgrading packages..." -ForegroundColor Cyan
        
        choco upgrade all -y --no-progress${preRelease}${excludePackages ? ` ${excludePackages}` : ''}
        
        ${logPath ? `$Outdated | Export-Csv -Path "${logPath}" -NoTypeInformation -Append
        Write-Host "[SUCCESS] Upgrade log saved: ${logPath}" -ForegroundColor Green` : ''}
    }
    
    Write-Host "[SUCCESS] Upgrade process completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Upgrade failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-force-reinstall',
    name: 'Force Reinstall Package',
    category: 'Package Management',
    description: 'Force reinstall a package to fix corruption or reset configuration',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'vscode' },
      { id: 'version', label: 'Specific Version (optional)', type: 'text', required: false, placeholder: '1.85.0' },
      { id: 'forceX86', label: 'Force x86 Version', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const version = params.version ? ` --version="${escapePowerShellString(params.version)}"` : '';
      const forceX86 = params.forceX86 ? ' --x86' : '';
      
      return `# Force Reinstall Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Force reinstalling package: ${packageName}" -ForegroundColor Cyan
    
    # Uninstall existing package
    Write-Host "Removing existing installation..." -ForegroundColor Yellow
    choco uninstall "${packageName}" -y --force 2>$null
    
    # Clear package cache
    Write-Host "Clearing package cache..." -ForegroundColor Yellow
    $CachePath = Join-Path $env:ChocolateyInstall "cache"
    Get-ChildItem -Path $CachePath -Filter "*${packageName}*" -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse
    
    # Reinstall package
    Write-Host "Installing fresh copy..." -ForegroundColor Yellow
    choco install "${packageName}" -y --force --no-progress${version}${forceX86}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Package '${packageName}' reinstalled successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Reinstall failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Reinstall failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-add-source',
    name: 'Add Package Source',
    category: 'Source Management',
    description: 'Add a new Chocolatey package source with authentication options',
    parameters: [
      { id: 'sourceName', label: 'Source Name', type: 'text', required: true, placeholder: 'InternalRepo' },
      { id: 'sourceUrl', label: 'Source URL or Path', type: 'text', required: true, placeholder: 'https://nuget.company.com/chocolatey' },
      { id: 'priority', label: 'Priority (lower = higher priority)', type: 'number', required: false, defaultValue: 0 },
      { id: 'username', label: 'Username (optional)', type: 'text', required: false },
      { id: 'apiKey', label: 'API Key (optional)', type: 'text', required: false },
      { id: 'bypassProxy', label: 'Bypass Proxy', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const sourceName = escapePowerShellString(params.sourceName);
      const sourceUrl = escapePowerShellString(params.sourceUrl);
      const priority = params.priority || 0;
      const username = params.username ? ` --user="${escapePowerShellString(params.username)}"` : '';
      const apiKey = params.apiKey ? ` --apikey="${escapePowerShellString(params.apiKey)}"` : '';
      const bypassProxy = params.bypassProxy ? ' --bypass-proxy' : '';
      
      return `# Add Chocolatey Package Source
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Adding package source: ${sourceName}" -ForegroundColor Cyan
    
    # Remove existing source if it exists
    choco source remove --name="${sourceName}" 2>$null
    
    # Add new source
    choco source add --name="${sourceName}" --source="${sourceUrl}" --priority=${priority}${username}${apiKey}${bypassProxy}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Source '${sourceName}' added successfully!" -ForegroundColor Green
        Write-Host "  URL: ${sourceUrl}" -ForegroundColor Cyan
        Write-Host "  Priority: ${priority}" -ForegroundColor Cyan
        
        # Verify source was added
        Write-Host ""
        Write-Host "Current sources:" -ForegroundColor Cyan
        choco source list
    } else {
        Write-Host "[FAILED] Failed to add source with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Adding source failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-remove-source',
    name: 'Remove Package Source',
    category: 'Source Management',
    description: 'Remove a Chocolatey package source',
    parameters: [
      { id: 'sourceName', label: 'Source Name', type: 'text', required: true, placeholder: 'OldRepo' }
    ],
    scriptTemplate: (params) => {
      const sourceName = escapePowerShellString(params.sourceName);
      
      return `# Remove Chocolatey Package Source
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Removing package source: ${sourceName}" -ForegroundColor Cyan
    
    # Check if source exists
    $Sources = choco source list --limit-output | Where-Object { $_ -match "^${sourceName}\\|" }
    
    if ($Sources) {
        choco source remove --name="${sourceName}"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Source '${sourceName}' removed successfully!" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Failed to remove source with exit code: $LASTEXITCODE" -ForegroundColor Red
        }
    } else {
        Write-Host "! Source '${sourceName}' not found" -ForegroundColor Yellow
    }
    
    # Show remaining sources
    Write-Host ""
    Write-Host "Remaining sources:" -ForegroundColor Cyan
    choco source list
    
} catch {
    Write-Error "Removing source failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-set-source-priority',
    name: 'Set Source Priority',
    category: 'Source Management',
    description: 'Change the priority of an existing Chocolatey source',
    parameters: [
      { id: 'sourceName', label: 'Source Name', type: 'text', required: true, placeholder: 'chocolatey' },
      { id: 'newPriority', label: 'New Priority (lower = higher priority)', type: 'number', required: true, defaultValue: 0 }
    ],
    scriptTemplate: (params) => {
      const sourceName = escapePowerShellString(params.sourceName);
      const newPriority = params.newPriority;
      
      return `# Set Chocolatey Source Priority
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Updating priority for source: ${sourceName}" -ForegroundColor Cyan
    
    # Get current source info
    $SourceInfo = choco source list --limit-output | Where-Object { $_ -match "^${sourceName}\\|" }
    
    if ($SourceInfo) {
        $Parts = $SourceInfo -split '\\|'
        $SourceUrl = $Parts[1]
        
        # Remove and re-add with new priority
        choco source remove --name="${sourceName}"
        choco source add --name="${sourceName}" --source="$SourceUrl" --priority=${newPriority}
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Source '${sourceName}' priority updated to ${newPriority}!" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Failed to update priority with exit code: $LASTEXITCODE" -ForegroundColor Red
        }
    } else {
        Write-Host "! Source '${sourceName}' not found" -ForegroundColor Yellow
    }
    
    # Show updated sources
    Write-Host ""
    Write-Host "Current sources:" -ForegroundColor Cyan
    choco source list
    
} catch {
    Write-Error "Updating source priority failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-security-scan',
    name: 'Security Vulnerability Scan',
    category: 'Compliance',
    description: 'Scan installed packages for known security vulnerabilities',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Security-Scan.csv' },
      { id: 'checkCVE', label: 'Check CVE Database', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Chocolatey Security Vulnerability Scan
# Generated: ${new Date().toISOString()}
# Requires: Chocolatey for Business or manual CVE checking

try {
    Write-Host "Running security vulnerability scan..." -ForegroundColor Cyan
    
    # Get all installed packages with versions
    $InstalledPackages = choco list --local-only --limit-output | ForEach-Object {
        $parts = $_ -split '\\|'
        [PSCustomObject]@{
            PackageName = $parts[0]
            InstalledVersion = $parts[1]
            ScanDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Status = "Pending"
            Vulnerabilities = ""
        }
    }
    
    Write-Host "Scanning $($InstalledPackages.Count) packages..." -ForegroundColor Yellow
    
    # Check each package for outdated versions (potential vulnerabilities)
    $OutdatedPackages = choco outdated --limit-output
    $OutdatedNames = $OutdatedPackages | ForEach-Object { ($_ -split '\\|')[0] }
    
    foreach ($Package in $InstalledPackages) {
        if ($OutdatedNames -contains $Package.PackageName) {
            $Package.Status = "Outdated - Potential Vulnerability"
            $Package.Vulnerabilities = "Update available"
        } else {
            $Package.Status = "Current"
        }
    }
    
    # Export results
    $InstalledPackages | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $VulnerableCount = ($InstalledPackages | Where-Object { $_.Status -like "*Vulnerability*" }).Count
    
    Write-Host ""
    Write-Host "Security Scan Summary:" -ForegroundColor Cyan
    Write-Host "  Total Packages: $($InstalledPackages.Count)" -ForegroundColor White
    Write-Host "  Potentially Vulnerable: $VulnerableCount" -ForegroundColor $(if ($VulnerableCount -gt 0) { "Red" } else { "Green" })
    Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Security scan failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-license-compliance',
    name: 'License Compliance Report',
    category: 'Compliance',
    description: 'Generate a license compliance report for all installed packages',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\License-Compliance.csv' },
      { id: 'includeUrls', label: 'Include License URLs', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const includeUrls = params.includeUrls;
      
      return `# Chocolatey License Compliance Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating license compliance report..." -ForegroundColor Cyan
    
    # Get all installed packages
    $Packages = choco list --local-only --limit-output
    $LicenseReport = @()
    
    $TotalPackages = ($Packages | Measure-Object).Count
    $CurrentPackage = 0
    
    foreach ($Package in $Packages) {
        $CurrentPackage++
        $parts = $Package -split '\\|'
        $pkgName = $parts[0]
        $pkgVersion = $parts[1]
        
        Write-Progress -Activity "Scanning packages" -Status "$pkgName ($CurrentPackage of $TotalPackages)" -PercentComplete (($CurrentPackage / $TotalPackages) * 100)
        
        # Get package info for license details
        $PkgInfo = choco info $pkgName --limit-output 2>$null
        
        $LicenseEntry = [PSCustomObject]@{
            PackageName = $pkgName
            Version = $pkgVersion
            License = "Unknown"
            ${includeUrls ? `LicenseUrl = ""
            ProjectUrl = ""` : ''}
            ComplianceStatus = "Review Required"
        }
        
        # Parse license info from package details
        $FullInfo = choco info $pkgName 2>$null
        if ($FullInfo) {
            $LicenseLine = $FullInfo | Select-String -Pattern "License:"
            if ($LicenseLine) {
                $LicenseEntry.License = ($LicenseLine -replace "License:", "").Trim()
                $LicenseEntry.ComplianceStatus = "Documented"
            }
            ${includeUrls ? `
            $LicenseUrlLine = $FullInfo | Select-String -Pattern "License Url:"
            if ($LicenseUrlLine) {
                $LicenseEntry.LicenseUrl = ($LicenseUrlLine -replace "License Url:", "").Trim()
            }
            
            $ProjectUrlLine = $FullInfo | Select-String -Pattern "Project Url:"
            if ($ProjectUrlLine) {
                $LicenseEntry.ProjectUrl = ($ProjectUrlLine -replace "Project Url:", "").Trim()
            }` : ''}
        }
        
        $LicenseReport += $LicenseEntry
    }
    
    Write-Progress -Activity "Scanning packages" -Completed
    
    # Export report
    $LicenseReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $Documented = ($LicenseReport | Where-Object { $_.ComplianceStatus -eq "Documented" }).Count
    $ReviewRequired = ($LicenseReport | Where-Object { $_.ComplianceStatus -eq "Review Required" }).Count
    
    Write-Host ""
    Write-Host "License Compliance Summary:" -ForegroundColor Cyan
    Write-Host "  Total Packages: $TotalPackages" -ForegroundColor White
    Write-Host "  Documented Licenses: $Documented" -ForegroundColor Green
    Write-Host "  Review Required: $ReviewRequired" -ForegroundColor Yellow
    Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "License compliance report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-package-audit',
    name: 'Comprehensive Package Audit',
    category: 'Compliance',
    description: 'Perform a comprehensive audit of all installed Chocolatey packages',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Package-Audit.csv' },
      { id: 'includeHash', label: 'Include Package Hash', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const includeHash = params.includeHash;
      
      return `# Comprehensive Chocolatey Package Audit
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Performing comprehensive package audit..." -ForegroundColor Cyan
    
    $AuditResults = @()
    $Packages = choco list --local-only --limit-output
    $Outdated = choco outdated --limit-output | ForEach-Object { ($_ -split '\\|')[0] }
    
    $TotalPackages = ($Packages | Measure-Object).Count
    $CurrentPackage = 0
    
    foreach ($Package in $Packages) {
        $CurrentPackage++
        $parts = $Package -split '\\|'
        $pkgName = $parts[0]
        $pkgVersion = $parts[1]
        
        Write-Progress -Activity "Auditing packages" -Status "$pkgName" -PercentComplete (($CurrentPackage / $TotalPackages) * 100)
        
        # Get installation path
        $InstallPath = Join-Path $env:ChocolateyInstall "lib\\$pkgName"
        $NupkgFile = Get-ChildItem -Path $InstallPath -Filter "*.nupkg" -ErrorAction SilentlyContinue | Select-Object -First 1
        
        $AuditEntry = [PSCustomObject]@{
            PackageName = $pkgName
            InstalledVersion = $pkgVersion
            InstallPath = $InstallPath
            InstallDate = if (Test-Path $InstallPath) { (Get-Item $InstallPath).CreationTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "Unknown" }
            IsOutdated = $Outdated -contains $pkgName
            ${includeHash ? `PackageHash = if ($NupkgFile) { (Get-FileHash $NupkgFile.FullName -Algorithm SHA256).Hash } else { "N/A" }` : ''}
            AuditDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            AuditStatus = "Verified"
        }
        
        $AuditResults += $AuditEntry
    }
    
    Write-Progress -Activity "Auditing packages" -Completed
    
    # Export audit results
    $AuditResults | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $OutdatedCount = ($AuditResults | Where-Object { $_.IsOutdated }).Count
    
    Write-Host ""
    Write-Host "Package Audit Summary:" -ForegroundColor Cyan
    Write-Host "  Total Packages: $TotalPackages" -ForegroundColor White
    Write-Host "  Up to Date: $($TotalPackages - $OutdatedCount)" -ForegroundColor Green
    Write-Host "  Outdated: $OutdatedCount" -ForegroundColor Yellow
    Write-Host "  Audit report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Package audit failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-internalize-package',
    name: 'Internalize Package',
    category: 'Enterprise Features',
    description: 'Download and internalize a package for offline/private repository use',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'googlechrome' },
      { id: 'version', label: 'Specific Version (optional)', type: 'text', required: false },
      { id: 'outputDir', label: 'Output Directory', type: 'path', required: true, placeholder: 'C:\\InternalizedPackages' },
      { id: 'recompile', label: 'Recompile Package', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const version = params.version ? ` --version="${escapePowerShellString(params.version)}"` : '';
      const outputDir = escapePowerShellString(params.outputDir);
      const recompile = params.recompile ? ' --recompile' : '';
      
      return `# Internalize Chocolatey Package
# Generated: ${new Date().toISOString()}
# Requires: Chocolatey for Business

try {
    Write-Host "Internalizing package: ${packageName}" -ForegroundColor Cyan
    
    # Ensure output directory exists
    if (-not (Test-Path "${outputDir}")) {
        New-Item -Path "${outputDir}" -ItemType Directory -Force | Out-Null
        Write-Host "Created output directory: ${outputDir}" -ForegroundColor Yellow
    }
    
    # Download and internalize the package
    choco download "${packageName}"${version} --internalize --output-directory="${outputDir}"${recompile} --no-progress
    
    if ($LASTEXITCODE -eq 0) {
        # List created packages
        $CreatedPackages = Get-ChildItem -Path "${outputDir}" -Filter "*.nupkg" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
        
        Write-Host ""
        Write-Host "[SUCCESS] Package internalized successfully!" -ForegroundColor Green
        Write-Host "Created packages:" -ForegroundColor Cyan
        $CreatedPackages | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
        Write-Host "  Location: ${outputDir}" -ForegroundColor Cyan
    } else {
        Write-Host "[FAILED] Internalization failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Package internalization failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-push-to-server',
    name: 'Push Package to Server',
    category: 'Enterprise Features',
    description: 'Push a Chocolatey package to a NuGet server or repository',
    parameters: [
      { id: 'packagePath', label: 'Package Path (.nupkg)', type: 'path', required: true, placeholder: 'C:\\Packages\\myapp.1.0.0.nupkg' },
      { id: 'serverUrl', label: 'Server URL', type: 'text', required: true, placeholder: 'https://nuget.company.com/chocolatey' },
      { id: 'apiKey', label: 'API Key', type: 'text', required: true },
      { id: 'force', label: 'Force Push (overwrite existing)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packagePath = escapePowerShellString(params.packagePath);
      const serverUrl = escapePowerShellString(params.serverUrl);
      const apiKey = escapePowerShellString(params.apiKey);
      const force = params.force ? ' --force' : '';
      
      return `# Push Chocolatey Package to Server
# Generated: ${new Date().toISOString()}

try {
    if (-not (Test-Path "${packagePath}")) {
        throw "Package file not found: ${packagePath}"
    }
    
    Write-Host "Pushing package to server..." -ForegroundColor Cyan
    Write-Host "  Package: ${packagePath}" -ForegroundColor White
    Write-Host "  Server: ${serverUrl}" -ForegroundColor White
    
    # Set API key for the source
    choco apikey add --source="${serverUrl}" --key="${apiKey}"
    
    # Push the package
    choco push "${packagePath}" --source="${serverUrl}"${force}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Package pushed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Push failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Package push failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-sync-packages',
    name: 'Synchronize Installed Programs',
    category: 'Enterprise Features',
    description: 'Synchronize programs installed outside Chocolatey into Chocolatey management',
    parameters: [
      { id: 'outputDir', label: 'Output Directory for Packages', type: 'path', required: false, placeholder: 'C:\\SyncedPackages' }
    ],
    scriptTemplate: (params) => {
      const outputDir = params.outputDir ? escapePowerShellString(params.outputDir) : '';
      
      return `# Synchronize Installed Programs with Chocolatey
# Generated: ${new Date().toISOString()}
# Requires: Chocolatey for Business

try {
    Write-Host "Synchronizing installed programs with Chocolatey..." -ForegroundColor Cyan
    
    ${outputDir ? `# Ensure output directory exists
    if (-not (Test-Path "${outputDir}")) {
        New-Item -Path "${outputDir}" -ItemType Directory -Force | Out-Null
    }
    
    choco sync --output-directory="${outputDir}"` : 'choco sync'}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Synchronization completed!" -ForegroundColor Green
        ${outputDir ? `Write-Host "Synced packages saved to: ${outputDir}" -ForegroundColor Cyan` : ''}
        
        # Show synchronized packages
        Write-Host ""
        Write-Host "Currently managed packages:" -ForegroundColor Cyan
        choco list --local-only
    } else {
        Write-Host "[FAILED] Synchronization failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Synchronization failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-package-history',
    name: 'Package Installation History',
    category: 'Reporting',
    description: 'Generate a report of package installation and update history',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Package-History.csv' },
      { id: 'daysBack', label: 'Days to Look Back', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const daysBack = params.daysBack || 30;
      
      return `# Chocolatey Package Installation History
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating package installation history (last ${daysBack} days)..." -ForegroundColor Cyan
    
    $CutoffDate = (Get-Date).AddDays(-${daysBack})
    $HistoryReport = @()
    
    # Get Chocolatey log files
    $LogPath = Join-Path $env:ChocolateyInstall "logs"
    $LogFiles = Get-ChildItem -Path $LogPath -Filter "chocolatey*.log" -ErrorAction SilentlyContinue | 
                Where-Object { $_.LastWriteTime -gt $CutoffDate }
    
    foreach ($LogFile in $LogFiles) {
        $LogContent = Get-Content $LogFile.FullName -ErrorAction SilentlyContinue
        
        # Parse installation entries
        $InstallEntries = $LogContent | Select-String -Pattern "\\[INFO\\].*Installing.*|\\[INFO\\].*Upgrading.*|\\[INFO\\].*Uninstalling.*"
        
        foreach ($Entry in $InstallEntries) {
            $Line = $Entry.Line
            $Timestamp = if ($Line -match "^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})") { $matches[1] } else { "Unknown" }
            
            $Action = "Unknown"
            if ($Line -match "Installing") { $Action = "Install" }
            elseif ($Line -match "Upgrading") { $Action = "Upgrade" }
            elseif ($Line -match "Uninstalling") { $Action = "Uninstall" }
            
            $PackageName = if ($Line -match "'([^']+)'") { $matches[1] } else { "Unknown" }
            
            $HistoryReport += [PSCustomObject]@{
                Timestamp = $Timestamp
                Action = $Action
                PackageName = $PackageName
                LogFile = $LogFile.Name
            }
        }
    }
    
    # Sort by timestamp descending
    $HistoryReport = $HistoryReport | Sort-Object { [DateTime]::Parse($_.Timestamp) } -Descending -ErrorAction SilentlyContinue
    
    # Export report
    $HistoryReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $InstallCount = ($HistoryReport | Where-Object { $_.Action -eq "Install" }).Count
    $UpgradeCount = ($HistoryReport | Where-Object { $_.Action -eq "Upgrade" }).Count
    $UninstallCount = ($HistoryReport | Where-Object { $_.Action -eq "Uninstall" }).Count
    
    Write-Host ""
    Write-Host "Package History Summary (last ${daysBack} days):" -ForegroundColor Cyan
    Write-Host "  Installations: $InstallCount" -ForegroundColor Green
    Write-Host "  Upgrades: $UpgradeCount" -ForegroundColor Yellow
    Write-Host "  Uninstalls: $UninstallCount" -ForegroundColor Red
    Write-Host "  Total Actions: $($HistoryReport.Count)" -ForegroundColor White
    Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Package history report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-outdated-report',
    name: 'Outdated Packages Report',
    category: 'Reporting',
    description: 'Generate detailed report of all outdated packages with version comparison',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Outdated-Packages.csv' },
      { id: 'emailReport', label: 'Include in Email Format', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const emailReport = params.emailReport;
      
      return `# Chocolatey Outdated Packages Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Checking for outdated packages..." -ForegroundColor Cyan
    
    $OutdatedPackages = choco outdated --limit-output | ForEach-Object {
        $parts = $_ -split '\\|'
        [PSCustomObject]@{
            PackageName = $parts[0]
            CurrentVersion = $parts[1]
            AvailableVersion = $parts[2]
            Pinned = if ($parts[3] -eq "true") { "Yes" } else { "No" }
            VersionsBehind = "N/A"
            ReportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    }
    
    if ($OutdatedPackages.Count -eq 0) {
        Write-Host "[SUCCESS] All packages are up to date!" -ForegroundColor Green
    } else {
        # Export report
        $OutdatedPackages | Export-Csv -Path "${exportPath}" -NoTypeInformation
        
        ${emailReport ? `
        # Generate email-friendly HTML report
        $HtmlPath = "${exportPath}" -replace '\\.csv$', '.html'
        $HtmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .summary { margin-bottom: 20px; }
    </style>
</head>
<body>
    <h2>Chocolatey Outdated Packages Report</h2>
    <p class="summary">Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")<br>
    Total Outdated: $($OutdatedPackages.Count)</p>
    <table>
        <tr><th>Package</th><th>Current</th><th>Available</th><th>Pinned</th></tr>
"@
        foreach ($pkg in $OutdatedPackages) {
            $HtmlContent += "<tr><td>$($pkg.PackageName)</td><td>$($pkg.CurrentVersion)</td><td>$($pkg.AvailableVersion)</td><td>$($pkg.Pinned)</td></tr>"
        }
        $HtmlContent += "</table></body></html>"
        $HtmlContent | Out-File -FilePath $HtmlPath -Encoding UTF8
        Write-Host "  HTML report: $HtmlPath" -ForegroundColor Cyan` : ''}
        
        # Summary
        Write-Host ""
        Write-Host "Outdated Packages Summary:" -ForegroundColor Cyan
        Write-Host "  Total Outdated: $($OutdatedPackages.Count)" -ForegroundColor Yellow
        $OutdatedPackages | Format-Table PackageName, CurrentVersion, AvailableVersion, Pinned -AutoSize
        Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Outdated packages report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-uninstall-package',
    name: 'Uninstall Package',
    category: 'Package Management',
    description: 'Uninstall a Chocolatey package with cleanup options',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'firefox' },
      { id: 'removeDataDir', label: 'Remove Data Directory', type: 'boolean', required: false, defaultValue: false },
      { id: 'allVersions', label: 'Remove All Versions', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const removeDataDir = params.removeDataDir ? ' --remove-dependencies' : '';
      const allVersions = params.allVersions ? ' --all-versions' : '';
      
      return `# Uninstall Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Uninstalling package: ${packageName}" -ForegroundColor Cyan
    
    choco uninstall "${packageName}" -y${removeDataDir}${allVersions}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Package '${packageName}' uninstalled successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Uninstall failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Uninstall failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-pin-package',
    name: 'Pin Package Version',
    category: 'Package Management',
    description: 'Pin a package to prevent automatic upgrades',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'googlechrome' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Pin', 'Unpin'], defaultValue: 'Pin' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const action = params.action === 'Pin' ? 'add' : 'remove';
      
      return `# ${params.action} Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "${params.action === 'Pin' ? 'Pinning' : 'Unpinning'} package: ${packageName}" -ForegroundColor Cyan
    
    choco pin ${action} --name="${packageName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Package '${packageName}' ${params.action === 'Pin' ? 'pinned' : 'unpinned'} successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Operation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    # Show current pins
    Write-Host ""
    Write-Host "Current pinned packages:" -ForegroundColor Cyan
    choco pin list
    
} catch {
    Write-Error "${params.action} failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-download-package',
    name: 'Download Package Only',
    category: 'Package Management',
    description: 'Download a package without installing it',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: '7zip' },
      { id: 'version', label: 'Specific Version (optional)', type: 'text', required: false },
      { id: 'outputDir', label: 'Download Directory', type: 'path', required: true, placeholder: 'C:\\Downloads\\Packages' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const version = params.version ? ` --version="${escapePowerShellString(params.version)}"` : '';
      const outputDir = escapePowerShellString(params.outputDir);
      
      return `# Download Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Downloading package: ${packageName}" -ForegroundColor Cyan
    
    # Ensure output directory exists
    if (-not (Test-Path "${outputDir}")) {
        New-Item -Path "${outputDir}" -ItemType Directory -Force | Out-Null
    }
    
    choco download "${packageName}"${version} --output-directory="${outputDir}" --no-progress
    
    if ($LASTEXITCODE -eq 0) {
        $DownloadedFile = Get-ChildItem -Path "${outputDir}" -Filter "${packageName}*.nupkg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        Write-Host "[SUCCESS] Package downloaded: $($DownloadedFile.FullName)" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Download failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Download failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-list-sources',
    name: 'List All Sources',
    category: 'Source Management',
    description: 'List all configured Chocolatey package sources',
    parameters: [],
    scriptTemplate: () => {
      return `# List Chocolatey Sources
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configured Chocolatey sources:" -ForegroundColor Cyan
    Write-Host ""
    
    $Sources = choco source list --limit-output | ForEach-Object {
        $parts = $_ -split '\\|'
        [PSCustomObject]@{
            Name = $parts[0]
            Source = $parts[1]
            Disabled = if ($parts[2] -eq "True") { "Yes" } else { "No" }
            Priority = $parts[4]
        }
    }
    
    $Sources | Format-Table -AutoSize
    
    Write-Host "[SUCCESS] Listed $($Sources.Count) source(s)" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to list sources: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-enable-source',
    name: 'Enable/Disable Source',
    category: 'Source Management',
    description: 'Enable or disable a Chocolatey package source',
    parameters: [
      { id: 'sourceName', label: 'Source Name', type: 'text', required: true, placeholder: 'chocolatey' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' }
    ],
    scriptTemplate: (params) => {
      const sourceName = escapePowerShellString(params.sourceName);
      const action = params.action.toLowerCase();
      
      return `# ${params.action} Chocolatey Source
# Generated: ${new Date().toISOString()}

try {
    Write-Host "${params.action === 'Enable' ? 'Enabling' : 'Disabling'} source: ${sourceName}" -ForegroundColor Cyan
    
    choco source ${action} --name="${sourceName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Source '${sourceName}' ${action}d successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Operation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    # Show current sources
    Write-Host ""
    Write-Host "Current sources:" -ForegroundColor Cyan
    choco source list
    
} catch {
    Write-Error "${params.action} source failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-feature-toggle',
    name: 'Toggle Chocolatey Feature',
    category: 'Configuration',
    description: 'Enable or disable Chocolatey features',
    parameters: [
      { id: 'featureName', label: 'Feature Name', type: 'select', required: true, options: [
        'checksumFiles', 'autoUninstaller', 'allowGlobalConfirmation', 'failOnAutoUninstaller',
        'failOnStandardError', 'useFipsCompliantChecksums', 'showNonElevatedWarnings',
        'showDownloadProgress', 'stopOnFirstPackageFailure', 'useRememberedArgumentsForUpgrades',
        'ignoreInvalidOptionsSwitches', 'usePackageExitCodes', 'useEnhancedExitCodes'
      ] },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' }
    ],
    scriptTemplate: (params) => {
      const featureName = escapePowerShellString(params.featureName);
      const action = params.action.toLowerCase();
      
      return `# ${params.action} Chocolatey Feature
# Generated: ${new Date().toISOString()}

try {
    Write-Host "${params.action === 'Enable' ? 'Enabling' : 'Disabling'} feature: ${featureName}" -ForegroundColor Cyan
    
    choco feature ${action} --name="${featureName}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Feature '${featureName}' ${action}d successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Operation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    # Show current features
    Write-Host ""
    Write-Host "Current feature settings:" -ForegroundColor Cyan
    choco feature list
    
} catch {
    Write-Error "Feature toggle failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-config-set',
    name: 'Set Configuration Value',
    category: 'Configuration',
    description: 'Set Chocolatey configuration values',
    parameters: [
      { id: 'configName', label: 'Configuration Name', type: 'select', required: true, options: [
        'cacheLocation', 'commandExecutionTimeoutSeconds', 'containsLegacyPackageInstalls',
        'proxy', 'proxyUser', 'proxyBypassList', 'proxyBypassOnLocal', 'webRequestTimeoutSeconds'
      ] },
      { id: 'configValue', label: 'Value', type: 'text', required: true, placeholder: 'Enter value' }
    ],
    scriptTemplate: (params) => {
      const configName = escapePowerShellString(params.configName);
      const configValue = escapePowerShellString(params.configValue);
      
      return `# Set Chocolatey Configuration
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Setting configuration: ${configName}" -ForegroundColor Cyan
    
    choco config set --name="${configName}" --value="${configValue}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Configuration '${configName}' set to '${configValue}'" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Configuration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    # Show current configuration
    Write-Host ""
    Write-Host "Current configuration:" -ForegroundColor Cyan
    choco config list
    
} catch {
    Write-Error "Configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-cache-clear',
    name: 'Clear Package Cache',
    category: 'Maintenance',
    description: 'Clear Chocolatey package cache to free disk space',
    parameters: [
      { id: 'expiredOnly', label: 'Expired Cache Only', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const expiredOnly = params.expiredOnly;
      
      return `# Clear Chocolatey Cache
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Clearing Chocolatey cache..." -ForegroundColor Cyan
    
    $CachePath = Join-Path $env:ChocolateyInstall "cache"
    $TempPath = Join-Path $env:TEMP "chocolatey"
    
    $BeforeSize = 0
    if (Test-Path $CachePath) {
        $BeforeSize += (Get-ChildItem -Path $CachePath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    }
    if (Test-Path $TempPath) {
        $BeforeSize += (Get-ChildItem -Path $TempPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    }
    
    ${expiredOnly ? `
    # Remove only expired cache items (older than 30 days)
    $CutoffDate = (Get-Date).AddDays(-30)
    Get-ChildItem -Path $CachePath -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force -Recurse
    Get-ChildItem -Path $TempPath -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force -Recurse` : `
    # Remove all cache items
    if (Test-Path $CachePath) {
        Remove-Item -Path "$CachePath\\*" -Force -Recurse -ErrorAction SilentlyContinue
    }
    if (Test-Path $TempPath) {
        Remove-Item -Path "$TempPath\\*" -Force -Recurse -ErrorAction SilentlyContinue
    }`}
    
    $AfterSize = 0
    if (Test-Path $CachePath) {
        $AfterSize += (Get-ChildItem -Path $CachePath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    }
    if (Test-Path $TempPath) {
        $AfterSize += (Get-ChildItem -Path $TempPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    }
    
    $FreedSpace = [math]::Round(($BeforeSize - $AfterSize) / 1MB, 2)
    
    Write-Host "[SUCCESS] Cache cleared successfully!" -ForegroundColor Green
    Write-Host "  Freed space: $FreedSpace MB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Cache clear failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-repair-install',
    name: 'Repair Chocolatey Installation',
    category: 'Maintenance',
    description: 'Repair Chocolatey installation and fix common issues',
    parameters: [],
    scriptTemplate: () => {
      return `# Repair Chocolatey Installation
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Repairing Chocolatey installation..." -ForegroundColor Cyan
    
    # Verify ChocolateyInstall environment variable
    if (-not $env:ChocolateyInstall) {
        $env:ChocolateyInstall = "$env:ProgramData\\chocolatey"
        [Environment]::SetEnvironmentVariable("ChocolateyInstall", $env:ChocolateyInstall, "Machine")
        Write-Host "  Set ChocolateyInstall environment variable" -ForegroundColor Yellow
    }
    
    # Verify chocolatey.exe exists
    $ChocoExe = Join-Path $env:ChocolateyInstall "bin\\choco.exe"
    if (-not (Test-Path $ChocoExe)) {
        Write-Host "  Chocolatey executable not found, reinstalling..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    } else {
        Write-Host "  Chocolatey executable verified" -ForegroundColor Green
    }
    
    # Verify PATH contains Chocolatey
    $ChocoBin = Join-Path $env:ChocolateyInstall "bin"
    if ($env:PATH -notlike "*$ChocoBin*") {
        $env:PATH = "$ChocoBin;$env:PATH"
        [Environment]::SetEnvironmentVariable("PATH", $env:PATH, "Machine")
        Write-Host "  Added Chocolatey to PATH" -ForegroundColor Yellow
    } else {
        Write-Host "  PATH configuration verified" -ForegroundColor Green
    }
    
    # Refresh Chocolatey
    choco upgrade chocolatey -y --no-progress
    
    Write-Host ""
    Write-Host "[SUCCESS] Chocolatey repair completed!" -ForegroundColor Green
    Write-Host "  Version: $(choco --version)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Repair failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-create-package',
    name: 'Create New Package Template',
    category: 'Enterprise Features',
    description: 'Create a new Chocolatey package template',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'mycompany-app' },
      { id: 'outputDir', label: 'Output Directory', type: 'path', required: true, placeholder: 'C:\\Packages\\Development' },
      { id: 'template', label: 'Template Type', type: 'select', required: false, options: ['Default', 'Zip', 'MSI', 'EXE'], defaultValue: 'Default' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const outputDir = escapePowerShellString(params.outputDir);
      const template = params.template ? params.template.toLowerCase() : '';
      
      return `# Create Chocolatey Package Template
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating package template: ${packageName}" -ForegroundColor Cyan
    
    # Ensure output directory exists
    if (-not (Test-Path "${outputDir}")) {
        New-Item -Path "${outputDir}" -ItemType Directory -Force | Out-Null
    }
    
    Push-Location "${outputDir}"
    
    choco new "${packageName}"${template !== 'default' ? ` --template="${template}"` : ''}
    
    if ($LASTEXITCODE -eq 0) {
        $PackageDir = Join-Path "${outputDir}" "${packageName}"
        Write-Host ""
        Write-Host "[SUCCESS] Package template created successfully!" -ForegroundColor Green
        Write-Host "  Location: $PackageDir" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Files created:" -ForegroundColor Cyan
        Get-ChildItem -Path $PackageDir -Recurse | ForEach-Object {
            Write-Host "  - $($_.FullName.Replace($PackageDir, '.'))" -ForegroundColor White
        }
    } else {
        Write-Host "[FAILED] Package creation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    Pop-Location
    
} catch {
    Write-Error "Package creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-pack-package',
    name: 'Pack Package from NuSpec',
    category: 'Enterprise Features',
    description: 'Create a .nupkg file from a nuspec specification',
    parameters: [
      { id: 'nuspecPath', label: 'NuSpec File Path', type: 'path', required: true, placeholder: 'C:\\Packages\\myapp\\myapp.nuspec' },
      { id: 'outputDir', label: 'Output Directory', type: 'path', required: true, placeholder: 'C:\\Packages\\Output' }
    ],
    scriptTemplate: (params) => {
      const nuspecPath = escapePowerShellString(params.nuspecPath);
      const outputDir = escapePowerShellString(params.outputDir);
      
      return `# Pack Chocolatey Package
# Generated: ${new Date().toISOString()}

try {
    if (-not (Test-Path "${nuspecPath}")) {
        throw "NuSpec file not found: ${nuspecPath}"
    }
    
    Write-Host "Packing package from: ${nuspecPath}" -ForegroundColor Cyan
    
    # Ensure output directory exists
    if (-not (Test-Path "${outputDir}")) {
        New-Item -Path "${outputDir}" -ItemType Directory -Force | Out-Null
    }
    
    $NuSpecDir = Split-Path "${nuspecPath}" -Parent
    Push-Location $NuSpecDir
    
    choco pack "${nuspecPath}" --output-directory="${outputDir}"
    
    if ($LASTEXITCODE -eq 0) {
        $CreatedPackage = Get-ChildItem -Path "${outputDir}" -Filter "*.nupkg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        Write-Host ""
        Write-Host "[SUCCESS] Package created successfully!" -ForegroundColor Green
        Write-Host "  Package: $($CreatedPackage.FullName)" -ForegroundColor Cyan
        Write-Host "  Size: $([math]::Round($CreatedPackage.Length / 1KB, 2)) KB" -ForegroundColor Cyan
    } else {
        Write-Host "[FAILED] Pack failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    Pop-Location
    
} catch {
    Write-Error "Pack failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-test-package',
    name: 'Test Package Installation',
    category: 'Enterprise Features',
    description: 'Test install a package from local nupkg file',
    parameters: [
      { id: 'packagePath', label: 'Package Path (.nupkg)', type: 'path', required: true, placeholder: 'C:\\Packages\\myapp.1.0.0.nupkg' },
      { id: 'force', label: 'Force Install', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const packagePath = escapePowerShellString(params.packagePath);
      const force = params.force ? ' --force' : '';
      
      return `# Test Chocolatey Package Installation
# Generated: ${new Date().toISOString()}

try {
    if (-not (Test-Path "${packagePath}")) {
        throw "Package file not found: ${packagePath}"
    }
    
    Write-Host "Testing package installation: ${packagePath}" -ForegroundColor Cyan
    
    $PackageDir = Split-Path "${packagePath}" -Parent
    
    # Install from local source
    choco install $(([System.IO.Path]::GetFileNameWithoutExtension("${packagePath}") -split '\\.')[0]) -y -s "$PackageDir"${force} --no-progress
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Package installed successfully!" -ForegroundColor Green
        Write-Host "  Testing completed." -ForegroundColor Cyan
    } else {
        Write-Host "[FAILED] Installation test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Package test failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-dependency-report',
    name: 'Package Dependency Report',
    category: 'Reporting',
    description: 'Generate a report of package dependencies',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Dependencies.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Chocolatey Package Dependency Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating package dependency report..." -ForegroundColor Cyan
    
    $DependencyReport = @()
    $Packages = choco list --local-only --limit-output
    
    $TotalPackages = ($Packages | Measure-Object).Count
    $CurrentPackage = 0
    
    foreach ($Package in $Packages) {
        $CurrentPackage++
        $parts = $Package -split '\\|'
        $pkgName = $parts[0]
        $pkgVersion = $parts[1]
        
        Write-Progress -Activity "Analyzing dependencies" -Status "$pkgName" -PercentComplete (($CurrentPackage / $TotalPackages) * 100)
        
        # Get package info for dependencies
        $PkgInfo = choco info $pkgName --limit-output 2>$null
        $FullInfo = choco info $pkgName 2>$null
        
        $Dependencies = ""
        $DependencyLine = $FullInfo | Select-String -Pattern "Dependencies:"
        if ($DependencyLine) {
            $Dependencies = ($DependencyLine -replace "Dependencies:", "").Trim()
        }
        
        $DependencyReport += [PSCustomObject]@{
            PackageName = $pkgName
            Version = $pkgVersion
            Dependencies = $Dependencies
            ReportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    }
    
    Write-Progress -Activity "Analyzing dependencies" -Completed
    
    # Export report
    $DependencyReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $WithDeps = ($DependencyReport | Where-Object { $_.Dependencies -ne "" }).Count
    
    Write-Host ""
    Write-Host "Dependency Report Summary:" -ForegroundColor Cyan
    Write-Host "  Total Packages: $TotalPackages" -ForegroundColor White
    Write-Host "  With Dependencies: $WithDeps" -ForegroundColor Yellow
    Write-Host "  No Dependencies: $($TotalPackages - $WithDeps)" -ForegroundColor Green
    Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Dependency report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-size-report',
    name: 'Package Size Report',
    category: 'Reporting',
    description: 'Generate a report of disk space used by Chocolatey packages',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Package-Sizes.csv' },
      { id: 'sortBy', label: 'Sort By', type: 'select', required: false, options: ['Size', 'Name'], defaultValue: 'Size' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const sortBy = params.sortBy || 'Size';
      
      return `# Chocolatey Package Size Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Calculating package sizes..." -ForegroundColor Cyan
    
    $LibPath = Join-Path $env:ChocolateyInstall "lib"
    $SizeReport = @()
    
    $PackageDirs = Get-ChildItem -Path $LibPath -Directory
    $TotalDirs = $PackageDirs.Count
    $CurrentDir = 0
    
    foreach ($Dir in $PackageDirs) {
        $CurrentDir++
        Write-Progress -Activity "Calculating sizes" -Status "$($Dir.Name)" -PercentComplete (($CurrentDir / $TotalDirs) * 100)
        
        $DirSize = (Get-ChildItem -Path $Dir.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $SizeMB = [math]::Round($DirSize / 1MB, 2)
        
        # Get version from nupkg
        $NupkgFile = Get-ChildItem -Path $Dir.FullName -Filter "*.nupkg" -ErrorAction SilentlyContinue | Select-Object -First 1
        $Version = if ($NupkgFile) { ($NupkgFile.BaseName -split '\\.' | Select-Object -Last 3) -join '.' } else { "Unknown" }
        
        $SizeReport += [PSCustomObject]@{
            PackageName = $Dir.Name
            Version = $Version
            SizeMB = $SizeMB
            SizeBytes = $DirSize
            Path = $Dir.FullName
        }
    }
    
    Write-Progress -Activity "Calculating sizes" -Completed
    
    # Sort report
    $SizeReport = $SizeReport | Sort-Object -Property ${sortBy === 'Size' ? 'SizeBytes' : 'PackageName'} -Descending
    
    # Export report
    $SizeReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $TotalSize = ($SizeReport | Measure-Object -Property SizeMB -Sum).Sum
    
    Write-Host ""
    Write-Host "Package Size Summary:" -ForegroundColor Cyan
    Write-Host "  Total Packages: $TotalDirs" -ForegroundColor White
    Write-Host "  Total Size: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Top 10 Largest Packages:" -ForegroundColor Cyan
    $SizeReport | Select-Object -First 10 | Format-Table PackageName, SizeMB -AutoSize
    Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Size report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-install-from-config',
    name: 'Install from Packages Config',
    category: 'Bulk Operations',
    description: 'Install packages from a packages.config file',
    parameters: [
      { id: 'configPath', label: 'Config File Path', type: 'path', required: true, placeholder: 'C:\\Configs\\packages.config' }
    ],
    scriptTemplate: (params) => {
      const configPath = escapePowerShellString(params.configPath);
      
      return `# Install Chocolatey Packages from Config
# Generated: ${new Date().toISOString()}

try {
    if (-not (Test-Path "${configPath}")) {
        throw "Config file not found: ${configPath}"
    }
    
    Write-Host "Installing packages from: ${configPath}" -ForegroundColor Cyan
    
    # Parse and display packages to be installed
    [xml]$ConfigXml = Get-Content "${configPath}"
    $PackageCount = ($ConfigXml.packages.package | Measure-Object).Count
    
    Write-Host "Found $PackageCount package(s) to install:" -ForegroundColor Yellow
    $ConfigXml.packages.package | ForEach-Object {
        Write-Host "  - $($_.id) v$($_.version)" -ForegroundColor White
    }
    
    Write-Host ""
    choco install "${configPath}" -y --no-progress
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] All packages installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Some packages failed to install (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Installation from config failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-compare-machines',
    name: 'Compare Package Lists',
    category: 'Reporting',
    description: 'Compare installed packages between exported lists from different machines',
    parameters: [
      { id: 'sourcePath', label: 'Source Machine Export Path', type: 'path', required: true, placeholder: 'C:\\Exports\\machine1.config' },
      { id: 'targetPath', label: 'Target Machine Export Path', type: 'path', required: true, placeholder: 'C:\\Exports\\machine2.config' },
      { id: 'exportPath', label: 'Comparison Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Comparison.csv' }
    ],
    scriptTemplate: (params) => {
      const sourcePath = escapePowerShellString(params.sourcePath);
      const targetPath = escapePowerShellString(params.targetPath);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Compare Chocolatey Package Lists
# Generated: ${new Date().toISOString()}

try {
    if (-not (Test-Path "${sourcePath}")) {
        throw "Source file not found: ${sourcePath}"
    }
    if (-not (Test-Path "${targetPath}")) {
        throw "Target file not found: ${targetPath}"
    }
    
    Write-Host "Comparing package lists..." -ForegroundColor Cyan
    
    [xml]$SourceXml = Get-Content "${sourcePath}"
    [xml]$TargetXml = Get-Content "${targetPath}"
    
    $SourcePackages = @{}
    $SourceXml.packages.package | ForEach-Object { $SourcePackages[$_.id] = $_.version }
    
    $TargetPackages = @{}
    $TargetXml.packages.package | ForEach-Object { $TargetPackages[$_.id] = $_.version }
    
    $ComparisonReport = @()
    
    # Find packages in source but not in target
    foreach ($pkg in $SourcePackages.Keys) {
        if (-not $TargetPackages.ContainsKey($pkg)) {
            $ComparisonReport += [PSCustomObject]@{
                PackageName = $pkg
                SourceVersion = $SourcePackages[$pkg]
                TargetVersion = "Not Installed"
                Status = "Missing in Target"
            }
        } elseif ($SourcePackages[$pkg] -ne $TargetPackages[$pkg]) {
            $ComparisonReport += [PSCustomObject]@{
                PackageName = $pkg
                SourceVersion = $SourcePackages[$pkg]
                TargetVersion = $TargetPackages[$pkg]
                Status = "Version Mismatch"
            }
        } else {
            $ComparisonReport += [PSCustomObject]@{
                PackageName = $pkg
                SourceVersion = $SourcePackages[$pkg]
                TargetVersion = $TargetPackages[$pkg]
                Status = "Match"
            }
        }
    }
    
    # Find packages in target but not in source
    foreach ($pkg in $TargetPackages.Keys) {
        if (-not $SourcePackages.ContainsKey($pkg)) {
            $ComparisonReport += [PSCustomObject]@{
                PackageName = $pkg
                SourceVersion = "Not Installed"
                TargetVersion = $TargetPackages[$pkg]
                Status = "Extra in Target"
            }
        }
    }
    
    # Export report
    $ComparisonReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary
    $Matches = ($ComparisonReport | Where-Object { $_.Status -eq "Match" }).Count
    $Mismatches = ($ComparisonReport | Where-Object { $_.Status -eq "Version Mismatch" }).Count
    $MissingInTarget = ($ComparisonReport | Where-Object { $_.Status -eq "Missing in Target" }).Count
    $ExtraInTarget = ($ComparisonReport | Where-Object { $_.Status -eq "Extra in Target" }).Count
    
    Write-Host ""
    Write-Host "Comparison Summary:" -ForegroundColor Cyan
    Write-Host "  Matching: $Matches" -ForegroundColor Green
    Write-Host "  Version Mismatch: $Mismatches" -ForegroundColor Yellow
    Write-Host "  Missing in Target: $MissingInTarget" -ForegroundColor Red
    Write-Host "  Extra in Target: $ExtraInTarget" -ForegroundColor Magenta
    Write-Host "  Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Comparison failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-upgrade-specific',
    name: 'Upgrade Specific Packages',
    category: 'Package Management',
    description: 'Upgrade a list of specific packages',
    parameters: [
      { id: 'packages', label: 'Package Names (comma-separated)', type: 'textarea', required: true, placeholder: 'googlechrome, firefox, vscode' },
      { id: 'ignoreFailures', label: 'Ignore Failures and Continue', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packagesRaw = (params.packages as string).split(',').map((n: string) => n.trim());
      const ignoreFailures = params.ignoreFailures;
      
      return `# Upgrade Specific Chocolatey Packages
# Generated: ${new Date().toISOString()}

try {
    $Packages = @(${packagesRaw.map(p => `"${escapePowerShellString(p)}"`).join(', ')})
    $Results = @()
    
    Write-Host "Upgrading $($Packages.Count) package(s)..." -ForegroundColor Cyan
    
    foreach ($Package in $Packages) {
        Write-Host ""
        Write-Host "Upgrading: $Package..." -ForegroundColor Yellow
        
        choco upgrade $Package -y --no-progress
        
        $Results += [PSCustomObject]@{
            Package = $Package
            Success = $LASTEXITCODE -eq 0
            ExitCode = $LASTEXITCODE
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Upgraded: $Package" -ForegroundColor Green
        } else {
            Write-Host "[FAILED] Failed: $Package (Exit code: $LASTEXITCODE)" -ForegroundColor Red
            ${!ignoreFailures ? `throw "Upgrade failed for $Package"` : ''}
        }
    }
    
    # Summary
    $SuccessCount = ($Results | Where-Object { $_.Success }).Count
    $FailCount = ($Results | Where-Object { -not $_.Success }).Count
    
    Write-Host ""
    Write-Host "Upgrade Summary:" -ForegroundColor Cyan
    Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
    Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
    
} catch {
    Write-Error "Upgrade failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-info-package',
    name: 'Get Package Information',
    category: 'Reporting',
    description: 'Get detailed information about a specific package',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'googlechrome' },
      { id: 'localOnly', label: 'Local Installation Only', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const localOnly = params.localOnly ? ' --local-only' : '';
      
      return `# Get Chocolatey Package Information
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Getting information for package: ${packageName}" -ForegroundColor Cyan
    Write-Host ""
    
    choco info "${packageName}"${localOnly}
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[FAILED] Package not found or error occurred" -ForegroundColor Red
    }
    
} catch {
    Write-Error "Info retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-list-pending',
    name: 'List Packages with Pending Reboots',
    category: 'Maintenance',
    description: 'List packages that require a system reboot to complete installation',
    parameters: [],
    scriptTemplate: () => {
      return `# List Packages with Pending Reboots
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Checking for packages with pending reboots..." -ForegroundColor Cyan
    
    # Check pending file rename operations (common indicator)
    $PendingRenames = Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" -Name PendingFileRenameOperations -ErrorAction SilentlyContinue
    
    # Check Windows Update reboot pending
    $WUReboot = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired" -ErrorAction SilentlyContinue
    
    # Check Component Based Servicing
    $CBSReboot = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending" -ErrorAction SilentlyContinue
    
    $RebootRequired = $false
    
    if ($PendingRenames) {
        Write-Host "  ! Pending file rename operations detected" -ForegroundColor Yellow
        $RebootRequired = $true
    }
    
    if ($WUReboot) {
        Write-Host "  ! Windows Update requires reboot" -ForegroundColor Yellow
        $RebootRequired = $true
    }
    
    if ($CBSReboot) {
        Write-Host "  ! Component servicing requires reboot" -ForegroundColor Yellow
        $RebootRequired = $true
    }
    
    # Check Chocolatey pending installs
    $PendingPath = Join-Path $env:ChocolateyInstall ".chocolatey"
    $PendingPackages = Get-ChildItem -Path $PendingPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "\\.installing$" }
    
    if ($PendingPackages) {
        Write-Host ""
        Write-Host "Packages with incomplete installations:" -ForegroundColor Yellow
        $PendingPackages | ForEach-Object { Write-Host "  - $($_.Name -replace '\\.installing$', '')" -ForegroundColor White }
        $RebootRequired = $true
    }
    
    if (-not $RebootRequired) {
        Write-Host ""
        Write-Host "[SUCCESS] No pending reboots detected!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "! System reboot recommended" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Pending reboot check failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-set-api-key',
    name: 'Set API Key for Source',
    category: 'Source Management',
    description: 'Set API key for authentication with a package source',
    parameters: [
      { id: 'sourceName', label: 'Source URL', type: 'text', required: true, placeholder: 'https://push.chocolatey.org/' },
      { id: 'apiKey', label: 'API Key', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const sourceName = escapePowerShellString(params.sourceName);
      const apiKey = escapePowerShellString(params.apiKey);
      
      return `# Set Chocolatey API Key
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Setting API key for source: ${sourceName}" -ForegroundColor Cyan
    
    choco apikey add --source="${sourceName}" --key="${apiKey}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] API key configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FAILED] Failed to set API key with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
    
    # List configured API keys (keys are masked)
    Write-Host ""
    Write-Host "Configured API keys:" -ForegroundColor Cyan
    choco apikey list
    
} catch {
    Write-Error "API key configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-optimize-shims',
    name: 'Optimize Shimgen Executables',
    category: 'Maintenance',
    description: 'Optimize and verify shim executable configurations',
    parameters: [
      { id: 'verifyOnly', label: 'Verify Only (no changes)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const verifyOnly = params.verifyOnly;
      
      return `# Optimize Chocolatey Shims
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Optimizing Chocolatey shims..." -ForegroundColor Cyan
    
    $BinPath = Join-Path $env:ChocolateyInstall "bin"
    $Shims = Get-ChildItem -Path $BinPath -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Length -lt 50KB }
    
    $ShimReport = @()
    
    foreach ($Shim in $Shims) {
        $TargetPath = $null
        
        # Read shim target
        $ShimContent = [System.IO.File]::ReadAllText($Shim.FullName) 2>$null
        if ($ShimContent -match 'target="([^"]+)"') {
            $TargetPath = $matches[1]
        }
        
        $Status = "Valid"
        if ($TargetPath -and -not (Test-Path $TargetPath)) {
            $Status = "Broken - Target Missing"
            ${!verifyOnly ? `
            Write-Host "  Removing broken shim: $($Shim.Name)" -ForegroundColor Yellow
            Remove-Item $Shim.FullName -Force` : ''}
        }
        
        $ShimReport += [PSCustomObject]@{
            ShimName = $Shim.Name
            TargetPath = $TargetPath
            Status = $Status
        }
    }
    
    # Summary
    $ValidShims = ($ShimReport | Where-Object { $_.Status -eq "Valid" }).Count
    $BrokenShims = ($ShimReport | Where-Object { $_.Status -ne "Valid" }).Count
    
    Write-Host ""
    Write-Host "Shim Optimization Summary:" -ForegroundColor Cyan
    Write-Host "  Valid Shims: $ValidShims" -ForegroundColor Green
    Write-Host "  Broken Shims: $BrokenShims" -ForegroundColor $(if ($BrokenShims -gt 0) { "Yellow" } else { "Green" })
    ${!verifyOnly ? `Write-Host "  Broken shims removed" -ForegroundColor Yellow` : ''}
    
    if ($BrokenShims -gt 0) {
        Write-Host ""
        Write-Host "Broken shims:" -ForegroundColor Yellow
        $ShimReport | Where-Object { $_.Status -ne "Valid" } | Format-Table ShimName, TargetPath -AutoSize
    }
    
} catch {
    Write-Error "Shim optimization failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-environment-report',
    name: 'Environment Health Report',
    category: 'Reporting',
    description: 'Generate a comprehensive Chocolatey environment health report',
    parameters: [
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Choco-Environment.html' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Chocolatey Environment Health Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating environment health report..." -ForegroundColor Cyan
    
    # Gather information
    $ChocoVersion = choco --version
    $InstalledCount = (choco list --local-only --limit-output | Measure-Object).Count
    $OutdatedCount = (choco outdated --limit-output | Measure-Object).Count
    $SourceCount = (choco source list --limit-output | Measure-Object).Count
    
    $LibPath = Join-Path $env:ChocolateyInstall "lib"
    $TotalSize = [math]::Round((Get-ChildItem -Path $LibPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    
    # Check for issues
    $Issues = @()
    
    if ($OutdatedCount -gt 10) {
        $Issues += "High number of outdated packages ($OutdatedCount)"
    }
    
    $BinPath = Join-Path $env:ChocolateyInstall "bin"
    $BrokenShims = Get-ChildItem -Path $BinPath -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Length -lt 50KB } | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName) 2>$null
        if ($content -match 'target="([^"]+)"' -and -not (Test-Path $matches[1])) { $_ }
    }
    if ($BrokenShims.Count -gt 0) {
        $Issues += "Broken shims detected ($($BrokenShims.Count))"
    }
    
    # Generate HTML report
    $HtmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Chocolatey Environment Health Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #5c2d91; border-bottom: 3px solid #5c2d91; padding-bottom: 10px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px 25px; background: #f8f8f8; border-radius: 6px; }
        .metric-value { font-size: 28px; font-weight: bold; color: #5c2d91; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .issues { background: #fff3cd; padding: 15px; border-radius: 6px; margin-top: 20px; }
        .issues h3 { color: #856404; margin-top: 0; }
        .healthy { background: #d4edda; }
        .healthy h3 { color: #155724; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #5c2d91; color: white; }
        .timestamp { color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Chocolatey Environment Health Report</h1>
        
        <div class="metric">
            <div class="metric-value">$ChocoVersion</div>
            <div class="metric-label">Chocolatey Version</div>
        </div>
        <div class="metric">
            <div class="metric-value">$InstalledCount</div>
            <div class="metric-label">Installed Packages</div>
        </div>
        <div class="metric">
            <div class="metric-value">$OutdatedCount</div>
            <div class="metric-label">Outdated Packages</div>
        </div>
        <div class="metric">
            <div class="metric-value">$TotalSize MB</div>
            <div class="metric-label">Total Size</div>
        </div>
        <div class="metric">
            <div class="metric-value">$SourceCount</div>
            <div class="metric-label">Package Sources</div>
        </div>
        
        <div class="issues $(if ($Issues.Count -eq 0) { 'healthy' })">
            <h3>$(if ($Issues.Count -eq 0) { '[SUCCESS] Environment Healthy' } else { '[WARNING] Issues Detected' })</h3>
            $(if ($Issues.Count -gt 0) {
                $Issues | ForEach-Object { "<p>$_</p>" }
            } else {
                "<p>No issues detected. Your Chocolatey environment is healthy.</p>"
            })
        </div>
        
        <p class="timestamp">Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
    </div>
</body>
</html>
"@
    
    $HtmlContent | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    Write-Host ""
    Write-Host "Environment Health Summary:" -ForegroundColor Cyan
    Write-Host "  Chocolatey Version: $ChocoVersion" -ForegroundColor White
    Write-Host "  Installed Packages: $InstalledCount" -ForegroundColor White
    Write-Host "  Outdated Packages: $OutdatedCount" -ForegroundColor $(if ($OutdatedCount -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Total Size: $TotalSize MB" -ForegroundColor White
    Write-Host "  Issues: $($Issues.Count)" -ForegroundColor $(if ($Issues.Count -gt 0) { "Yellow" } else { "Green" })
    Write-Host ""
    Write-Host "[SUCCESS] Report saved: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Environment report failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'choco-backup-config',
    name: 'Backup Chocolatey Configuration',
    category: 'Maintenance',
    description: 'Backup complete Chocolatey configuration including sources, features, and packages list',
    parameters: [
      { id: 'backupDir', label: 'Backup Directory', type: 'path', required: true, placeholder: 'C:\\Backup\\Chocolatey' },
      { id: 'includePackages', label: 'Include Installed Packages List', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const backupDir = escapePowerShellString(params.backupDir);
      const includePackages = params.includePackages;
      
      return `# Backup Chocolatey Configuration
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Backing up Chocolatey configuration..." -ForegroundColor Cyan
    
    $BackupPath = "${backupDir}"
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $BackupFolder = Join-Path $BackupPath "ChocolateyBackup_$Timestamp"
    
    # Create backup directory
    if (-not (Test-Path $BackupFolder)) {
        New-Item -Path $BackupFolder -ItemType Directory -Force | Out-Null
    }
    
    # Backup configuration
    $ConfigPath = Join-Path $env:ChocolateyInstall "config\\chocolatey.config"
    if (Test-Path $ConfigPath) {
        Copy-Item -Path $ConfigPath -Destination $BackupFolder -Force
        Write-Host "  [SUCCESS] Configuration file backed up" -ForegroundColor Green
    }
    
    # Export sources
    $SourcesFile = Join-Path $BackupFolder "sources.txt"
    choco source list | Out-File -FilePath $SourcesFile -Encoding UTF8
    Write-Host "  [SUCCESS] Sources list backed up" -ForegroundColor Green
    
    # Export features
    $FeaturesFile = Join-Path $BackupFolder "features.txt"
    choco feature list | Out-File -FilePath $FeaturesFile -Encoding UTF8
    Write-Host "  [SUCCESS] Features list backed up" -ForegroundColor Green
    
    ${includePackages ? `
    # Export installed packages
    $PackagesFile = Join-Path $BackupFolder "packages.config"
    choco export $PackagesFile -y
    Write-Host "  [SUCCESS] Installed packages list backed up" -ForegroundColor Green` : ''}
    
    # Create backup manifest
    $Manifest = [PSCustomObject]@{
        BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ChocolateyVersion = choco --version
        ComputerName = $env:COMPUTERNAME
        InstalledPackages = (choco list --local-only --limit-output | Measure-Object).Count
    }
    $Manifest | ConvertTo-Json | Out-File -FilePath (Join-Path $BackupFolder "manifest.json") -Encoding UTF8
    
    Write-Host ""
    Write-Host "[SUCCESS] Backup completed successfully!" -ForegroundColor Green
    Write-Host "  Location: $BackupFolder" -ForegroundColor Cyan
    
    # List backup contents
    Write-Host ""
    Write-Host "Backup contents:" -ForegroundColor Cyan
    Get-ChildItem -Path $BackupFolder | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    
} catch {
    Write-Error "Backup failed: $_"
}`;
    },
    isPremium: true
  }
];
