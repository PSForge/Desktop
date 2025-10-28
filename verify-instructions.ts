// Verification script to check all tasks have complete instructions
import * as fs from 'fs';
import * as path from 'path';

const requiredSections = [
  'How This Task Works:',
  'Prerequisites:',
  'What You Need to Provide:',
  'What the Script Does:',
  'Important Notes:'
];

interface TaskFile {
  file: string;
  exportName: string;
}

const taskFiles: TaskFile[] = [
  { file: 'client/src/lib/active-directory-tasks.ts', exportName: 'activeDirectoryTasks' },
  { file: 'client/src/lib/azure-ad-tasks.ts', exportName: 'azureADTasks' },
  { file: 'client/src/lib/azure-resources-tasks.ts', exportName: 'azureResourcesTasks' },
  { file: 'client/src/lib/event-log-tasks.ts', exportName: 'eventLogTasks' },
  { file: 'client/src/lib/exchange-online-tasks.ts', exportName: 'exchangeOnlineTasks' },
  { file: 'client/src/lib/exchange-server-tasks.ts', exportName: 'exchangeServerTasks' },
  { file: 'client/src/lib/file-system-tasks.ts', exportName: 'fileSystemTasks' },
  { file: 'client/src/lib/hyper-v-tasks.ts', exportName: 'hyperVTasks' },
  { file: 'client/src/lib/intune-tasks.ts', exportName: 'intuneTasks' },
  { file: 'client/src/lib/mecm-tasks.ts', exportName: 'mecmTasks' },
  { file: 'client/src/lib/microsoft-teams-tasks.ts', exportName: 'microsoftTeamsTasks' },
  { file: 'client/src/lib/networking-tasks.ts', exportName: 'networkingTasks' },
  { file: 'client/src/lib/onedrive-tasks.ts', exportName: 'oneDriveTasks' },
  { file: 'client/src/lib/power-platform-tasks.ts', exportName: 'powerPlatformTasks' },
  { file: 'client/src/lib/process-management-tasks.ts', exportName: 'processManagementTasks' },
  { file: 'client/src/lib/registry-tasks.ts', exportName: 'registryTasks' },
  { file: 'client/src/lib/security-management-tasks.ts', exportName: 'securityManagementTasks' },
  { file: 'client/src/lib/services-tasks.ts', exportName: 'servicesTasks' },
  { file: 'client/src/lib/sharepoint-online-tasks.ts', exportName: 'sharePointOnlineTasks' },
  { file: 'client/src/lib/sharepoint-onpremises-tasks.ts', exportName: 'sharePointOnPremisesTasks' },
  { file: 'client/src/lib/windows-server-tasks.ts', exportName: 'windowsServerTasks' },
];

async function verifyInstructions() {
  let totalTasks = 0;
  let tasksWithInstructions = 0;
  let tasksWithoutInstructions = 0;
  const missingInstructions: Array<{file: string, taskId: string, taskName: string, missingSections: string[]}> = [];

  for (const taskFile of taskFiles) {
    try {
      const module = await import(path.resolve(taskFile.file));
      const tasks = module[taskFile.exportName] || [];
      
      console.log(`\n📁 Checking ${taskFile.file} (${tasks.length} tasks)`);
      
      for (const task of tasks) {
        totalTasks++;
        
        if (!task.instructions || task.instructions.trim() === '') {
          tasksWithoutInstructions++;
          missingInstructions.push({
            file: taskFile.file,
            taskId: task.id,
            taskName: task.name,
            missingSections: ['ALL - No instructions field']
          });
          console.log(`  ❌ ${task.id}: ${task.name} - NO INSTRUCTIONS`);
        } else {
          const missingSections = requiredSections.filter(section => 
            !task.instructions.includes(section)
          );
          
          if (missingSections.length > 0) {
            tasksWithoutInstructions++;
            missingInstructions.push({
              file: taskFile.file,
              taskId: task.id,
              taskName: task.name,
              missingSections
            });
            console.log(`  ⚠️  ${task.id}: ${task.name} - Missing sections: ${missingSections.join(', ')}`);
          } else {
            tasksWithInstructions++;
            console.log(`  ✅ ${task.id}: ${task.name}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading ${taskFile.file}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tasks: ${totalTasks}`);
  console.log(`Tasks with complete instructions: ${tasksWithInstructions}`);
  console.log(`Tasks missing instructions: ${tasksWithoutInstructions}`);
  console.log(`Completion rate: ${((tasksWithInstructions / totalTasks) * 100).toFixed(1)}%`);
  
  if (missingInstructions.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('TASKS MISSING INSTRUCTIONS:');
    console.log('='.repeat(80));
    
    const byFile = missingInstructions.reduce((acc, item) => {
      if (!acc[item.file]) acc[item.file] = [];
      acc[item.file].push(item);
      return acc;
    }, {} as Record<string, typeof missingInstructions>);
    
    for (const [file, tasks] of Object.entries(byFile)) {
      console.log(`\n${file}:`);
      for (const task of tasks) {
        console.log(`  - ${task.taskId}: ${task.taskName}`);
        console.log(`    Missing: ${task.missingSections.join(', ')}`);
      }
    }
  } else {
    console.log('\n🎉 ALL TASKS HAVE COMPLETE INSTRUCTIONS! 🎉');
  }
  
  return missingInstructions;
}

verifyInstructions().catch(console.error);
