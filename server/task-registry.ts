/**
 * Server-side task registry.
 * Imports all GUI Builder task libraries and exposes a searchable flat index
 * for use by the CLI /cli/tasks and /cli/tasks/generate endpoints.
 */

import { adTasks } from "@/lib/ad-tasks";
import { mecmTasks } from "@/lib/mecm-tasks";
import { exchangeOnlineTasks } from "@/lib/exchange-online-tasks";
import { exchangeServerTasks } from "@/lib/exchange-server-tasks";
import { azureAdTasks } from "@/lib/azure-ad-tasks";
import { azureResourceTasks } from "@/lib/azure-resources-tasks";
import { hyperVTasks } from "@/lib/hyper-v-tasks";
import { intuneTasks } from "@/lib/intune-tasks";
import { powerPlatformTasks } from "@/lib/power-platform-tasks";
import { teamsTasks } from "@/lib/teams-tasks";
import { office365Tasks } from "@/lib/office365-tasks";
import { oneDriveTasks } from "@/lib/onedrive-tasks";
import { sharePointOnlineTasks } from "@/lib/sharepoint-online-tasks";
import { sharePointOnPremTasks } from "@/lib/sharepoint-onprem-tasks";
import { windows365Tasks } from "@/lib/windows365-tasks";
import { windowsServerTasks } from "@/lib/windows-server-tasks";
import { eventLogTasks } from "@/lib/event-log-tasks";
import { fileSystemTasks } from "@/lib/file-system-tasks";
import { networkingTasks } from "@/lib/networking-tasks";
import { processManagementTasks } from "@/lib/process-management-tasks";
import { registryTasks } from "@/lib/registry-tasks";
import { securityManagementTasks } from "@/lib/security-management-tasks";
import { servicesTasks } from "@/lib/services-tasks";
import { vmwareTasks } from "@/lib/vmware-tasks";
import { veeamTasks } from "@/lib/veeam-tasks";
import { nutanixTasks } from "@/lib/nutanix-tasks";
import { citrixTasks } from "@/lib/citrix-tasks";
import { pdqTasks } from "@/lib/pdq-tasks";
import { chocolateyTasks } from "@/lib/chocolatey-tasks";
import { servicenowTasks } from "@/lib/servicenow-tasks";
import { connectwiseTasks } from "@/lib/connectwise-tasks";
import { awsTasks } from "@/lib/aws-tasks";
import { gcpTasks } from "@/lib/gcp-tasks";
import { crowdstrikeTasks } from "@/lib/crowdstrike-tasks";
import { sophosTasks } from "@/lib/sophos-tasks";
import { oktaTasks } from "@/lib/okta-tasks";
import { duoTasks } from "@/lib/duo-tasks";
import { fortinetTasks } from "@/lib/fortinet-tasks";
import { ciscoTasks } from "@/lib/cisco-tasks";
import { netappTasks } from "@/lib/netapp-tasks";
import { jamfTasks } from "@/lib/jamf-tasks";
import { slackTasks } from "@/lib/slack-tasks";
import { zoomTasks } from "@/lib/zoom-tasks";
import { githubTasks } from "@/lib/github-tasks";
import { splunkTasks } from "@/lib/splunk-tasks";
import { dockerTasks } from "@/lib/docker-tasks";
import { jiraTasks } from "@/lib/jira-tasks";
import { salesforceTasks } from "@/lib/salesforce-tasks";
import { sqlServerTasks } from "@/lib/sql-server-tasks";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaskParameter {
  id: string;
  label: string;
  type: "text" | "email" | "path" | "number" | "boolean" | "select" | "textarea";
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<string | { value: string; label: string }>;
  defaultValue?: string | number | boolean;
}

export interface TaskRegistryEntry {
  id: string;
  name: string;
  platform: string;
  platformId: string;
  category: string;
  description: string;
  isPremium: boolean;
  parameters: TaskParameter[];
  /** Generate the PowerShell script from user-supplied parameter values. */
  generate: (params: Record<string, string>) => string;
}

