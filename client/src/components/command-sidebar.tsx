import { useState, useMemo } from "react";
import { 
  Search, ChevronDown, ChevronRight, Plus, FolderOpen, Terminal,
  Database, Network, Shield, Users, Settings, Clock, Cog, Server,
  Cloud, Mail, Key, MonitorSmartphone, HardDrive, Globe,
  GitBranch, MessageSquare, Video, Ticket, ShoppingCart,
  Package, Apple, Layers, Container
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandCategory, commandCategories } from "@shared/schema";
import { powershellCommands, getCommandsByCategory, searchCommands } from "@/lib/powershell-commands";

interface CommandSidebarProps {
  onAddCommand: (command: Command) => void;
}

export function CommandSidebar({ onAddCommand }: CommandSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<CommandCategory>>(
    new Set()
  );

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchCommands(searchQuery);
  }, [searchQuery]);

  const toggleCategory = (category: CommandCategory) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
    }
    setOpenCategories(newOpen);
  };

  const getCategoryIcon = (category: CommandCategory) => {
    switch (category) {
      // Windows Core
      case "File System":
        return <FolderOpen className="h-4 w-4" />;
      case "Registry":
        return <Database className="h-4 w-4" />;
      case "Network":
        return <Network className="h-4 w-4" />;
      case "Active Directory":
        return <Users className="h-4 w-4" />;
      case "System Administration":
        return <Settings className="h-4 w-4" />;
      case "Security":
        return <Shield className="h-4 w-4" />;
      case "Process Management":
        return <Cog className="h-4 w-4" />;
      case "Event Logs":
        return <Clock className="h-4 w-4" />;
      case "Services":
        return <Server className="h-4 w-4" />;
      case "Variables & Data":
        return <Database className="h-4 w-4" />;
      // Microsoft Cloud
      case "Azure":
      case "Azure AD":
      case "Azure Resources":
        return <Cloud className="h-4 w-4" />;
      case "Exchange Online":
      case "Exchange Server":
        return <Mail className="h-4 w-4" />;
      case "SharePoint":
      case "SharePoint On-Prem":
        return <Globe className="h-4 w-4" />;
      case "Microsoft Teams":
        return <MessageSquare className="h-4 w-4" />;
      case "OneDrive":
        return <HardDrive className="h-4 w-4" />;
      case "Office 365":
        return <Layers className="h-4 w-4" />;
      case "Intune":
      case "MECM":
        return <MonitorSmartphone className="h-4 w-4" />;
      case "Power Platform":
        return <Layers className="h-4 w-4" />;
      case "Windows 365":
        return <MonitorSmartphone className="h-4 w-4" />;
      // Infrastructure
      case "Hyper-V":
      case "VMware":
      case "Nutanix":
      case "Citrix":
        return <Server className="h-4 w-4" />;
      case "Windows Server":
        return <Server className="h-4 w-4" />;
      case "SQL Server":
        return <Database className="h-4 w-4" />;
      case "Docker":
        return <Container className="h-4 w-4" />;
      case "Veeam":
        return <HardDrive className="h-4 w-4" />;
      case "NetApp":
        return <HardDrive className="h-4 w-4" />;
      // Cloud Providers
      case "AWS":
      case "Google Cloud":
        return <Cloud className="h-4 w-4" />;
      // Security & Identity
      case "CrowdStrike":
      case "Sophos":
      case "Fortinet":
        return <Shield className="h-4 w-4" />;
      case "Okta":
      case "Duo Security":
        return <Key className="h-4 w-4" />;
      case "Cisco":
        return <Network className="h-4 w-4" />;
      // DevOps & Collaboration
      case "GitHub":
        return <GitBranch className="h-4 w-4" />;
      case "Splunk":
        return <Database className="h-4 w-4" />;
      case "Jira":
      case "ServiceNow":
        return <Ticket className="h-4 w-4" />;
      case "Slack":
        return <MessageSquare className="h-4 w-4" />;
      case "Zoom":
        return <Video className="h-4 w-4" />;
      case "Salesforce":
        return <ShoppingCart className="h-4 w-4" />;
      case "ConnectWise":
        return <Ticket className="h-4 w-4" />;
      // Deployment & Management
      case "PDQ Deploy":
      case "Chocolatey":
        return <Package className="h-4 w-4" />;
      case "JAMF":
        return <Apple className="h-4 w-4" />;
      default:
        return <Terminal className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full sm:w-80 md:w-96 border-b md:border-b-0 md:border-r bg-card flex flex-col md:h-full md:shrink-0" data-testid="sidebar-commands">
      <div className="p-4 sm:p-6 border-b space-y-3 sm:space-y-4 md:shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-medium mb-1" data-testid="text-sidebar-title">Command Library</h2>
          <p className="text-xs text-muted-foreground" data-testid="text-sidebar-description">Select commands to build your script</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-commands"
          />
        </div>
      </div>

      <div className="md:flex-1 md:overflow-auto">
        <div className="p-4 space-y-2">
          {filteredCommands ? (
            filteredCommands.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-2 mb-2" data-testid="text-search-results">
                  {filteredCommands.length} result{filteredCommands.length !== 1 ? 's' : ''}
                </p>
                {filteredCommands.map((command) => (
                  <CommandCard
                    key={command.id}
                    command={command}
                    onAdd={onAddCommand}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12" data-testid="empty-state-search">
                <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-results">No commands found</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
              </div>
            )
          ) : (
            commandCategories.map((category) => {
              const commands = getCommandsByCategory(category);
              const isOpen = openCategories.has(category);
              
              return (
                <Collapsible
                  key={category}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 hover-elevate active-elevate-2 h-9"
                      data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getCategoryIcon(category)}
                      <span className="flex-1 text-left text-sm font-medium">{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {commands.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-1 space-y-1 pl-4">
                    {commands.map((command) => (
                      <CommandCard
                        key={command.id}
                        command={command}
                        onAdd={onAddCommand}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function CommandCard({ command, onAdd }: { command: Command; onAdd: (command: Command) => void }) {
  return (
    <div
      className="group border rounded-md p-3 hover-elevate active-elevate-2 transition-all"
      data-testid={`card-command-${command.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-mono font-medium truncate">{command.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {command.description}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onAdd(command)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover-elevate active-elevate-2"
          data-testid={`button-add-command-${command.id}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {command.parameters.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-muted-foreground">
            {command.parameters.length} parameter{command.parameters.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
