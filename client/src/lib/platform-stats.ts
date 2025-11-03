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

export function getPlatformStats() {
  // Count total tasks across all libraries
  const totalTasks = 
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
    servicesTasks.length;

  // Count total platforms (23 total: 16 premium + 7 free)
  const totalPlatforms = 23;

  // Premium task count (all tasks except free tier Windows management)
  const freeTierTasks = 
    eventLogTasks.length +
    fileSystemTasks.length +
    networkingTasks.length +
    processManagementTasks.length +
    registryTasks.length +
    securityManagementTasks.length +
    servicesTasks.length;

  const premiumTasks = totalTasks - freeTierTasks;

  return {
    totalTasks,
    totalCategories: totalPlatforms,
    premiumTasks,
    freeTierTasks,
  };
}
