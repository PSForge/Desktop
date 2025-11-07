// Dynamic platform and task statistics
import { adTasks } from './ad-tasks';
import { azureAdTasks } from './azure-ad-tasks';
import { azureResourceTasks } from './azure-resources-tasks';
import { exchangeOnlineTasks } from './exchange-online-tasks';
import { exchangeServerTasks } from './exchange-server-tasks';
import { hyperVTasks } from './hyper-v-tasks';
import { intuneTasks } from './intune-tasks';
import { mecmTasks } from './mecm-tasks';
import { teamsTasks } from './teams-tasks';
import { office365Tasks } from './office365-tasks';
import { oneDriveTasks } from './onedrive-tasks';
import { sharePointOnlineTasks } from './sharepoint-online-tasks';
import { sharePointOnPremTasks } from './sharepoint-onprem-tasks';
import { windows365Tasks } from './windows365-tasks';
import { windowsServerTasks } from './windows-server-tasks';
import { powerPlatformTasks } from './power-platform-tasks';
import { eventLogTasks } from './event-log-tasks';
import { fileSystemTasks } from './file-system-tasks';
import { networkingTasks } from './networking-tasks';
import { processManagementTasks } from './process-management-tasks';
import { registryTasks } from './registry-tasks';
import { securityManagementTasks } from './security-management-tasks';
import { servicesTasks } from './services-tasks';

// Version 3.0 Enterprise Platform Tasks (All Pro-tier)
import { vmwareTasks } from './vmware-tasks';
import { veeamTasks } from './veeam-tasks';
import { nutanixTasks } from './nutanix-tasks';
import { citrixTasks } from './citrix-tasks';
import { pdqTasks } from './pdq-tasks';
import { chocolateyTasks } from './chocolatey-tasks';
import { servicenowTasks } from './servicenow-tasks';
import { connectwiseTasks } from './connectwise-tasks';
import { awsTasks } from './aws-tasks';
import { gcpTasks } from './gcp-tasks';
import { crowdstrikeTasks } from './crowdstrike-tasks';
import { sophosTasks } from './sophos-tasks';
import { oktaTasks } from './okta-tasks';
import { duoTasks } from './duo-tasks';
import { fortinetTasks } from './fortinet-tasks';
import { ciscoTasks } from './cisco-tasks';
import { netappTasks } from './netapp-tasks';
import { jamfTasks } from './jamf-tasks';
import { slackTasks } from './slack-tasks';
import { zoomTasks } from './zoom-tasks';
import { githubTasks } from './github-tasks';
import { splunkTasks } from './splunk-tasks';
import { dockerTasks } from './docker-tasks';
import { jiraTasks } from './jira-tasks';
import { salesforceTasks } from './salesforce-tasks';

export function getPlatformStats() {
  // Count total tasks across all libraries (Version 2.0 + 3.0)
  const totalTasks = 
    // Version 2.0 - Original 23 platforms (506 tasks)
    adTasks.length +
    azureAdTasks.length +
    azureResourceTasks.length +
    exchangeOnlineTasks.length +
    exchangeServerTasks.length +
    hyperVTasks.length +
    intuneTasks.length +
    mecmTasks.length +
    teamsTasks.length +
    office365Tasks.length +
    oneDriveTasks.length +
    sharePointOnlineTasks.length +
    sharePointOnPremTasks.length +
    windows365Tasks.length +
    windowsServerTasks.length +
    powerPlatformTasks.length +
    eventLogTasks.length +
    fileSystemTasks.length +
    networkingTasks.length +
    processManagementTasks.length +
    registryTasks.length +
    securityManagementTasks.length +
    servicesTasks.length +
    // Version 3.0 - New 25 enterprise platforms (All Pro-tier)
    vmwareTasks.length +
    veeamTasks.length +
    nutanixTasks.length +
    citrixTasks.length +
    pdqTasks.length +
    chocolateyTasks.length +
    servicenowTasks.length +
    connectwiseTasks.length +
    awsTasks.length +
    gcpTasks.length +
    crowdstrikeTasks.length +
    sophosTasks.length +
    oktaTasks.length +
    duoTasks.length +
    fortinetTasks.length +
    ciscoTasks.length +
    netappTasks.length +
    jamfTasks.length +
    slackTasks.length +
    zoomTasks.length +
    githubTasks.length +
    splunkTasks.length +
    dockerTasks.length +
    jiraTasks.length +
    salesforceTasks.length;

  // Count total platforms (48 total: 41 premium + 7 free)
  const totalPlatforms = 48;

  // Free tier tasks (Windows management only - 7 categories)
  const freeTierTasks = 
    eventLogTasks.length +
    fileSystemTasks.length +
    networkingTasks.length +
    processManagementTasks.length +
    registryTasks.length +
    securityManagementTasks.length +
    servicesTasks.length;

  // Premium task count (all v2.0 Microsoft + all v3.0 enterprise platforms)
  const premiumTasks = totalTasks - freeTierTasks;

  // Version 3.0 specific counts (all premium)
  const v3Tasks = 
    vmwareTasks.length +
    veeamTasks.length +
    nutanixTasks.length +
    citrixTasks.length +
    pdqTasks.length +
    chocolateyTasks.length +
    servicenowTasks.length +
    connectwiseTasks.length +
    awsTasks.length +
    gcpTasks.length +
    crowdstrikeTasks.length +
    sophosTasks.length +
    oktaTasks.length +
    duoTasks.length +
    fortinetTasks.length +
    ciscoTasks.length +
    netappTasks.length +
    jamfTasks.length +
    slackTasks.length +
    zoomTasks.length +
    githubTasks.length +
    splunkTasks.length +
    dockerTasks.length +
    jiraTasks.length +
    salesforceTasks.length;

  return {
    totalTasks,
    totalCategories: totalPlatforms,
    premiumTasks,
    freeTierTasks,
    v3Tasks,
    v3Platforms: 25,
  };
}
