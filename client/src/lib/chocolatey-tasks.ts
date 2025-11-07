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
  }
];
