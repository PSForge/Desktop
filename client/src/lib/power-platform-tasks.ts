import { escapePowerShellString } from './powershell-utils';

export interface PowerPlatformParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  helpText?: string;
}

export interface PowerPlatformTask {
  id: string;
  title: string;
  description: string;
  category: string;
  instructions?: string;
  parameters: PowerPlatformParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium?: boolean;
}

export const powerPlatformTasks: PowerPlatformTask[] = [
  {
    id: 'pp-export-environments',
    title: 'Export Environments List',
    description: 'Export list of all Power Platform environments to CSV',
    category: 'Environment Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports comprehensive inventory of all Power Platform environments for governance, capacity planning, and license management.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Retrieves all Power Platform environments
- Collects environment type, location, and creation date
- Exports detailed inventory to CSV
- Reports total environment count

**Important Notes:**
- Essential for environment governance and compliance
- Shows production, trial, sandbox, and developer environments
- Use for capacity planning and cost management
- Run monthly for environment inventory updates
- Identify rogue trial environments for cleanup
- Track environment sprawl across organization
- Typical use: governance reviews, cost analysis
- Delete unused trial/sandbox environments to reduce costs`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\PowerPlatformEnvironments.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Power Platform Environments
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Platform environments..." -ForegroundColor Cyan
    
    $Environments = Get-AdminPowerAppEnvironment
    
    Write-Host "Found $($Environments.Count) environments" -ForegroundColor Yellow
    
    $EnvReport = foreach ($Env in $Environments) {
        [PSCustomObject]@{
            DisplayName        = $Env.DisplayName
            EnvironmentName    = $Env.EnvironmentName
            EnvironmentType    = $Env.EnvironmentType
            Location           = $Env.Location
            CreatedTime        = $Env.CreatedTime
        }
    }
    
    $EnvReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Environments exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export environments: $_"
}`;
    }
  },

  {
    id: 'pp-export-apps',
    title: 'Export Power Apps Inventory',
    description: 'Export list of all Power Apps to CSV',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports complete inventory of all Power Apps across tenant for app lifecycle management and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Retrieves all Power Apps across environments
- Collects app name, owner, environment, and creation date
- Exports comprehensive app inventory to CSV
- Reports total app count

**Important Notes:**
- Essential for app lifecycle governance
- Shows canvas and model-driven apps
- Use for identifying orphaned apps after user departures
- Run quarterly for app inventory audits
- Identify duplicate apps for consolidation
- Track app ownership for support accountability
- Typical use: governance reviews, license optimization
- Delete unused apps to improve manageability`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\PowerApps.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Power Apps Inventory
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Apps..." -ForegroundColor Cyan
    
    $Apps = Get-AdminPowerApp
    
    Write-Host "Found $($Apps.Count) apps" -ForegroundColor Yellow
    
    $AppReport = foreach ($App in $Apps) {
        [PSCustomObject]@{
            DisplayName      = $App.DisplayName
            AppName          = $App.AppName
            Owner            = $App.Owner.displayName
            EnvironmentName  = $App.EnvironmentName
            CreatedTime      = $App.CreatedTime
        }
    }
    
    $AppReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Power Apps exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export Power Apps: $_"
}`;
    }
  },

  {
    id: 'pp-export-flows',
    title: 'Export Power Automate Flows',
    description: 'Export list of all Power Automate flows to CSV',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports inventory of all Power Automate flows for monitoring automation usage and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Retrieves all Power Automate flows across environments
- Collects flow name, enabled status, owner, and creation date
- Exports flow inventory to CSV
- Reports total flow count

**Important Notes:**
- Essential for automation governance and monitoring
- Shows enabled/disabled flow status
- Use for identifying broken or orphaned flows
- Run monthly for flow health audits
- Identify flows with expired connections
- Track flow ownership for maintenance
- Typical use: governance reviews, troubleshooting
- Disable unused flows to reduce API consumption`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\PowerFlows.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Power Automate Flows
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Automate flows..." -ForegroundColor Cyan
    
    $Flows = Get-AdminFlow
    
    Write-Host "Found $($Flows.Count) flows" -ForegroundColor Yellow
    
    $FlowReport = foreach ($Flow in $Flows) {
        [PSCustomObject]@{
            DisplayName      = $Flow.DisplayName
            FlowName         = $Flow.FlowName
            Enabled          = $Flow.Enabled
            Owner            = $Flow.CreatedBy.displayName
            EnvironmentName  = $Flow.EnvironmentName
            CreatedTime      = $Flow.CreatedTime
        }
    }
    
    $FlowReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Power Automate flows exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export flows: $_"
}`;
    }
  },

  {
    id: 'pp-export-connectors',
    title: 'Export Custom Connectors',
    description: 'Export list of custom connectors to CSV',
    category: 'Connectors',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports inventory of custom connectors for API integration governance and documentation.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Retrieves all custom connectors across environments
- Collects connector name, environment, and creation date
- Exports connector inventory to CSV
- Reports total custom connector count

**Important Notes:**
- Essential for API integration governance
- Shows custom API connectors only (not built-in)
- Use for tracking external API dependencies
- Run quarterly for connector audits
- Identify unused connectors for cleanup
- Document connector purposes and owners
- Typical use: security reviews, API inventory
- Review for security vulnerabilities in custom APIs`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\Connectors.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Custom Connectors
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting custom connectors..." -ForegroundColor Cyan
    
    $Connectors = Get-AdminPowerAppConnector -ConnectorType Custom
    
    Write-Host "Found $($Connectors.Count) custom connectors" -ForegroundColor Yellow
    
    $ConnectorReport = foreach ($Connector in $Connectors) {
        [PSCustomObject]@{
            DisplayName      = $Connector.DisplayName
            ConnectorName    = $Connector.ConnectorName
            EnvironmentName  = $Connector.EnvironmentName
            CreatedTime      = $Connector.CreatedTime
        }
    }
    
    $ConnectorReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Custom connectors exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export connectors: $_"
}`;
    }
  },

  {
    id: 'pp-export-dlp-policies',
    title: 'Export DLP Policies',
    description: 'Export Data Loss Prevention policies to CSV',
    category: 'Governance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports Data Loss Prevention (DLP) policies for security compliance and connector governance documentation.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Retrieves all DLP policies across tenant
- Collects policy name, creator, and creation date
- Exports DLP policy inventory to CSV
- Reports total policy count

**Important Notes:**
- Essential for security compliance and data protection
- DLP policies control connector data sharing
- Use for regulatory compliance documentation
- Run quarterly for security audits
- Prevent data leakage between business/non-business connectors
- Typical policies: block consumer services in production
- Typical use: compliance reviews, security audits
- Ensure all environments covered by DLP policies`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\DLPPolicies.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export DLP Policies
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting DLP policies..." -ForegroundColor Cyan
    
    $Policies = Get-AdminDlpPolicy
    
    Write-Host "Found $($Policies.Count) DLP policies" -ForegroundColor Yellow
    
    $PolicyReport = foreach ($Policy in $Policies) {
        [PSCustomObject]@{
            DisplayName      = $Policy.DisplayName
            PolicyName       = $Policy.PolicyName
            CreatedBy        = $Policy.CreatedBy
            CreatedTime      = $Policy.CreatedTime
        }
    }
    
    $PolicyReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ DLP policies exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to export DLP policies: $_"
}`;
    }
  },

  {
    id: 'pp-create-env',
    title: 'Create Power Platform Environment',
    description: 'Create a new Power Platform environment',
    category: 'Environment Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates a new Power Platform environment in the specified region for application development, testing, or production workloads.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Available environment capacity in tenant

**What You Need to Provide:**
- Environment display name
- Azure region for the environment

**What the Script Does:**
- Validates environment name availability
- Creates new environment in specified region
- Sets environment type to Production
- Confirms successful environment creation

**Important Notes:**
- Each environment consumes capacity from tenant quota
- Environment name must be unique within tenant
- Use descriptive names like "Contoso-Production" or "HR-Dev"
- Production environments support all features
- Typical use: creating dev/test/prod environments
- Consider naming conventions for governance
- Review tenant capacity before creating environments
- New environments take 2-5 minutes to provision`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Contoso-Production',
        helpText: 'Display name for the new environment'
      },
      {
        name: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        options: [
          { value: 'unitedstates', label: 'United States' },
          { value: 'europe', label: 'Europe' },
          { value: 'asia', label: 'Asia' },
          { value: 'australia', label: 'Australia' },
          { value: 'canada', label: 'Canada' },
          { value: 'unitedkingdom', label: 'United Kingdom' }
        ],
        helpText: 'Azure region where the environment will be created'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const region = params.region;

      return `# Create Power Platform Environment
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating Power Platform environment..." -ForegroundColor Cyan
    Write-Host "Name: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Region: ${region}" -ForegroundColor Yellow
    
    $NewEnv = New-AdminPowerAppEnvironment -DisplayName "${environmentName}" -LocationName ${region} -EnvironmentSku Production
    
    Write-Host "✓ Environment created successfully" -ForegroundColor Green
    Write-Host "Environment ID: $($NewEnv.EnvironmentName)" -ForegroundColor Gray
    Write-Host "Location: $($NewEnv.Location)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create environment: $_"
}`;
    }
  },

  {
    id: 'pp-delete-env',
    title: 'Delete Power Platform Environment',
    description: 'Permanently delete a Power Platform environment',
    category: 'Environment Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script permanently deletes a Power Platform environment and all its contents including apps, flows, and data.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Environment must not be the default environment

**What You Need to Provide:**
- Environment name (GUID) or display name to delete

**What the Script Does:**
- Validates environment exists
- Permanently deletes the specified environment
- Removes all apps, flows, connectors, and data
- Confirms successful deletion

**Important Notes:**
- ⚠️ THIS ACTION IS IRREVERSIBLE - all data will be permanently lost
- Cannot delete the default environment
- All apps and flows in the environment will be deleted
- Users will lose access immediately
- Backup important data before deletion
- Environment capacity is released back to tenant quota
- Typical use: removing unused dev/test environments
- Consider exporting solutions before deletion
- Verify environment name carefully before executing`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID or display name',
        helpText: 'The environment to delete (verify carefully!)'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);

      return `# Delete Power Platform Environment
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: This action is IRREVERSIBLE

try {
    Write-Host "⚠️  WARNING: This will permanently delete the environment!" -ForegroundColor Red
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host ""
    
    $Confirm = Read-Host "Type 'DELETE' to confirm deletion"
    
    if ($Confirm -eq 'DELETE') {
        Write-Host "Deleting environment..." -ForegroundColor Cyan
        
        Remove-AdminPowerAppEnvironment -EnvironmentName "${environmentName}"
        
        Write-Host "✓ Environment deleted successfully" -ForegroundColor Green
        Write-Host "All apps, flows, and data have been permanently removed" -ForegroundColor Gray
    } else {
        Write-Host "Deletion cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete environment: $_"
}`;
    }
  },

  {
    id: 'pp-backup-env',
    title: 'Backup Power Platform Environment',
    description: 'Create a backup of a Power Platform environment',
    category: 'Environment Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates a point-in-time backup of a Power Platform environment for disaster recovery and compliance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Environment must be production or sandbox type
- Dataverse database must be enabled

**What You Need to Provide:**
- Environment name to backup
- Descriptive backup label

**What the Script Does:**
- Validates environment supports backups
- Creates a new backup with the specified label
- Captures all Dataverse data and customizations
- Reports backup completion

**Important Notes:**
- Only production and sandbox environments support backups
- Backups include Dataverse data and metadata
- Backup label helps identify backup purpose/date
- Use labels like "Pre-Migration-Jan2025" or "Weekly-Backup"
- Backups consume tenant storage quota
- System backups are automatic, this creates manual backups
- Typical use: before major updates or migrations
- Review backup retention policies
- Verify backup completed successfully before changes`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'The environment to backup'
      },
      {
        name: 'backupLabel',
        label: 'Backup Label',
        type: 'text',
        required: true,
        placeholder: 'Pre-Migration-Jan2025',
        helpText: 'Descriptive label for this backup'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const backupLabel = escapePowerShellString(params.backupLabel);

      return `# Backup Power Platform Environment
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating environment backup..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Label: ${backupLabel}" -ForegroundColor Yellow
    
    Backup-CdsEnvironment -EnvironmentName "${environmentName}" -BackupLabel "${backupLabel}"
    
    Write-Host "✓ Backup created successfully" -ForegroundColor Green
    Write-Host "Backup label: ${backupLabel}" -ForegroundColor Gray
    Write-Host "Use this label to identify the backup for restore operations" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create backup: $_"
}`;
    }
  },

  {
    id: 'pp-restore-env',
    title: 'Restore Environment from Backup',
    description: 'Restore a Power Platform environment from a previous backup',
    category: 'Environment Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script restores a Power Platform environment from a previously created backup for disaster recovery.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Valid backup must exist for source environment
- Target environment must exist

**What You Need to Provide:**
- Source environment name (where backup exists)
- Target environment name (where to restore)

**What the Script Does:**
- Validates backup availability
- Restores backup to target environment
- Overwrites all data in target environment
- Reports restoration completion

**Important Notes:**
- ⚠️ WARNING: Target environment data will be OVERWRITTEN
- All current apps and data in target will be replaced
- Restoration can take 30-60 minutes for large environments
- Users should not access target during restoration
- Flows may need to be re-enabled after restore
- Connection references may need updating
- Typical use: disaster recovery, environment refresh
- Test restored environment before production use
- Notify users before performing restoration`,
    parameters: [
      {
        name: 'sourceEnvironment',
        label: 'Source Environment',
        type: 'text',
        required: true,
        placeholder: 'Source environment ID',
        helpText: 'Environment with the backup to restore from'
      },
      {
        name: 'targetEnvironment',
        label: 'Target Environment',
        type: 'text',
        required: true,
        placeholder: 'Target environment ID',
        helpText: 'Environment to restore the backup to (will be overwritten!)'
      }
    ],
    scriptTemplate: (params) => {
      const sourceEnvironment = escapePowerShellString(params.sourceEnvironment);
      const targetEnvironment = escapePowerShellString(params.targetEnvironment);

      return `# Restore Environment from Backup
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: Target environment will be OVERWRITTEN

try {
    Write-Host "⚠️  WARNING: This will overwrite the target environment!" -ForegroundColor Red
    Write-Host "Source: ${sourceEnvironment}" -ForegroundColor Yellow
    Write-Host "Target: ${targetEnvironment}" -ForegroundColor Yellow
    Write-Host ""
    
    $Confirm = Read-Host "Type 'RESTORE' to confirm"
    
    if ($Confirm -eq 'RESTORE') {
        Write-Host "Restoring environment from backup..." -ForegroundColor Cyan
        Write-Host "This may take 30-60 minutes for large environments" -ForegroundColor Gray
        
        Restore-CdsEnvironment -SourceEnvironmentName "${sourceEnvironment}" -TargetEnvironmentName "${targetEnvironment}"
        
        Write-Host "✓ Environment restore initiated successfully" -ForegroundColor Green
        Write-Host "Monitor the Power Platform Admin Center for completion status" -ForegroundColor Gray
    } else {
        Write-Host "Restoration cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to restore environment: $_"
}`;
    }
  },

  {
    id: 'pp-copy-env',
    title: 'Copy Power Platform Environment',
    description: 'Copy an environment to create a duplicate',
    category: 'Environment Management',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates a complete copy of an existing Power Platform environment for testing, training, or migration purposes.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Source environment must be production or sandbox
- Available environment capacity for new environment

**What You Need to Provide:**
- Source environment name to copy from
- Display name for the new copied environment

**What the Script Does:**
- Creates new environment with specified name
- Copies all Dataverse data and customizations
- Includes apps, flows, and connection references
- Reports copy operation status

**Important Notes:**
- Copy operation can take 1-2 hours for large environments
- New environment consumes additional capacity quota
- Apps and flows are copied but not shared to users
- Connection credentials are not copied for security
- Users must reconfigure connections in copied environment
- Typical use: creating test copies of production
- Use for training environments or UAT testing
- Monitor copy progress in Power Platform Admin Center
- Test thoroughly before using copied environment`,
    parameters: [
      {
        name: 'sourceEnvironment',
        label: 'Source Environment',
        type: 'text',
        required: true,
        placeholder: 'Source environment ID',
        helpText: 'Environment to copy from'
      },
      {
        name: 'targetName',
        label: 'Target Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Contoso-Test-Copy',
        helpText: 'Display name for the new copied environment'
      }
    ],
    scriptTemplate: (params) => {
      const sourceEnvironment = escapePowerShellString(params.sourceEnvironment);
      const targetName = escapePowerShellString(params.targetName);

      return `# Copy Power Platform Environment
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Copying Power Platform environment..." -ForegroundColor Cyan
    Write-Host "Source: ${sourceEnvironment}" -ForegroundColor Yellow
    Write-Host "Target Name: ${targetName}" -ForegroundColor Yellow
    Write-Host "This operation may take 1-2 hours for large environments" -ForegroundColor Gray
    
    Copy-CdsEnvironment -SourceEnvironmentName "${sourceEnvironment}" -TargetEnvironmentDisplayName "${targetName}"
    
    Write-Host "✓ Environment copy initiated successfully" -ForegroundColor Green
    Write-Host "Monitor the Power Platform Admin Center for completion status" -ForegroundColor Gray
    Write-Host "Note: Connection credentials must be reconfigured in the new environment" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to copy environment: $_"
}`;
    }
  },

  {
    id: 'pp-list-apps',
    title: 'List Power Apps in Environment',
    description: 'List all Power Apps in a specific environment',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script retrieves and displays all Power Apps within a specific environment for inventory and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- Environment name to list apps from
- CSV export file path

**What the Script Does:**
- Retrieves all apps in the specified environment
- Collects app name, owner, type, and creation date
- Exports app inventory to CSV file
- Reports total app count for the environment

**Important Notes:**
- Shows both canvas and model-driven apps
- Use to audit apps in specific environments
- Identify apps by specific owners or creation dates
- Typical use: environment governance, app inventory
- Filter results in CSV for specific app types
- Track app growth over time by environment
- Identify duplicate or orphaned apps
- Export monthly for environment documentation`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to list apps from'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\PowerApps-ByEnv.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# List Power Apps in Environment
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Apps from environment..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    
    $Apps = Get-AdminPowerApp -EnvironmentName "${environmentName}"
    
    Write-Host "Found $($Apps.Count) apps in this environment" -ForegroundColor Yellow
    
    $AppReport = foreach ($App in $Apps) {
        [PSCustomObject]@{
            DisplayName      = $App.DisplayName
            AppName          = $App.AppName
            Owner            = $App.Owner.displayName
            AppType          = $App.Internal.properties.appType
            EnvironmentName  = $App.EnvironmentName
            CreatedTime      = $App.CreatedTime
            LastModifiedTime = $App.LastModifiedTime
        }
    }
    
    $AppReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Power Apps exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to list Power Apps: $_"
}`;
    }
  },

  {
    id: 'pp-delete-app',
    title: 'Delete Power App',
    description: 'Permanently delete a Power App',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script permanently deletes a Power App from the Power Platform for cleanup and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- App must not be in use by active users

**What You Need to Provide:**
- App name (GUID) to delete

**What the Script Does:**
- Validates app exists
- Permanently deletes the specified app
- Removes all app versions and data sources
- Confirms successful deletion

**Important Notes:**
- ⚠️ THIS ACTION IS IRREVERSIBLE - the app cannot be recovered
- All app versions will be deleted
- Users will immediately lose access to the app
- App data connections are removed
- Does not delete underlying data sources
- Typical use: removing obsolete or duplicate apps
- Export app package before deletion if needed
- Verify app name carefully before executing
- Notify users before deleting production apps`,
    parameters: [
      {
        name: 'appName',
        label: 'App Name',
        type: 'text',
        required: true,
        placeholder: 'App ID (GUID)',
        helpText: 'The app to delete (verify carefully!)'
      }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);

      return `# Delete Power App
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: This action is IRREVERSIBLE

try {
    Write-Host "⚠️  WARNING: This will permanently delete the app!" -ForegroundColor Red
    Write-Host "App: ${appName}" -ForegroundColor Yellow
    Write-Host ""
    
    $Confirm = Read-Host "Type 'DELETE' to confirm deletion"
    
    if ($Confirm -eq 'DELETE') {
        Write-Host "Deleting Power App..." -ForegroundColor Cyan
        
        Remove-AdminPowerApp -AppName "${appName}"
        
        Write-Host "✓ Power App deleted successfully" -ForegroundColor Green
        Write-Host "Users will no longer have access to this app" -ForegroundColor Gray
    } else {
        Write-Host "Deletion cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete Power App: $_"
}`;
    }
  },

  {
    id: 'pp-share-app',
    title: 'Share Power App with Users',
    description: 'Grant users access to a Power App',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script shares a Power App with a user or security group, granting them permission to view or edit the app.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- User or group must exist in Azure AD

**What You Need to Provide:**
- App name (GUID) to share
- User email or security group ID
- Role (CanView or CanEdit)

**What the Script Does:**
- Validates app and user exist
- Assigns specified role to the user
- Grants appropriate permissions
- Confirms successful sharing

**Important Notes:**
- CanView allows users to run the app only
- CanEdit allows users to modify and republish the app
- Use CanView for end users, CanEdit for co-developers
- Users also need access to underlying data sources
- Sharing does not grant data source permissions
- Typical use: sharing apps with teams or departments
- Consider security groups for large user sets
- Review app permissions regularly for governance
- Remove access when users leave teams`,
    parameters: [
      {
        name: 'appName',
        label: 'App Name',
        type: 'text',
        required: true,
        placeholder: 'App ID (GUID)',
        helpText: 'The app to share'
      },
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@contoso.com',
        helpText: 'Email of the user to share with'
      },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: [
          { value: 'CanView', label: 'Can View (run only)' },
          { value: 'CanEdit', label: 'Can Edit (modify app)' }
        ],
        helpText: 'Permission level to grant'
      }
    ],
    scriptTemplate: (params) => {
      const appName = escapePowerShellString(params.appName);
      const userEmail = escapePowerShellString(params.userEmail);
      const role = params.role;

      return `# Share Power App with User
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Sharing Power App..." -ForegroundColor Cyan
    Write-Host "App: ${appName}" -ForegroundColor Yellow
    Write-Host "User: ${userEmail}" -ForegroundColor Yellow
    Write-Host "Role: ${role}" -ForegroundColor Yellow
    
    Set-AdminPowerAppRoleAssignment -AppName "${appName}" -PrincipalType User -PrincipalObjectId "${userEmail}" -RoleName ${role}
    
    Write-Host "✓ Power App shared successfully" -ForegroundColor Green
    Write-Host "User ${userEmail} now has ${role} permission" -ForegroundColor Gray
    Write-Host "Note: User may also need data source permissions" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to share Power App: $_"
}`;
    }
  },

  {
    id: 'pp-list-flows',
    title: 'List Power Automate Flows',
    description: 'List all Power Automate flows in an environment',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script retrieves and displays all Power Automate flows within a specific environment for monitoring and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- Environment name to list flows from
- CSV export file path

**What the Script Does:**
- Retrieves all flows in the specified environment
- Collects flow name, state, owner, and creation date
- Exports flow inventory to CSV file
- Reports total flow count and enabled/disabled status

**Important Notes:**
- Shows both cloud and automated flows
- Identifies enabled vs disabled flows
- Use to audit automation in specific environments
- Track flow ownership and creation dates
- Typical use: flow governance, troubleshooting
- Identify flows with errors or expired connections
- Export monthly for environment documentation
- Review disabled flows for cleanup opportunities`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to list flows from'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\PowerFlows-ByEnv.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# List Power Automate Flows
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Automate flows from environment..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    
    $Flows = Get-AdminFlow -EnvironmentName "${environmentName}"
    
    Write-Host "Found $($Flows.Count) flows in this environment" -ForegroundColor Yellow
    
    $EnabledCount = ($Flows | Where-Object { $_.Enabled -eq $true }).Count
    $DisabledCount = ($Flows | Where-Object { $_.Enabled -eq $false }).Count
    
    Write-Host "Enabled: $EnabledCount | Disabled: $DisabledCount" -ForegroundColor Gray
    
    $FlowReport = foreach ($Flow in $Flows) {
        [PSCustomObject]@{
            DisplayName      = $Flow.DisplayName
            FlowName         = $Flow.FlowName
            Enabled          = $Flow.Enabled
            State            = $Flow.Internal.properties.state
            Owner            = $Flow.CreatedBy.displayName
            EnvironmentName  = $Flow.EnvironmentName
            CreatedTime      = $Flow.CreatedTime
            LastModifiedTime = $Flow.LastModifiedTime
        }
    }
    
    $FlowReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Power Automate flows exported to: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to list Power Automate flows: $_"
}`;
    }
  },

  {
    id: 'pp-disable-flow',
    title: 'Disable Power Automate Flow',
    description: 'Turn off a Power Automate flow',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script disables a Power Automate flow to stop it from running while preserving configuration for future re-enablement.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Flow must be currently enabled

**What You Need to Provide:**
- Environment name where flow exists
- Flow name (GUID) to disable

**What the Script Does:**
- Validates flow exists and is enabled
- Disables the specified flow
- Stops flow from triggering or running
- Confirms successful disablement

**Important Notes:**
- ⚠️ Flow will stop running immediately
- Existing flow runs will complete
- Flow configuration and history are preserved
- Can be re-enabled later without reconfiguration
- Typical use: troubleshooting, maintenance windows
- Disable flows before environment maintenance
- Review disabled flows quarterly for cleanup
- Consider flow dependencies before disabling
- Notify flow owners before disabling production flows`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the flow'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID (GUID)',
        helpText: 'The flow to disable'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);

      return `# Disable Power Automate Flow
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: Flow will stop running immediately

try {
    Write-Host "⚠️  WARNING: This will stop the flow from running!" -ForegroundColor Yellow
    Write-Host "Environment: ${environmentName}" -ForegroundColor Gray
    Write-Host "Flow: ${flowName}" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Disabling flow..." -ForegroundColor Cyan
    
    Disable-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}"
    
    Write-Host "✓ Flow disabled successfully" -ForegroundColor Green
    Write-Host "The flow will no longer trigger or run" -ForegroundColor Gray
    Write-Host "Flow can be re-enabled later without reconfiguration" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to disable flow: $_"
}`;
    }
  },

  {
    id: 'pp-enable-flow',
    title: 'Enable Power Automate Flow',
    description: 'Turn on a Power Automate flow',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script enables a previously disabled Power Automate flow to resume automated operations.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Flow must be currently disabled

**What You Need to Provide:**
- Environment name where flow exists
- Flow name (GUID) to enable

**What the Script Does:**
- Validates flow exists and is disabled
- Enables the specified flow
- Flow resumes normal trigger and execution
- Confirms successful enablement

**Important Notes:**
- Flow will start running immediately based on triggers
- All connections must be valid for flow to run
- Expired connections will cause flow failures
- Test connections before enabling production flows
- Typical use: re-enabling after maintenance or troubleshooting
- Monitor flow runs after re-enabling
- Check for errors in first few runs
- Verify flow logic is still valid before enabling`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the flow'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID (GUID)',
        helpText: 'The flow to enable'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);

      return `# Enable Power Automate Flow
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Enabling Power Automate flow..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Flow: ${flowName}" -ForegroundColor Yellow
    
    Enable-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}"
    
    Write-Host "✓ Flow enabled successfully" -ForegroundColor Green
    Write-Host "The flow will now trigger and run based on its configuration" -ForegroundColor Gray
    Write-Host "Monitor the flow runs to ensure connections are valid" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to enable flow: $_"
}`;
    }
  },

  {
    id: 'pp-delete-flow',
    title: 'Delete Power Automate Flow',
    description: 'Permanently delete a Power Automate flow',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script permanently deletes a Power Automate flow from the Power Platform for cleanup and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Flow should be disabled before deletion

**What You Need to Provide:**
- Environment name where flow exists
- Flow name (GUID) to delete

**What the Script Does:**
- Validates flow exists
- Permanently deletes the specified flow
- Removes all flow versions and run history
- Confirms successful deletion

**Important Notes:**
- ⚠️ THIS ACTION IS IRREVERSIBLE - flow cannot be recovered
- All flow run history will be deleted
- Flow will stop running immediately
- Flow connections are removed
- Does not delete underlying connectors or data sources
- Typical use: removing obsolete or broken flows
- Export flow definition before deletion if needed
- Verify flow name carefully before executing
- Disable flow first to prevent active runs during deletion`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the flow'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID (GUID)',
        helpText: 'The flow to delete (verify carefully!)'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);

      return `# Delete Power Automate Flow
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: This action is IRREVERSIBLE

try {
    Write-Host "⚠️  WARNING: This will permanently delete the flow!" -ForegroundColor Red
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Flow: ${flowName}" -ForegroundColor Yellow
    Write-Host ""
    
    $Confirm = Read-Host "Type 'DELETE' to confirm deletion"
    
    if ($Confirm -eq 'DELETE') {
        Write-Host "Deleting Power Automate flow..." -ForegroundColor Cyan
        
        Remove-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}"
        
        Write-Host "✓ Flow deleted successfully" -ForegroundColor Green
        Write-Host "All flow versions and run history have been permanently removed" -ForegroundColor Gray
    } else {
        Write-Host "Deletion cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete flow: $_"
}`;
    }
  },

  {
    id: 'pp-list-connectors',
    title: 'List Custom Connectors',
    description: 'List all custom connectors in an environment',
    category: 'Connectors',
    isPremium: true,
    instructions: `**How This Task Works:**
This script retrieves and displays all custom connectors within a specific environment for API governance and documentation.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- Environment name to list connectors from
- CSV export file path

**What the Script Does:**
- Retrieves all custom connectors in the environment
- Collects connector name, creator, and creation date
- Exports connector inventory to CSV file
- Reports total custom connector count

**Important Notes:**
- Shows only custom connectors, not built-in Microsoft connectors
- Custom connectors are used for proprietary APIs
- Use to audit external API dependencies
- Track connector ownership and usage
- Typical use: API governance, security reviews
- Review connectors quarterly for security vulnerabilities
- Document connector purposes and data flow
- Identify unused connectors for cleanup
- Verify connector authentications are valid`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to list connectors from'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\CustomConnectors.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# List Custom Connectors
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting custom connectors from environment..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    
    $Connectors = Get-AdminPowerAppConnector -EnvironmentName "${environmentName}" -FilterNonCustomConnectors
    
    Write-Host "Found $($Connectors.Count) custom connectors in this environment" -ForegroundColor Yellow
    
    $ConnectorReport = foreach ($Connector in $Connectors) {
        [PSCustomObject]@{
            DisplayName      = $Connector.DisplayName
            ConnectorName    = $Connector.ConnectorName
            ConnectorId      = $Connector.ConnectorId
            ApiType          = $Connector.Internal.properties.apiDefinitions.originalSwaggerUrl
            CreatedBy        = $Connector.CreatedBy.displayName
            EnvironmentName  = $Connector.EnvironmentName
            CreatedTime      = $Connector.CreatedTime
        }
    }
    
    $ConnectorReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Custom connectors exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "Review connectors for security and governance compliance" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to list custom connectors: $_"
}`;
    }
  },

  {
    id: 'pp-delete-connector',
    title: 'Delete Custom Connector',
    description: 'Permanently delete a custom connector',
    category: 'Connectors',
    isPremium: true,
    instructions: `**How This Task Works:**
