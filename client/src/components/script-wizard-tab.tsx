import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Download, Upload, Info, Lock, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SecurityDashboard } from '@/components/security-dashboard';
import { parseCSV, validateCSVData, generateCSVTemplate, downloadCSV, readCSVFile, ParsedCSV } from '@/lib/csv-utils';
import { generateBulkScript, BulkTaskConfig } from '@/lib/bulk-script-generator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Import all task libraries
import { adTasks } from '@/lib/ad-tasks';
import { azureAdTasks } from '@/lib/azure-ad-tasks';
import { azureResourceTasks } from '@/lib/azure-resources-tasks';
import { exchangeOnlineTasks } from '@/lib/exchange-online-tasks';
import { exchangeServerTasks } from '@/lib/exchange-server-tasks';
import { hyperVTasks } from '@/lib/hyper-v-tasks';
import { intuneTasks } from '@/lib/intune-tasks';
import { mecmTasks } from '@/lib/mecm-tasks';
import { teamsTasks } from '@/lib/teams-tasks';
import { office365Tasks } from '@/lib/office365-tasks';
import { oneDriveTasks } from '@/lib/onedrive-tasks';
import { sharePointOnlineTasks } from '@/lib/sharepoint-online-tasks';
import { sharePointOnPremTasks } from '@/lib/sharepoint-onprem-tasks';
import { windows365Tasks } from '@/lib/windows365-tasks';
import { windowsServerTasks } from '@/lib/windows-server-tasks';
import { powerPlatformTasks } from '@/lib/power-platform-tasks';
import { eventLogTasks } from '@/lib/event-log-tasks';
import { fileSystemTasks } from '@/lib/file-system-tasks';
import { networkingTasks } from '@/lib/networking-tasks';
import { processManagementTasks } from '@/lib/process-management-tasks';
import { registryTasks } from '@/lib/registry-tasks';
import { securityManagementTasks } from '@/lib/security-management-tasks';
import { servicesTasks } from '@/lib/services-tasks';
import { vmwareTasks } from '@/lib/vmware-tasks';
import { veeamTasks } from '@/lib/veeam-tasks';
import { nutanixTasks } from '@/lib/nutanix-tasks';
import { citrixTasks } from '@/lib/citrix-tasks';
import { pdqTasks } from '@/lib/pdq-tasks';
import { chocolateyTasks } from '@/lib/chocolatey-tasks';
import { servicenowTasks } from '@/lib/servicenow-tasks';
import { connectwiseTasks } from '@/lib/connectwise-tasks';
import { awsTasks } from '@/lib/aws-tasks';
import { gcpTasks } from '@/lib/gcp-tasks';
import { crowdstrikeTasks } from '@/lib/crowdstrike-tasks';
import { sophosTasks } from '@/lib/sophos-tasks';
import { oktaTasks } from '@/lib/okta-tasks';
import { duoTasks } from '@/lib/duo-tasks';
import { fortinetTasks } from '@/lib/fortinet-tasks';
import { ciscoTasks } from '@/lib/cisco-tasks';
import { netappTasks } from '@/lib/netapp-tasks';
import { jamfTasks } from '@/lib/jamf-tasks';
import { slackTasks } from '@/lib/slack-tasks';
import { zoomTasks } from '@/lib/zoom-tasks';
import { githubTasks } from '@/lib/github-tasks';
import { splunkTasks } from '@/lib/splunk-tasks';
import { dockerTasks } from '@/lib/docker-tasks';
import { jiraTasks } from '@/lib/jira-tasks';
import { salesforceTasks } from '@/lib/salesforce-tasks';
import { sqlServerTasks } from '@/lib/sql-server-tasks';

interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  tasks: any[];
}

