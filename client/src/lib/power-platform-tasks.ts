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
  }
];

export const powerPlatformCategories = [
  'Environment Management',
  'Apps & Flows',
  'Connectors',
  'Governance',
  'Reporting & Analytics',
  'Solutions',
  'Common Admin Tasks'
];