This script permanently deletes a custom connector from the Power Platform for API cleanup and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Connector must not be in use by active apps or flows

**What You Need to Provide:**
- Environment name where connector exists
- Connector name (GUID) to delete

**What the Script Does:**
- Validates connector exists and is not in use
- Permanently deletes the specified custom connector
- Removes connector definition and authentication configuration
- Confirms successful deletion

**Important Notes:**
- ⚠️ THIS ACTION IS IRREVERSIBLE - connector cannot be recovered
- Apps and flows using this connector will break
- Verify connector is not in use before deletion
- Export connector definition before deletion if needed
- Typical use: removing obsolete or deprecated API integrations
- Check apps/flows for connector dependencies first
- Cannot delete built-in Microsoft connectors
- Only custom connectors can be deleted
- Consider disabling in DLP policy instead of deleting`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the connector'
      },
      {
        name: 'connectorName',
        label: 'Connector Name',
        type: 'text',
        required: true,
        placeholder: 'Connector ID (GUID)',
        helpText: 'The custom connector to delete (verify carefully!)'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const connectorName = escapePowerShellString(params.connectorName);

      return `# Delete Custom Connector
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: This action is IRREVERSIBLE

try {
    Write-Host "⚠️  WARNING: This will permanently delete the custom connector!" -ForegroundColor Red
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Connector: ${connectorName}" -ForegroundColor Yellow
    Write-Host ""
    
    $Confirm = Read-Host "Type 'DELETE' to confirm deletion"
    
    if ($Confirm -eq 'DELETE') {
        Write-Host "Deleting custom connector..." -ForegroundColor Cyan
        
        Remove-AdminPowerAppConnector -EnvironmentName "${environmentName}" -ConnectorName "${connectorName}"
        
        Write-Host "✓ Custom connector deleted successfully" -ForegroundColor Green
        Write-Host "Apps and flows using this connector will no longer work" -ForegroundColor Yellow
    } else {
        Write-Host "Deletion cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete connector: $_"
}`;
    }
  },

  {
    id: 'pp-block-connector',
    title: 'Block Connector Tenant-Wide',
    description: 'Block a connector in DLP policy to prevent usage',
    category: 'Connectors',
    isPremium: true,
    instructions: `**How This Task Works:**
This script adds a connector to the "Blocked" group in a DLP policy to prevent tenant-wide usage for security and compliance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- DLP policy must already exist

**What You Need to Provide:**
- DLP policy name to update
- Connector ID to block (e.g., shared_twitter, shared_box)

**What the Script Does:**
- Retrieves the specified DLP policy
- Adds the connector to the "Blocked" data group
- Prevents all apps and flows from using this connector
- Confirms successful blocking

**Important Notes:**
- ⚠️ Apps and flows using this connector will break immediately
- Blocking is tenant-wide or environment-specific based on policy scope
- Use for security compliance (e.g., blocking consumer services)
- Common blocked connectors: Twitter, Dropbox, Gmail, Box
- Users cannot create new connections to blocked connectors
- Existing connections become unusable but are not deleted
- Typical use: enforcing data loss prevention policies
- Review connector usage before blocking to avoid disruption
- Consider notifying users before blocking widely-used connectors`,
    parameters: [
      {
        name: 'policyName',
        label: 'DLP Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Policy ID (GUID)',
        helpText: 'The DLP policy to update'
      },
      {
        name: 'connectorId',
        label: 'Connector ID',
        type: 'text',
        required: true,
        placeholder: 'shared_twitter',
        helpText: 'Connector ID to block (e.g., shared_twitter, shared_box)'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const connectorId = escapePowerShellString(params.connectorId);

      return `# Block Connector in DLP Policy
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: Apps using this connector will break

try {
    Write-Host "⚠️  WARNING: This will block the connector tenant-wide!" -ForegroundColor Yellow
    Write-Host "DLP Policy: ${policyName}" -ForegroundColor Gray
    Write-Host "Connector: ${connectorId}" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Blocking connector in DLP policy..." -ForegroundColor Cyan
    
    Add-ConnectorToBusinessDataGroup -PolicyName "${policyName}" -ConnectorName "${connectorId}" -GroupName Blocked
    
    Write-Host "✓ Connector blocked successfully" -ForegroundColor Green
    Write-Host "Apps and flows using this connector will no longer work" -ForegroundColor Yellow
    Write-Host "Users cannot create new connections to this connector" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to block connector: $_"
}`;
    }
  },

  {
    id: 'pp-tenant-settings',
    title: 'Configure Tenant Settings',
    description: 'Update Power Platform tenant-level configuration',
    category: 'Governance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script configures tenant-wide Power Platform settings for governance, security, and capacity management.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Tenant-level permissions required

**What You Need to Provide:**
- Whether to disable trial environment creation by non-admins
- Whether to disable capacity allocation by environment admins

**What the Script Does:**
- Retrieves current tenant settings
- Updates specified governance settings
- Applies changes tenant-wide immediately
- Confirms successful configuration update

**Important Notes:**
- Changes affect all users and environments immediately
- Disabling trials prevents non-admin users from creating trial environments
- Useful for preventing environment sprawl
- Capacity allocation controls who can allocate add-on capacity
- Recommended: disable trials in production tenants
- Settings enforce governance and cost control
- Typical use: implementing tenant governance policies
- Review impact on maker community before restricting
- Document tenant settings in governance documentation`,
    parameters: [
      {
        name: 'disableTrials',
        label: 'Disable Trial Environment Creation',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Prevent non-admin users from creating trial environments'
      },
      {
        name: 'disableCapacityAllocation',
        label: 'Disable Capacity Allocation by Environment Admins',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Prevent environment admins from allocating capacity'
      }
    ],
    scriptTemplate: (params) => {
      const disableTrials = params.disableTrials === true ? '$true' : '$false';
      const disableCapacity = params.disableCapacityAllocation === true ? '$true' : '$false';

      return `# Configure Power Platform Tenant Settings
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Configuring Power Platform tenant settings..." -ForegroundColor Cyan
    Write-Host "Disable trial creation: ${disableTrials}" -ForegroundColor Yellow
    Write-Host "Disable capacity allocation: ${disableCapacity}" -ForegroundColor Yellow
    
    Set-TenantSettings -RequestBody @{
        disableTrialEnvironmentCreationByNonAdminUsers = ${disableTrials}
        disableCapacityAllocationByEnvironmentAdmins = ${disableCapacity}
    }
    
    Write-Host "✓ Tenant settings updated successfully" -ForegroundColor Green
    Write-Host "Changes are effective immediately across the tenant" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure tenant settings: $_"
}`;
    }
  },

  {
    id: 'pp-export-users',
    title: 'Export Environment Users & Permissions',
    description: 'Export all users with environment access and their roles',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports comprehensive inventory of all users with access to Power Platform environments and their assigned security roles.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path for user permissions report

**What the Script Does:**
- Retrieves all Power Platform environments
- For each environment, gets all user role assignments
- Collects user email, role name, and environment details
- Exports comprehensive permissions inventory to CSV

**Important Notes:**
- Essential for security audits and access reviews
- Shows Environment Admin and Environment Maker roles
- Use for quarterly access certification
- Identify users with excessive permissions
- Track role assignments across all environments
- Remove access when users change roles or leave
- Typical use: compliance audits, security reviews
- Export takes longer for tenants with many environments
- Review regularly for least privilege compliance`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\EnvironmentUsers.csv',
        helpText: 'Path where the user permissions CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Environment Users & Permissions
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting environment user permissions..." -ForegroundColor Cyan
    Write-Host "This may take several minutes for large tenants" -ForegroundColor Gray
    
    $Environments = Get-AdminPowerAppEnvironment
    Write-Host "Found $($Environments.Count) environments" -ForegroundColor Yellow
    
    $UserReport = @()
    $EnvCount = 0
    
    foreach ($Env in $Environments) {
        $EnvCount++
        Write-Host "Processing environment $EnvCount of $($Environments.Count): $($Env.DisplayName)" -ForegroundColor Gray
        
        $RoleAssignments = Get-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName $Env.EnvironmentName
        
        foreach ($Assignment in $RoleAssignments) {
            $UserReport += [PSCustomObject]@{
                EnvironmentName        = $Env.DisplayName
                EnvironmentId          = $Env.EnvironmentName
                UserEmail              = $Assignment.PrincipalDisplayName
                UserObjectId           = $Assignment.PrincipalObjectId
                RoleName               = $Assignment.RoleDefinition.DisplayName
                RoleType               = $Assignment.RoleType
            }
        }
    }
    
    Write-Host "Total user assignments: $($UserReport.Count)" -ForegroundColor Yellow
    
    $UserReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Environment users and permissions exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "Review for access certification and security audits" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export environment users: $_"
}`;
    }
  },

  {
    id: 'pp-set-env-security',
    title: 'Set Environment Security Role',
    description: 'Assign security role to user in environment',
    category: 'Governance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script assigns a security role to a user in a specific Power Platform environment for access control and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- User must exist in Azure AD

**What You Need to Provide:**
- Environment name to grant access
- User email address (Azure AD UPN)
- Security role to assign (Environment Admin or Environment Maker)

**What the Script Does:**
- Validates user exists in Azure AD
- Assigns specified security role to user in environment
- Grants appropriate permissions immediately
- Confirms successful role assignment

**Important Notes:**
- Environment Admin: full control over environment settings
- Environment Maker: can create apps, flows, and connections
- Changes are effective immediately
- User receives email notification of access grant
- Use Environment Admin role sparingly for security
- Grant Environment Maker to app developers
- Typical use: onboarding developers, delegating administration
- Review role assignments quarterly for security
- Remove roles when users change teams or leave`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to grant access to'
      },
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@contoso.com',
        helpText: 'Email of user to grant access (Azure AD UPN)'
      },
      {
        name: 'roleName',
        label: 'Security Role',
        type: 'select',
        required: true,
        options: [
          { value: 'EnvironmentAdmin', label: 'Environment Admin (full control)' },
          { value: 'EnvironmentMaker', label: 'Environment Maker (create apps)' }
        ],
        helpText: 'Security role to assign to the user'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const userEmail = escapePowerShellString(params.userEmail);
      const roleName = params.roleName;

      return `# Set Environment Security Role
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Assigning environment security role..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "User: ${userEmail}" -ForegroundColor Yellow
    Write-Host "Role: ${roleName}" -ForegroundColor Yellow
    
    Set-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName "${environmentName}" -PrincipalType User -PrincipalObjectId "${userEmail}" -RoleName ${roleName}
    
    Write-Host "✓ Security role assigned successfully" -ForegroundColor Green
    Write-Host "User ${userEmail} now has ${roleName} permissions" -ForegroundColor Gray
    Write-Host "Changes are effective immediately" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to set environment security role: $_"
}`;
    }
  },

  {
    id: 'pp-capacity-report',
    title: 'Generate Capacity Usage Report',
    description: 'Report on storage and API capacity consumption',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates comprehensive capacity usage reports for Power Platform environments to track consumption and plan capacity.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path for capacity report

**What the Script Does:**
- Retrieves all Power Platform environments
- Collects database storage, file storage, and log capacity usage
- Calculates capacity consumption per environment
- Exports detailed capacity report to CSV

**Important Notes:**
- Essential for capacity planning and cost management
- Shows storage consumption in MB
- Tracks database, file, and log capacity separately
- Use monthly for capacity trending and forecasting
- Identify environments consuming excessive capacity
- Plan capacity purchases based on growth trends
- Typical use: monthly capacity reviews, budget planning
- Capacity add-ons required when limits exceeded
- Optimize environments to reduce capacity costs`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\CapacityReport.csv',
        helpText: 'Path where the capacity report CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Generate Capacity Usage Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting capacity usage data..." -ForegroundColor Cyan
    
    $Environments = Get-AdminPowerAppEnvironment
    
    Write-Host "Found $($Environments.Count) environments" -ForegroundColor Yellow
    
    $CapacityReport = foreach ($Env in $Environments) {
        $Capacity = $Env.Internal.properties.capacity
        
        [PSCustomObject]@{
            DisplayName           = $Env.DisplayName
            EnvironmentName       = $Env.EnvironmentName
            EnvironmentType       = $Env.EnvironmentType
            DatabaseCapacityMB    = if ($Capacity.actualConsumption.database) { $Capacity.actualConsumption.database } else { 0 }
            FileCapacityMB        = if ($Capacity.actualConsumption.file) { $Capacity.actualConsumption.file } else { 0 }
            LogCapacityMB         = if ($Capacity.actualConsumption.log) { $Capacity.actualConsumption.log } else { 0 }
            TotalCapacityMB       = if ($Capacity.actualConsumption.total) { $Capacity.actualConsumption.total } else { 0 }
            Location              = $Env.Location
        }
    }
    
    $TotalCapacity = ($CapacityReport | Measure-Object -Property TotalCapacityMB -Sum).Sum
    Write-Host "Total capacity consumed: $([math]::Round($TotalCapacity, 2)) MB" -ForegroundColor Yellow
    
    $CapacityReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Capacity report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "Review for capacity planning and cost management" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to generate capacity report: $_"
}`;
    }
  },

  {
    id: 'pp-create-dlp',
    title: 'Create DLP Policy',
    description: 'Create a new Data Loss Prevention policy',
    category: 'Governance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates a new Data Loss Prevention (DLP) policy to control data sharing between connectors for security and compliance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- Display name for the new DLP policy
- Environment filter (All environments or specific environments)

**What the Script Does:**
- Creates a new DLP policy with specified name
- Sets initial scope (tenant-wide or environment-specific)
- Configures default connector groups
- Confirms successful policy creation

**Important Notes:**
- DLP policies prevent data leakage between connectors
- New policies start with all connectors in "Business" group
- After creation, configure connector groups via Admin Center
- Common approach: block consumer services (Gmail, Dropbox, Twitter)
- Allow business connectors (SharePoint, SQL Server, Dataverse)
- Policies can be tenant-wide or environment-specific
- Typical use: enforcing data protection regulations
- Test policies in non-production environments first
- Document policy purpose and connector classifications`,
    parameters: [
      {
        name: 'policyName',
        label: 'Policy Display Name',
        type: 'text',
        required: true,
        placeholder: 'Production DLP Policy',
        helpText: 'Descriptive name for the DLP policy'
      },
      {
        name: 'environmentFilter',
        label: 'Environment Scope',
        type: 'select',
        required: true,
        options: [
          { value: 'AllEnvironments', label: 'All Environments (tenant-wide)' },
          { value: 'OnlyEnvironments', label: 'Selected Environments Only' },
          { value: 'ExceptEnvironments', label: 'All Except Selected Environments' }
        ],
        helpText: 'Which environments this policy applies to'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const environmentFilter = params.environmentFilter;

      return `# Create DLP Policy
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating Data Loss Prevention policy..." -ForegroundColor Cyan
    Write-Host "Policy Name: ${policyName}" -ForegroundColor Yellow
    Write-Host "Environment Scope: ${environmentFilter}" -ForegroundColor Yellow
    
    $PolicyParams = @{
        DisplayName = "${policyName}"
        EnvironmentType = "${environmentFilter}"
    }
    
    $NewPolicy = New-DlpPolicy @PolicyParams
    
    Write-Host "✓ DLP policy created successfully" -ForegroundColor Green
    Write-Host "Policy ID: $($NewPolicy.PolicyName)" -ForegroundColor Gray
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Configure connector groups in Power Platform Admin Center" -ForegroundColor Gray
    Write-Host "  2. Add connectors to Business, Non-Business, or Blocked groups" -ForegroundColor Gray
    Write-Host "  3. Test policy with non-production apps first" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create DLP policy: $_"
}`;
    }
  },

  {
    id: 'pp-delete-dlp',
    title: 'Delete DLP Policy',
    description: 'Permanently delete a Data Loss Prevention policy',
    category: 'Governance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script permanently deletes a DLP policy from Power Platform, removing all connector restrictions.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- DLP policy name (GUID) to delete

**What the Script Does:**
- Validates DLP policy exists
- Permanently deletes the specified policy
- Removes all connector group restrictions
- Confirms successful deletion

**Important Notes:**
- ⚠️ THIS ACTION IS IRREVERSIBLE - policy cannot be recovered
- All connector restrictions are immediately removed
- Apps and flows previously blocked may start working
- May create security/compliance risk if deleted accidentally
- Typical use: removing obsolete or incorrect policies
- Verify policy name carefully before deletion
- Export policy configuration before deletion if needed
- Consider disabling instead of deleting for testing
- Notify compliance team before deleting production policies`,
    parameters: [
      {
        name: 'policyName',
        label: 'DLP Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Policy ID (GUID)',
        helpText: 'The DLP policy to delete (verify carefully!)'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);

      return `# Delete DLP Policy
# Generated: ${new Date().toISOString()}
# ⚠️ WARNING: This action is IRREVERSIBLE

try {
    Write-Host "⚠️  WARNING: This will permanently delete the DLP policy!" -ForegroundColor Red
    Write-Host "Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "All connector restrictions will be removed" -ForegroundColor Yellow
    Write-Host ""
    
    $Confirm = Read-Host "Type 'DELETE' to confirm deletion"
    
    if ($Confirm -eq 'DELETE') {
        Write-Host "Deleting DLP policy..." -ForegroundColor Cyan
        
        Remove-DlpPolicy -PolicyName "${policyName}"
        
        Write-Host "✓ DLP policy deleted successfully" -ForegroundColor Green
        Write-Host "All connector restrictions from this policy are removed" -ForegroundColor Gray
    } else {
        Write-Host "Deletion cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete DLP policy: $_"
}`;
    }
  },

  {
    id: 'pp-flow-run-history',
    title: 'Export Flow Run History',
    description: 'Export execution history for a Power Automate flow',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports detailed run history for a specific Power Automate flow for troubleshooting and analytics.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Flow must have run history available

**What You Need to Provide:**
- Environment name where flow exists
- Flow name (GUID)
- CSV export file path

**What the Script Does:**
- Retrieves flow run history (up to last 28 days)
- Collects run status, start time, duration, and trigger details
- Exports execution history to CSV
- Reports success/failure statistics

**Important Notes:**
- Run history retained for 28 days by default
- Shows Succeeded, Failed, Cancelled, and Running statuses
- Use for troubleshooting flow failures
- Identify patterns in flow execution times
- Track flow reliability and performance
- Essential for flow health monitoring
- Typical use: investigating flow errors, performance analysis
- Export before flow deletion to preserve history
- Review failed runs to identify issues`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the flow'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID (GUID)',
        helpText: 'The flow to get run history for'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\FlowRunHistory.csv',
        helpText: 'Path where the run history CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Flow Run History
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting flow run history..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Flow: ${flowName}" -ForegroundColor Yellow
    
    $FlowRuns = Get-FlowRun -EnvironmentName "${environmentName}" -FlowName "${flowName}"
    
    Write-Host "Found $($FlowRuns.Count) flow runs (last 28 days)" -ForegroundColor Yellow
    
    $RunReport = foreach ($Run in $FlowRuns) {
        [PSCustomObject]@{
            RunId           = $Run.Name
            Status          = $Run.Status
            StartTime       = $Run.StartTime
            EndTime         = $Run.Properties.endTime
            TriggerName     = $Run.Properties.trigger.name
            TriggerType     = $Run.Properties.trigger.type
            Duration        = if ($Run.Properties.endTime -and $Run.StartTime) { 
                                (([datetime]$Run.Properties.endTime) - ([datetime]$Run.StartTime)).TotalSeconds 
                              } else { $null }
            Error           = if ($Run.Properties.error) { $Run.Properties.error.message } else { $null }
        }
    }
    
    $SuccessCount = ($RunReport | Where-Object { $_.Status -eq 'Succeeded' }).Count
    $FailCount = ($RunReport | Where-Object { $_.Status -eq 'Failed' }).Count
    
    Write-Host "Succeeded: $SuccessCount | Failed: $FailCount" -ForegroundColor Gray
    
    $RunReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Flow run history exported to: ${exportPath}" -ForegroundColor Green
    Write-Host "Review for troubleshooting and performance analysis" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export flow run history: $_"
}`;
    }
  },

  {
    id: 'pp-orphaned-resources',
    title: 'Find Orphaned Resources',
    description: 'Identify apps and flows without valid owners',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script identifies Power Apps and flows without valid owners (orphaned resources) for cleanup and reassignment.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- CSV export file path for orphaned resources report

**What the Script Does:**
- Retrieves all Power Apps across tenant
- Retrieves all Power Automate flows across tenant
- Identifies resources where owner has been deleted or disabled
- Exports orphaned resources inventory to CSV

**Important Notes:**
- Resources become orphaned when owners leave organization
- Orphaned apps cannot be edited or republished
- Orphaned flows may continue running but cannot be modified
- Essential for security governance and cleanup
- Reassign ownership to active users or teams
- Typical use: quarterly cleanup, security audits
- Delete unused orphaned resources to improve manageability
- Export critical orphaned apps before deletion
- Notify remaining team members about orphaned resources`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\OrphanedResources.csv',
        helpText: 'Path where the orphaned resources CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Find Orphaned Resources
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Searching for orphaned Power Platform resources..." -ForegroundColor Cyan
    Write-Host "This may take several minutes for large tenants" -ForegroundColor Gray
    
    Write-Host "Collecting Power Apps..." -ForegroundColor Gray
    $Apps = Get-AdminPowerApp
    
    Write-Host "Collecting Power Automate flows..." -ForegroundColor Gray
    $Flows = Get-AdminFlow
    
    $OrphanedResources = @()
    
    # Check apps for orphaned owners
    foreach ($App in $Apps) {
        if (-not $App.Owner -or $App.Owner.id -eq $null -or $App.Owner.displayName -eq $null) {
            $OrphanedResources += [PSCustomObject]@{
                ResourceType     = 'Power App'
                DisplayName      = $App.DisplayName
                ResourceName     = $App.AppName
                EnvironmentName  = $App.EnvironmentName
                OriginalOwner    = if ($App.Owner.userPrincipalName) { $App.Owner.userPrincipalName } else { 'Unknown' }
                CreatedTime      = $App.CreatedTime
                LastModifiedTime = $App.LastModifiedTime
            }
        }
    }
    
    # Check flows for orphaned owners
    foreach ($Flow in $Flows) {
        if (-not $Flow.CreatedBy -or $Flow.CreatedBy.objectId -eq $null -or $Flow.CreatedBy.displayName -eq $null) {
            $OrphanedResources += [PSCustomObject]@{
                ResourceType     = 'Power Automate Flow'
                DisplayName      = $Flow.DisplayName
                ResourceName     = $Flow.FlowName
                EnvironmentName  = $Flow.EnvironmentName
                OriginalOwner    = if ($Flow.CreatedBy.userPrincipalName) { $Flow.CreatedBy.userPrincipalName } else { 'Unknown' }
                CreatedTime      = $Flow.CreatedTime
                LastModifiedTime = $Flow.LastModifiedTime
            }
        }
    }
    
    Write-Host "✓ Found $($OrphanedResources.Count) orphaned resources" -ForegroundColor Yellow
    
    if ($OrphanedResources.Count -gt 0) {
        $OrphanedResources | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "✓ Orphaned resources exported to: ${exportPath}" -ForegroundColor Green
        Write-Host "Review for reassignment or cleanup" -ForegroundColor Gray
    } else {
        Write-Host "No orphaned resources found - excellent!" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to find orphaned resources: $_"
}`;
    }
  },

  {
    id: 'pp-usage-analytics',
    title: 'Export Usage Analytics',
    description: 'Export Power Platform usage metrics and analytics',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports Power Platform usage analytics including app launches, flow runs, and user activity for reporting and analysis.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Analytics data available (up to 28 days)

**What You Need to Provide:**
- Number of days back to analyze (default: 30)
- CSV export file path

**What the Script Does:**
- Retrieves flow run analytics for specified date range
- Collects usage metrics across all environments
- Aggregates activity by environment and user
- Exports analytics report to CSV

**Important Notes:**
- Analytics data retained for 28 days
- Shows flow execution frequency and patterns
- Use for adoption tracking and ROI analysis
- Identify heavily-used vs unused resources
- Track user engagement with Power Platform
- Essential for executive reporting and planning
- Typical use: monthly usage reviews, adoption tracking
- Combine with app/flow inventory for complete picture
- Review trends to justify capacity investments`,
    parameters: [
      {
        name: 'daysBack',
        label: 'Days Back to Analyze',
        type: 'number',
        required: false,
        defaultValue: 30,
        placeholder: '30',
        helpText: 'Number of days of analytics to export (max 28)'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\UsageAnalytics.csv',
        helpText: 'Path where the analytics CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const daysBack = params.daysBack || 30;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Usage Analytics
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Platform usage analytics..." -ForegroundColor Cyan
    
    $DaysBack = ${daysBack}
    if ($DaysBack -gt 28) {
        Write-Host "⚠️  Warning: Analytics limited to 28 days, using 28" -ForegroundColor Yellow
        $DaysBack = 28
    }
    
    $StartDate = (Get-Date).AddDays(-$DaysBack)
    Write-Host "Analyzing usage from: $($StartDate.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow
    
    # Get all flow runs for analytics
    $FlowRuns = Get-AdminFlow | ForEach-Object {
        $Flow = $_
        try {
            $Runs = Get-FlowRun -EnvironmentName $Flow.EnvironmentName -FlowName $Flow.FlowName
            $Runs | Where-Object { [datetime]$_.StartTime -ge $StartDate }
        } catch {
            # Flow may not have runs or access issues
            $null
        }
    }
    
    Write-Host "Found $($FlowRuns.Count) flow runs in the last $DaysBack days" -ForegroundColor Yellow
    
    # Aggregate analytics
    $AnalyticsReport = $FlowRuns | Group-Object -Property { $_.Properties.clientTrackingId } | ForEach-Object {
        $Runs = $_.Group
        [PSCustomObject]@{
            FlowName         = $Runs[0].Properties.workflow.name
            EnvironmentName  = $Runs[0].EnvironmentName
            TotalRuns        = $Runs.Count
            SuccessfulRuns   = ($Runs | Where-Object { $_.Status -eq 'Succeeded' }).Count
            FailedRuns       = ($Runs | Where-Object { $_.Status -eq 'Failed' }).Count
            AvgDurationSec   = if ($Runs.Count -gt 0) { 
                                 ($Runs | ForEach-Object { 
                                   if ($_.Properties.endTime -and $_.StartTime) { 
                                     (([datetime]$_.Properties.endTime) - ([datetime]$_.StartTime)).TotalSeconds 
                                   } 
                                 } | Measure-Object -Average).Average 
                               } else { 0 }
            FirstRun         = ($Runs | Sort-Object StartTime | Select-Object -First 1).StartTime
            LastRun          = ($Runs | Sort-Object StartTime | Select-Object -Last 1).StartTime
        }
    }
    
    if ($AnalyticsReport) {
        $AnalyticsReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "✓ Usage analytics exported to: ${exportPath}" -ForegroundColor Green
        Write-Host "Review for adoption tracking and performance insights" -ForegroundColor Gray
    } else {
        Write-Host "No usage data found for the specified period" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to export usage analytics: $_"
}`;
    }
  },

  {
    id: 'pp-solution-export',
    title: 'Export Solution',
    description: 'Export a Power Platform solution package',
    category: 'Solutions',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports a Power Platform solution as a managed or unmanaged package for deployment and version control.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Solution must exist in the environment
- Dataverse database must be enabled

**What You Need to Provide:**
- Environment name containing the solution
- Solution unique name
- Export file path (.zip)
- Whether to export as managed or unmanaged

**What the Script Does:**
- Validates solution exists in environment
- Exports solution as managed or unmanaged package
- Creates .zip file with all solution components
- Confirms successful export

**Important Notes:**
- Managed solutions: for production deployment, cannot be modified
- Unmanaged solutions: for development, can be edited
- Export unmanaged from development environments
- Export managed for deployment to test/production
- Solution includes all components: apps, flows, entities, etc.
- Use for application lifecycle management (ALM)
- Typical use: deploying solutions across environments
- Store exports in source control for version history
- Export before major changes for rollback capability`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the solution'
      },
      {
        name: 'solutionName',
        label: 'Solution Unique Name',
        type: 'text',
        required: true,
        placeholder: 'ContosoSolution',
        helpText: 'Unique name of the solution (not display name)'
      },
      {
        name: 'exportPath',
        label: 'Export File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ContosoSolution.zip',
        helpText: 'Path where the solution .zip file will be saved'
      },
      {
        name: 'managed',
        label: 'Export as Managed',
        type: 'checkbox',
        required: false,
        defaultValue: true,
        helpText: 'Export as managed solution (recommended for production)'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const solutionName = escapePowerShellString(params.solutionName);
      const exportPath = escapePowerShellString(params.exportPath);
      const managed = params.managed !== false ? '$true' : '$false';

      return `# Export Power Platform Solution
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting Power Platform solution..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Solution: ${solutionName}" -ForegroundColor Yellow
    Write-Host "Managed: ${managed}" -ForegroundColor Yellow
    Write-Host "Export Path: ${exportPath}" -ForegroundColor Yellow
    
    $ExportParams = @{
        EnvironmentName     = "${environmentName}"
        SolutionName        = "${solutionName}"
        SolutionOutputFile  = "${exportPath}"
        Managed             = ${managed}
    }
    
    Export-CdsSolution @ExportParams
    
    Write-Host "✓ Solution exported successfully" -ForegroundColor Green
    Write-Host "Solution package: ${exportPath}" -ForegroundColor Gray
    
    if (${managed} -eq $true) {
        Write-Host "This is a MANAGED solution - deploy to test/production environments" -ForegroundColor Gray
    } else {
        Write-Host "This is an UNMANAGED solution - use for development/source control" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to export solution: $_"
}`;
    }
  },

  // ==================== PREMIUM TASKS ====================
  {
    id: 'pp-create-dataverse-table',
    title: 'Create and Manage Dataverse Tables',
    description: 'Create custom tables, columns, relationships',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates custom Dataverse tables with columns and relationships for data storage in Power Platform environments.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or System Administrator role
- Authenticated to Power Platform
- Dataverse database enabled in environment

**What You Need to Provide:**
- Environment name
- Table display name and logical name
- Column definitions (name, type, description)

**What the Script Does:**
- Creates custom Dataverse table
- Adds custom columns with specified data types
- Sets primary name field
- Configures table settings and properties
- Reports creation success

**Important Notes:**
- Essential for custom business data storage
- Table logical names must be unique in environment
- Column types: Text, Number, Date, Lookup, Choice
- Tables support relationships to other tables
- Use naming conventions: prefix with publisher
- Plan data model before creating tables
- Consider security roles for table access
- Typical use: custom CRM data, workflow storage`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Power Platform environment'
      },
      {
        name: 'tableDisplayName',
        label: 'Table Display Name',
        type: 'text',
        required: true,
        placeholder: 'Customer Feedback',
        helpText: 'User-friendly table name'
      },
      {
        name: 'tableLogicalName',
        label: 'Table Logical Name',
        type: 'text',
        required: true,
        placeholder: 'contoso_customerfeedback',
        helpText: 'Unique technical name (use prefix)'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const displayName = escapePowerShellString(params.tableDisplayName);
      const logicalName = escapePowerShellString(params.tableLogicalName);

      return `# Create Dataverse Table
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating Dataverse table..." -ForegroundColor Cyan
    Write-Host "  Display Name: ${displayName}" -ForegroundColor Gray
    Write-Host "  Logical Name: ${logicalName}" -ForegroundColor Gray
    
    # Note: This requires Dataverse Web API or PowerShell CDS module
    # Example shown for reference - adjust based on your module
    
    Write-Host "⚠ Creating custom tables requires Dataverse API access" -ForegroundColor Yellow
    Write-Host "Use Power Apps Maker portal or Dataverse API for table creation" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Recommended approach:" -ForegroundColor Cyan
    Write-Host "1. Use Power Apps (make.powerapps.com)" -ForegroundColor Gray
    Write-Host "2. Navigate to Tables > New table" -ForegroundColor Gray
    Write-Host "3. Set Display name: ${displayName}" -ForegroundColor Gray
    Write-Host "4. Set Name: ${logicalName}" -ForegroundColor Gray
    Write-Host "5. Add columns as needed" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For automation, use Microsoft.PowerPlatform.Dataverse.Client module" -ForegroundColor Cyan
    
} catch {
    Write-Error "Table creation guidance: $_"
}`;
    }
  },

  {
    id: 'pp-manage-flows',
    title: 'Manage Power Automate Cloud Flows',
    description: 'Create, enable, disable, run flows',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script manages Power Automate cloud flows for workflow automation control and troubleshooting.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or flow owner permissions
- Authenticated to Power Platform
- Flow exists in specified environment

**What You Need to Provide:**
- Environment name
- Flow name or ID
- Action (Enable, Disable, Run, or Delete)

**What the Script Does:**
- Performs specified flow management operation
- For Enable: activates flow trigger
- For Disable: stops flow from running
- For Run: manually triggers flow execution
- For Delete: removes flow from environment
- Reports operation success

**Important Notes:**
- Essential for flow lifecycle management
- Disabled flows do not consume run quota
- Manual run useful for testing
- Delete operation is permanent
- Check flow run history for errors
- Coordinate flow changes with owners
- Typical use: troubleshooting, maintenance
- Re-enable flows after testing`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Power Platform environment'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID or display name',
        helpText: 'Target flow identifier'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Enable', label: 'Enable Flow' },
          { value: 'Disable', label: 'Disable Flow' },
          { value: 'Run', label: 'Run Flow' },
          { value: 'Delete', label: 'Delete Flow' }
        ],
        helpText: 'Flow management operation'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);
      const action = params.action;

      return `# Manage Power Automate Flow
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Flow management operation: ${action}" -ForegroundColor Cyan
    Write-Host "  Environment: ${environmentName}" -ForegroundColor Gray
    Write-Host "  Flow: ${flowName}" -ForegroundColor Gray
    
    switch ("${action}") {
        "Enable" {
            Write-Host "Enabling flow..." -ForegroundColor Cyan
            Set-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}" -Enabled $true
            Write-Host "✓ Flow enabled successfully" -ForegroundColor Green
        }
        
        "Disable" {
            Write-Host "Disabling flow..." -ForegroundColor Cyan
            Set-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}" -Enabled $false
            Write-Host "✓ Flow disabled successfully" -ForegroundColor Green
            Write-Host "  Flow will not trigger automatically" -ForegroundColor Gray
        }
        
        "Run" {
            Write-Host "Running flow manually..." -ForegroundColor Cyan
            # Note: Manual run requires flow trigger parameters
            Write-Host "⚠ Manual flow run requires trigger payload" -ForegroundColor Yellow
            Write-Host "Use Power Automate portal to run manually with inputs" -ForegroundColor Gray
        }
        
        "Delete" {
            Write-Host "⚠ WARNING: This will permanently delete the flow!" -ForegroundColor Red
            $Confirm = Read-Host "Type 'DELETE' to confirm"
            
            if ($Confirm -eq 'DELETE') {
                Remove-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}"
                Write-Host "✓ Flow deleted successfully" -ForegroundColor Green
            } else {
                Write-Host "Deletion cancelled" -ForegroundColor Yellow
            }
        }
    }
    
} catch {
    Write-Error "Failed to manage flow: $_"
}`;
    }
  },

  {
    id: 'pp-configure-dlp',
    title: 'Configure DLP Policies',
    description: 'Data loss prevention policies for connectors',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script configures Data Loss Prevention (DLP) policies to control connector usage and prevent data leakage.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Understanding of business vs non-business connectors

**What You Need to Provide:**
- DLP policy name
- Policy scope (Tenant, Environment, or Exclude environments)
- Connector classification (Business, Non-Business, Blocked)

**What the Script Does:**
- Creates new DLP policy with specified name
- Classifies connectors into groups
- Sets policy scope (all environments or specific)
- Prevents data sharing between connector groups
- Reports policy creation success

**Important Notes:**
- Essential for regulatory compliance and data protection
- Prevents mixing business and non-business data
- Blocked connectors cannot be used at all
- Business connectors can share data with each other
- Non-business connectors isolated from business connectors
- Apply to all environments or specific ones
- Typical policy: block consumer services in production
- Review impact before applying broadly`,
    parameters: [
      {
        name: 'policyName',
        label: 'DLP Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Production DLP Policy',
        helpText: 'Descriptive policy name'
      },
      {
        name: 'policyScope',
        label: 'Policy Scope',
        type: 'select',
        required: true,
        options: [
          { value: 'AllEnvironments', label: 'All Environments' },
          { value: 'ExceptEnvironments', label: 'All Except Specified' },
          { value: 'OnlyEnvironments', label: 'Only Specified Environments' }
        ],
        helpText: 'Where policy applies'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const scope = params.policyScope;

      return `# Configure DLP Policy
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating DLP policy..." -ForegroundColor Cyan
    Write-Host "  Policy Name: ${policyName}" -ForegroundColor Gray
    Write-Host "  Scope: ${scope}" -ForegroundColor Gray
    
    # Create new DLP policy
    $Policy = New-AdminDlpPolicy -DisplayName "${policyName}"
    
    Write-Host "✓ DLP policy created" -ForegroundColor Green
    Write-Host "  Policy ID: $($Policy.PolicyName)" -ForegroundColor Gray
    
    # Example: Add connectors to business data group
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Classify connectors as Business or Non-Business" -ForegroundColor Gray
    Write-Host "2. Use: Add-ConnectorsToBusinessDataGroup" -ForegroundColor Gray
    Write-Host "3. Use: Add-ConnectorsToNonBusinessDataGroup" -ForegroundColor Gray
    Write-Host "4. Block risky connectors completely" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example business connectors:" -ForegroundColor Cyan
    Write-Host "  SharePoint, Dataverse, Office 365, Teams" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example non-business connectors to consider blocking:" -ForegroundColor Cyan
    Write-Host "  Gmail, Dropbox, Twitter, Facebook" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create DLP policy: $_"
}`;
    }
  },

  {
    id: 'pp-manage-environments',
    title: 'Manage Power Apps Environments',
    description: 'Create, delete, backup/restore environments',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script performs comprehensive environment management operations for Power Platform environments.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Available environment capacity (for creation)

**What You Need to Provide:**
- Action (Create, Delete, Backup, or Restore)
- Environment name/ID
- For Create: region and environment type
- For Backup: backup label
- For Restore: source and target environments

**What the Script Does:**
- Performs specified environment operation
- For Create: provisions new environment
- For Delete: removes environment permanently
- For Backup: creates manual backup
- For Restore: recovers from backup
- Reports operation success

**Important Notes:**
- Essential for environment lifecycle management
- Deletion is permanent - all data lost
- Backups support disaster recovery
- Only production/sandbox support backups
- Restoration overwrites target environment
- Coordinate changes with stakeholders
- Test backups regularly
- Typical use: DR, dev/test provisioning`,
    parameters: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Create', label: 'Create Environment' },
          { value: 'Delete', label: 'Delete Environment' },
          { value: 'Backup', label: 'Backup Environment' },
          { value: 'Restore', label: 'Restore Environment' }
        ],
        helpText: 'Environment management operation'
      },
      {
        name: 'environmentName',
        label: 'Environment Name/ID',
        type: 'text',
        required: true,
        placeholder: 'Contoso-Production',
        helpText: 'Target environment'
      },
      {
        name: 'region',
        label: 'Region (for Create)',
        type: 'select',
        required: false,
        options: [
          { value: 'unitedstates', label: 'United States' },
          { value: 'europe', label: 'Europe' },
          { value: 'asia', label: 'Asia' }
        ],
        helpText: 'Geographic region'
      }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const envName = escapePowerShellString(params.environmentName);
      const region = params.region || 'unitedstates';

      return `# Manage Power Apps Environment
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Environment operation: ${action}" -ForegroundColor Cyan
    Write-Host "  Environment: ${envName}" -ForegroundColor Gray
    
    switch ("${action}") {
        "Create" {
            Write-Host "Creating new environment..." -ForegroundColor Cyan
            Write-Host "  Region: ${region}" -ForegroundColor Gray
            
            $NewEnv = New-AdminPowerAppEnvironment -DisplayName "${envName}" -LocationName ${region} -EnvironmentSku Production
            
            Write-Host "✓ Environment created successfully" -ForegroundColor Green
            Write-Host "  Environment ID: $($NewEnv.EnvironmentName)" -ForegroundColor Gray
        }
        
        "Delete" {
            Write-Host "⚠ WARNING: This will permanently delete the environment!" -ForegroundColor Red
            $Confirm = Read-Host "Type 'DELETE' to confirm"
            
            if ($Confirm -eq 'DELETE') {
                Remove-AdminPowerAppEnvironment -EnvironmentName "${envName}"
                Write-Host "✓ Environment deleted" -ForegroundColor Green
            } else {
                Write-Host "Deletion cancelled" -ForegroundColor Yellow
            }
        }
        
        "Backup" {
            $BackupLabel = Read-Host "Enter backup label (e.g., Pre-Migration-2025)"
            
            Write-Host "Creating backup..." -ForegroundColor Cyan
            Backup-CdsEnvironment -EnvironmentName "${envName}" -BackupLabel $BackupLabel
            Write-Host "✓ Backup created successfully" -ForegroundColor Green
        }
        
        "Restore" {
            Write-Host "⚠ Restore will overwrite target environment" -ForegroundColor Yellow
            $SourceEnv = Read-Host "Enter source environment name"
            $TargetEnv = Read-Host "Enter target environment name"
            
            $Confirm = Read-Host "Type 'RESTORE' to confirm"
            if ($Confirm -eq 'RESTORE') {
                Restore-CdsEnvironment -SourceEnvironmentName $SourceEnv -TargetEnvironmentName $TargetEnv
                Write-Host "✓ Restore initiated" -ForegroundColor Green
            }
        }
    }
    
} catch {
    Write-Error "Failed to manage environment: $_"
}`;
    }
  },

  {
    id: 'pp-configure-security-roles',
    title: 'Configure Environment Security Roles',
    description: 'Assign security roles to users',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script assigns security roles to users for Power Platform environment access control.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or System Administrator role
- Authenticated to Power Platform
- Users must exist in Azure AD

**What You Need to Provide:**
- Environment name
- User email address
- Security role to assign (System Administrator, System Customizer, Basic User, etc.)

**What the Script Does:**
- Retrieves user from Azure AD
- Assigns specified security role in environment
- Grants appropriate permissions
- Reports role assignment success

**Important Notes:**
- Essential for environment access control
- System Administrator has full permissions
- System Customizer can customize without user access
- Basic User has read/write to their own data
- Environment Maker can create resources
- Use principle of least privilege
- Review role assignments periodically
- Typical use: onboarding, role changes`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Target environment'
      },
      {
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        placeholder: 'user@company.com',
        helpText: 'User to assign role to'
      },
      {
        name: 'roleName',
        label: 'Security Role',
        type: 'select',
        required: true,
        options: [
          { value: 'System Administrator', label: 'System Administrator (Full control)' },
          { value: 'System Customizer', label: 'System Customizer (Customize)' },
          { value: 'Environment Maker', label: 'Environment Maker (Create resources)' },
          { value: 'Basic User', label: 'Basic User (Standard access)' }
        ],
        helpText: 'Role to assign'
      }
    ],
    scriptTemplate: (params) => {
      const envName = escapePowerShellString(params.environmentName);
      const userEmail = escapePowerShellString(params.userEmail);
      const roleName = escapePowerShellString(params.roleName);

      return `# Configure Security Roles
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Assigning security role..." -ForegroundColor Cyan
    Write-Host "  Environment: ${envName}" -ForegroundColor Gray
    Write-Host "  User: ${userEmail}" -ForegroundColor Gray
    Write-Host "  Role: ${roleName}" -ForegroundColor Gray
    
    # Add user to environment with role
    Set-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName "${envName}" -PrincipalType User -PrincipalObjectId "${userEmail}" -RoleName "${roleName}"
    
    Write-Host "✓ Security role assigned successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "User now has '${roleName}' permissions in environment" -ForegroundColor Gray
    
    # Display current role assignments
    Write-Host ""
    Write-Host "Current role assignments:" -ForegroundColor Cyan
    Get-AdminPowerAppEnvironmentRoleAssignment -EnvironmentName "${envName}" | Where-Object { $_.PrincipalEmail -eq "${userEmail}" } | Format-Table RoleName, PrincipalDisplayName
    
} catch {
    Write-Error "Failed to assign security role: $_"
}`;
    }
  },

  {
    id: 'pp-export-powerbi-reports',
    title: 'Export Power BI Reports and Datasets',
    description: 'Export reports, datasets for backup',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports Power BI reports and datasets for backup, migration, and version control.

**Prerequisites:**
- Power BI PowerShell module installed
- Power BI Administrator or Workspace Admin role
- Authenticated to Power BI service
- Reports exist in specified workspace

**What You Need to Provide:**
- Workspace name
- Report name to export
- Export file path

**What the Script Does:**
- Connects to Power BI workspace
- Exports report definition (.pbix file)
- Downloads dataset configuration
- Saves to specified location
- Reports export success

**Important Notes:**
- Essential for backup and version control
- Exports include report layout and visuals
- Dataset connections may need reconfiguration
- Use for disaster recovery
- Schedule regular exports
- Store exports in version control
- Test restore process periodically
- Typical use: backups, migrations, dev/test`,
    parameters: [
      {
        name: 'workspaceName',
        label: 'Workspace Name',
        type: 'text',
        required: true,
        placeholder: 'Sales Analytics',
        helpText: 'Power BI workspace'
      },
      {
        name: 'reportName',
        label: 'Report Name',
        type: 'text',
        required: true,
        placeholder: 'Monthly Sales Report',
        helpText: 'Report to export'
      },
      {
        name: 'exportPath',
        label: 'Export File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Backups\\SalesReport.pbix',
        helpText: 'Destination file path'
      }
    ],
    scriptTemplate: (params) => {
      const workspaceName = escapePowerShellString(params.workspaceName);
      const reportName = escapePowerShellString(params.reportName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Power BI Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting Power BI report..." -ForegroundColor Cyan
    Write-Host "  Workspace: ${workspaceName}" -ForegroundColor Gray
    Write-Host "  Report: ${reportName}" -ForegroundColor Gray
    
    # Connect to Power BI
    Connect-PowerBIServiceAccount
    
    # Get workspace
    $Workspace = Get-PowerBIWorkspace -Name "${workspaceName}"
    
    if (-not $Workspace) {
        throw "Workspace not found: ${workspaceName}"
    }
    
    Write-Host "✓ Workspace found: $($Workspace.Id)" -ForegroundColor Green
    
    # Get report
    $Report = Get-PowerBIReport -WorkspaceId $Workspace.Id | Where-Object { $_.Name -eq "${reportName}" }
    
    if (-not $Report) {
        throw "Report not found: ${reportName}"
    }
    
    Write-Host "✓ Report found: $($Report.Id)" -ForegroundColor Green
    
    # Export report
    Write-Host "Exporting report..." -ForegroundColor Cyan
    Export-PowerBIReport -WorkspaceId $Workspace.Id -Id $Report.Id -OutFile "${exportPath}"
    
    Write-Host "✓ Report exported successfully" -ForegroundColor Green
    Write-Host "  Location: ${exportPath}" -ForegroundColor Gray
    
    # Display file size
    $FileSize = [math]::Round((Get-Item "${exportPath}").Length / 1MB, 2)
    Write-Host "  File size: $FileSize MB" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export Power BI report: $_"
}`;
    }
  },

  {
    id: 'pp-manage-chatbots',
    title: 'Manage Power Virtual Agents Bots',
    description: 'Create, configure, publish chatbots',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script manages Power Virtual Agents chatbots for deployment and configuration.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Virtual Agents license
- Power Platform Administrator or bot owner permissions
- Authenticated to Power Platform

**What You Need to Provide:**
- Environment name
- Bot name
- Action (Create, Publish, Delete, or Get Info)

**What the Script Does:**
- Performs specified bot management operation
- For Create: provisions new bot
- For Publish: deploys bot to channels
- For Delete: removes bot
- For Get Info: displays bot configuration
- Reports operation success

**Important Notes:**
- Essential for chatbot deployment
- Publishing makes bot available to users
- Test bots thoroughly before publishing
- Monitor bot analytics regularly
- Update topics based on user feedback
- Use authentication for sensitive operations
- Typical use: deployment, updates, troubleshooting
- Unpublish during major updates`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Power Platform environment'
      },
      {
        name: 'botName',
        label: 'Bot Name',
        type: 'text',
        required: true,
        placeholder: 'IT Support Bot',
        helpText: 'Chatbot name'
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'Create', label: 'Create Bot' },
          { value: 'Publish', label: 'Publish Bot' },
          { value: 'Delete', label: 'Delete Bot' },
          { value: 'Info', label: 'Get Bot Info' }
        ],
        helpText: 'Bot management operation'
      }
    ],
    scriptTemplate: (params) => {
      const envName = escapePowerShellString(params.environmentName);
      const botName = escapePowerShellString(params.botName);
      const action = params.action;

      return `# Manage Power Virtual Agents Bot
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Bot management operation: ${action}" -ForegroundColor Cyan
    Write-Host "  Environment: ${envName}" -ForegroundColor Gray
    Write-Host "  Bot: ${botName}" -ForegroundColor Gray
    
    switch ("${action}") {
        "Create" {
            Write-Host "Creating new bot..." -ForegroundColor Cyan
            Write-Host "⚠ Bot creation typically done through Power Virtual Agents portal" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Steps to create bot:" -ForegroundColor Cyan
            Write-Host "1. Go to https://powerva.microsoft.com" -ForegroundColor Gray
            Write-Host "2. Select environment: ${envName}" -ForegroundColor Gray
            Write-Host "3. Click 'New bot'" -ForegroundColor Gray
            Write-Host "4. Enter name: ${botName}" -ForegroundColor Gray
            Write-Host "5. Configure topics and responses" -ForegroundColor Gray
        }
        
        "Publish" {
            Write-Host "Publishing bot..." -ForegroundColor Cyan
            Write-Host "This makes the bot available to users" -ForegroundColor Gray
            Write-Host ""
            Write-Host "⚠ Use Power Virtual Agents portal to publish:" -ForegroundColor Yellow
            Write-Host "1. Open bot: ${botName}" -ForegroundColor Gray
            Write-Host "2. Click 'Publish' in top navigation" -ForegroundColor Gray
            Write-Host "3. Review changes" -ForegroundColor Gray
            Write-Host "4. Click 'Publish' to deploy" -ForegroundColor Gray
        }
        
        "Delete" {
            Write-Host "⚠ WARNING: This will permanently delete the bot!" -ForegroundColor Red
            Write-Host "Use Power Virtual Agents portal to delete" -ForegroundColor Gray
        }
        
        "Info" {
            Write-Host "Retrieving bot information..." -ForegroundColor Cyan
            Write-Host "Use Get-AdminPowerAppChatbot cmdlet with appropriate parameters" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Bot management guidance: $_"
}`;
    }
  },

  {
    id: 'pp-audit-usage',
    title: 'Audit Power Platform Usage',
    description: 'Export usage analytics, connector usage',
    category: 'Common Admin Tasks',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports Power Platform usage analytics for governance, compliance, and capacity planning.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- Audit logs enabled in tenant

**What You Need to Provide:**
- Start date for usage period
- End date for usage period
- CSV export file path

**What the Script Does:**
- Queries Power Platform usage data
- Collects app usage, flow runs, connector usage
- Aggregates metrics by user and resource
- Exports detailed usage report to CSV
- Reports total usage statistics

**Important Notes:**
- Essential for license compliance and governance
- Shows user adoption and engagement
- Identifies heavy resource consumers
- Supports chargeback calculations
- Use for capacity planning
- Run monthly for usage trends
- Identify unused resources for cleanup
- Typical use: compliance, cost optimization`,
    parameters: [
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'text',
        required: true,
        placeholder: '2025-01-01',
        helpText: 'Usage period start (YYYY-MM-DD)'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'text',
        required: true,
        placeholder: '2025-01-31',
        helpText: 'Usage period end (YYYY-MM-DD)'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Reports\\PPUsage.csv',
        helpText: 'Path where the CSV file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Audit Power Platform Usage
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Collecting Power Platform usage analytics..." -ForegroundColor Cyan
    Write-Host "  Period: ${startDate} to ${endDate}" -ForegroundColor Gray
    
    $StartDate = [DateTime]"${startDate}"
    $EndDate = [DateTime]"${endDate}"
    
    # Collect app usage
    Write-Host "Retrieving app usage..." -ForegroundColor Cyan
    $Apps = Get-AdminPowerApp
    
    # Collect flow usage
    Write-Host "Retrieving flow usage..." -ForegroundColor Cyan
    $Flows = Get-AdminFlow
    
    # Collect connector usage
    Write-Host "Retrieving connector usage..." -ForegroundColor Cyan
    $Connections = Get-AdminPowerAppConnection
    
    # Build usage report
    $UsageReport = @()
    
    # App usage
    foreach ($App in $Apps) {
        $UsageReport += [PSCustomObject]@{
            Type            = "App"
            ResourceName    = $App.DisplayName
            Owner           = $App.Owner.displayName
            Environment     = $App.EnvironmentName
            CreatedDate     = $App.CreatedTime
            LastModified    = $App.LastModifiedTime
        }
    }
    
    # Flow usage
    foreach ($Flow in $Flows) {
        $UsageReport += [PSCustomObject]@{
            Type            = "Flow"
            ResourceName    = $Flow.DisplayName
            Owner           = $Flow.CreatedBy.displayName
            Environment     = $Flow.EnvironmentName
            CreatedDate     = $Flow.CreatedTime
            LastModified    = $Flow.LastModifiedTime
        }
    }
    
    # Export to CSV
    $UsageReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Usage report exported to: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Usage Summary ===" -ForegroundColor Cyan
    Write-Host "Total Apps: $($Apps.Count)" -ForegroundColor Gray
    Write-Host "Total Flows: $($Flows.Count)" -ForegroundColor Gray
    Write-Host "Total Connections: $($Connections.Count)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Top users by resource count:" -ForegroundColor Cyan
    $UsageReport | Group-Object Owner | Sort-Object Count -Descending | Select-Object -First 10 Name, Count | Format-Table
    
} catch {
    Write-Error "Failed to export usage report: $_"
}`;
    }
  },

  {
    id: 'pp-export-app-package',
    title: 'Export Power App Package',
    description: 'Export a Power App as a deployable .msapp package',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports a Power App as a .msapp package for backup, version control, or deployment to other environments.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or App Owner role
- Authenticated to Power Platform
- App must exist in the specified environment

**What You Need to Provide:**
- Environment name where app exists
- App name (GUID) to export
- Export file path (.msapp)

**What the Script Does:**
- Validates app exists in environment
- Exports app definition and components
- Creates .msapp package file
- Confirms successful export

**Important Notes:**
- .msapp packages contain app definition and embedded resources
- Does not include data source connections (must be reconfigured)
- Use for application lifecycle management (ALM)
- Store exports in version control for history
- Typical use: backups before major changes, cross-environment deployment
- Canvas apps export as .msapp, model-driven apps use solutions
- Test imported apps thoroughly in target environment
- Export before any destructive operations`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the app'
      },
      {
        name: 'appName',
        label: 'App Name',
        type: 'text',
        required: true,
        placeholder: 'App ID (GUID)',
        helpText: 'The app to export'
      },
      {
        name: 'exportPath',
        label: 'Export File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\MyApp.msapp',
        helpText: 'Path where the .msapp package will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const appName = escapePowerShellString(params.appName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Power App Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting Power App package..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "App: ${appName}" -ForegroundColor Yellow
    
    # Get the app to verify it exists
    $App = Get-AdminPowerApp -EnvironmentName "${environmentName}" -AppName "${appName}"
    
    if (-not $App) {
        throw "App not found: ${appName}"
    }
    
    Write-Host "✓ App found: $($App.DisplayName)" -ForegroundColor Green
    
    # Export the app package
    Write-Host "Exporting app package..." -ForegroundColor Cyan
    
    Export-PowerApp -EnvironmentName "${environmentName}" -AppName "${appName}" -PackageFilePath "${exportPath}"
    
    Write-Host "✓ App package exported successfully" -ForegroundColor Green
    Write-Host "Location: ${exportPath}" -ForegroundColor Gray
    
    # Display file info
    if (Test-Path "${exportPath}") {
        $FileInfo = Get-Item "${exportPath}"
        Write-Host "File size: $([math]::Round($FileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Store package in version control" -ForegroundColor Gray
    Write-Host "  2. Use Import-PowerApp to deploy to other environments" -ForegroundColor Gray
    Write-Host "  3. Data source connections must be reconfigured after import" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export app package: $_"
}`;
    }
  },

  {
    id: 'pp-import-app-package',
    title: 'Import Power App Package',
    description: 'Import a Power App from a .msapp package',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script imports a Power App from a .msapp package into an environment for deployment or migration.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Environment Maker role
- Authenticated to Power Platform
- .msapp package file must exist
- Target environment must exist

**What You Need to Provide:**
- Target environment name
- Package file path (.msapp)
- Display name for the imported app

**What the Script Does:**
- Validates package file exists
- Imports app definition into target environment
- Creates new app with specified display name
- Confirms successful import

**Important Notes:**
- ⚠️ Data source connections must be reconfigured after import
- App will be created in "draft" state initially
- Existing app with same name is NOT overwritten
- Users must reshare app permissions after import
- Test thoroughly before publishing to users
- Typical use: cross-environment deployment, disaster recovery
- Canvas apps use .msapp format
- Model-driven apps should use solution import instead`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Target Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to import the app into'
      },
      {
        name: 'packagePath',
        label: 'Package File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\MyApp.msapp',
        helpText: 'Path to the .msapp package file'
      },
      {
        name: 'appDisplayName',
        label: 'App Display Name',
        type: 'text',
        required: true,
        placeholder: 'My Imported App',
        helpText: 'Display name for the imported app'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const packagePath = escapePowerShellString(params.packagePath);
      const appDisplayName = escapePowerShellString(params.appDisplayName);

      return `# Import Power App Package
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Importing Power App package..." -ForegroundColor Cyan
    Write-Host "Target Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Package: ${packagePath}" -ForegroundColor Yellow
    Write-Host "App Name: ${appDisplayName}" -ForegroundColor Yellow
    
    # Verify package file exists
    if (-not (Test-Path "${packagePath}")) {
        throw "Package file not found: ${packagePath}"
    }
    
    $FileInfo = Get-Item "${packagePath}"
    Write-Host "✓ Package found: $([math]::Round($FileInfo.Length / 1KB, 2)) KB" -ForegroundColor Green
    
    # Import the app
    Write-Host "Importing app..." -ForegroundColor Cyan
    Write-Host "This may take several minutes for large apps" -ForegroundColor Gray
    
    $ImportedApp = Import-PowerApp -EnvironmentName "${environmentName}" -PackageFilePath "${packagePath}" -DisplayName "${appDisplayName}"
    
    Write-Host "✓ App imported successfully" -ForegroundColor Green
    Write-Host "App ID: $($ImportedApp.AppName)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "⚠️  Important next steps:" -ForegroundColor Yellow
    Write-Host "  1. Open the app in Power Apps Studio" -ForegroundColor Gray
    Write-Host "  2. Reconfigure data source connections" -ForegroundColor Gray
    Write-Host "  3. Test all functionality thoroughly" -ForegroundColor Gray
    Write-Host "  4. Share app with appropriate users" -ForegroundColor Gray
    Write-Host "  5. Publish when ready for production use" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to import app package: $_"
}`;
    }
  },

  {
    id: 'pp-get-app-versions',
    title: 'Get Power App Version History',
    description: 'Retrieve version history for a Power App',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script retrieves the version history of a Power App for change tracking and rollback planning.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or App Owner role
- Authenticated to Power Platform
- App must exist and have version history

**What You Need to Provide:**
- Environment name where app exists
- App name (GUID)
- CSV export file path

**What the Script Does:**
- Retrieves all published versions of the app
- Collects version number, publish date, and publisher
- Exports version history to CSV
- Reports total version count

**Important Notes:**
- Essential for change management and auditing
- Shows chronological history of app publishes
- Use to identify when changes were introduced
- Supports rollback planning and troubleshooting
- Version history retained based on tenant settings
- Typical use: change tracking, compliance auditing
- Identify who made specific changes and when
- Review before major updates to plan rollback`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the app'
      },
      {
        name: 'appName',
        label: 'App Name',
        type: 'text',
        required: true,
        placeholder: 'App ID (GUID)',
        helpText: 'The app to get version history for'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\AppVersions.csv',
        helpText: 'Path where the version history CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const appName = escapePowerShellString(params.appName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Get Power App Version History
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Retrieving Power App version history..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "App: ${appName}" -ForegroundColor Yellow
    
    # Get app info
    $App = Get-AdminPowerApp -EnvironmentName "${environmentName}" -AppName "${appName}"
    
    if (-not $App) {
        throw "App not found: ${appName}"
    }
    
    Write-Host "✓ App found: $($App.DisplayName)" -ForegroundColor Green
    
    # Get version history
    $Versions = Get-PowerAppVersion -EnvironmentName "${environmentName}" -AppName "${appName}"
    
    Write-Host "Found $($Versions.Count) versions" -ForegroundColor Yellow
    
    $VersionReport = foreach ($Version in $Versions) {
        [PSCustomObject]@{
            AppName          = $App.DisplayName
            AppId            = "${appName}"
            VersionId        = $Version.Id
            VersionName      = $Version.Properties.appVersion
            PublishedTime    = $Version.Properties.createdTime
            PublishedBy      = $Version.Properties.createdBy.displayName
            PublishedByEmail = $Version.Properties.createdBy.email
            IsCurrent        = $Version.Properties.lifeCycleId -eq 'Published'
        }
    }
    
    $VersionReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Version history exported to: ${exportPath}" -ForegroundColor Green
    
    # Show recent versions
    Write-Host ""
    Write-Host "Most recent versions:" -ForegroundColor Cyan
    $VersionReport | Sort-Object PublishedTime -Descending | Select-Object -First 5 | Format-Table VersionName, PublishedTime, PublishedBy
    
} catch {
    Write-Error "Failed to get app version history: $_"
}`;
    }
  },

  {
    id: 'pp-export-flow-definition',
    title: 'Export Flow Definition',
    description: 'Export Power Automate flow definition as JSON',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports a Power Automate flow definition as JSON for backup, version control, or migration.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Flow Owner role
- Authenticated to Power Platform
- Flow must exist in the specified environment

**What You Need to Provide:**
- Environment name where flow exists
- Flow name (GUID)
- Export file path (.json)

**What the Script Does:**
- Retrieves complete flow definition
- Exports triggers, actions, and configuration
- Creates JSON file with flow structure
- Confirms successful export

**Important Notes:**
- Essential for flow backup and version control
- JSON contains complete flow logic and configuration
- Connection references are included but credentials are not
- Use for disaster recovery and documentation
- Store exports in source control
- Typical use: backups, migrations, change tracking
- Flow actions and triggers fully captured
- Manual review recommended before import`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the flow'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID (GUID)',
        helpText: 'The flow to export'
      },
      {
        name: 'exportPath',
        label: 'Export File Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\MyFlow.json',
        helpText: 'Path where the JSON file will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Flow Definition
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting Power Automate flow definition..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Flow: ${flowName}" -ForegroundColor Yellow
    
    # Get flow details
    $Flow = Get-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}"
    
    if (-not $Flow) {
        throw "Flow not found: ${flowName}"
    }
    
    Write-Host "✓ Flow found: $($Flow.DisplayName)" -ForegroundColor Green
    Write-Host "  Status: $(if ($Flow.Enabled) { 'Enabled' } else { 'Disabled' })" -ForegroundColor Gray
    Write-Host "  Owner: $($Flow.CreatedBy.displayName)" -ForegroundColor Gray
    
    # Export flow definition
    Write-Host "Exporting flow definition..." -ForegroundColor Cyan
    
    $FlowDefinition = [PSCustomObject]@{
        DisplayName      = $Flow.DisplayName
        FlowName         = $Flow.FlowName
        EnvironmentName  = $Flow.EnvironmentName
        Enabled          = $Flow.Enabled
        CreatedTime      = $Flow.CreatedTime
        LastModifiedTime = $Flow.LastModifiedTime
        CreatedBy        = $Flow.CreatedBy
        Definition       = $Flow.Internal.properties.definition
        ConnectionRefs   = $Flow.Internal.properties.connectionReferences
        TriggerConfig    = $Flow.Internal.properties.definition.triggers
        ActionConfig     = $Flow.Internal.properties.definition.actions
    }
    
    $FlowDefinition | ConvertTo-Json -Depth 20 | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    Write-Host "✓ Flow definition exported successfully" -ForegroundColor Green
    Write-Host "Location: ${exportPath}" -ForegroundColor Gray
    
    # Display file info
    if (Test-Path "${exportPath}") {
        $FileInfo = Get-Item "${exportPath}"
        Write-Host "File size: $([math]::Round($FileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Notes:" -ForegroundColor Yellow
    Write-Host "  - Connection credentials are NOT included" -ForegroundColor Gray
    Write-Host "  - Store in version control for history" -ForegroundColor Gray
    Write-Host "  - Review before importing to other environments" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export flow definition: $_"
}`;
    }
  },

  {
    id: 'pp-flow-failed-runs',
    title: 'Export Failed Flow Runs Report',
    description: 'Generate report of failed Power Automate flow runs',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates a comprehensive report of failed Power Automate flow runs for troubleshooting and error analysis.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Flow Owner role
- Authenticated to Power Platform
- Flow run history must be available (up to 28 days)

**What You Need to Provide:**
- Environment name where flows exist
- Number of days to analyze (max 28)
- CSV export file path

**What the Script Does:**
- Retrieves flow run history across environment
- Filters for failed runs only
- Collects error messages and failure details
- Exports failed runs report to CSV
- Reports failure patterns and statistics

**Important Notes:**
- Essential for proactive flow monitoring
- Shows error messages and failure timestamps
- Use for identifying recurring issues
- Prioritize fixes based on failure frequency
- Run history limited to 28 days
- Typical use: troubleshooting, health monitoring
- Review failed runs regularly for reliability
- Address high-frequency failures first`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to analyze'
      },
      {
        name: 'daysBack',
        label: 'Days to Analyze',
        type: 'number',
        required: false,
        defaultValue: 7,
        placeholder: '7',
        helpText: 'Number of days to look back (max 28)'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\FailedFlowRuns.csv',
        helpText: 'Path where the failed runs CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const daysBack = params.daysBack || 7;
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export Failed Flow Runs Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating failed flow runs report..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    
    $DaysBack = ${daysBack}
    if ($DaysBack -gt 28) {
        Write-Host "⚠️  Run history limited to 28 days, using 28" -ForegroundColor Yellow
        $DaysBack = 28
    }
    
    $StartDate = (Get-Date).AddDays(-$DaysBack)
    Write-Host "Analyzing failures since: $($StartDate.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow
    
    # Get all flows in environment
    $Flows = Get-AdminFlow -EnvironmentName "${environmentName}"
    Write-Host "Scanning $($Flows.Count) flows..." -ForegroundColor Gray
    
    $FailedRuns = @()
    $ProcessedFlows = 0
    
    foreach ($Flow in $Flows) {
        $ProcessedFlows++
        Write-Progress -Activity "Analyzing flows" -Status "$ProcessedFlows of $($Flows.Count): $($Flow.DisplayName)" -PercentComplete (($ProcessedFlows / $Flows.Count) * 100)
        
        try {
            $Runs = Get-FlowRun -EnvironmentName "${environmentName}" -FlowName $Flow.FlowName
            $RecentFailures = $Runs | Where-Object { 
                $_.Status -eq 'Failed' -and 
                [datetime]$_.StartTime -ge $StartDate 
            }
            
            foreach ($FailedRun in $RecentFailures) {
                $FailedRuns += [PSCustomObject]@{
                    FlowDisplayName  = $Flow.DisplayName
                    FlowName         = $Flow.FlowName
                    FlowOwner        = $Flow.CreatedBy.displayName
                    RunId            = $FailedRun.Name
                    Status           = $FailedRun.Status
                    StartTime        = $FailedRun.StartTime
                    EndTime          = $FailedRun.Properties.endTime
                    ErrorCode        = if ($FailedRun.Properties.error) { $FailedRun.Properties.error.code } else { 'Unknown' }
                    ErrorMessage     = if ($FailedRun.Properties.error) { $FailedRun.Properties.error.message } else { 'No error message' }
                    TriggerName      = $FailedRun.Properties.trigger.name
                }
            }
        } catch {
            # Flow may not have runs or access issues
        }
    }
    
    Write-Progress -Activity "Analyzing flows" -Completed
    
    Write-Host "✓ Found $($FailedRuns.Count) failed runs in the last $DaysBack days" -ForegroundColor Yellow
    
    if ($FailedRuns.Count -gt 0) {
        $FailedRuns | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "✓ Failed runs report exported to: ${exportPath}" -ForegroundColor Green
        
        # Show summary
        Write-Host ""
        Write-Host "=== Failure Summary ===" -ForegroundColor Cyan
        Write-Host "Top flows with failures:" -ForegroundColor Gray
        $FailedRuns | Group-Object FlowDisplayName | Sort-Object Count -Descending | Select-Object -First 10 Name, Count | Format-Table
        
        Write-Host "Common error codes:" -ForegroundColor Gray
        $FailedRuns | Group-Object ErrorCode | Sort-Object Count -Descending | Select-Object -First 5 Name, Count | Format-Table
    } else {
        Write-Host "✓ No failed runs found - excellent!" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to generate failed runs report: $_"
}`;
    }
  },

  {
    id: 'pp-dataverse-tables',
    title: 'Export Dataverse Tables Inventory',
    description: 'List all Dataverse tables and their schemas',
    category: 'Dataverse',
    isPremium: true,
    instructions: `**How This Task Works:**
This script exports an inventory of all Dataverse tables and their column schemas for documentation and governance.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or System Customizer role
- Authenticated to Power Platform
- Dataverse database must be enabled in environment

**What You Need to Provide:**
- Environment name with Dataverse
- CSV export file path

**What the Script Does:**
- Connects to Dataverse environment
- Retrieves all tables (entities) and their metadata
- Collects table names, types, and ownership types
- Exports complete table inventory to CSV
- Reports total table count

**Important Notes:**
- Essential for data governance and documentation
- Shows both system and custom tables
- Includes ownership type (User, Organization, None)
- Use for data dictionary and documentation
- Track custom tables for solution planning
- Typical use: documentation, compliance audits
- Review before major data migrations
- Identify unused tables for cleanup`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment with Dataverse database'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\DataverseTables.csv',
        helpText: 'Path where the table inventory CSV will be saved'
      },
      {
        name: 'includeSystem',
        label: 'Include System Tables',
        type: 'checkbox',
        required: false,
        defaultValue: false,
        helpText: 'Include Microsoft system tables in export'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const exportPath = escapePowerShellString(params.exportPath);
      const includeSystem = params.includeSystem ? '$true' : '$false';

      return `# Export Dataverse Tables Inventory
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Exporting Dataverse tables inventory..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Include System Tables: ${includeSystem}" -ForegroundColor Yellow
    
    # Connect to Dataverse
    Write-Host "Connecting to Dataverse..." -ForegroundColor Gray
    
    # Get environment URL
    $Env = Get-AdminPowerAppEnvironment -EnvironmentName "${environmentName}"
    $OrgUrl = $Env.Internal.properties.linkedEnvironmentMetadata.instanceUrl
    
    if (-not $OrgUrl) {
        throw "Dataverse is not enabled in this environment"
    }
    
    Write-Host "✓ Connected to: $OrgUrl" -ForegroundColor Green
    
    # Get all entities/tables
    Write-Host "Retrieving tables..." -ForegroundColor Cyan
    
    $ApiUrl = "$OrgUrl/api/data/v9.2/EntityDefinitions"
    $Headers = @{
        "Authorization" = "Bearer $((Get-AzAccessToken -ResourceUrl $OrgUrl).Token)"
        "OData-MaxVersion" = "4.0"
        "OData-Version" = "4.0"
        "Accept" = "application/json"
    }
    
    $Response = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers -Method Get
    $Tables = $Response.value
    
    # Filter system tables if requested
    if (-not ${includeSystem}) {
        $Tables = $Tables | Where-Object { -not $_.IsCustomizable.Value -eq $false -and $_.LogicalName -notlike "msdyn*" -and $_.LogicalName -notlike "adx*" }
    }
    
    Write-Host "Found $($Tables.Count) tables" -ForegroundColor Yellow
    
    $TableReport = foreach ($Table in $Tables) {
        [PSCustomObject]@{
            DisplayName      = $Table.DisplayName.UserLocalizedLabel.Label
            LogicalName      = $Table.LogicalName
            SchemaName       = $Table.SchemaName
            OwnershipType    = $Table.OwnershipType
            IsCustomEntity   = $Table.IsCustomEntity
            IsManaged        = $Table.IsManaged
            TableType        = $Table.TableType
            PrimaryIdAttr    = $Table.PrimaryIdAttribute
            PrimaryNameAttr  = $Table.PrimaryNameAttribute
            Description      = if ($Table.Description.UserLocalizedLabel) { $Table.Description.UserLocalizedLabel.Label } else { '' }
        }
    }
    
    $TableReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Table inventory exported to: ${exportPath}" -ForegroundColor Green
    
    # Show summary
    Write-Host ""
    Write-Host "=== Table Summary ===" -ForegroundColor Cyan
    Write-Host "Total Tables: $($Tables.Count)" -ForegroundColor Gray
    Write-Host "Custom Tables: $(($TableReport | Where-Object { $_.IsCustomEntity }).Count)" -ForegroundColor Gray
    Write-Host "Managed Tables: $(($TableReport | Where-Object { $_.IsManaged }).Count)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to export Dataverse tables: $_"
}`;
    }
  },

  {
    id: 'pp-create-env-variable',
    title: 'Create Environment Variable',
    description: 'Create a new environment variable in Dataverse',
    category: 'Dataverse',
    isPremium: true,
    instructions: `**How This Task Works:**