/** Minimal task info returned to CLI list/search endpoints (no generator fn). */
export interface TaskSummary {
  id: string;
  name: string;
  platform: string;
  platformId: string;
  category: string;
  description: string;
  isPremium: boolean;
  parameterCount: number;
}

// ── Source entries helper ─────────────────────────────────────────────────────

interface RawTask {
  id: string;
  name: string;
  category?: string;
  description: string;
  parameters?: TaskParameter[];
  isPremium?: boolean;
  scriptTemplate: (params: Record<string, string>) => string;
}

function buildEntries(
  tasks: RawTask[],
  platform: string,
  platformId: string,
): TaskRegistryEntry[] {
  return tasks.map(t => ({
    id: t.id,
    name: t.name,
    platform,
    platformId,
    category: t.category ?? platform,
    description: t.description,
    isPremium: t.isPremium ?? false,
    parameters: (t.parameters ?? []) as TaskParameter[],
    generate: t.scriptTemplate,
  }));
}

// ── Build the flat registry ───────────────────────────────────────────────────

const registry: TaskRegistryEntry[] = [
  ...buildEntries(adTasks as RawTask[], "Active Directory", "active-directory"),
  ...buildEntries(mecmTasks as RawTask[], "MECM / SCCM", "mecm"),
  ...buildEntries(exchangeOnlineTasks as RawTask[], "Exchange Online", "exchange-online"),
  ...buildEntries(exchangeServerTasks as RawTask[], "Exchange Server", "exchange-server"),
  ...buildEntries(azureAdTasks as RawTask[], "Azure AD / Entra ID", "azure-ad"),
  ...buildEntries(azureResourceTasks as RawTask[], "Azure Resources", "azure-resources"),
  ...buildEntries(hyperVTasks as RawTask[], "Hyper-V", "hyper-v"),
  ...buildEntries(intuneTasks as RawTask[], "Intune", "intune"),
  ...buildEntries(powerPlatformTasks as RawTask[], "Power Platform", "power-platform"),
  ...buildEntries(teamsTasks as RawTask[], "Microsoft Teams", "teams"),
  ...buildEntries(office365Tasks as RawTask[], "Office 365", "office365"),
  ...buildEntries(oneDriveTasks as RawTask[], "OneDrive", "onedrive"),
  ...buildEntries(sharePointOnlineTasks as RawTask[], "SharePoint Online", "sharepoint-online"),
  ...buildEntries(sharePointOnPremTasks as RawTask[], "SharePoint On-Prem", "sharepoint-onprem"),
  ...buildEntries(windows365Tasks as RawTask[], "Windows 365", "windows365"),
  ...buildEntries(windowsServerTasks as RawTask[], "Windows Server", "windows-server"),
  ...buildEntries(eventLogTasks as RawTask[], "Event Log", "event-log"),
  ...buildEntries(fileSystemTasks as RawTask[], "File System", "file-system"),
  ...buildEntries(networkingTasks as RawTask[], "Networking", "networking"),
  ...buildEntries(processManagementTasks as RawTask[], "Process Management", "process-management"),
  ...buildEntries(registryTasks as RawTask[], "Registry", "registry"),
  ...buildEntries(securityManagementTasks as RawTask[], "Security Management", "security-management"),
  ...buildEntries(servicesTasks as RawTask[], "Services", "services"),
  ...buildEntries(vmwareTasks as RawTask[], "VMware", "vmware"),
  ...buildEntries(veeamTasks as RawTask[], "Veeam", "veeam"),
  ...buildEntries(nutanixTasks as RawTask[], "Nutanix", "nutanix"),
  ...buildEntries(citrixTasks as RawTask[], "Citrix", "citrix"),
  ...buildEntries(pdqTasks as RawTask[], "PDQ", "pdq"),
  ...buildEntries(chocolateyTasks as RawTask[], "Chocolatey", "chocolatey"),
  ...buildEntries(servicenowTasks as RawTask[], "ServiceNow", "servicenow"),
  ...buildEntries(connectwiseTasks as RawTask[], "ConnectWise", "connectwise"),
  ...buildEntries(awsTasks as RawTask[], "AWS", "aws"),
  ...buildEntries(gcpTasks as RawTask[], "GCP", "gcp"),
  ...buildEntries(crowdstrikeTasks as RawTask[], "CrowdStrike", "crowdstrike"),
  ...buildEntries(sophosTasks as RawTask[], "Sophos", "sophos"),
  ...buildEntries(oktaTasks as RawTask[], "Okta", "okta"),
  ...buildEntries(duoTasks as RawTask[], "Duo Security", "duo"),
  ...buildEntries(fortinetTasks as RawTask[], "Fortinet", "fortinet"),
  ...buildEntries(ciscoTasks as RawTask[], "Cisco", "cisco"),
  ...buildEntries(netappTasks as RawTask[], "NetApp", "netapp"),
  ...buildEntries(jamfTasks as RawTask[], "JAMF", "jamf"),
  ...buildEntries(slackTasks as RawTask[], "Slack", "slack"),
  ...buildEntries(zoomTasks as RawTask[], "Zoom", "zoom"),
  ...buildEntries(githubTasks as RawTask[], "GitHub", "github"),
  ...buildEntries(splunkTasks as RawTask[], "Splunk", "splunk"),
  ...buildEntries(dockerTasks as RawTask[], "Docker", "docker"),
  ...buildEntries(jiraTasks as RawTask[], "Jira", "jira"),
  ...buildEntries(salesforceTasks as RawTask[], "Salesforce", "salesforce"),
  ...buildEntries(sqlServerTasks as RawTask[], "SQL Server", "sql-server"),
];

