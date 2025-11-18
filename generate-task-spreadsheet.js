// Script to generate a comprehensive task spreadsheet for PSForge
// This exports all tasks to a CSV file

import { fileSystemTasks } from './client/src/lib/file-system-tasks.ts';
import { networkingTasks } from './client/src/lib/networking-tasks.ts';
import { servicesTasks } from './client/src/lib/services-tasks.ts';
import { processManagementTasks } from './client/src/lib/process-management-tasks.ts';
import { eventLogTasks } from './client/src/lib/event-log-tasks.ts';
import { adTasks } from './client/src/lib/ad-tasks.ts';
import { registryTasks } from './client/src/lib/registry-tasks.ts';
import { securityManagementTasks } from './client/src/lib/security-management-tasks.ts';
import { exchangeOnlineTasks } from './client/src/lib/exchange-online-tasks.ts';
import { azureAdTasks } from './client/src/lib/azure-ad-tasks.ts';
import { azureResourceTasks } from './client/src/lib/azure-resources-tasks.ts';
import { sharePointOnlineTasks } from './client/src/lib/sharepoint-online-tasks.ts';
import { sharePointOnPremTasks } from './client/src/lib/sharepoint-onprem-tasks.ts';
import { mecmTasks } from './client/src/lib/mecm-tasks.ts';
import { exchangeServerTasks } from './client/src/lib/exchange-server-tasks.ts';
import { hyperVTasks } from './client/src/lib/hyper-v-tasks.ts';
import { intuneTasks } from './client/src/lib/intune-tasks.ts';
import { powerPlatformTasks } from './client/src/lib/power-platform-tasks.ts';
import { teamsTasks } from './client/src/lib/teams-tasks.ts';
import { office365Tasks } from './client/src/lib/office365-tasks.ts';
import { oneDriveTasks } from './client/src/lib/onedrive-tasks.ts';
import { windows365Tasks } from './client/src/lib/windows365-tasks.ts';
import { windowsServerTasks } from './client/src/lib/windows-server-tasks.ts';
import { vmwareTasks } from './client/src/lib/vmware-tasks.ts';
import { veeamTasks } from './client/src/lib/veeam-tasks.ts';
import { nutanixTasks } from './client/src/lib/nutanix-tasks.ts';
import { citrixTasks } from './client/src/lib/citrix-tasks.ts';
import { pdqTasks } from './client/src/lib/pdq-tasks.ts';
import { chocolateyTasks } from './client/src/lib/chocolatey-tasks.ts';
import { servicenowTasks } from './client/src/lib/servicenow-tasks.ts';
import { connectwiseTasks } from './client/src/lib/connectwise-tasks.ts';
import { awsTasks } from './client/src/lib/aws-tasks.ts';
import { gcpTasks } from './client/src/lib/gcp-tasks.ts';
import { crowdstrikeTasks } from './client/src/lib/crowdstrike-tasks.ts';
import { sophosTasks } from './client/src/lib/sophos-tasks.ts';
import { oktaTasks } from './client/src/lib/okta-tasks.ts';
import { duoTasks } from './client/src/lib/duo-tasks.ts';
import { fortinetTasks } from './client/src/lib/fortinet-tasks.ts';
import { ciscoTasks } from './client/src/lib/cisco-tasks.ts';
import { netappTasks } from './client/src/lib/netapp-tasks.ts';
import { jamfTasks } from './client/src/lib/jamf-tasks.ts';
import { slackTasks } from './client/src/lib/slack-tasks.ts';
import { zoomTasks } from './client/src/lib/zoom-tasks.ts';
import { githubTasks } from './client/src/lib/github-tasks.ts';
import { splunkTasks } from './client/src/lib/splunk-tasks.ts';
import { dockerTasks } from './client/src/lib/docker-tasks.ts';
import { jiraTasks } from './client/src/lib/jira-tasks.ts';
import { salesforceTasks } from './client/src/lib/salesforce-tasks.ts';
import { writeFileSync } from 'fs';