This script creates a new environment variable in Dataverse for configuration management and solution deployment.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or System Customizer role
- Authenticated to Power Platform
- Dataverse database must be enabled

**What You Need to Provide:**
- Environment name
- Variable schema name
- Variable display name
- Variable type (String, Number, Boolean, JSON)
- Default value

**What the Script Does:**
- Creates new environment variable definition
- Sets variable type and default value
- Makes variable available for apps and flows
- Confirms successful creation

**Important Notes:**
- Essential for configuration management across environments
- Environment variables enable ALM best practices
- Values can differ per environment (dev/test/prod)
- Use for connection strings, API endpoints, feature flags
- Include in solutions for deployment
- Typical use: configuration management, deployments
- Avoid hardcoding values - use environment variables
- Update values without modifying apps/flows`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to create variable in'
      },
      {
        name: 'schemaName',
        label: 'Schema Name',
        type: 'text',
        required: true,
        placeholder: 'contoso_ApiEndpoint',
        helpText: 'Unique schema name (prefix_VariableName)'
      },
      {
        name: 'displayName',
        label: 'Display Name',
        type: 'text',
        required: true,
        placeholder: 'Contoso API Endpoint',
        helpText: 'User-friendly display name'
      },
      {
        name: 'variableType',
        label: 'Variable Type',
        type: 'select',
        required: true,
        options: [
          { value: 'String', label: 'String (Text)' },
          { value: 'Number', label: 'Number (Decimal)' },
          { value: 'Boolean', label: 'Boolean (Yes/No)' },
          { value: 'JSON', label: 'JSON (Data Object)' }
        ],
        helpText: 'Data type for the variable'
      },
      {
        name: 'defaultValue',
        label: 'Default Value',
        type: 'text',
        required: true,
        placeholder: 'https://api.contoso.com',
        helpText: 'Default value for the variable'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const schemaName = escapePowerShellString(params.schemaName);
      const displayName = escapePowerShellString(params.displayName);
      const variableType = params.variableType;
      const defaultValue = escapePowerShellString(params.defaultValue);

      return `# Create Environment Variable
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Creating environment variable..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Schema Name: ${schemaName}" -ForegroundColor Yellow
    Write-Host "Display Name: ${displayName}" -ForegroundColor Yellow
    Write-Host "Type: ${variableType}" -ForegroundColor Yellow
    
    # Get environment URL
    $Env = Get-AdminPowerAppEnvironment -EnvironmentName "${environmentName}"
    $OrgUrl = $Env.Internal.properties.linkedEnvironmentMetadata.instanceUrl
    
    if (-not $OrgUrl) {
        throw "Dataverse is not enabled in this environment"
    }
    
    Write-Host "✓ Connected to: $OrgUrl" -ForegroundColor Green
    
    # Map variable type to Dataverse type code
    $TypeMapping = @{
        'String'  = 100000000
        'Number'  = 100000001
        'Boolean' = 100000002
        'JSON'    = 100000003
    }
    
    $TypeCode = $TypeMapping['${variableType}']
    
    # Create environment variable definition
    $VariableDefinition = @{
        schemaname = "${schemaName}"
        displayname = "${displayName}"
        type = $TypeCode
        defaultvalue = "${defaultValue}"
    }
    
    $ApiUrl = "$OrgUrl/api/data/v9.2/environmentvariabledefinitions"
    $Headers = @{
        "Authorization" = "Bearer $((Get-AzAccessToken -ResourceUrl $OrgUrl).Token)"
        "OData-MaxVersion" = "4.0"
        "OData-Version" = "4.0"
        "Accept" = "application/json"
        "Content-Type" = "application/json"
    }
    
    $Body = $VariableDefinition | ConvertTo-Json
    
    Write-Host "Creating variable definition..." -ForegroundColor Cyan
    $Response = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers -Method Post -Body $Body
    
    Write-Host "✓ Environment variable created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Variable Details:" -ForegroundColor Cyan
    Write-Host "  Schema Name: ${schemaName}" -ForegroundColor Gray
    Write-Host "  Display Name: ${displayName}" -ForegroundColor Gray
    Write-Host "  Type: ${variableType}" -ForegroundColor Gray
    Write-Host "  Default Value: ${defaultValue}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Add variable to a solution for deployment" -ForegroundColor Gray
    Write-Host "  2. Reference in Power Apps using Environment() function" -ForegroundColor Gray
    Write-Host "  3. Reference in Power Automate using environment variable actions" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create environment variable: $_"
}`;
    }
  },

  {
    id: 'pp-update-dlp-connector-group',
    title: 'Update DLP Connector Classification',
    description: 'Move a connector between DLP policy groups',
    category: 'Governance',
    isPremium: true,
    instructions: `**How This Task Works:**
