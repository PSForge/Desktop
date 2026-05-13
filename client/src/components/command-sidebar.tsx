import { useEffect, useState, useMemo } from "react";
import { 
  Search, ChevronDown, ChevronRight, Plus, FolderOpen, Terminal, Star,
  Database, Network, Shield, Users, Settings, Clock, Cog, Server,
  Cloud, Mail, Key, MonitorSmartphone, HardDrive, Globe,
  GitBranch, MessageSquare, Video, Ticket, ShoppingCart,
  Package, Apple, Layers, Container, Grid2X2, List, AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandCategory, commandCategories } from "@shared/schema";
import { powershellCommands, getCommandsByCategory, searchCommands } from "@/lib/powershell-commands";

type LibraryViewMode = "compact" | "expanded";

type PlatformPackId =
  | "windows-core"
  | "microsoft-cloud"
  | "infrastructure"
  | "cloud"
  | "security"
  | "devops"
  | "deployment";

const RECENT_COMMANDS_KEY = "psforge-command-library-recents";
const COMMAND_LIBRARY_PREFS_KEY = "psforge-command-library-preferences";

type CommandLibraryPreferences = {
  viewMode?: LibraryViewMode;
  activePackId?: PlatformPackId;
};

const platformPacks: Array<{
  id: PlatformPackId;
  title: string;
  description: string;
  accent: string;
  categories: CommandCategory[];
}> = [
  {
    id: "windows-core",
    title: "Windows Core",
    description: "Files, services, registry, networking, and local administration.",
    accent: "text-sky-400",
    categories: ["File System", "Registry", "Network", "System Administration", "Security", "Process Management", "Event Logs", "Services", "Variables & Data"],
  },
  {
    id: "microsoft-cloud",
    title: "Microsoft Cloud",
    description: "Microsoft 365, Azure, Intune, Teams, Exchange, and SharePoint.",
    accent: "text-blue-400",
    categories: ["Azure", "Azure AD", "Azure Resources", "Exchange Online", "Exchange Server", "SharePoint", "SharePoint On-Prem", "Microsoft Teams", "OneDrive", "Office 365", "Intune", "MECM", "Power Platform", "Windows 365"],
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    description: "Virtualization, storage, database, backup, and server operations.",
    accent: "text-emerald-400",
    categories: ["Hyper-V", "VMware", "Nutanix", "Citrix", "Windows Server", "SQL Server", "Docker", "Veeam", "NetApp"],
  },
  {
    id: "cloud",
    title: "Cloud Providers",
    description: "AWS and Google Cloud administration.",
    accent: "text-cyan-400",
    categories: ["AWS", "Google Cloud"],
  },
  {
    id: "security",
    title: "Security And Identity",
    description: "Identity, EDR, firewall, MFA, and network security workflows.",
    accent: "text-amber-400",
    categories: ["CrowdStrike", "Sophos", "Fortinet", "Okta", "Duo Security", "Cisco"],
  },
  {
    id: "devops",
    title: "DevOps And ITSM",
    description: "GitHub, ticketing, observability, CRM, and collaboration platforms.",
    accent: "text-violet-400",
    categories: ["GitHub", "Splunk", "Jira", "ServiceNow", "Slack", "Zoom", "Salesforce", "ConnectWise"],
  },
  {
    id: "deployment",
    title: "Deployment",
    description: "Software deployment and endpoint package management.",
    accent: "text-orange-400",
    categories: ["PDQ Deploy", "Chocolatey", "JAMF"],
  },
];

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readCommandLibraryPreferences(): CommandLibraryPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  return safeJsonParse<CommandLibraryPreferences>(window.localStorage.getItem(COMMAND_LIBRARY_PREFS_KEY), {});
}

interface CommandSidebarProps {
  onAddCommand: (command: Command) => void;
  favoriteCommandIds?: string[];
  onToggleFavorite?: (commandId: string) => void;
  teamFavoriteCommandIds?: string[];
}

