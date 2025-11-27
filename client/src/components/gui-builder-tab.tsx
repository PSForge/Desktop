import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskDetailForm } from "@/components/task-detail-form";
import { ExportDialog } from "@/components/export-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConversionNudge } from "@/components/conversion-nudges";
import { useAuth } from "@/lib/auth-context";
import { useMilestones } from "@/hooks/use-milestones";
import { apiRequest } from "@/lib/queryClient";
import { adTasks, ADTask } from "@/lib/ad-tasks";
import { mecmTasks, MECMTask } from "@/lib/mecm-tasks";
import { exchangeOnlineTasks, ExchangeOnlineTask } from "@/lib/exchange-online-tasks";
import { exchangeServerTasks, ExchangeServerTask } from "@/lib/exchange-server-tasks";
import { azureAdTasks, AzureAdTask } from "@/lib/azure-ad-tasks";
import { azureResourceTasks, AzureResourceTask } from "@/lib/azure-resources-tasks";
import { hyperVTasks, HyperVTask } from "@/lib/hyper-v-tasks";
import { intuneTasks, IntuneTask } from "@/lib/intune-tasks";
import { powerPlatformTasks, PowerPlatformTask } from "@/lib/power-platform-tasks";
import { teamsTasks, TeamsTask } from "@/lib/teams-tasks";
import { office365Tasks, Office365Task } from "@/lib/office365-tasks";
import { oneDriveTasks, OneDriveTask } from "@/lib/onedrive-tasks";
import { sharePointOnlineTasks, SharePointOnlineTask } from "@/lib/sharepoint-online-tasks";
import { sharePointOnPremTasks, SharePointOnPremTask } from "@/lib/sharepoint-onprem-tasks";
import { windows365Tasks, Windows365Task } from "@/lib/windows365-tasks";
import { windowsServerTasks, WindowsServerTask } from "@/lib/windows-server-tasks";
import { eventLogTasks, EventLogTask } from "@/lib/event-log-tasks";
import { fileSystemTasks, FileSystemTask } from "@/lib/file-system-tasks";
import { networkingTasks, NetworkingTask } from "@/lib/networking-tasks";
import { processManagementTasks, ProcessManagementTask } from "@/lib/process-management-tasks";
import { registryTasks, RegistryTask } from "@/lib/registry-tasks";
import { securityManagementTasks, SecurityManagementTask } from "@/lib/security-management-tasks";
import { servicesTasks, ServicesTask } from "@/lib/services-tasks";
import { vmwareTasks, VMwareTask } from "@/lib/vmware-tasks";
import { veeamTasks, VeeamTask } from "@/lib/veeam-tasks";
import { nutanixTasks, NutanixTask } from "@/lib/nutanix-tasks";
import { citrixTasks, CitrixTask } from "@/lib/citrix-tasks";
import { pdqTasks, PDQTask } from "@/lib/pdq-tasks";
import { chocolateyTasks, ChocolateyTask } from "@/lib/chocolatey-tasks";
import { servicenowTasks, ServiceNowTask } from "@/lib/servicenow-tasks";
import { connectwiseTasks, ConnectWiseTask } from "@/lib/connectwise-tasks";
import { awsTasks, AWSTask } from "@/lib/aws-tasks";
import { gcpTasks, GCPTask } from "@/lib/gcp-tasks";
import { crowdstrikeTasks, CrowdStrikeTask } from "@/lib/crowdstrike-tasks";
import { sophosTasks, SophosTask } from "@/lib/sophos-tasks";
import { oktaTasks, OktaTask } from "@/lib/okta-tasks";
import { duoTasks, DuoTask } from "@/lib/duo-tasks";
import { fortinetTasks, FortinetTask } from "@/lib/fortinet-tasks";
import { ciscoTasks, CiscoTask } from "@/lib/cisco-tasks";
import { netappTasks, NetAppTask } from "@/lib/netapp-tasks";
import { jamfTasks, JAMFTask } from "@/lib/jamf-tasks";
import { slackTasks, SlackTask } from "@/lib/slack-tasks";
import { zoomTasks, ZoomTask } from "@/lib/zoom-tasks";
import { githubTasks, GitHubTask } from "@/lib/github-tasks";
import { splunkTasks, SplunkTask } from "@/lib/splunk-tasks";
import { dockerTasks, DockerTask } from "@/lib/docker-tasks";
import { jiraTasks, JiraTask } from "@/lib/jira-tasks";
import { salesforceTasks, SalesforceTask } from "@/lib/salesforce-tasks";
import { sqlServerTasks, SQLServerTask } from "@/lib/sql-server-tasks";
import {
  FolderOpen,
  Network,
  Settings,
  Activity,
  FileText,
  Users,
  Database,
  Shield,
  Cloud,
  Mail,
  CloudCog,
  Share2,
  Server,
  HardDrive,
  MonitorPlay,
  Terminal,
  ChevronRight,
  Package,
  Smartphone,
  Zap,
  MessageSquare,
  Grid3x3,
  DatabaseZap,
  Laptop,
  Lock,
  Building2,
  Workflow,
  CloudDownload,
  Boxes,
  Wallet,
  Radio,
  Container,
  GitBranch,
  BarChart3,
  Landmark
} from "lucide-react";

interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
  isPremium?: boolean;
}

const categories: CategoryConfig[] = [
  {
    id: "file-system",
    name: "File System",
    icon: FolderOpen,
    description: "Manage files and folders",
    color: "text-blue-500"
  },
  {
    id: "network",
    name: "Network",
    icon: Network,
    description: "Network configuration and diagnostics",
    color: "text-green-500"
  },
  {
    id: "services",
    name: "Services",
    icon: Settings,
    description: "Windows service management",
    color: "text-purple-500"
  },
  {
    id: "process-management",
    name: "Process Management",
    icon: Activity,
    description: "Control running processes",
    color: "text-orange-500"
  },
  {
    id: "event-logs",
    name: "Event Logs",
    icon: FileText,
    description: "View and manage system logs",
    color: "text-yellow-500"
  },
  {
    id: "active-directory",
    name: "Active Directory",
    icon: Users,
    description: "User and group administration",
    color: "text-indigo-500"
  },
  {
    id: "registry",
    name: "Registry",
    icon: Database,
    description: "Windows registry operations",
    color: "text-red-500"
  },
  {
    id: "security",
    name: "Security",
    icon: Shield,
    description: "Security and permissions",
    color: "text-pink-500"
  },
  {
    id: "exchange-online",
    name: "Exchange Online",
    icon: Mail,
    description: "Office 365 mailbox management",
    color: "text-teal-500",
    isPremium: true
  },
  {
    id: "azure-ad",
    name: "Azure AD",
    icon: CloudCog,
    description: "Azure Active Directory",
    color: "text-cyan-500",
    isPremium: true
  },
  {
    id: "azure-resources",
    name: "Azure Resources",
    icon: Package,
    description: "Azure cloud infrastructure",
    color: "text-blue-600",
    isPremium: true
  },
  {
    id: "sharepoint-online",
    name: "SharePoint Online",
    icon: Share2,
    description: "SharePoint Online management",
    color: "text-teal-600",
    isPremium: true
  },
  {
    id: "sharepoint-onprem",
    name: "SharePoint On-Prem",
    icon: DatabaseZap,
    description: "On-premises SharePoint",
    color: "text-emerald-700",
    isPremium: true
  },
  {
    id: "mecm",
    name: "MECM",
    icon: Server,
    description: "Configuration Manager",
    color: "text-violet-500",
    isPremium: true
  },
  {
    id: "exchange-server",
    name: "Exchange Server",
    icon: HardDrive,
    description: "On-premises Exchange",
    color: "text-amber-500",
    isPremium: true
  },
  {
    id: "hyper-v",
    name: "Hyper-V",
    icon: MonitorPlay,
    description: "Virtual machine management",
    color: "text-fuchsia-500",
    isPremium: true
  },
  {
    id: "intune",
    name: "Intune",
    icon: Smartphone,
    description: "Device management",
    color: "text-purple-600",
    isPremium: true
  },
  {
    id: "power-platform",
    name: "Power Platform",
    icon: Zap,
    description: "Power Apps & Automate",
    color: "text-rose-500",
    isPremium: true
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    icon: MessageSquare,
    description: "Teams collaboration",
    color: "text-indigo-600",
    isPremium: true
  },
  {
    id: "office365",
    name: "Office 365",
    icon: Grid3x3,
    description: "Office 365 tenant",
    color: "text-orange-600",
    isPremium: true
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: Cloud,
    description: "OneDrive cloud storage",
    color: "text-sky-600",
    isPremium: true
  },
  {
    id: "windows365",
    name: "Windows 365",
    icon: Laptop,
    description: "Cloud PC management",
    color: "text-cyan-600",
    isPremium: true
  },
  {
    id: "windows-server",
    name: "Windows Server",
    icon: Terminal,
    description: "Server configuration and features",
    color: "text-lime-500",
    isPremium: true
  },
  {
    id: "vmware",
    name: "VMware vSphere",
    icon: Server,
    description: "VMware infrastructure automation",
    color: "text-gray-500",
    isPremium: true
  },
  {
    id: "veeam",
    name: "Veeam Backup",
    icon: CloudDownload,
    description: "Backup and recovery operations",
    color: "text-emerald-500",
    isPremium: true
  },
  {
    id: "nutanix",
    name: "Nutanix AHV",
    icon: Boxes,
    description: "Nutanix hyperconverged infrastructure",
    color: "text-blue-400",
    isPremium: true
  },
  {
    id: "citrix",
    name: "Citrix Virtual Apps",
    icon: MonitorPlay,
    description: "Citrix XenApp and XenDesktop",
    color: "text-green-600",
    isPremium: true
  },
  {
    id: "pdq",
    name: "PDQ Deploy/Inventory",
    icon: Package,
    description: "Software deployment and inventory",
    color: "text-orange-500",
    isPremium: true
  },
  {
    id: "chocolatey",
    name: "Chocolatey/WinGet",
    icon: Package,
    description: "Package management automation",
    color: "text-brown-500",
    isPremium: true
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    icon: Workflow,
    description: "ITSM and ticketing automation",
    color: "text-teal-700",
    isPremium: true
  },
  {
    id: "connectwise",
    name: "ConnectWise",
    icon: Workflow,
    description: "RMM and PSA automation",
    color: "text-red-600",
    isPremium: true
  },
  {
    id: "aws",
    name: "Amazon AWS",
    icon: Cloud,
    description: "AWS cloud resource management",
    color: "text-amber-600",
    isPremium: true
  },
  {
    id: "gcp",
    name: "Google Cloud",
    icon: CloudCog,
    description: "GCP infrastructure automation",
    color: "text-blue-500",
    isPremium: true
  },
  {
    id: "crowdstrike",
    name: "CrowdStrike Falcon",
    icon: Shield,
    description: "Endpoint security automation",
    color: "text-red-700",
    isPremium: true
  },
  {
    id: "sophos",
    name: "Sophos Central",
    icon: Shield,
    description: "Endpoint protection management",
    color: "text-blue-700",
    isPremium: true
  },
  {
    id: "okta",
    name: "Okta",
    icon: Lock,
    description: "Identity and access management",
    color: "text-indigo-700",
    isPremium: true
  },
  {
    id: "duo",
    name: "Duo Security",
    icon: Lock,
    description: "Multi-factor authentication",
    color: "text-green-700",
    isPremium: true
  },
  {
    id: "fortinet",
    name: "Fortinet FortiGate",
    icon: Shield,
    description: "Firewall and network security",
    color: "text-red-800",
    isPremium: true
  },
  {
    id: "cisco",
    name: "Cisco Meraki",
    icon: Radio,
    description: "Network and wireless management",
    color: "text-cyan-700",
    isPremium: true
  },
  {
    id: "netapp",
    name: "NetApp ONTAP",
    icon: HardDrive,
    description: "Enterprise storage management",
    color: "text-blue-800",
    isPremium: true
  },
  {
    id: "jamf",
    name: "JAMF Pro",
    icon: Smartphone,
    description: "Apple device management",
    color: "text-gray-700",
    isPremium: true
  },
  {
    id: "slack",
    name: "Slack",
    icon: MessageSquare,
    description: "Team collaboration automation",
    color: "text-purple-700",
    isPremium: true
  },
  {
    id: "zoom",
    name: "Zoom",
    icon: MessageSquare,
    description: "Video conferencing automation",
    color: "text-blue-600",
    isPremium: true
  },
  {
    id: "github",
    name: "GitHub/GitLab",
    icon: GitBranch,
    description: "DevOps and repository automation",
    color: "text-gray-800",
    isPremium: true
  },
  {
    id: "splunk",
    name: "Splunk/Datadog",
    icon: BarChart3,
    description: "Monitoring and analytics",
    color: "text-orange-700",
    isPremium: true
  },
  {
    id: "docker",
    name: "Docker/Kubernetes",
    icon: Container,
    description: "Container orchestration",
    color: "text-cyan-600",
    isPremium: true
  },
  {
    id: "jira",
    name: "Jira/Confluence",
    icon: Workflow,
    description: "Project management automation",
    color: "text-blue-700",
    isPremium: true
  },
  {
    id: "salesforce",
    name: "Salesforce",
    icon: Landmark,
    description: "CRM automation",
    color: "text-sky-700",
    isPremium: true
  },
  {
    id: "sql-server",
    name: "SQL Server",
    icon: Database,
    description: "Database administration and maintenance",
    color: "text-indigo-700",
    isPremium: true
  }
];