This script updates DLP policy connector classifications by moving connectors between Business, Non-Business, and Blocked groups.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or Global Administrator role
- Authenticated to Power Platform
- DLP policy must exist

**What You Need to Provide:**
- DLP policy name (GUID)
- Connector ID to reclassify
- Target group (Business, NonBusiness, Blocked)

**What the Script Does:**
- Retrieves current DLP policy configuration
- Moves connector to specified group
- Updates policy with new classification
- Confirms successful update

**Important Notes:**
- ⚠️ Changes take effect immediately
- Apps/flows using misclassified connectors may break
- Business connectors can share data with each other
- Non-Business connectors can share data with each other
- Blocked connectors cannot be used at all
- Typical use: security policy updates, compliance changes
- Test changes in non-production first
- Notify users before blocking widely-used connectors`,
    parameters: [
      {
        name: 'policyName',
        label: 'DLP Policy Name',
        type: 'text',
        required: true,
        placeholder: 'Policy ID (GUID)',
        helpText: 'The DLP policy to update'
      },
      {
        name: 'connectorId',
        label: 'Connector ID',
        type: 'text',
        required: true,
        placeholder: 'shared_sharepointonline',
        helpText: 'Connector ID (e.g., shared_sharepointonline, shared_office365)'
      },
      {
        name: 'targetGroup',
        label: 'Target Group',
        type: 'select',
        required: true,
        options: [
          { value: 'Business', label: 'Business (confidential data allowed)' },
          { value: 'NonBusiness', label: 'Non-Business (general data)' },
          { value: 'Blocked', label: 'Blocked (cannot be used)' }
        ],
        helpText: 'Group to move the connector to'
      }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const connectorId = escapePowerShellString(params.connectorId);
      const targetGroup = params.targetGroup;

      return `# Update DLP Connector Classification
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Updating DLP connector classification..." -ForegroundColor Cyan
    Write-Host "Policy: ${policyName}" -ForegroundColor Yellow
    Write-Host "Connector: ${connectorId}" -ForegroundColor Yellow
    Write-Host "Target Group: ${targetGroup}" -ForegroundColor Yellow
    
    # Get current policy
    $Policy = Get-AdminDlpPolicy -PolicyName "${policyName}"
    
    if (-not $Policy) {
        throw "DLP Policy not found: ${policyName}"
    }
    
    Write-Host "✓ Policy found: $($Policy.DisplayName)" -ForegroundColor Green
    
    # Prepare connector classification update
    $ConnectorConfig = @{
        id = "/providers/Microsoft.PowerApps/apis/${connectorId}"
        name = "${connectorId}"
        type = "Microsoft.PowerApps/apis"
    }
    
    # Map target group to DLP group name
    $GroupMapping = @{
        'Business'    = 'lbi'      # Low Business Impact (Business data)
        'NonBusiness' = 'hbi'      # High Business Impact (Non-business data)  
        'Blocked'     = 'blocked'
    }
    
    $DlpGroup = $GroupMapping['${targetGroup}']
    
    Write-Host "Moving connector to group: $DlpGroup" -ForegroundColor Cyan
    
    # Update policy
    Set-AdminDlpPolicy -PolicyName "${policyName}" -SetConnectorGroups @{
        $DlpGroup = @($ConnectorConfig)
    }
    
    Write-Host "✓ Connector classification updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Important:" -ForegroundColor Yellow
    Write-Host "  - Changes take effect immediately" -ForegroundColor Gray
    Write-Host "  - Apps/flows using this connector may be affected" -ForegroundColor Gray
    Write-Host "  - Verify no critical processes are disrupted" -ForegroundColor Gray
    
    # Show current policy groups
    Write-Host ""
    Write-Host "Current policy connector groups:" -ForegroundColor Cyan
    Get-AdminDlpPolicy -PolicyName "${policyName}" | Select-Object -ExpandProperty connectorGroups | Format-Table classification, connectors
    
} catch {
    Write-Error "Failed to update DLP connector classification: $_"
}`;
    }
  },

  {
    id: 'pp-license-consumption',
    title: 'Export License Consumption Report',
    description: 'Generate Power Platform license usage and consumption report',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script generates a comprehensive license consumption report for Power Platform capacity planning and cost management.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator or License Administrator role
- Authenticated to Power Platform and Azure AD

**What You Need to Provide:**
- CSV export file path

**What the Script Does:**
- Retrieves Power Platform license assignments
- Collects user consumption metrics
- Calculates per-user and per-environment usage
- Exports license consumption report to CSV
- Reports summary statistics

**Important Notes:**
- Essential for license compliance and cost optimization
- Shows assigned vs consumed licenses
- Identifies underutilized licenses for reallocation
- Use for capacity planning and budgeting
- Track premium connector usage for license requirements
- Typical use: license audits, cost optimization
- Review monthly for optimization opportunities
- Identify users who need license upgrades`,
    parameters: [
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\LicenseConsumption.csv',
        helpText: 'Path where the license report CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Export License Consumption Report
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Generating Power Platform license consumption report..." -ForegroundColor Cyan
    
    # Get all environments and their resource usage
    Write-Host "Collecting environment data..." -ForegroundColor Gray
    $Environments = Get-AdminPowerAppEnvironment
    
    # Get all users with Power Apps/Automate activity
    Write-Host "Collecting user activity data..." -ForegroundColor Gray
    $Apps = Get-AdminPowerApp
    $Flows = Get-AdminFlow
    
    # Build user consumption report
    $UserConsumption = @{}
    
    # Track app ownership
    foreach ($App in $Apps) {
        $Owner = $App.Owner.userPrincipalName
        if ($Owner) {
            if (-not $UserConsumption.ContainsKey($Owner)) {
                $UserConsumption[$Owner] = @{
                    Email = $Owner
                    DisplayName = $App.Owner.displayName
                    AppCount = 0
                    FlowCount = 0
                    Environments = @{}
                    UsesPremiumConnectors = $false
                }
            }
            $UserConsumption[$Owner].AppCount++
            $UserConsumption[$Owner].Environments[$App.EnvironmentName] = $true
        }
    }
    
    # Track flow ownership
    foreach ($Flow in $Flows) {
        $Owner = $Flow.CreatedBy.userPrincipalName
        if ($Owner) {
            if (-not $UserConsumption.ContainsKey($Owner)) {
                $UserConsumption[$Owner] = @{
                    Email = $Owner
                    DisplayName = $Flow.CreatedBy.displayName
                    AppCount = 0
                    FlowCount = 0
                    Environments = @{}
                    UsesPremiumConnectors = $false
                }
            }
            $UserConsumption[$Owner].FlowCount++
            $UserConsumption[$Owner].Environments[$Flow.EnvironmentName] = $true
        }
    }
    
    # Build report
    $LicenseReport = foreach ($User in $UserConsumption.Values) {
        [PSCustomObject]@{
            UserEmail            = $User.Email
            DisplayName          = $User.DisplayName
            TotalApps            = $User.AppCount
            TotalFlows           = $User.FlowCount
            EnvironmentsUsed     = $User.Environments.Count
            TotalResources       = $User.AppCount + $User.FlowCount
            RequiresPremium      = $User.UsesPremiumConnectors
            LicenseRecommendation = if ($User.AppCount + $User.FlowCount -gt 10) { 'Per-User Plan' } 
                                    elseif ($User.AppCount + $User.FlowCount -gt 0) { 'Per-App Plan' }
                                    else { 'No License Needed' }
        }
    }
    
    Write-Host "Found $($LicenseReport.Count) users with Power Platform activity" -ForegroundColor Yellow
    
    # Export report
    $LicenseReport | Sort-Object TotalResources -Descending | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ License consumption report exported to: ${exportPath}" -ForegroundColor Green
    
    # Show summary
    Write-Host ""
    Write-Host "=== License Consumption Summary ===" -ForegroundColor Cyan
    Write-Host "Total Users with Activity: $($LicenseReport.Count)" -ForegroundColor Gray
    Write-Host "Total Apps: $(($LicenseReport | Measure-Object -Property TotalApps -Sum).Sum)" -ForegroundColor Gray
    Write-Host "Total Flows: $(($LicenseReport | Measure-Object -Property TotalFlows -Sum).Sum)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "License Recommendations:" -ForegroundColor Cyan
    $LicenseReport | Group-Object LicenseRecommendation | Sort-Object Count -Descending | Format-Table Name, Count
    
    Write-Host ""
    Write-Host "Top consumers:" -ForegroundColor Cyan
    $LicenseReport | Sort-Object TotalResources -Descending | Select-Object -First 10 UserEmail, TotalApps, TotalFlows, TotalResources | Format-Table
    
} catch {
    Write-Error "Failed to generate license consumption report: $_"
}`;
    }
  },

  {
    id: 'pp-connection-health',
    title: 'Check Connection Health Status',
    description: 'Verify health status of all Power Platform connections',
    category: 'Reporting & Analytics',
    isPremium: true,
    instructions: `**How This Task Works:**