export function CommandSidebar({
  onAddCommand,
  favoriteCommandIds = [],
  onToggleFavorite,
  teamFavoriteCommandIds = [],
}: CommandSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<LibraryViewMode>(() => readCommandLibraryPreferences().viewMode || "compact");
  const [activePackId, setActivePackId] = useState<PlatformPackId>(() => readCommandLibraryPreferences().activePackId || "windows-core");
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() =>
    safeJsonParse<string[]>(typeof window !== "undefined" ? window.localStorage.getItem(RECENT_COMMANDS_KEY) : null, []),
  );
  const [openCategories, setOpenCategories] = useState<Set<CommandCategory>>(
    new Set(platformPacks[0].categories.slice(0, 3))
  );

  const activePack = platformPacks.find((pack) => pack.id === activePackId) || platformPacks[0];

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchCommands(searchQuery);
  }, [searchQuery]);

  const groupedSearchResults = useMemo(() => {
    if (!filteredCommands) {
      return [];
    }

    return platformPacks
      .map((pack) => ({
        pack,
        commands: filteredCommands.filter((command) => pack.categories.includes(command.category)),
      }))
      .filter((group) => group.commands.length > 0);
  }, [filteredCommands]);

  const favoriteCommands = useMemo(
    () => favoriteCommandIds
      .map((commandId) => powershellCommands.find((command) => command.id === commandId))
      .filter((command): command is Command => Boolean(command)),
    [favoriteCommandIds],
  );

  const teamFavoriteCommands = useMemo(
    () => teamFavoriteCommandIds
      .map((commandId) => powershellCommands.find((command) => command.id === commandId))
      .filter((command): command is Command => Boolean(command)),
    [teamFavoriteCommandIds],
  );

  const recentCommands = useMemo(
    () => recentCommandIds
      .map((commandId) => powershellCommands.find((command) => command.id === commandId))
      .filter((command): command is Command => Boolean(command)),
    [recentCommandIds],
  );

  const activePackCommandCount = useMemo(
    () => activePack.categories.reduce((total, category) => total + getCommandsByCategory(category).length, 0),
    [activePack],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recentCommandIds));
    }
  }, [recentCommandIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMMAND_LIBRARY_PREFS_KEY, JSON.stringify({ viewMode, activePackId }));
    }
  }, [activePackId, viewMode]);

  const rememberCommand = (command: Command) => {
    setRecentCommandIds((current) => [command.id, ...current.filter((commandId) => commandId !== command.id)].slice(0, 8));
  };

  const handleAddCommand = (command: Command) => {
    rememberCommand(command);
    onAddCommand(command);
  };

  const selectPack = (packId: PlatformPackId) => {
    const nextPack = platformPacks.find((pack) => pack.id === packId) || platformPacks[0];
    setActivePackId(packId);
    setOpenCategories(new Set(nextPack.categories.slice(0, 3)));
  };

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
      <div className="border-b p-4 sm:p-5 space-y-3 md:shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-medium mb-1" data-testid="text-sidebar-title">Command Library 2.0</h2>
            <p className="text-xs text-muted-foreground" data-testid="text-sidebar-description">Platform packs, favorites, and reusable PowerShell commands</p>
          </div>
          <div className="flex rounded-md border p-0.5">
            <Button
              size="icon"
              variant={viewMode === "compact" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => setViewMode("compact")}
              title="Compact command cards"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "expanded" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => setViewMode("expanded")}
              title="Expanded command cards"
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </Button>
          </div>
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

        <div className="grid grid-cols-2 gap-2">
          {platformPacks.slice(0, 6).map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`rounded-md border px-3 py-2 text-left transition hover:bg-muted/50 ${
                activePackId === pack.id ? "border-primary bg-primary/10" : "bg-background/50"
              }`}
              onClick={() => selectPack(pack.id)}
            >
              <div className={`text-xs font-medium ${pack.accent}`}>{pack.title}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {pack.categories.reduce((total, category) => total + getCommandsByCategory(category).length, 0)} commands
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="md:flex-1 md:overflow-auto">
        <div className="p-4 space-y-2">
          {filteredCommands ? (
            filteredCommands.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground px-2 mb-2" data-testid="text-search-results">
                  {filteredCommands.length} result{filteredCommands.length !== 1 ? 's' : ''}, grouped by platform
                </p>
                {groupedSearchResults.map(({ pack, commands }) => (
                  <div key={pack.id} className="space-y-1.5">
                    <div className="flex items-center justify-between px-2">
                      <div className={`text-xs font-medium ${pack.accent}`}>{pack.title}</div>
                      <Badge variant="outline">{commands.length}</Badge>
                    </div>
                    {commands.map((command) => (
                      <CommandCard
                        key={command.id}
                        command={command}
                        onAdd={handleAddCommand}
                        isFavorite={favoriteCommandIds.includes(command.id)}
                        onToggleFavorite={onToggleFavorite}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
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
            <>
              {favoriteCommands.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-background/40 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4 text-amber-400" />
                    Favorites
                  </div>
                  <div className="space-y-1">
                    {favoriteCommands.map((command) => (
                      <CommandCard
                        key={command.id}
                        command={command}
                        onAdd={handleAddCommand}
                        isFavorite
                        onToggleFavorite={onToggleFavorite}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              {recentCommands.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-background/40 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent commands
                  </div>
                  <div className="space-y-1">
                    {recentCommands.map((command) => (
                      <CommandCard
                        key={`recent-${command.id}`}
                        command={command}
                        onAdd={handleAddCommand}
                        isFavorite={favoriteCommandIds.includes(command.id)}
                        onToggleFavorite={onToggleFavorite}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              {teamFavoriteCommands.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4 text-primary" />
                    Team favorites
                  </div>
                  <div className="text-xs text-muted-foreground">Curated admin-friendly commands that come up often in support, remediation, and discovery workflows.</div>
                  <div className="space-y-1">
                    {teamFavoriteCommands.map((command) => (
                      <CommandCard
                        key={`team-${command.id}`}
                        command={command}
                        onAdd={handleAddCommand}
                        isFavorite={favoriteCommandIds.includes(command.id)}
                        onToggleFavorite={onToggleFavorite}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-background/30 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-sm font-medium ${activePack.accent}`}>{activePack.title}</div>
                    <div className="text-xs text-muted-foreground">{activePack.description}</div>
                  </div>
                  <Badge variant="outline">{activePackCommandCount}</Badge>
                </div>
              {activePack.categories.map((category) => {
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
                            onAdd={handleAddCommand}
                            isFavorite={favoriteCommandIds.includes(command.id)}
                            onToggleFavorite={onToggleFavorite}
                            viewMode={viewMode}
                          />
                        ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandCard({
  command,
  onAdd,
  isFavorite = false,
  onToggleFavorite,
  viewMode,
}: {
  command: Command;
  onAdd: (command: Command) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (commandId: string) => void;
  viewMode: LibraryViewMode;
}) {
  const risk = getCommandRisk(command);
  const moduleHint = getModuleHint(command.category);
  const useCase = getUseCaseHint(command);
  const isCompact = viewMode === "compact";

  return (
    <div
      className={`group border rounded-md hover-elevate active-elevate-2 transition-all ${isCompact ? "p-2" : "p-3"}`}
      data-testid={`card-command-${command.id}`}
    >
      <div className={`flex items-start justify-between gap-2 ${isCompact ? "" : "mb-2"}`}>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-mono font-medium truncate">{command.name}</h3>
          <p className={`text-xs text-muted-foreground mt-1 ${isCompact ? "line-clamp-1" : "line-clamp-2"}`}>
            {command.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onToggleFavorite ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onToggleFavorite(command.id)}
              className="opacity-100 transition-opacity hover-elevate active-elevate-2"
              data-testid={`button-favorite-command-${command.id}`}
            >
              <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onAdd(command)}
            className="shrink-0 opacity-100 transition-opacity hover-elevate active-elevate-2 md:opacity-0 md:group-hover:opacity-100"
            data-testid={`button-add-command-${command.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={risk.variant} className="gap-1 text-[10px]">
          {risk.level !== "Low" ? <AlertTriangle className="h-3 w-3" /> : null}
          {risk.level}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {command.parameters.length} param{command.parameters.length === 1 ? "" : "s"}
        </Badge>
        {moduleHint ? (
          <Badge variant="secondary" className="max-w-full truncate text-[10px]">
            {moduleHint}
          </Badge>
        ) : null}
      </div>

      {!isCompact && (
        <div className="mt-2 rounded-md border bg-background/50 px-2 py-1.5 text-xs text-muted-foreground">
          {useCase}
        </div>
      )}
    </div>
  );
}

function getCommandRisk(command: Command): { level: "Low" | "Review" | "High"; variant: "default" | "secondary" | "destructive" } {
  const text = `${command.name} ${command.syntax}`.toLowerCase();
  if (/(remove|delete|clear|stop|disable|revoke|reset|set-acl|format|dismount)/.test(text)) {
    return { level: "High", variant: "destructive" };
  }

  if (/(set-|new-|start-|restart|copy-|move-|invoke-|install-|update-|grant|add-)/.test(text)) {
    return { level: "Review", variant: "secondary" };
  }

  return { level: "Low", variant: "default" };
}

function getModuleHint(category: CommandCategory) {
  if (["Azure", "Azure AD", "Azure Resources"].includes(category)) return "Az / Graph";
  if (["Exchange Online", "Exchange Server"].includes(category)) return "Exchange";
  if (["SharePoint", "SharePoint On-Prem"].includes(category)) return "PnP / SPO";
  if (["Microsoft Teams"].includes(category)) return "Teams";
  if (["Office 365", "OneDrive", "Intune", "MECM", "Windows 365"].includes(category)) return "Graph";
  if (["AWS"].includes(category)) return "AWS Tools";
  if (["Google Cloud"].includes(category)) return "gcloud";
  if (["VMware"].includes(category)) return "PowerCLI";
  if (["Hyper-V"].includes(category)) return "Hyper-V";
  if (["SQL Server"].includes(category)) return "SqlServer";
  if (["Active Directory"].includes(category)) return "ActiveDirectory";
  return null;
}

function getUseCaseHint(command: Command) {
  const required = command.parameters.filter((parameter) => parameter.required).length;
  if (required > 0) {
    return `Common use: ${command.description}. Requires ${required} required parameter${required === 1 ? "" : "s"}.`;
  }

  return `Common use: ${command.description}. Ready to insert with optional parameters.`;
}
