import { escapePowerShellString } from './powershell-utils';

export interface PDQTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface PDQTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: PDQTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const pdqTasks: PDQTask[] = [
  {
    id: 'pdq-bulk-deploy',
    name: 'Bulk Software Deployment',
    category: 'Bulk Operations',
    description: 'Deploy software packages to multiple computers',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Chrome-Latest' },
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true, placeholder: 'PC01, PC02, PC03' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      
      return `# PDQ Deploy - Bulk Software Deployment
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $Package = Get-PDQPackage -Name "${packageName}"
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($Target in $Targets) {
        Write-Host "Deploying to: $Target..." -ForegroundColor Yellow
        Start-PDQDeploy -Package $Package -Target $Target
        Write-Host "✓ Deployment initiated for $Target" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk deployment initiated for $($Targets.Count) computers" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'pdq-create-package',
    name: 'Create Deployment Package',
    category: 'Package Management',
    description: 'Create a new deployment package',
    parameters: [
      { id: 'packageName', label: 'Package Name', type: 'text', required: true, placeholder: 'Adobe-Reader-DC' },
      { id: 'installerPath', label: 'Installer Path', type: 'path', required: true, placeholder: 'C:\\Installers\\AdobeReader.exe' },
      { id: 'parameters', label: 'Install Parameters', type: 'text', required: false, placeholder: '/S /v/qn' }
    ],
    scriptTemplate: (params) => {
      const packageName = escapePowerShellString(params.packageName);
      const installerPath = escapePowerShellString(params.installerPath);
      const installParams = params.parameters ? escapePowerShellString(params.parameters) : '';
      
      return `# Create PDQ Deploy Package
# Generated: ${new Date().toISOString()}

Import-Module PDQDeploy

try {
    $NewPackage = New-PDQPackage -Name "${packageName}"
    
    Add-PDQStep -Package $NewPackage \`
        -Type "Install" \`
        -Path "${installerPath}"${installParams ? ` \`\n        -Parameters "${installParams}"` : ''}
    
    Write-Host "✓ Package '${packageName}' created successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create package: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'pdq-inventory-scan',
    name: 'Run Inventory Scan',
    category: 'Inventory Management',
    description: 'Scan computers for software and hardware inventory',
    parameters: [
      { id: 'targets', label: 'Target Computers (comma-separated)', type: 'textarea', required: true },
      { id: 'scanType', label: 'Scan Type', type: 'select', required: true, options: ['Software', 'Hardware', 'Both'], defaultValue: 'Both' }
    ],
    scriptTemplate: (params) => {
      const targetsRaw = (params.targets as string).split(',').map((n: string) => n.trim());
      const scanType = params.scanType;
      
      return `# PDQ Inventory Scan
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Targets = @(${targetsRaw.map(n => `"${escapePowerShellString(n)}"`).join(', ')})
    
    foreach ($Target in $Targets) {
        Write-Host "Scanning: $Target..." -ForegroundColor Yellow
        Start-PDQScan -Computer $Target -ScanProfile "${scanType}"
        Write-Host "✓ Scan initiated for $Target" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Inventory scan initiated for $($Targets.Count) computers" -ForegroundColor Green
    
} catch {
    Write-Error "Scan failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'pdq-export-software-report',
    name: 'Export Software Inventory Report',
    category: 'Reporting',
    description: 'Export installed software report from PDQ Inventory',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Software-Inventory.csv' },
      { id: 'softwareName', label: 'Software Name Filter (optional)', type: 'text', required: false, placeholder: 'Microsoft' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const filter = params.softwareName ? ` | Where-Object { $_.Name -like "*${escapePowerShellString(params.softwareName)}*" }` : '';
      
      return `# PDQ Inventory - Software Report
# Generated: ${new Date().toISOString()}

Import-Module PDQInventory

try {
    $Software = Get-PDQApplication${filter}
    
    $Report = $Software | Select-Object \`
        Name,
        Version,
        Publisher,
        @{N='ComputerCount';E={$_.Computers.Count}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Software inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Applications: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Export failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
