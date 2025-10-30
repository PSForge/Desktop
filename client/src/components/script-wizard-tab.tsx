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

interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  tasks: any[];
}

const platforms: PlatformConfig[] = [
  { id: 'file-system', name: 'File System', description: 'File and folder management', isPremium: false, tasks: fileSystemTasks },
  { id: 'networking', name: 'Networking', description: 'Network configuration', isPremium: false, tasks: networkingTasks },
  { id: 'services', name: 'Services', description: 'Windows services', isPremium: false, tasks: servicesTasks },
  { id: 'processes', name: 'Processes', description: 'Process management', isPremium: false, tasks: processManagementTasks },
  { id: 'event-logs', name: 'Event Logs', description: 'System event logs', isPremium: false, tasks: eventLogTasks },
  { id: 'registry', name: 'Registry', description: 'Windows registry', isPremium: false, tasks: registryTasks },
  { id: 'security', name: 'Security', description: 'Security management', isPremium: false, tasks: securityManagementTasks },
  { id: 'ad', name: 'Active Directory', description: 'User & group management', isPremium: false, tasks: adTasks },
  { id: 'azure-ad', name: 'Azure AD', description: 'Cloud identity management', isPremium: true, tasks: azureAdTasks },
  { id: 'azure-resources', name: 'Azure Resources', description: 'Cloud infrastructure', isPremium: true, tasks: azureResourceTasks },
  { id: 'exchange-online', name: 'Exchange Online', description: 'Cloud mailbox management', isPremium: true, tasks: exchangeOnlineTasks },
  { id: 'exchange-server', name: 'Exchange Server', description: 'On-prem mailbox management', isPremium: true, tasks: exchangeServerTasks },
  { id: 'hyper-v', name: 'Hyper-V', description: 'Virtual machine management', isPremium: true, tasks: hyperVTasks },
  { id: 'intune', name: 'Intune', description: 'Device management', isPremium: true, tasks: intuneTasks },
  { id: 'mecm', name: 'MECM', description: 'Configuration Manager', isPremium: true, tasks: mecmTasks },
  { id: 'teams', name: 'Microsoft Teams', description: 'Teams administration', isPremium: true, tasks: teamsTasks },
  { id: 'office365', name: 'Office 365', description: 'Office 365 management', isPremium: true, tasks: office365Tasks },
  { id: 'onedrive', name: 'OneDrive', description: 'OneDrive management', isPremium: true, tasks: oneDriveTasks },
  { id: 'sharepoint-online', name: 'SharePoint Online', description: 'SharePoint cloud', isPremium: true, tasks: sharePointOnlineTasks },
  { id: 'sharepoint-onprem', name: 'SharePoint On-Prem', description: 'SharePoint on-premises', isPremium: true, tasks: sharePointOnPremTasks },
  { id: 'windows365', name: 'Windows 365', description: 'Cloud PC management', isPremium: true, tasks: windows365Tasks },
  { id: 'windows-server', name: 'Windows Server', description: 'Server administration', isPremium: true, tasks: windowsServerTasks },
  { id: 'power-platform', name: 'Power Platform', description: 'Power Apps & Automate', isPremium: true, tasks: powerPlatformTasks },
];

export function ScriptWizardTab() {
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
  const [generatedScript, setGeneratedScript] = useState('');
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);

  const totalSteps = 4;

  // Filter platforms based on subscription
  const availablePlatforms = useMemo(() => {
    return platforms.filter(p => !p.isPremium || featureAccess?.hasGuiBuilderAccess);
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
    if (platform?.isPremium && !featureAccess?.hasGuiBuilderAccess) {
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

  const handleGenerateScript = () => {
    if (selectedTasks.length === 0 || csvData.rows.length === 0) {
      toast({
        title: 'Missing Data',
        description: 'Please select tasks and provide CSV data',
        variant: 'destructive'
      });
      return;
    }

    // Build bulk task configs
    const bulkTasks: BulkTaskConfig[] = selectedTasks.map(task => ({
      taskId: task.id,
      taskName: task.name,
      scriptTemplate: task.generateScript ? task.generateScript({}) : `# ${task.name}`,
      parameterMappings: {}
    }));

    const script = generateBulkScript(bulkTasks, csvData.rows, {
      includeErrorHandling: true,
      includeProgressOutput: true,
      includeRetryLogic: false
    });

    setGeneratedScript(script);
    setCurrentStep(4);
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
    // Step 1 validation
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

    // Step 2 validation
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

    // Step 3 validation
    if (currentStep === 3) {
      if (csvData.rows.length === 0) {
        toast({
          title: 'No Data Provided',
          description: 'Please upload or enter CSV data before generating the script',
          variant: 'destructive'
        });
        return;
      }
      if (csvValidationErrors.length > 0) {
        toast({
          title: 'CSV Validation Errors',
          description: `Please fix ${csvValidationErrors.length} validation error(s) before continuing`,
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
    setGeneratedScript('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step Indicator */}
      <div className="border-b px-6 py-4 bg-muted/30">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
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
                {step < 4 && (
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
                    <AlertDescription>
                      Select the platforms where you want to perform bulk operations. You can combine tasks from multiple platforms in a single script.
                    </AlertDescription>
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

                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                      <TabsTrigger value="template">Download Template</TabsTrigger>
                    </TabsList>

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

          {/* Step 4: Preview & Export */}
          {currentStep === 4 && (
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
                {currentStep === 3 ? 'Generate Script' : 'Next'}
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