interface GUIBuilderTabProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
  script: string;
  setScript: (script: string) => void;
}

export function GUIBuilderTab({ selectedCategory, onCategorySelect, script, setScript }: GUIBuilderTabProps) {
  const { featureAccess, user } = useAuth();
  const { trackScriptGenerated } = useMilestones();
  const [selectedTask, setSelectedTask] = useState<ADTask | MECMTask | ExchangeOnlineTask | ExchangeServerTask | AzureAdTask | AzureResourceTask | HyperVTask | IntuneTask | PowerPlatformTask | TeamsTask | Office365Task | OneDriveTask | SharePointOnlineTask | SharePointOnPremTask | Windows365Task | WindowsServerTask | EventLogTask | FileSystemTask | NetworkingTask | ProcessManagementTask | RegistryTask | SecurityManagementTask | ServicesTask | SQLServerTask | null>(null);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');

  const handleCategoryClick = (categoryId: string, category: CategoryConfig) => {
    if (category.isPremium && !featureAccess?.hasPremiumCategories) {
      setUpgradeFeature(category.name);
      setShowUpgradeModal(true);
      return;
    }
    onCategorySelect(categoryId);
    setSelectedTask(null);
  };

  const handleTaskSelect = (task: ADTask | MECMTask | ExchangeOnlineTask | ExchangeServerTask | AzureAdTask | AzureResourceTask | HyperVTask | IntuneTask | PowerPlatformTask | TeamsTask | Office365Task | OneDriveTask | SharePointOnlineTask | SharePointOnPremTask | Windows365Task | WindowsServerTask | EventLogTask | FileSystemTask | NetworkingTask | ProcessManagementTask | RegistryTask | SecurityManagementTask | ServicesTask | SQLServerTask) => {
    setSelectedTask(task);
  };

  const handleBackToTasks = () => {
    setSelectedTask(null);
  };

  const handleGenerateScript = (generatedScript: string) => {
    setScript(generatedScript);
    
    // Track script generation for analytics (non-blocking, fails silently)
    apiRequest("/api/metrics/script-generated", "POST", {
      taskCategory: (selectedTask as any)?.category,
      taskName: (selectedTask as any)?.name,
      builderType: "gui_builder",
    }).catch((error) => {
      // Silently fail tracking - don't disrupt user experience
      console.debug("Script generation tracking skipped:", error.message);
    });
    
    // Track for conversion optimization (user stats)
    trackScriptGenerated('gui');
    
    setScriptDialogOpen(true);
  };

  // Get tasks for selected category
  const categoryTasks = selectedCategory === 'active-directory' 
    ? adTasks 
    : selectedCategory === 'mecm'
    ? mecmTasks
    : selectedCategory === 'exchange-online'
    ? exchangeOnlineTasks
    : selectedCategory === 'exchange-server'
    ? exchangeServerTasks
    : selectedCategory === 'azure-ad'
    ? azureAdTasks
    : selectedCategory === 'azure-resources'
    ? azureResourceTasks
    : selectedCategory === 'hyper-v'
    ? hyperVTasks
    : selectedCategory === 'intune'
    ? intuneTasks
    : selectedCategory === 'power-platform'
    ? powerPlatformTasks
    : selectedCategory === 'teams'
    ? teamsTasks
    : selectedCategory === 'office365'
    ? office365Tasks
    : selectedCategory === 'onedrive'
    ? oneDriveTasks
    : selectedCategory === 'sharepoint-online'
    ? sharePointOnlineTasks
    : selectedCategory === 'sharepoint-onprem'
    ? sharePointOnPremTasks
    : selectedCategory === 'windows365'
    ? windows365Tasks
    : selectedCategory === 'windows-server'
    ? windowsServerTasks
    : selectedCategory === 'vmware'
    ? vmwareTasks
    : selectedCategory === 'veeam'
    ? veeamTasks
    : selectedCategory === 'nutanix'
    ? nutanixTasks
    : selectedCategory === 'citrix'
    ? citrixTasks
    : selectedCategory === 'pdq'
    ? pdqTasks
    : selectedCategory === 'chocolatey'
    ? chocolateyTasks
    : selectedCategory === 'servicenow'
    ? servicenowTasks
    : selectedCategory === 'connectwise'
    ? connectwiseTasks
    : selectedCategory === 'aws'
    ? awsTasks
    : selectedCategory === 'gcp'
    ? gcpTasks
    : selectedCategory === 'crowdstrike'
    ? crowdstrikeTasks
    : selectedCategory === 'sophos'
    ? sophosTasks
    : selectedCategory === 'okta'
    ? oktaTasks
    : selectedCategory === 'duo'
    ? duoTasks
    : selectedCategory === 'fortinet'
    ? fortinetTasks
    : selectedCategory === 'cisco'
    ? ciscoTasks
    : selectedCategory === 'netapp'
    ? netappTasks
    : selectedCategory === 'jamf'
    ? jamfTasks
    : selectedCategory === 'slack'
    ? slackTasks
    : selectedCategory === 'zoom'
    ? zoomTasks
    : selectedCategory === 'github'
    ? githubTasks
    : selectedCategory === 'splunk'
    ? splunkTasks
    : selectedCategory === 'docker'
    ? dockerTasks
    : selectedCategory === 'jira'
    ? jiraTasks
    : selectedCategory === 'salesforce'
    ? salesforceTasks
    : selectedCategory === 'sql-server'
    ? sqlServerTasks
    : selectedCategory === 'event-logs'
    ? eventLogTasks
    : selectedCategory === 'file-system'
    ? fileSystemTasks
    : selectedCategory === 'network'
    ? networkingTasks
    : selectedCategory === 'process-management'
    ? processManagementTasks
    : selectedCategory === 'registry'
    ? registryTasks
    : selectedCategory === 'security'
    ? securityManagementTasks
    : selectedCategory === 'services'
    ? servicesTasks
    : [];

  // If a task is selected, show the task detail form
  if (selectedTask) {
    // Get the category name for metadata tracking
    const category = categories.find(c => c.id === selectedCategory);
    const taskName = (selectedTask as any).name || (selectedTask as any).title;
    const categoryName = category?.name || 'Unknown';

    return (
      <>
        <TaskDetailForm
          task={selectedTask as any}
          onBack={handleBackToTasks}
          onGenerateScript={handleGenerateScript}
        />
        <ExportDialog
          open={scriptDialogOpen}
          onOpenChange={setScriptDialogOpen}
          code={script}
          taskCategory={categoryName}
          taskName={taskName}
        />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="p-4 sm:p-6 border-b">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">GUI Script Builder</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a category to build configuration scripts with an easy-to-use interface
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            const isLocked = category.isPremium && !featureAccess?.hasPremiumCategories;

            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
                  isSelected ? 'ring-2 ring-primary' : ''
                } ${isLocked ? 'opacity-75' : ''}`}
                onClick={() => handleCategoryClick(category.id, category)}
                data-testid={`category-card-${category.id}`}
              >
                <CardHeader className="flex flex-col items-center text-center space-y-2 p-6">
                  <div className="relative">
                    <div className={`${category.color} mb-2`}>
                      <Icon className="h-12 w-12" />
                    </div>
                    {isLocked && (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    {category.isPremium && (
                      <Badge variant="secondary" className="text-xs">Pro</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {category.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {selectedCategory && categoryTasks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">
              Available Tasks for {categories.find(c => c.id === selectedCategory)?.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryTasks.map((task: any) => {
                const taskName = task.name || task.title;
                return (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => handleTaskSelect(task)}
                    data-testid={`task-card-${task.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{taskName}</CardTitle>
                          <CardDescription className="text-sm">
                            {task.description}
                          </CardDescription>
                          <div className="mt-2">
                            <span className="inline-block px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                              {task.category}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {selectedCategory && categoryTasks.length === 0 && (
          <div className="mt-8 p-6 border rounded-lg bg-muted/50">
            <p className="text-center text-muted-foreground">
              Tasks for <span className="font-semibold text-foreground">
                {categories.find(c => c.id === selectedCategory)?.name}
              </span> will be added soon
            </p>
          </div>
        )}
      </div>

      {/* Conversion nudge for free users */}
      {user && user.role === 'free' && (
        <div className="mt-6">
          <ConversionNudge context="gui-builder" />
        </div>
      )}

      <UpgradeModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={upgradeFeature}
      />
    </div>
  );
}