// ── Public API ────────────────────────────────────────────────────────────────

/** Return all unique platform names (sorted). */
export function getPlatforms(): Array<{ id: string; name: string; taskCount: number }> {
  const map = new Map<string, { id: string; name: string; taskCount: number }>();
  for (const t of registry) {
    const existing = map.get(t.platformId);
    if (existing) {
      existing.taskCount += 1;
    } else {
      map.set(t.platformId, { id: t.platformId, name: t.platform, taskCount: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Search tasks by keyword, platform, or category. */
export function searchTasks(opts: {
  search?: string;
  platformId?: string;
  category?: string;
  freeOnly?: boolean;
  limit?: number;
  offset?: number;
}): { tasks: TaskSummary[]; total: number } {
  let results = registry as TaskRegistryEntry[];

  if (opts.platformId) {
    results = results.filter(t => t.platformId === opts.platformId);
  }
  if (opts.category) {
    const catLower = opts.category.toLowerCase();
    results = results.filter(t => (t.category ?? "").toLowerCase().includes(catLower));
  }
  if (opts.freeOnly) {
    results = results.filter(t => !t.isPremium);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    results = results.filter(
      t =>
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.platform ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q),
    );
  }

  const total = results.length;
  const offset = opts.offset ?? 0;
  const limit = Math.min(opts.limit ?? 20, 100);
  const page = results.slice(offset, offset + limit);

  const tasks: TaskSummary[] = page.map(t => ({
    id: t.id,
    name: t.name,
    platform: t.platform,
    platformId: t.platformId,
    category: t.category,
    description: t.description,
    isPremium: t.isPremium,
    parameterCount: t.parameters.length,
  }));

  return { tasks, total };
}

/** Look up a single task by ID (returns full entry including parameter definitions). */
export function getTaskById(id: string): TaskRegistryEntry | undefined {
  return registry.find(t => t.id === id);
}

/** Total number of tasks in the registry. */
export function getTaskCount(): number {
  return registry.length;
}