const platforms: PlatformConfig[] = [
  // Free tier platforms (Windows Management)
  { id: 'file-system', name: 'File System', description: 'Manage files and folders', isPremium: false, tasks: fileSystemTasks },
  { id: 'network', name: 'Network', description: 'Network configuration and diagnostics', isPremium: false, tasks: networkingTasks },
  { id: 'services', name: 'Services', description: 'Windows service management', isPremium: false, tasks: servicesTasks },
  { id: 'process-management', name: 'Process Management', description: 'Control running processes', isPremium: false, tasks: processManagementTasks },
  { id: 'event-logs', name: 'Event Logs', description: 'View and manage system logs', isPremium: false, tasks: eventLogTasks },
  { id: 'active-directory', name: 'Active Directory', description: 'User and group administration', isPremium: false, tasks: adTasks },
  { id: 'registry', name: 'Registry', description: 'Windows registry operations', isPremium: false, tasks: registryTasks },
  { id: 'security', name: 'Security', description: 'Security and permissions', isPremium: false, tasks: securityManagementTasks },
  // Pro tier platforms (Enterprise IT)
  { id: 'exchange-online', name: 'Exchange Online', description: 'Office 365 mailbox management', isPremium: true, tasks: exchangeOnlineTasks },
  { id: 'azure-ad', name: 'Azure AD', description: 'Azure Active Directory', isPremium: true, tasks: azureAdTasks },
  { id: 'azure-resources', name: 'Azure Resources', description: 'Azure cloud infrastructure', isPremium: true, tasks: azureResourceTasks },
  { id: 'sharepoint-online', name: 'SharePoint Online', description: 'SharePoint Online management', isPremium: true, tasks: sharePointOnlineTasks },
  { id: 'sharepoint-onprem', name: 'SharePoint On-Prem', description: 'On-premises SharePoint', isPremium: true, tasks: sharePointOnPremTasks },
  { id: 'mecm', name: 'MECM', description: 'Configuration Manager', isPremium: true, tasks: mecmTasks },
  { id: 'exchange-server', name: 'Exchange Server', description: 'On-premises Exchange', isPremium: true, tasks: exchangeServerTasks },
  { id: 'hyper-v', name: 'Hyper-V', description: 'Virtual machine management', isPremium: true, tasks: hyperVTasks },
  { id: 'intune', name: 'Intune', description: 'Device management', isPremium: true, tasks: intuneTasks },
  { id: 'power-platform', name: 'Power Platform', description: 'Power Apps & Automate', isPremium: true, tasks: powerPlatformTasks },
  { id: 'teams', name: 'Microsoft Teams', description: 'Teams collaboration', isPremium: true, tasks: teamsTasks },
  { id: 'office365', name: 'Office 365', description: 'Office 365 tenant', isPremium: true, tasks: office365Tasks },
  { id: 'onedrive', name: 'OneDrive', description: 'OneDrive cloud storage', isPremium: true, tasks: oneDriveTasks },
  { id: 'windows365', name: 'Windows 365', description: 'Cloud PC management', isPremium: true, tasks: windows365Tasks },
  { id: 'windows-server', name: 'Windows Server', description: 'Server configuration and features', isPremium: true, tasks: windowsServerTasks },
  // Version 3.0 Enterprise Platforms (All Pro-tier)
  { id: 'vmware', name: 'VMware vSphere', description: 'VMware infrastructure automation', isPremium: true, tasks: vmwareTasks },
  { id: 'veeam', name: 'Veeam Backup', description: 'Backup and recovery operations', isPremium: true, tasks: veeamTasks },
  { id: 'nutanix', name: 'Nutanix AHV', description: 'Nutanix hyperconverged infrastructure', isPremium: true, tasks: nutanixTasks },
  { id: 'citrix', name: 'Citrix Virtual Apps', description: 'Citrix XenApp and XenDesktop', isPremium: true, tasks: citrixTasks },
  { id: 'pdq', name: 'PDQ Deploy/Inventory', description: 'Software deployment and inventory', isPremium: true, tasks: pdqTasks },
  { id: 'chocolatey', name: 'Chocolatey/WinGet', description: 'Package management automation', isPremium: true, tasks: chocolateyTasks },
  { id: 'servicenow', name: 'ServiceNow', description: 'ITSM and ticketing automation', isPremium: true, tasks: servicenowTasks },
  { id: 'connectwise', name: 'ConnectWise', description: 'RMM and PSA automation', isPremium: true, tasks: connectwiseTasks },
  { id: 'aws', name: 'Amazon AWS', description: 'AWS cloud resource management', isPremium: true, tasks: awsTasks },
  { id: 'gcp', name: 'Google Cloud', description: 'GCP infrastructure automation', isPremium: true, tasks: gcpTasks },
  { id: 'crowdstrike', name: 'CrowdStrike Falcon', description: 'Endpoint security automation', isPremium: true, tasks: crowdstrikeTasks },
  { id: 'sophos', name: 'Sophos Central', description: 'Endpoint protection management', isPremium: true, tasks: sophosTasks },
  { id: 'okta', name: 'Okta', description: 'Identity and access management', isPremium: true, tasks: oktaTasks },
  { id: 'duo', name: 'Duo Security', description: 'Multi-factor authentication', isPremium: true, tasks: duoTasks },
  { id: 'fortinet', name: 'Fortinet FortiGate', description: 'Firewall and network security', isPremium: true, tasks: fortinetTasks },
  { id: 'cisco', name: 'Cisco Meraki', description: 'Network and wireless management', isPremium: true, tasks: ciscoTasks },
  { id: 'netapp', name: 'NetApp ONTAP', description: 'Enterprise storage management', isPremium: true, tasks: netappTasks },
  { id: 'jamf', name: 'JAMF Pro', description: 'Apple device management', isPremium: true, tasks: jamfTasks },
  { id: 'slack', name: 'Slack', description: 'Team collaboration automation', isPremium: true, tasks: slackTasks },
  { id: 'zoom', name: 'Zoom', description: 'Video conferencing automation', isPremium: true, tasks: zoomTasks },
  { id: 'github', name: 'GitHub/GitLab', description: 'DevOps and repository automation', isPremium: true, tasks: githubTasks },
  { id: 'splunk', name: 'Splunk/Datadog', description: 'Monitoring and analytics', isPremium: true, tasks: splunkTasks },
  { id: 'docker', name: 'Docker/Kubernetes', description: 'Container orchestration', isPremium: true, tasks: dockerTasks },
  { id: 'jira', name: 'Jira/Confluence', description: 'Project management automation', isPremium: true, tasks: jiraTasks },
  { id: 'salesforce', name: 'Salesforce', description: 'CRM automation', isPremium: true, tasks: salesforceTasks },
  { id: 'sql-server', name: 'SQL Server', description: 'Database administration and maintenance', isPremium: true, tasks: sqlServerTasks },
];

