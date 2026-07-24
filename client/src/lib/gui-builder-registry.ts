import { adTasks } from "@/lib/ad-tasks";
import { awsTasks } from "@/lib/aws-tasks";
import { azureAdTasks } from "@/lib/azure-ad-tasks";
import { azureResourceTasks } from "@/lib/azure-resources-tasks";
import { chocolateyTasks } from "@/lib/chocolatey-tasks";
import { ciscoTasks } from "@/lib/cisco-tasks";
import { citrixTasks } from "@/lib/citrix-tasks";
import { connectwiseTasks } from "@/lib/connectwise-tasks";
import { crowdstrikeTasks } from "@/lib/crowdstrike-tasks";
import { dockerTasks } from "@/lib/docker-tasks";
import { duoTasks } from "@/lib/duo-tasks";
import { eventLogTasks } from "@/lib/event-log-tasks";
import { exchangeOnlineTasks } from "@/lib/exchange-online-tasks";
import { exchangeServerTasks } from "@/lib/exchange-server-tasks";
import { fileSystemTasks } from "@/lib/file-system-tasks";
import { fortinetTasks } from "@/lib/fortinet-tasks";
import { gcpTasks } from "@/lib/gcp-tasks";
import { githubTasks } from "@/lib/github-tasks";
import { hyperVTasks } from "@/lib/hyper-v-tasks";
import { intuneTasks } from "@/lib/intune-tasks";
import { jamfTasks } from "@/lib/jamf-tasks";
import { jiraTasks } from "@/lib/jira-tasks";
import { mecmTasks } from "@/lib/mecm-tasks";
import { netappTasks } from "@/lib/netapp-tasks";
import { networkingTasks } from "@/lib/networking-tasks";
import { nutanixTasks } from "@/lib/nutanix-tasks";
import { office365Tasks } from "@/lib/office365-tasks";
import { oktaTasks } from "@/lib/okta-tasks";
import { oneDriveTasks } from "@/lib/onedrive-tasks";
import { pdqTasks } from "@/lib/pdq-tasks";
import { powerPlatformTasks } from "@/lib/power-platform-tasks";
import { processManagementTasks } from "@/lib/process-management-tasks";
import { registryTasks } from "@/lib/registry-tasks";
import { salesforceTasks } from "@/lib/salesforce-tasks";
import { securityManagementTasks } from "@/lib/security-management-tasks";
import { servicesTasks } from "@/lib/services-tasks";
import { servicenowTasks } from "@/lib/servicenow-tasks";
import { sharePointOnlineTasks } from "@/lib/sharepoint-online-tasks";
import { sharePointOnPremTasks } from "@/lib/sharepoint-onprem-tasks";
import { slackTasks } from "@/lib/slack-tasks";
import { sophosTasks } from "@/lib/sophos-tasks";
import { splunkTasks } from "@/lib/splunk-tasks";
import { sqlServerTasks } from "@/lib/sql-server-tasks";
import { teamsTasks } from "@/lib/teams-tasks";
import { veeamTasks } from "@/lib/veeam-tasks";
import { vmwareTasks } from "@/lib/vmware-tasks";
import { windows365Tasks } from "@/lib/windows365-tasks";
import { windowsServerTasks } from "@/lib/windows-server-tasks";
import { zoomTasks } from "@/lib/zoom-tasks";

export type GuiBuilderTask = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
};

export type GuiBuilderPlatform = {
  id: string;
  name: string;
  isPremium?: boolean;
  tasks: GuiBuilderTask[];
};

const premiumPlatformIds = new Set([
  "exchange-online",
  "azure-ad",
  "azure-resources",
  "sharepoint-online",
  "sharepoint-onprem",
  "mecm",
  "exchange-server",
  "hyper-v",
  "intune",
  "power-platform",
  "teams",
  "office365",
  "onedrive",
  "windows365",
  "windows-server",
]);

