import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskDetailForm } from "@/components/task-detail-form";
import { ScriptPreviewDialog } from "@/components/script-preview-dialog";
import { adTasks, ADTask } from "@/lib/ad-tasks";
import { mecmTasks, MECMTask } from "@/lib/mecm-tasks";
import { exchangeOnlineTasks, ExchangeOnlineTask } from "@/lib/exchange-online-tasks";
import { exchangeServerTasks, ExchangeServerTask } from "@/lib/exchange-server-tasks";
import { azureAdTasks, AzureAdTask } from "@/lib/azure-ad-tasks";
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
  ChevronRight
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
    id: "sharepoint",
    name: "SharePoint",
    icon: Share2,
    description: "SharePoint site administration",
    color: "text-emerald-500"
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
  const [selectedTask, setSelectedTask] = useState<ADTask | MECMTask | ExchangeOnlineTask | ExchangeServerTask | AzureAdTask | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    onCategorySelect(categoryId);
    setSelectedTask(null);
  };

  const handleTaskSelect = (task: ADTask | MECMTask | ExchangeOnlineTask | ExchangeServerTask | AzureAdTask) => {
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
          taskName={selectedTask.name}
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

        {(selectedCategory === 'active-directory' || selectedCategory === 'mecm' || selectedCategory === 'exchange-online' || selectedCategory === 'exchange-server' || selectedCategory === 'azure-ad') && categoryTasks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">
              Available Tasks for {categories.find(c => c.id === selectedCategory)?.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryTasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleTaskSelect(task)}
                  data-testid={`task-card-${task.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">{task.name}</CardTitle>
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
              ))}
            </div>
          </div>
        )}

        {selectedCategory && selectedCategory !== 'active-directory' && selectedCategory !== 'mecm' && selectedCategory !== 'exchange-online' && selectedCategory !== 'exchange-server' && selectedCategory !== 'azure-ad' && (
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