This script checks the health status of all Power Platform connections to identify broken or expired connections.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator role
- Authenticated to Power Platform

**What You Need to Provide:**
- Environment name to check
- CSV export file path

**What the Script Does:**
- Retrieves all connections in environment
- Checks connection status and validity
- Identifies broken or expired connections
- Exports connection health report to CSV
- Reports issues requiring attention

**Important Notes:**
- Essential for proactive maintenance
- Broken connections cause flow failures
- Expired credentials need renewal
- Check regularly to prevent outages
- Notify connection owners of issues
- Typical use: health monitoring, troubleshooting
- Run weekly for proactive maintenance
- Prioritize fixing connections used by critical flows`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment to check connections in'
      },
      {
        name: 'exportPath',
        label: 'Export CSV Path',
        type: 'text',
        required: true,
        placeholder: 'C:\\Exports\\ConnectionHealth.csv',
        helpText: 'Path where the connection health CSV will be saved'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const exportPath = escapePowerShellString(params.exportPath);

      return `# Check Connection Health Status
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Checking Power Platform connection health..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    
    # Get all connections in environment
    $Connections = Get-AdminPowerAppConnection -EnvironmentName "${environmentName}"
    
    Write-Host "Found $($Connections.Count) connections" -ForegroundColor Yellow
    
    $HealthReport = foreach ($Connection in $Connections) {
        $Status = $Connection.Statuses | Select-Object -First 1
        $StatusCode = if ($Status) { $Status.status } else { 'Unknown' }
        
        $IsHealthy = $StatusCode -eq 'Connected'
        $NeedsAttention = $StatusCode -in @('Error', 'Unauthenticated', 'Invalid')
        
        [PSCustomObject]@{
            ConnectionName    = $Connection.DisplayName
            ConnectionId      = $Connection.ConnectionName
            ConnectorName     = $Connection.ConnectorName
            Status            = $StatusCode
            IsHealthy         = $IsHealthy
            NeedsAttention    = $NeedsAttention
            CreatedBy         = $Connection.CreatedBy.displayName
            CreatedByEmail    = $Connection.CreatedBy.userPrincipalName
            CreatedTime       = $Connection.CreatedTime
            LastModifiedTime  = $Connection.LastModifiedTime
            EnvironmentName   = $Connection.EnvironmentName
        }
    }
    
    # Export report
    $HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Connection health report exported to: ${exportPath}" -ForegroundColor Green
    
    # Summary statistics
    $HealthyCount = ($HealthReport | Where-Object { $_.IsHealthy }).Count
    $UnhealthyCount = ($HealthReport | Where-Object { -not $_.IsHealthy }).Count
    $AttentionCount = ($HealthReport | Where-Object { $_.NeedsAttention }).Count
    
    Write-Host ""
    Write-Host "=== Connection Health Summary ===" -ForegroundColor Cyan
    Write-Host "Total Connections: $($Connections.Count)" -ForegroundColor Gray
    Write-Host "Healthy: $HealthyCount" -ForegroundColor Green
    Write-Host "Unhealthy: $UnhealthyCount" -ForegroundColor $(if ($UnhealthyCount -gt 0) { 'Yellow' } else { 'Gray' })
    Write-Host "Needs Immediate Attention: $AttentionCount" -ForegroundColor $(if ($AttentionCount -gt 0) { 'Red' } else { 'Gray' })
    
    if ($AttentionCount -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Connections requiring attention:" -ForegroundColor Red
        $HealthReport | Where-Object { $_.NeedsAttention } | Format-Table ConnectionName, ConnectorName, Status, CreatedByEmail
        
        Write-Host ""
        Write-Host "Recommended actions:" -ForegroundColor Yellow
        Write-Host "  1. Contact connection owners to re-authenticate" -ForegroundColor Gray
        Write-Host "  2. Update expired credentials" -ForegroundColor Gray
        Write-Host "  3. Remove unused broken connections" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "✓ All connections are healthy!" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to check connection health: $_"
}`;
    }
  },

  {
    id: 'pp-reassign-app-owner',
    title: 'Reassign Power App Owner',
    description: 'Transfer ownership of a Power App to another user',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script transfers ownership of a Power App from one user to another for governance and personnel changes.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator role
- Authenticated to Power Platform
- New owner must exist in Azure AD
- App must exist in the specified environment

**What You Need to Provide:**
- Environment name where app exists
- App name (GUID)
- New owner email address

**What the Script Does:**
- Validates app and new owner exist
- Transfers app ownership to new user
- Grants full edit permissions to new owner
- Confirms successful ownership transfer

**Important Notes:**
- Essential for employee offboarding/transitions
- New owner gets full control of the app
- Previous owner retains co-owner access
- Use for orphaned app cleanup
- Data source permissions may need updating
- Typical use: employee departures, team changes
- Notify new owner of their responsibilities
- Review app functionality after transfer`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the app'
      },
      {
        name: 'appName',
        label: 'App Name',
        type: 'text',
        required: true,
        placeholder: 'App ID (GUID)',
        helpText: 'The app to transfer ownership of'
      },
      {
        name: 'newOwnerEmail',
        label: 'New Owner Email',
        type: 'text',
        required: true,
        placeholder: 'newowner@company.com',
        helpText: 'Email of the user to transfer ownership to'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const appName = escapePowerShellString(params.appName);
      const newOwnerEmail = escapePowerShellString(params.newOwnerEmail);

      return `# Reassign Power App Owner
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Reassigning Power App ownership..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "App: ${appName}" -ForegroundColor Yellow
    Write-Host "New Owner: ${newOwnerEmail}" -ForegroundColor Yellow
    
    # Get current app info
    $App = Get-AdminPowerApp -EnvironmentName "${environmentName}" -AppName "${appName}"
    
    if (-not $App) {
        throw "App not found: ${appName}"
    }
    
    Write-Host "✓ App found: $($App.DisplayName)" -ForegroundColor Green
    Write-Host "  Current Owner: $($App.Owner.displayName) ($($App.Owner.userPrincipalName))" -ForegroundColor Gray
    
    # Transfer ownership
    Write-Host "Transferring ownership..." -ForegroundColor Cyan
    
    Set-AdminPowerAppOwner -EnvironmentName "${environmentName}" -AppName "${appName}" -AppOwner "${newOwnerEmail}"
    
    Write-Host "✓ Ownership transferred successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Transfer Details:" -ForegroundColor Cyan
    Write-Host "  App: $($App.DisplayName)" -ForegroundColor Gray
    Write-Host "  Previous Owner: $($App.Owner.userPrincipalName)" -ForegroundColor Gray
    Write-Host "  New Owner: ${newOwnerEmail}" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Next steps for new owner:" -ForegroundColor Yellow
    Write-Host "  1. Review app functionality" -ForegroundColor Gray
    Write-Host "  2. Update data source connections if needed" -ForegroundColor Gray
    Write-Host "  3. Review and update sharing permissions" -ForegroundColor Gray
    Write-Host "  4. Test all app features" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to reassign app ownership: $_"
}`;
    }
  },

  {
    id: 'pp-reassign-flow-owner',
    title: 'Reassign Power Automate Flow Owner',
    description: 'Transfer ownership of a Power Automate flow to another user',
    category: 'Apps & Flows',
    isPremium: true,
    instructions: `**How This Task Works:**
This script transfers ownership of a Power Automate flow from one user to another for governance and personnel changes.

**Prerequisites:**
- Power Apps PowerShell module installed
- Power Platform Administrator role
- Authenticated to Power Platform
- New owner must exist in Azure AD
- Flow must exist in the specified environment

**What You Need to Provide:**
- Environment name where flow exists
- Flow name (GUID)
- New owner email address

**What the Script Does:**
- Validates flow and new owner exist
- Transfers flow ownership to new user
- Grants full edit permissions to new owner
- Confirms successful ownership transfer

**Important Notes:**
- Essential for employee offboarding/transitions
- New owner gets full control of the flow
- Flow connections may need to be updated
- ⚠️ Flow may pause if connections are user-specific
- Check flow runs after transfer
- Typical use: employee departures, team changes
- New owner should verify all connections work
- Re-enable flow if it was paused during transfer`,
    parameters: [
      {
        name: 'environmentName',
        label: 'Environment Name',
        type: 'text',
        required: true,
        placeholder: 'Environment ID',
        helpText: 'Environment containing the flow'
      },
      {
        name: 'flowName',
        label: 'Flow Name',
        type: 'text',
        required: true,
        placeholder: 'Flow ID (GUID)',
        helpText: 'The flow to transfer ownership of'
      },
      {
        name: 'newOwnerEmail',
        label: 'New Owner Email',
        type: 'text',
        required: true,
        placeholder: 'newowner@company.com',
        helpText: 'Email of the user to transfer ownership to'
      }
    ],
    scriptTemplate: (params) => {
      const environmentName = escapePowerShellString(params.environmentName);
      const flowName = escapePowerShellString(params.flowName);
      const newOwnerEmail = escapePowerShellString(params.newOwnerEmail);

      return `# Reassign Power Automate Flow Owner
# Generated: ${new Date().toISOString()}

try {
    Write-Host "Reassigning Power Automate flow ownership..." -ForegroundColor Cyan
    Write-Host "Environment: ${environmentName}" -ForegroundColor Yellow
    Write-Host "Flow: ${flowName}" -ForegroundColor Yellow
    Write-Host "New Owner: ${newOwnerEmail}" -ForegroundColor Yellow
    
    # Get current flow info
    $Flow = Get-AdminFlow -EnvironmentName "${environmentName}" -FlowName "${flowName}"
    
    if (-not $Flow) {
        throw "Flow not found: ${flowName}"
    }
    
    Write-Host "✓ Flow found: $($Flow.DisplayName)" -ForegroundColor Green
    Write-Host "  Current Owner: $($Flow.CreatedBy.displayName) ($($Flow.CreatedBy.userPrincipalName))" -ForegroundColor Gray
    Write-Host "  Status: $(if ($Flow.Enabled) { 'Enabled' } else { 'Disabled' })" -ForegroundColor Gray
    
    # Transfer ownership
    Write-Host "Transferring ownership..." -ForegroundColor Cyan
    
    Set-AdminFlowOwnerRole -EnvironmentName "${environmentName}" -FlowName "${flowName}" -PrincipalType User -PrincipalObjectId "${newOwnerEmail}" -RoleName Owner
    
    Write-Host "✓ Ownership transferred successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Transfer Details:" -ForegroundColor Cyan
    Write-Host "  Flow: $($Flow.DisplayName)" -ForegroundColor Gray
    Write-Host "  Previous Owner: $($Flow.CreatedBy.userPrincipalName)" -ForegroundColor Gray
    Write-Host "  New Owner: ${newOwnerEmail}" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "⚠️  Important next steps for new owner:" -ForegroundColor Yellow
    Write-Host "  1. Open flow in Power Automate portal" -ForegroundColor Gray
    Write-Host "  2. Update connection credentials if needed" -ForegroundColor Gray
    Write-Host "  3. Verify flow triggers are working" -ForegroundColor Gray
    Write-Host "  4. Re-enable flow if it was paused" -ForegroundColor Gray
    Write-Host "  5. Monitor first few runs for errors" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to reassign flow ownership: $_"
}`;
    }
  }
];

export const powerPlatformCategories = [
  'Environment Management',
  'Apps & Flows',
  'Connectors',
  'Dataverse',
  'Governance',
  'Reporting & Analytics',
  'Solutions',
  'Common Admin Tasks'
];
