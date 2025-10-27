import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskDetailForm } from "@/components/task-detail-form";
import { ScriptPreviewDialog } from "@/components/script-preview-dialog";
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
  Laptop
} from "lucide-react";

interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
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
    id: "azure",
    name: "Azure",
    icon: Cloud,
    description: "Azure cloud resources",
    color: "text-sky-500"
  },
  {
    id: "exchange-online",
    name: "Exchange Online",
    icon: Mail,
    description: "Office 365 mailbox management",
    color: "text-teal-500"
  },
  {
    id: "azure-ad",
    name: "Azure AD",
    icon: CloudCog,
    description: "Azure Active Directory",
    color: "text-cyan-500"
  },
  {
    id: "azure-resources",
    name: "Azure Resources",
    icon: Package,
    description: "Azure cloud infrastructure",
    color: "text-blue-600"
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    icon: Share2,
    description: "SharePoint site administration",
    color: "text-emerald-500"
  },
  {
    id: "sharepoint-online",
    name: "SharePoint Online",
    icon: Share2,
    description: "SharePoint Online management",
    color: "text-teal-600"
  },
  {
    id: "sharepoint-onprem",
    name: "SharePoint On-Prem",
    icon: DatabaseZap,
    description: "On-premises SharePoint",
    color: "text-emerald-700"
  },
  {
    id: "mecm",
    name: "MECM",
    icon: Server,
    description: "Configuration Manager",
    color: "text-violet-500"
  },
  {
    id: "exchange-server",
    name: "Exchange Server",
    icon: HardDrive,
    description: "On-premises Exchange",
    color: "text-amber-500"
  },
  {
    id: "hyper-v",
    name: "Hyper-V",
    icon: MonitorPlay,
    description: "Virtual machine management",
    color: "text-fuchsia-500"
  },
  {
    id: "intune",
    name: "Intune",
    icon: Smartphone,
    description: "Device management",
    color: "text-purple-600"
  },
  {
    id: "power-platform",
    name: "Power Platform",
    icon: Zap,
    description: "Power Apps & Automate",
    color: "text-rose-500"
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    icon: MessageSquare,
    description: "Teams collaboration",
    color: "text-indigo-600"
  },
  {
    id: "office365",
    name: "Office 365",
    icon: Grid3x3,
    description: "Office 365 tenant",
    color: "text-orange-600"
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: Cloud,
    description: "OneDrive cloud storage",
    color: "text-sky-600"
  },
  {
    id: "windows365",
    name: "Windows 365",
    icon: Laptop,
    description: "Cloud PC management",
    color: "text-cyan-600"
  },
  {
    id: "windows-server",
    name: "Windows Server",
    icon: Terminal,
    description: "Server configuration and features",
    color: "text-lime-500"
  }
];

interface GUIBuilderTabProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
}

export function GUIBuilderTab({ selectedCategory, onCategorySelect }: GUIBuilderTabProps) {
  const [selectedTask, setSelectedTask] = useState<ADTask | MECMTask | ExchangeOnlineTask | ExchangeServerTask | AzureAdTask | AzureResourceTask | HyperVTask | IntuneTask | PowerPlatformTask | TeamsTask | Office365Task | OneDriveTask | SharePointOnlineTask | SharePointOnPremTask | Windows365Task | WindowsServerTask | EventLogTask | FileSystemTask | NetworkingTask | ProcessManagementTask | RegistryTask | SecurityManagementTask | ServicesTask | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    onCategorySelect(categoryId);
    setSelectedTask(null);
  };

  const handleTaskSelect = (task: ADTask | MECMTask | ExchangeOnlineTask | ExchangeServerTask | AzureAdTask | AzureResourceTask | HyperVTask | IntuneTask | PowerPlatformTask | TeamsTask | Office365Task | OneDriveTask | SharePointOnlineTask | SharePointOnPremTask | Windows365Task | WindowsServerTask | EventLogTask | FileSystemTask | NetworkingTask | ProcessManagementTask | RegistryTask | SecurityManagementTask | ServicesTask) => {
    setSelectedTask(task);
  };

  const handleBackToTasks = () => {
    setSelectedTask(null);
  };

  const handleGenerateScript = (script: string) => {
    setGeneratedScript(script);
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
    return (
      <>
        <TaskDetailForm
          task={selectedTask}
          onBack={handleBackToTasks}
          onGenerateScript={handleGenerateScript}
        />
        <ScriptPreviewDialog
          open={scriptDialogOpen}
          onOpenChange={setScriptDialogOpen}
          script={generatedScript}
          taskName={(selectedTask as any).name || (selectedTask as any).title}
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

            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleCategoryClick(category.id)}
                data-testid={`category-card-${category.id}`}
              >
                <CardHeader className="flex flex-col items-center text-center space-y-2 p-6">
                  <div className={`${category.color} mb-2`}>
                    <Icon className="h-12 w-12" />
                  </div>
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {category.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {(selectedCategory === 'active-directory' || selectedCategory === 'mecm' || selectedCategory === 'exchange-online' || selectedCategory === 'exchange-server' || selectedCategory === 'azure-ad' || selectedCategory === 'azure-resources' || selectedCategory === 'hyper-v' || selectedCategory === 'intune' || selectedCategory === 'power-platform' || selectedCategory === 'teams' || selectedCategory === 'office365' || selectedCategory === 'onedrive' || selectedCategory === 'sharepoint-online' || selectedCategory === 'sharepoint-onprem' || selectedCategory === 'windows365' || selectedCategory === 'windows-server') && categoryTasks.length > 0 && (
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

        {selectedCategory && selectedCategory !== 'active-directory' && selectedCategory !== 'mecm' && selectedCategory !== 'exchange-online' && selectedCategory !== 'exchange-server' && selectedCategory !== 'azure-ad' && selectedCategory !== 'azure-resources' && selectedCategory !== 'hyper-v' && selectedCategory !== 'intune' && selectedCategory !== 'power-platform' && selectedCategory !== 'teams' && selectedCategory !== 'office365' && selectedCategory !== 'onedrive' && selectedCategory !== 'sharepoint-online' && selectedCategory !== 'sharepoint-onprem' && selectedCategory !== 'windows365' && selectedCategory !== 'windows-server' && (
          <div className="mt-8 p-6 border rounded-lg bg-muted/50">
            <p className="text-center text-muted-foreground">
              Tasks for <span className="font-semibold text-foreground">
                {categories.find(c => c.id === selectedCategory)?.name}
              </span> will be added soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