interface ScriptWizardTabProps {
  script: string;
  setScript: (script: string) => void;
}

export function ScriptWizardTab({ script, setScript }: ScriptWizardTabProps) {
  const { featureAccess } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Array<{
    id: string;
    name: string;
    description: string;
    platformId: string;
    platformName: string;
    parameters?: any[];
    generateScript?: (params: any) => string;
  }>>([]);
  const [csvData, setCsvData] = useState<ParsedCSV>({ headers: [], rows: [] });
  const [csvText, setCsvText] = useState('');
  const [csvFilePath, setCsvFilePath] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  
  // Parameter mappings: { taskId: { parameterId: csvColumn } }
  const [parameterMappings, setParameterMappings] = useState<Record<string, Record<string, string>>>({});

  const totalSteps = 5;

  // Filter platforms based on subscription
  const availablePlatforms = useMemo(() => {
    return platforms.filter(p => !p.isPremium || featureAccess?.hasPremiumCategories);
  }, [featureAccess]);

  // Get tasks from selected platforms
  const availableTasks = useMemo(() => {
    const tasks: any[] = [];
    selectedPlatforms.forEach(platformId => {
      const platform = platforms.find(p => p.id === platformId);
      if (platform) {
        platform.tasks.forEach(task => {
          tasks.push({
            ...task,
            platformId,
            platformName: platform.name
          });
        });
      }
    });
    return tasks;
  }, [selectedPlatforms]);

  const handlePlatformToggle = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (platform?.isPremium && !featureAccess?.hasPremiumCategories) {
      toast({
        title: 'Pro Feature',
        description: `${platform.name} requires a Pro subscription`,
        variant: 'destructive'
      });
      return;
    }

    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleTaskToggle = (task: any) => {
    setSelectedTasks(prev =>
      prev.find(t => t.id === task.id)
        ? prev.filter(t => t.id !== task.id)
        : [...prev, task]
    );
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await readCSVFile(file);
      setCsvText(text);
      const parsed = parseCSV(text);
      setCsvData(parsed);
      toast({
        title: 'CSV Uploaded',
        description: `Loaded ${parsed.rows.length} rows with ${parsed.headers.length} columns`
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Could not read CSV file',
        variant: 'destructive'
      });
    }
  };

  const handleCSVTextChange = (text: string) => {
    setCsvText(text);
    const parsed = parseCSV(text);
    setCsvData(parsed);
    
    // Validate CSV data
    if (parsed.rows.length > 0) {
      const errors: string[] = [];
      if (parsed.headers.length === 0) {
        errors.push('CSV must have header row');
      }
      parsed.rows.forEach((row, index) => {
        const emptyValues = Object.values(row).filter(v => !v || v.trim() === '').length;
        if (emptyValues === Object.keys(row).length) {
          errors.push(`Row ${index + 2} is completely empty`);
        }
      });
      setCsvValidationErrors(errors);
    } else {
      setCsvValidationErrors([]);
    }
  };

  const handleDownloadTemplate = () => {
    const columns = ['Name', 'Email', 'Department'];
    const template = generateCSVTemplate(columns, true);
    downloadCSV('bulk-template.csv', template);
    toast({
      title: 'Template Downloaded',
      description: 'CSV template has been downloaded'
    });
  };

  const handleParameterMappingChange = (taskId: string, parameterId: string, csvColumn: string) => {
    setParameterMappings(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [parameterId]: csvColumn
      }
    }));
  };

  const handleGenerateScript = () => {
    if (selectedTasks.length === 0 || csvData.rows.length === 0) {
      toast({
        title: 'Missing Data',
        description: 'Please select tasks and provide CSV data',
        variant: 'destructive'
      });
      return;
    }

    // Generate the bulk script with CSV file path reference
    const lines: string[] = [];
    
    // Header
    lines.push('# PowerShell Bulk Operations Script');
    lines.push(`# Generated by PSForge: ${new Date().toISOString()}`);
    lines.push(`# Tasks per Item: ${selectedTasks.length}`);
    lines.push('');
    
    // CSV file path
    if (csvFilePath) {
      lines.push('# Import CSV data from file');
      lines.push(`$CSVPath = "${csvFilePath.replace(/\\/g, '\\\\')}"`);
      lines.push('if (-not (Test-Path $CSVPath)) {');
      lines.push('    Write-Host "Error: CSV file not found at: $CSVPath" -ForegroundColor Red');
      lines.push('    exit 1');
      lines.push('}');
      lines.push('$BulkData = Import-CSV -Path $CSVPath');
    } else {
      // Embed CSV data if no file path provided
      lines.push('# Embedded CSV data');
      lines.push('$BulkData = @(');
      csvData.rows.forEach((row, index) => {
        lines.push('  [PSCustomObject]@{');
        Object.entries(row).forEach(([key, value]) => {
          const escapedValue = value.replace(/'/g, "''");
          lines.push(`    '${key}' = '${escapedValue}'`);
        });
        lines.push(`  }${index < csvData.rows.length - 1 ? ',' : ''}`);
      });
      lines.push(')');
    }
    lines.push('');
    
    // Error handling setup
    lines.push('$ErrorActionPreference = "Continue"');
    lines.push('$SuccessCount = 0');
    lines.push('$FailureCount = 0');
    lines.push('$Errors = @()');
    lines.push('');
    
    // Progress output
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host "Starting Bulk Operations" -ForegroundColor Cyan');
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host ""');
    lines.push('');
    
    // Main processing loop
    lines.push('$ItemNumber = 0');
    lines.push('foreach ($Item in $BulkData) {');
    lines.push('  $ItemNumber++');
    lines.push('  Write-Host "--------------------------------------------" -ForegroundColor Yellow');
    lines.push('  Write-Host "Processing Item $ItemNumber of $($BulkData.Count)" -ForegroundColor Yellow');
    lines.push('  Write-Host "--------------------------------------------" -ForegroundColor Yellow');
    lines.push('  try {');
    lines.push('');
    
    // Add each task with proper parameter mapping
    selectedTasks.forEach((task, taskIndex) => {
      lines.push(`    Write-Host "  → ${task.name}..." -ForegroundColor Gray`);
      lines.push('');
      
      const taskMappings = parameterMappings[task.id] || {};
      const taskParams = task.parameters || [];
      
      // Build parameter object with defaults for script generation
      const paramObj: Record<string, any> = {};
      taskParams.forEach(param => {
        // Always use default values for script generation
        // This allows transformations to work correctly
        paramObj[param.id] = param.defaultValue || (param.type === 'number' ? 0 : param.type === 'boolean' ? false : '');
      });
      
      // Generate the task script with default values
      let taskScript = '';
      if (task.generateScript) {
        taskScript = task.generateScript(paramObj);
      } else if ((task as any).scriptTemplate) {
        taskScript = (task as any).scriptTemplate(paramObj);
      }
      
      // Now set mapped variables from CSV BEFORE the task script
      Object.entries(taskMappings).forEach(([paramId, csvColumn]) => {
        // Quote column names to handle spaces and special characters
        const quotedColumn = csvColumn.includes(' ') || csvColumn.includes('-') || csvColumn.match(/[^a-zA-Z0-9_]/)
          ? `'${csvColumn.replace(/'/g, "''")}'`
          : csvColumn;
        lines.push(`    $${paramId} = $Item.${quotedColumn}`);
      });
      
      if (Object.keys(taskMappings).length > 0) {
        lines.push('');
      }
      
      // Add task script, skipping variable declarations for mapped parameters
      const mappedParamIds = Object.keys(taskMappings);
      taskScript.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines and generated timestamp
        if (!trimmedLine || trimmedLine.startsWith('# Generated:')) return;
        
        // Skip variable declarations for mapped parameters
        if (mappedParamIds.length > 0) {
          const isVariableDecl = mappedParamIds.some(paramId => {
            return trimmedLine.match(new RegExp(`^\\$${paramId}\\s*=`, 'i'));
          });
          if (isVariableDecl) return;
        }
        
        // Add the line
        lines.push(`    ${line}`);
      });
      
      lines.push('');
    });
    
    // End try-catch
    lines.push('    Write-Host "  ✓ Successfully completed" -ForegroundColor Green');
    lines.push('    $SuccessCount++');
    lines.push('  } catch {');
    lines.push('    $FailureCount++');
    lines.push('    $ErrorMessage = $_.Exception.Message');
    lines.push('    $Errors += @{');
    lines.push('      ItemNumber = $ItemNumber');
    lines.push('      Item = $Item');
    lines.push('      Error = $ErrorMessage');
    lines.push('    }');
    lines.push('    Write-Host "  ✗ Failed: $ErrorMessage" -ForegroundColor Red');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    // Summary
    lines.push('Write-Host ""');
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host "Bulk Operations Complete" -ForegroundColor Cyan');
    lines.push('Write-Host "============================================" -ForegroundColor Cyan');
    lines.push('Write-Host "Total Items: $($BulkData.Count)" -ForegroundColor White');
    lines.push('Write-Host "Successful: $SuccessCount" -ForegroundColor Green');
    lines.push('Write-Host "Failed: $FailureCount" -ForegroundColor Red');
    lines.push('if ($Errors.Count -gt 0) {');
    lines.push('  Write-Host ""');
    lines.push('  Write-Host "Errors Encountered:" -ForegroundColor Red');
    lines.push('  $Errors | ForEach-Object {');
    lines.push('    Write-Host "  Item $($_.ItemNumber): $($_.Error)" -ForegroundColor Red');
    lines.push('  }');
    lines.push('}');
    
    const script = lines.join('\n');
    setGeneratedScript(script);
    setScript(script);
    
    // Track script generation for analytics (non-blocking, fails silently)
    const firstTask = selectedTasks[0];
    apiRequest("/api/metrics/script-generated", "POST", {
      taskCategory: firstTask?.platformName,
      taskName: `Bulk: ${firstTask?.name || 'Multiple Tasks'}`,
      builderType: "script_wizard",
    }).catch((error) => {
      // Silently fail tracking - don't disrupt user experience
      console.debug("Script generation tracking skipped:", error.message);
    });
    
    setCurrentStep(5);
  };

  const handleExport = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-script-${Date.now()}.ps1`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Script Exported',
      description: 'Bulk PowerShell script has been downloaded'
    });
  };

  const handleNext = () => {
    // Step 1 validation - Platform Selection
    if (currentStep === 1) {
      if (selectedPlatforms.length === 0) {
        toast({
          title: 'No Platforms Selected',
          description: 'Please select at least one platform to continue',
          variant: 'destructive'
        });
        return;
      }
    }

    // Step 2 validation - Task Selection
    if (currentStep === 2) {
      if (selectedTasks.length === 0) {
        toast({
          title: 'No Tasks Selected',
          description: 'Please select at least one task to continue',
          variant: 'destructive'
        });
        return;
      }
    }

    // Step 3 validation - CSV Upload or File Path
    if (currentStep === 3) {
      // User must provide either CSV data OR a file path
      if (csvData.rows.length === 0 && !csvFilePath.trim()) {
        toast({
          title: 'No CSV Data or File Path',
          description: 'Please either upload CSV data or provide a CSV file path to continue',
          variant: 'destructive'
        });
        return;
      }
      
      // If CSV data uploaded, validate it
      if (csvData.rows.length > 0 && csvValidationErrors.length > 0) {
        toast({
          title: 'CSV Validation Errors',
          description: `Please fix ${csvValidationErrors.length} validation error(s) before continuing`,
          variant: 'destructive'
        });
        return;
      }
      
      // Must have headers to map parameters
      if (csvData.headers.length === 0 && csvFilePath.trim()) {
        toast({
          title: 'CSV Preview Needed',
          description: 'Please upload a sample CSV file to preview columns for parameter mapping',
          variant: 'destructive'
        });
        return;
      }
    }

    // Step 4 validation - Parameter Mapping
    if (currentStep === 4) {
      // Check if any required parameters are not mapped
      const unmappedRequired: string[] = [];
      selectedTasks.forEach(task => {
        const taskParams = task.parameters || [];
        const taskMappings = parameterMappings[task.id] || {};
        taskParams.forEach(param => {
          if (param.required && !taskMappings[param.id]) {
            unmappedRequired.push(`${task.name}: ${param.label || param.id}`);
          }
        });
      });

      if (unmappedRequired.length > 0) {
        toast({
          title: 'Required Parameters Not Mapped',
          description: `Please map all required parameters: ${unmappedRequired.slice(0, 3).join(', ')}${unmappedRequired.length > 3 ? '...' : ''}`,
          variant: 'destructive'
        });
        return;
      }

      handleGenerateScript();
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedPlatforms([]);
    setSelectedTasks([]);
    setCsvData({ headers: [], rows: [] });
    setCsvText('');
    setCsvFilePath('');
    setGeneratedScript('');
    setParameterMappings({});
    setCsvValidationErrors([]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step Indicator */}
      <div className="border-b px-6 py-4 bg-muted/30">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    step === currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : step < currentStep
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                  data-testid={`wizard-step-${step}`}
                >
                  {step}
                </div>
                {step < 5 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>
      {/* Step Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Step 1: Platform Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card data-testid="wizard-step-platform-selection">
                <CardHeader>
                  <CardTitle>Select Platforms</CardTitle>
                  <CardDescription>
                    Choose one or more IT platforms for your bulk automation tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>Select the platforms where you want to perform operations. You can combine tasks from multiple platforms in a single script.</AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availablePlatforms.map(platform => (
                      <div
                        key={platform.id}
                        className={`flex items-start gap-3 p-4 rounded-md border-2 transition-colors cursor-pointer ${
                          selectedPlatforms.includes(platform.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover-elevate'
                        }`}
                        onClick={() => handlePlatformToggle(platform.id)}
                        data-testid={`platform-${platform.id}`}
                      >
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => handlePlatformToggle(platform.id)}
                          data-testid={`checkbox-platform-${platform.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium cursor-pointer">{platform.name}</Label>
                            {platform.isPremium && (
                              <Badge variant="secondary" className="text-xs">Pro</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{platform.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{platform.tasks.length} tasks</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedPlatforms.length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected • {availableTasks.length} tasks available
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Task Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card data-testid="wizard-step-task-selection">
                <CardHeader>
                  <CardTitle>Select Tasks</CardTitle>
                  <CardDescription>
                    Choose automation tasks to include in your bulk script. Tasks will execute in the order selected.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Select tasks in the order they should execute for each item in your bulk operation.
                    </AlertDescription>
                  </Alert>

                  <ScrollArea className="h-[500px] pr-4">
                    {selectedPlatforms.map(platformId => {
                      const platform = platforms.find(p => p.id === platformId);
                      if (!platform) return null;

                      const platformTasks = availableTasks.filter(t => t.platformId === platformId);

                      return (
                        <div key={platformId} className="mb-6">
                          <h3 className="font-medium mb-3">{platform.name}</h3>
                          <div className="space-y-2">
                            {platformTasks.map(task => (
                              <div
                                key={task.id}
                                className={`flex items-start gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
                                  selectedTasks.find(t => t.id === task.id)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover-elevate'
                                }`}
                                onClick={() => handleTaskToggle(task)}
                                data-testid={`task-${task.id}`}
                              >
                                <Checkbox
                                  checked={!!selectedTasks.find(t => t.id === task.id)}
                                  onCheckedChange={() => handleTaskToggle(task)}
                                  data-testid={`checkbox-task-${task.id}`}
                                />
                                <div className="flex-1">
                                  <Label className="font-medium cursor-pointer">{task.name}</Label>
                                  <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>

                  {selectedTasks.length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Bulk Data Input */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card data-testid="wizard-step-bulk-data">
                <CardHeader>
                  <CardTitle>Configure Bulk Data</CardTitle>
                  <CardDescription>
                    Upload a CSV file or manually enter data for your bulk operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your CSV should contain one row per item to process. Each column represents a parameter value.
                    </AlertDescription>
                  </Alert>

                  <Tabs defaultValue="filepath" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="filepath">CSV File Path</TabsTrigger>
                      <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                      <TabsTrigger value="template">Download Template</TabsTrigger>
                    </TabsList>

                    <TabsContent value="filepath" className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Provide the path to your CSV file. The generated script will use Import-CSV to load data from this file when executed.
                          You can also upload a sample CSV below to preview columns and validate data structure.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>CSV File Path (for generated script)</Label>
                          <input
                            type="text"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                            placeholder="C:\IT\BulkUsers.csv"
                            value={csvFilePath}
                            onChange={(e) => setCsvFilePath(e.target.value)}
                            data-testid="input-csv-filepath"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Example: C:\Users\Admin\Desktop\users.csv
                          </p>
                        </div>

                        {csvFilePath && (
                          <div className="bg-muted/50 p-3 rounded-md">
                            <p className="text-sm font-medium">Script will use:</p>
                            <code className="text-xs bg-background px-2 py-1 rounded mt-1 block">
                              Import-CSV -Path "{csvFilePath}"
                            </code>
                          </div>
                        )}

                        <div className="border-t pt-4">
                          <Label className="text-sm">Upload Sample CSV (optional - for column preview)</Label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="button-upload-sample-csv"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Sample CSV for Preview
                          </Button>

                          {csvData.rows.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="text-sm font-medium text-green-600">
                                ✓ Sample loaded: {csvData.rows.length} rows, {csvData.headers.length} columns
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Columns: {csvData.headers.join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-csv"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose CSV File
                      </Button>

                      {csvData.rows.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Loaded {csvData.rows.length} rows with {csvData.headers.length} columns
                          </div>
                          <ScrollArea className="h-[300px] rounded-md border p-4">
                            <pre className="text-xs">{csvText}</pre>
                          </ScrollArea>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="manual" className="space-y-4">
                      <Textarea
                        placeholder="Enter CSV data manually... (e.g., Name,Email,Department)"
                        value={csvText}
                        onChange={(e) => handleCSVTextChange(e.target.value)}
                        className="min-h-[300px] font-mono text-xs"
                        data-testid="textarea-csv-manual"
                      />
                      {csvData.rows.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {csvData.rows.length} rows • {csvData.headers.length} columns
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="template" className="space-y-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Download a CSV template to help structure your bulk data. Edit the template in Excel or any spreadsheet application.
                        </AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        data-testid="button-download-template"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV Template
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Parameter Mapping */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card data-testid="wizard-step-parameter-mapping">
                <CardHeader>
                  <CardTitle>Map CSV Columns to Task Parameters</CardTitle>
                  <CardDescription>
                    Connect your CSV data to task parameters for dynamic script generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Map CSV column names to task parameters. For each row in your CSV, the script will execute the selected tasks using values from that row.
                      {csvData.headers.length > 0 && (
                        <div className="mt-2">
                          <strong>Available CSV Columns:</strong> {csvData.headers.join(', ')}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  {csvData.headers.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No CSV data loaded. Please go back to Step 3 and upload CSV data.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-6">
                        {selectedTasks.map((task, taskIndex) => {
                          const taskParams = task.parameters || [];
                          
                          return (
                            <Card key={task.id} className="border-primary/20">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="text-base">{task.name}</CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                      {task.platformName} • {taskParams.length} parameter{taskParams.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    Task {taskIndex + 1}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {taskParams.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    This task has no parameters to map.
                                  </p>
                                ) : (
                                  taskParams.map((param) => (
                                    <div key={param.id} className="grid grid-cols-2 gap-4 items-center">
                                      <div>
                                        <Label className="text-sm font-medium">
                                          {param.label || param.id}
                                          {param.required && <span className="text-destructive ml-1">*</span>}
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {param.type} parameter
                                        </p>
                                      </div>
                                      <div>
                                        <select
                                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                          value={parameterMappings[task.id]?.[param.id] || ''}
                                          onChange={(e) => handleParameterMappingChange(task.id, param.id, e.target.value)}
                                          data-testid={`select-mapping-${task.id}-${param.id}`}
                                        >
                                          <option value="">-- Not Mapped --</option>
                                          {csvData.headers.map((header) => (
                                            <option key={header} value={header}>
                                              {header}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {selectedTasks.length === 0 && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No tasks selected. Please go back to Step 2 to select automation tasks.
                          </AlertDescription>
                        </Alert>
                      )}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Preview & Export */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <Card data-testid="wizard-step-preview-export">
                <CardHeader>
                  <CardTitle>Preview & Export</CardTitle>
                  <CardDescription>
                    Review your generated bulk script and security analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="preview">Script Preview</TabsTrigger>
                      <TabsTrigger value="security">Security Analysis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="space-y-4 mt-4">
                      <ScrollArea className="h-[500px] rounded-md border bg-muted/30">
                        <pre className="p-4 text-xs font-mono">
                          <code>{generatedScript || '# No script generated'}</code>
                        </pre>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="security" className="mt-4">
                      <ScrollArea className="h-[500px]">
                        <SecurityDashboard script={generatedScript} />
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      {/* Navigation Footer */}
      <div className="border-t px-6 py-4 bg-muted/30">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-wizard-previous"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleReset}
              data-testid="button-wizard-reset"
            >
              Start Over
            </Button>
            {currentStep < totalSteps ? (
              <Button onClick={handleNext} data-testid="button-wizard-next">
                {currentStep === 4 ? 'Generate Script' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleExport} data-testid="button-wizard-export">
                <Download className="h-4 w-4 mr-2" />
                Export Script
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