export const guiBuilderPlatforms: GuiBuilderPlatform[] = [
  { id: "file-system", name: "File System", tasks: fileSystemTasks },
  { id: "network", name: "Network", tasks: networkingTasks },
  { id: "services", name: "Services", tasks: servicesTasks },
  { id: "process-management", name: "Process Management", tasks: processManagementTasks },
  { id: "event-logs", name: "Event Logs", tasks: eventLogTasks },
  { id: "active-directory", name: "Active Directory", tasks: adTasks },
  { id: "registry", name: "Registry", tasks: registryTasks },
  { id: "security", name: "Security", tasks: securityManagementTasks },
  { id: "exchange-online", name: "Exchange Online", tasks: exchangeOnlineTasks },
  { id: "azure-ad", name: "Azure AD", tasks: azureAdTasks },
  { id: "azure-resources", name: "Azure Resources", tasks: azureResourceTasks },
  { id: "sharepoint-online", name: "SharePoint Online", tasks: sharePointOnlineTasks },
  { id: "sharepoint-onprem", name: "SharePoint On-Prem", tasks: sharePointOnPremTasks },
  { id: "mecm", name: "MECM", tasks: mecmTasks },
  { id: "exchange-server", name: "Exchange Server", tasks: exchangeServerTasks },
  { id: "hyper-v", name: "Hyper-V", tasks: hyperVTasks },
  { id: "intune", name: "Intune", tasks: intuneTasks },
  { id: "power-platform", name: "Power Platform", tasks: powerPlatformTasks },
  { id: "teams", name: "Microsoft Teams", tasks: teamsTasks },
  { id: "office365", name: "Office 365", tasks: office365Tasks },
  { id: "onedrive", name: "OneDrive", tasks: oneDriveTasks },
  { id: "windows365", name: "Windows 365", tasks: windows365Tasks },
  { id: "windows-server", name: "Windows Server", tasks: windowsServerTasks },
  { id: "vmware", name: "VMware", tasks: vmwareTasks },
  { id: "veeam", name: "Veeam", tasks: veeamTasks },
  { id: "nutanix", name: "Nutanix", tasks: nutanixTasks },
  { id: "citrix", name: "Citrix", tasks: citrixTasks },
  { id: "pdq", name: "PDQ", tasks: pdqTasks },
  { id: "chocolatey", name: "Chocolatey", tasks: chocolateyTasks },
  { id: "servicenow", name: "ServiceNow", tasks: servicenowTasks },
  { id: "connectwise", name: "ConnectWise", tasks: connectwiseTasks },
  { id: "aws", name: "AWS", tasks: awsTasks },
  { id: "gcp", name: "Google Cloud", tasks: gcpTasks },
  { id: "crowdstrike", name: "CrowdStrike", tasks: crowdstrikeTasks },
  { id: "sophos", name: "Sophos", tasks: sophosTasks },
  { id: "okta", name: "Okta", tasks: oktaTasks },
  { id: "duo", name: "Duo", tasks: duoTasks },
  { id: "fortinet", name: "Fortinet", tasks: fortinetTasks },
  { id: "cisco", name: "Cisco", tasks: ciscoTasks },
  { id: "netapp", name: "NetApp", tasks: netappTasks },
  { id: "jamf", name: "JAMF", tasks: jamfTasks },
  { id: "slack", name: "Slack", tasks: slackTasks },
  { id: "zoom", name: "Zoom", tasks: zoomTasks },
  { id: "github", name: "GitHub", tasks: githubTasks },
  { id: "splunk", name: "Splunk", tasks: splunkTasks },
  { id: "docker", name: "Docker", tasks: dockerTasks },
  { id: "jira", name: "Jira", tasks: jiraTasks },
  { id: "salesforce", name: "Salesforce", tasks: salesforceTasks },
  { id: "sql-server", name: "SQL Server", tasks: sqlServerTasks },
].map((platform) => ({
  ...platform,
  isPremium: premiumPlatformIds.has(platform.id),
}));

export function getGuiBuilderPlatform(platformId?: string | null) {
  if (!platformId) {
    return null;
  }

  return guiBuilderPlatforms.find((platform) => platform.id === platformId) || null;
}

export function getGuiBuilderTasks(platformId?: string | null): GuiBuilderTask[] {
  return getGuiBuilderPlatform(platformId)?.tasks || [];
}

export function getGuiBuilderTask(platformId: string | null | undefined, taskId: string) {
  return getGuiBuilderTasks(platformId).find((task) => task.id === taskId) || null;
}

export function getGuiBuilderTaskLabel(task: GuiBuilderTask) {
  return task.name || task.title || task.id;
}