const platforms = [
  // Free tier platforms
  { name: 'File System', tier: 'Free', tasks: fileSystemTasks },
  { name: 'Network', tier: 'Free', tasks: networkingTasks },
  { name: 'Services', tier: 'Free', tasks: servicesTasks },
  { name: 'Process Management', tier: 'Free', tasks: processManagementTasks },
  { name: 'Event Logs', tier: 'Free', tasks: eventLogTasks },
  { name: 'Active Directory', tier: 'Free', tasks: adTasks },
  { name: 'Registry', tier: 'Free', tasks: registryTasks },
  { name: 'Security', tier: 'Free', tasks: securityManagementTasks },
  // Pro tier platforms
  { name: 'Exchange Online', tier: 'Pro', tasks: exchangeOnlineTasks },
  { name: 'Azure AD', tier: 'Pro', tasks: azureAdTasks },
  { name: 'Azure Resources', tier: 'Pro', tasks: azureResourceTasks },
  { name: 'SharePoint Online', tier: 'Pro', tasks: sharePointOnlineTasks },
  { name: 'SharePoint On-Prem', tier: 'Pro', tasks: sharePointOnPremTasks },
  { name: 'MECM', tier: 'Pro', tasks: mecmTasks },
  { name: 'Exchange Server', tier: 'Pro', tasks: exchangeServerTasks },
  { name: 'Hyper-V', tier: 'Pro', tasks: hyperVTasks },
  { name: 'Intune', tier: 'Pro', tasks: intuneTasks },
  { name: 'Power Platform', tier: 'Pro', tasks: powerPlatformTasks },
  { name: 'Microsoft Teams', tier: 'Pro', tasks: teamsTasks },
  { name: 'Office 365', tier: 'Pro', tasks: office365Tasks },
  { name: 'OneDrive', tier: 'Pro', tasks: oneDriveTasks },
  { name: 'Windows 365', tier: 'Pro', tasks: windows365Tasks },
  { name: 'Windows Server', tier: 'Pro', tasks: windowsServerTasks },
  { name: 'VMware vSphere', tier: 'Pro', tasks: vmwareTasks },
  { name: 'Veeam Backup', tier: 'Pro', tasks: veeamTasks },
  { name: 'Nutanix AHV', tier: 'Pro', tasks: nutanixTasks },
  { name: 'Citrix Virtual Apps', tier: 'Pro', tasks: citrixTasks },
  { name: 'PDQ Deploy/Inventory', tier: 'Pro', tasks: pdqTasks },
  { name: 'Chocolatey/WinGet', tier: 'Pro', tasks: chocolateyTasks },
  { name: 'ServiceNow', tier: 'Pro', tasks: servicenowTasks },
  { name: 'ConnectWise', tier: 'Pro', tasks: connectwiseTasks },
  { name: 'Amazon AWS', tier: 'Pro', tasks: awsTasks },
  { name: 'Google Cloud', tier: 'Pro', tasks: gcpTasks },
  { name: 'CrowdStrike Falcon', tier: 'Pro', tasks: crowdstrikeTasks },
  { name: 'Sophos Central', tier: 'Pro', tasks: sophosTasks },
  { name: 'Okta', tier: 'Pro', tasks: oktaTasks },
  { name: 'Duo Security', tier: 'Pro', tasks: duoTasks },
  { name: 'Fortinet FortiGate', tier: 'Pro', tasks: fortinetTasks },
  { name: 'Cisco Meraki', tier: 'Pro', tasks: ciscoTasks },
  { name: 'NetApp ONTAP', tier: 'Pro', tasks: netappTasks },
  { name: 'JAMF Pro', tier: 'Pro', tasks: jamfTasks },
  { name: 'Slack', tier: 'Pro', tasks: slackTasks },
  { name: 'Zoom', tier: 'Pro', tasks: zoomTasks },
  { name: 'GitHub/GitLab', tier: 'Pro', tasks: githubTasks },
  { name: 'Splunk/Datadog', tier: 'Pro', tasks: splunkTasks },
  { name: 'Docker/Kubernetes', tier: 'Pro', tasks: dockerTasks },
  { name: 'Jira/Confluence', tier: 'Pro', tasks: jiraTasks },
  { name: 'Salesforce', tier: 'Pro', tasks: salesforceTasks },
];

// CSV Header
let csv = 'Platform,Tier,Task ID,Task Name,Category,Description,Premium Task\n';

let totalTasks = 0;
let freeTasks = 0;
let premiumTasks = 0;

// Extract task data
platforms.forEach(platform => {
  platform.tasks.forEach(task => {
    const taskId = task.id || '';
    const taskName = (task.name || task.title || '').replace(/"/g, '""');
    const category = (task.category || '').replace(/"/g, '""');
    const description = (task.description || '').replace(/"/g, '""');
    const isPremium = task.isPremium ? 'Yes' : 'No';
    
    csv += `"${platform.name}","${platform.tier}","${taskId}","${taskName}","${category}","${description}","${isPremium}"\n`;
    
    totalTasks++;
    if (task.isPremium) {
      premiumTasks++;
    } else {
      freeTasks++;
    }
  });
});

// Write to file
writeFileSync('PSForge_Tasks_Inventory.csv', csv);

console.log(`✓ Spreadsheet generated: PSForge_Tasks_Inventory.csv`);
console.log(`Total Platforms: ${platforms.length}`);
console.log(`Total Tasks: ${totalTasks}`);
console.log(`Free Tasks: ${freeTasks}`);
console.log(`Premium Tasks: ${premiumTasks}`);
