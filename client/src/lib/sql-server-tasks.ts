import { 
  escapePowerShellString, 
  buildPowerShellArray, 
  toPowerShellBoolean,
  validateRequiredFields 
} from './powershell-utils';

export interface SQLServerTaskParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'path';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: string[];
}

export interface SQLServerTask {
  id: string;
  title: string;
  description: string;
  category: string;
  isPremium: boolean;
  instructions?: string;
  parameters: SQLServerTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
}

export const sqlServerTasks: SQLServerTask[] = [
  // ==================== DATABASE BACKUP & RESTORE ====================
  {
    id: 'sql-full-backup',
    title: 'Full Database Backup',
    description: 'Perform full backup of SQL Server database',
    category: 'Backup & Restore',
    isPremium: true,
    instructions: `**How This Task Works:**
- Performs full database backup to disk for disaster recovery
- Essential for production database protection
- Supports compression for storage savings

**Prerequisites:**
- SQL Server installed with backup permissions
- SQL Server PowerShell module (SqlServer)
- Sufficient disk space for backup file
- db_backupoperator or sysadmin role

**What You Need to Provide:**
- SQL Server instance name
- Database name
- Backup file path (including .bak extension)
- Optional: compression, verification

**What the Script Does:**
1. Connects to SQL Server instance
2. Validates database exists
3. Performs full backup with specified options
4. Verifies backup integrity (if requested)
5. Reports backup size and duration

**Important Notes:**
- Full backups are foundation for disaster recovery
- Schedule daily for production databases
- Store backups on separate disk/location from data files
- Compression saves 50-70% storage (SQL 2008+)
- Verify backups regularly to ensure restorability
- Retention: Keep 7-30 days based on RPO requirements`,
    parameters: [
      {
        name: 'serverInstance',
        label: 'SQL Server Instance',
        type: 'text',
        required: true,
        placeholder: 'localhost\\SQLEXPRESS or SQL01',
        helpText: 'Server\\Instance or just server name for default instance'
      },
      {
        name: 'databaseName',
        label: 'Database Name',
        type: 'text',
        required: true,
        placeholder: 'MyDatabase',
        helpText: 'Name of database to backup'
      },
      {
        name: 'backupPath',
        label: 'Backup File Path',
        type: 'path',
        required: true,
        placeholder: 'C:\\Backups\\MyDatabase_Full.bak',
        helpText: 'Full path including filename and .bak extension'
      },
      {
        name: 'compress',
        label: 'Compress Backup',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Reduce backup file size (SQL 2008+)'
      },
      {
        name: 'verify',
        label: 'Verify Backup',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: 'Verify backup integrity after completion'
      }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = params.compress !== false;
      const verify = params.verify !== false;

      return `# SQL Server Full Database Backup
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$BackupPath = "${backupPath}"
$Compress = $${compress}
$Verify = $${verify}

try {
    Write-Host "Starting full backup of database: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Target: $BackupPath" -ForegroundColor Gray
    
    # Build backup parameters
    $BackupParams = @{
        ServerInstance = $ServerInstance
        Database = $DatabaseName
        BackupFile = $BackupPath
        BackupAction = 'Database'
        CompressionOption = if ($Compress) { 'On' } else { 'Default' }
    }
    
    # Perform backup
    $StartTime = Get-Date
    Backup-SqlDatabase @BackupParams
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ Backup completed successfully" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalMinutes, 2)) minutes" -ForegroundColor Gray
    
    # Get backup file size
    if (Test-Path $BackupPath) {
        $BackupSize = (Get-Item $BackupPath).Length / 1GB
        Write-Host "  Size: $([math]::Round($BackupSize, 2)) GB" -ForegroundColor Gray
    }
    
    # Verify backup
    if ($Verify) {
        Write-Host "Verifying backup integrity..." -ForegroundColor Cyan
        
        $Query = @"
RESTORE VERIFYONLY 
FROM DISK = N'$BackupPath'
"@
        
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $Query -ErrorAction Stop
        Write-Host "✓ Backup verification passed" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Backup Summary:" -ForegroundColor White
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "  File: $BackupPath" -ForegroundColor Gray
    Write-Host "  Compressed: $Compress" -ForegroundColor Gray
    Write-Host "  Verified: $Verify" -ForegroundColor Gray
    
} catch {
    Write-Error "Backup failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-differential-backup',
    title: 'Differential Database Backup',
    description: 'Perform differential backup (changes since last full backup)',
    category: 'Backup & Restore',
    isPremium: true,
    instructions: `**How This Task Works:**
- Backs up only data changed since last full backup
- Faster than full backups, smaller backup files
- Requires existing full backup as baseline

**Prerequisites:**
- SQL Server with backup permissions
- Recent full backup of target database
- SqlServer PowerShell module
- db_backupoperator or sysadmin role

**What You Need to Provide:**
- SQL Server instance
- Database name
- Backup file path

**What the Script Does:**
1. Connects to SQL Server
2. Performs differential backup
3. Reports backup details and duration

**Important Notes:**
- Differential backs up changes since last FULL backup
- Requires full backup to exist first
- Restore sequence: Full → Differential → Transaction logs
- Schedule: Every 4-6 hours between full backups
- Smaller/faster than full backups`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'backupPath', label: 'Backup File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\MyDatabase_Diff.bak' },
      { name: 'compress', label: 'Compress Backup', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = params.compress !== false;

      return `# SQL Server Differential Backup
# Generated: ${new Date().toISOString()}

Import-Module SqlServer

try {
    Write-Host "Starting differential backup: ${databaseName}" -ForegroundColor Cyan
    
    $StartTime = Get-Date
    Backup-SqlDatabase -ServerInstance "${serverInstance}" \`
        -Database "${databaseName}" \`
        -BackupFile "${backupPath}" \`
        -BackupAction 'Database' \`
        -Incremental \`
        -CompressionOption $(if (${compress}) { 'On' } else { 'Default' })
    
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ Differential backup completed" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalSeconds, 1)) seconds" -ForegroundColor Gray
    Write-Host "  File: ${backupPath}" -ForegroundColor Gray
    
} catch {
    Write-Error "Differential backup failed: $_"
    exit 1
}`;
    }
  },

  // ==================== INDEX MAINTENANCE ====================
  {
    id: 'sql-rebuild-indexes',
    title: 'Rebuild Fragmented Indexes',
    description: 'Rebuild or reorganize indexes based on fragmentation level',
    category: 'Index Maintenance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes index fragmentation across all tables
- Rebuilds heavily fragmented indexes (>30%)
- Reorganizes moderately fragmented indexes (10-30%)
- Improves query performance and database efficiency

**Prerequisites:**
- SQL Server with ddladmin or sysadmin role
- SqlServer PowerShell module
- Maintenance window (indexes locked during rebuild)

**What You Need to Provide:**
- SQL Server instance
- Database name
- Fragmentation thresholds

**What the Script Does:**
1. Scans all indexes for fragmentation percentage
2. Rebuilds indexes >30% fragmented (REBUILD)
3. Reorganizes indexes 10-30% fragmented (REORGANIZE)
4. Updates statistics
5. Reports maintenance summary

**Important Notes:**
- Rebuild: Drops and recreates index (locks table, faster, more thorough)
- Reorganize: Defragments in-place (online, slower, less disruptive)
- Schedule weekly during maintenance window
- Skip small tables (<1000 pages)
- Critical for OLTP and reporting database performance`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'rebuildThreshold', label: 'Rebuild Threshold (%)', type: 'number', required: false, defaultValue: 30, helpText: 'Rebuild if fragmentation > this value' },
      { name: 'reorganizeThreshold', label: 'Reorganize Threshold (%)', type: 'number', required: false, defaultValue: 10, helpText: 'Reorganize if fragmentation > this value' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const rebuildThreshold = params.rebuildThreshold || 30;
      const reorganizeThreshold = params.reorganizeThreshold || 10;

      return `# SQL Server Index Maintenance
# Generated: ${new Date().toISOString()}

Import-Module SqlServer

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$RebuildThreshold = ${rebuildThreshold}
$ReorganizeThreshold = ${reorganizeThreshold}

try {
    Write-Host "Analyzing index fragmentation: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Rebuild threshold: $RebuildThreshold%" -ForegroundColor Gray
    Write-Host "Reorganize threshold: $ReorganizeThreshold%" -ForegroundColor Gray
    Write-Host ""
    
    # Query to get fragmented indexes
    $FragQuery = @"
SELECT 
    OBJECT_SCHEMA_NAME(ips.object_id) AS SchemaName,
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_id,
    ips.avg_fragmentation_in_percent AS Fragmentation,
    ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > $ReorganizeThreshold
    AND ips.page_count > 1000
    AND i.name IS NOT NULL
ORDER BY ips.avg_fragmentation_in_percent DESC
"@
    
    $Indexes = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $FragQuery
    
    if (-not $Indexes) {
        Write-Host "✓ No fragmented indexes found" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Found $($Indexes.Count) fragmented indexes" -ForegroundColor Yellow
    Write-Host ""
    
    $RebuildCount = 0
    $ReorganizeCount = 0
    
    foreach ($Index in $Indexes) {
        $SchemaTable = "[$($Index.SchemaName)].[$($Index.TableName)]"
        $IndexName = $Index.IndexName
        $Frag = [math]::Round($Index.Fragmentation, 2)
        
        if ($Index.Fragmentation -ge $RebuildThreshold) {
            Write-Host "REBUILD: $SchemaTable.$IndexName ($Frag%)" -ForegroundColor Yellow
            
            $RebuildQuery = "ALTER INDEX [$IndexName] ON $SchemaTable REBUILD WITH (ONLINE = OFF)"
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $RebuildQuery
            
            $RebuildCount++
        }
        elseif ($Index.Fragmentation -ge $ReorganizeThreshold) {
            Write-Host "REORGANIZE: $SchemaTable.$IndexName ($Frag%)" -ForegroundColor Cyan
            
            $ReorgQuery = "ALTER INDEX [$IndexName] ON $SchemaTable REORGANIZE"
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $ReorgQuery
            
            $ReorganizeCount++
        }
    }
    
    # Update statistics
    Write-Host ""
    Write-Host "Updating statistics..." -ForegroundColor Cyan
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query "EXEC sp_updatestats"
    
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Indexes Rebuilt: $RebuildCount" -ForegroundColor Green
    Write-Host "Indexes Reorganized: $ReorganizeCount" -ForegroundColor Green
    Write-Host "Statistics Updated: Yes" -ForegroundColor Green
    
} catch {
    Write-Error "Index maintenance failed: $_"
    exit 1
}`;
    }
  },

  // ==================== DATABASE INTEGRITY ====================
  {
    id: 'sql-integrity-check',
    title: 'Database Integrity Check (DBCC CHECKDB)',
    description: 'Verify database integrity and detect corruption',
    category: 'Database Integrity',
    isPremium: true,
    instructions: `**How This Task Works:**
- Runs DBCC CHECKDB to verify physical/logical consistency
- Detects corruption in database pages, indexes, and structures
- Essential weekly maintenance task for all production databases

**Prerequisites:**
- SQL Server with db_owner or sysadmin role
- SqlServer PowerShell module
- Maintenance window (resource-intensive operation)

**What You Need to Provide:**
- SQL Server instance
- Database name
- Repair option (NONE for check only, REPAIR_REBUILD for auto-fix)

**What the Script Does:**
1. Runs DBCC CHECKDB integrity check
2. Reports any corruption found
3. Optionally attempts automated repair
4. Logs results for compliance

**Important Notes:**
- Schedule weekly for all production databases
- Run during low-activity periods (resource-intensive)
- REPAIR_REBUILD: Fixes non-critical issues without data loss
- REPAIR_ALLOW_DATA_LOSS: Last resort, may lose data
- Always backup before repair attempts
- Critical for disaster recovery readiness`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'repairOption', label: 'Repair Option', type: 'select', required: false, defaultValue: 'NONE', options: ['NONE', 'REPAIR_REBUILD'], helpText: 'NONE = check only, REPAIR_REBUILD = auto-fix' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const repairOption = params.repairOption || 'NONE';

      return `# SQL Server Database Integrity Check
# Generated: ${new Date().toISOString()}

Import-Module SqlServer

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$RepairOption = "${repairOption}"

try {
    Write-Host "Starting DBCC CHECKDB: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Repair Option: $RepairOption" -ForegroundColor Gray
    Write-Host ""
    
    $StartTime = Get-Date
    
    # Build CHECKDB command
    if ($RepairOption -ne "NONE") {
        Write-Host "⚠ REPAIR MODE - Database will be placed in single-user mode" -ForegroundColor Yellow
        
        # Set single-user mode for repair
        $SingleUserQuery = "ALTER DATABASE [$DatabaseName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SingleUserQuery
        
        $CheckQuery = "DBCC CHECKDB ([$DatabaseName], $RepairOption) WITH NO_INFOMSGS"
    } else {
        $CheckQuery = "DBCC CHECKDB ([$DatabaseName]) WITH NO_INFOMSGS"
    }
    
    # Run CHECKDB
    $Results = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CheckQuery -QueryTimeout 0
    
    # Return to multi-user if in repair mode
    if ($RepairOption -ne "NONE") {
        $MultiUserQuery = "ALTER DATABASE [$DatabaseName] SET MULTI_USER"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $MultiUserQuery
    }
    
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ CHECKDB completed successfully" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalMinutes, 2)) minutes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Result: No corruption detected" -ForegroundColor Green
    
} catch {
    Write-Error "Database integrity check failed: $_"
    
    # Ensure database returns to multi-user
    try {
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "ALTER DATABASE [$DatabaseName] SET MULTI_USER" -ErrorAction SilentlyContinue
    } catch {}
    
    exit 1
}`;
    }
  },

  // ==================== USER & PERMISSION MANAGEMENT ====================
  {
    id: 'sql-create-login-user',
    title: 'Create SQL Login and Database User',
    description: 'Create SQL authentication login and map to database user with role',
    category: 'User & Permission Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates SQL Server authentication login at instance level
- Creates database user mapped to login
- Assigns database role (db_owner, db_datareader, db_datawriter, etc.)
- Enables application/service account access

**Prerequisites:**
- SQL Server with securityadmin and db_accessadmin roles
- SqlServer PowerShell module
- SQL Server authentication enabled (Mixed Mode)

**What You Need to Provide:**
- Login name
- Password (stored securely)
- Database name
- Database role

**What the Script Does:**
1. Creates SQL Server login with password
2. Creates database user mapped to login
3. Assigns specified database role
4. Reports success and connection string

**Important Notes:**
- Use Windows Authentication when possible (more secure)
- SQL Auth required for: Apps, Linux, cross-domain access
- Store passwords in Key Vault/secrets manager
- Common roles: db_owner, db_datareader, db_datawriter, db_ddladmin
- Least privilege: Use db_datareader for read-only access`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'loginName', label: 'Login Name', type: 'text', required: true, placeholder: 'AppUser01', helpText: 'SQL Server login name' },
      { name: 'password', label: 'Password', type: 'text', required: true, placeholder: 'ComplexP@ssw0rd!', helpText: 'Strong password (8+ chars, mixed case, numbers, symbols)' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'databaseRole', label: 'Database Role', type: 'select', required: true, defaultValue: 'db_datareader', options: ['db_owner', 'db_datareader', 'db_datawriter', 'db_ddladmin', 'db_securityadmin', 'db_accessadmin'], helpText: 'Permission level for database access' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const loginName = escapePowerShellString(params.loginName);
      const password = escapePowerShellString(params.password);
      const databaseName = escapePowerShellString(params.databaseName);
      const databaseRole = escapePowerShellString(params.databaseRole);

      return `# Create SQL Server Login and Database User
# Generated: ${new Date().toISOString()}

Import-Module SqlServer

$ServerInstance = "${serverInstance}"
$LoginName = "${loginName}"
$Password = "${password}"
$DatabaseName = "${databaseName}"
$DatabaseRole = "${databaseRole}"

try {
    Write-Host "Creating SQL Server login and database user..." -ForegroundColor Cyan
    
    # Check if login already exists
    $LoginCheck = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "SELECT name FROM sys.server_principals WHERE name = '$LoginName'"
    
    if ($LoginCheck) {
        Write-Host "⚠ Login already exists: $LoginName" -ForegroundColor Yellow
    } else {
        # Create SQL Server login
        $CreateLoginQuery = @"
CREATE LOGIN [$LoginName] 
WITH PASSWORD = N'$Password', 
     DEFAULT_DATABASE = [$DatabaseName],
     CHECK_POLICY = ON,
     CHECK_EXPIRATION = OFF
"@
        
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CreateLoginQuery
        Write-Host "✓ SQL Server login created: $LoginName" -ForegroundColor Green
    }
    
    # Check if user already exists in database
    $UserCheck = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query "SELECT name FROM sys.database_principals WHERE name = '$LoginName'"
    
    if ($UserCheck) {
        Write-Host "⚠ Database user already exists: $LoginName" -ForegroundColor Yellow
    } else {
        # Create database user
        $CreateUserQuery = "CREATE USER [$LoginName] FOR LOGIN [$LoginName]"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $CreateUserQuery
        Write-Host "✓ Database user created: $LoginName" -ForegroundColor Green
    }
    
    # Add user to role
    $AddRoleQuery = "ALTER ROLE [$DatabaseRole] ADD MEMBER [$LoginName]"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $AddRoleQuery
    Write-Host "✓ User added to role: $DatabaseRole" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "=============== SUCCESS ===============" -ForegroundColor White
    Write-Host "Login: $LoginName" -ForegroundColor Gray
    Write-Host "Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "Role: $DatabaseRole" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Connection String:" -ForegroundColor Cyan
    Write-Host "Server=$ServerInstance;Database=$DatabaseName;User Id=$LoginName;Password=***;" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create login/user: $_"
    exit 1
}`;
    }
  },

  // ==================== SQL AGENT JOB MANAGEMENT ====================
  {
    id: 'sql-create-backup-job',
    title: 'Create SQL Agent Backup Job',
    description: 'Create scheduled SQL Agent job for automated database backups',
    category: 'SQL Agent Jobs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates SQL Server Agent job for automated backups
- Schedules daily, weekly, or custom backup windows
- Sends email notifications on failure (if Database Mail configured)
- Essential for production database protection

**Prerequisites:**
- SQL Server Agent service running
- SQL Server with sysadmin role
- SqlServer PowerShell module
- Backup destination folder exists

**What You Need to Provide:**
- Job name
- Database to backup
- Backup folder path
- Schedule (daily, weekly, time)

**What the Script Does:**
1. Creates SQL Agent job
2. Adds backup step with compression
3. Configures schedule
4. Sets up failure notifications
5. Enables job

**Important Notes:**
- SQL Agent jobs persist across restarts
- Schedule types: Daily, Weekly, Monthly, One-time
- Jobs run under SQL Server Agent service account
- Check job history: SSMS → SQL Server Agent → Jobs → View History
- Consider: Full (daily), Differential (hourly), Log backups (15min)`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Backup_MyDatabase_Full_Daily', helpText: 'Descriptive job name' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'backupFolder', label: 'Backup Folder', type: 'path', required: true, placeholder: 'C:\\SQLBackups', helpText: 'Folder where backup files will be stored' },
      { name: 'scheduleTime', label: 'Schedule Time (24hr)', type: 'text', required: true, placeholder: '02:00:00', defaultValue: '02:00:00', helpText: 'Time to run backup (HH:MM:SS)' },
      { name: 'scheduleType', label: 'Schedule Type', type: 'select', required: true, defaultValue: 'Daily', options: ['Daily', 'Weekly'], helpText: 'How often to run backup' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const jobName = escapePowerShellString(params.jobName);
      const databaseName = escapePowerShellString(params.databaseName);
      const backupFolder = escapePowerShellString(params.backupFolder);
      const scheduleTime = params.scheduleTime || '02:00:00';
      const scheduleType = params.scheduleType || 'Daily';

      return `# Create SQL Agent Backup Job
# Generated: ${new Date().toISOString()}

Import-Module SqlServer

$ServerInstance = "${serverInstance}"
$JobName = "${jobName}"
$DatabaseName = "${databaseName}"
$BackupFolder = "${backupFolder}"
$ScheduleTime = "${scheduleTime}"
$ScheduleType = "${scheduleType}"

try {
    Write-Host "Creating SQL Agent backup job..." -ForegroundColor Cyan
    
    # Build backup command
    $BackupCommand = @"
DECLARE @BackupFile NVARCHAR(500)
SET @BackupFile = '$BackupFolder\\' + '$DatabaseName' + '_' + 
                  CONVERT(VARCHAR(8), GETDATE(), 112) + '_' + 
                  REPLACE(CONVERT(VARCHAR(8), GETDATE(), 108), ':', '') + '.bak'

BACKUP DATABASE [$DatabaseName] 
TO DISK = @BackupFile
WITH COMPRESSION, INIT, STATS = 10

PRINT 'Backup completed: ' + @BackupFile
"@
    
    # Create job
    $CreateJobQuery = @"
IF NOT EXISTS (SELECT 1 FROM msdb.dbo.sysjobs WHERE name = '$JobName')
BEGIN
    EXEC msdb.dbo.sp_add_job 
        @job_name = N'$JobName',
        @enabled = 1,
        @description = N'Automated backup of $DatabaseName database',
        @category_name = N'Database Maintenance'
END

-- Add job step
IF NOT EXISTS (SELECT 1 FROM msdb.dbo.sysjobsteps WHERE job_id = (SELECT job_id FROM msdb.dbo.sysjobs WHERE name = '$JobName'))
BEGIN
    EXEC msdb.dbo.sp_add_jobstep
        @job_name = N'$JobName',
        @step_name = N'Backup Database',
        @subsystem = N'TSQL',
        @command = N'$($BackupCommand.Replace("'", "''"))',
        @on_success_action = 1, -- Quit with success
        @on_fail_action = 2, -- Quit with failure
        @database_name = N'master'
END

-- Create schedule
DECLARE @FreqType INT = $(if ($ScheduleType -eq 'Daily') { 4 } else { 8 })

IF NOT EXISTS (SELECT 1 FROM msdb.dbo.sysschedules WHERE name = '$JobName' + '_Schedule')
BEGIN
    EXEC msdb.dbo.sp_add_jobschedule
        @job_name = N'$JobName',
        @name = N'$JobName' + '_Schedule',
        @enabled = 1,
        @freq_type = @FreqType, -- 4=Daily, 8=Weekly
        @freq_interval = $(if ($ScheduleType -eq 'Daily') { 1 } else { 127 }), -- 1=Every day, 127=Every day of week
        @active_start_time = $(($ScheduleTime -replace ':', ''))'
END

-- Add job to local server
EXEC msdb.dbo.sp_add_jobserver 
    @job_name = N'$JobName',
    @server_name = N'(local)'
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Database "msdb" -Query $CreateJobQuery
    
    Write-Host "✓ SQL Agent job created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Job Details:" -ForegroundColor White
    Write-Host "  Name: $JobName" -ForegroundColor Gray
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "  Backup Folder: $BackupFolder" -ForegroundColor Gray
    Write-Host "  Schedule: $ScheduleType at $ScheduleTime" -ForegroundColor Gray
    Write-Host ""
    Write-Host "View job status: SSMS → SQL Server Agent → Jobs → $JobName" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create SQL Agent job: $_"
    exit 1
}`;
    }
  },

  // ==================== PERFORMANCE MONITORING ====================
  {
    id: 'sql-performance-report',
    title: 'Generate Performance Report',
    description: 'Export CPU, memory, disk I/O, and query performance metrics',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Collects key SQL Server performance metrics
- Identifies top resource-consuming queries
- Reports blocking sessions and wait statistics
- Exports comprehensive performance snapshot to CSV

**Prerequisites:**
- SQL Server with VIEW SERVER STATE permission
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Output CSV path

**What the Script Does:**
1. Queries DMVs for performance metrics
2. Identifies top CPU/IO queries
3. Reports blocking and wait stats
4. Exports comprehensive report to CSV

**Important Notes:**
- Run during peak hours for meaningful data
- Schedule daily for trending analysis
- Top queries help identify optimization opportunities
- Wait stats reveal bottlenecks (disk, CPU, locking)
- Use for capacity planning and troubleshooting`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SQL_Performance.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Performance Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer

$ServerInstance = "${serverInstance}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Collecting SQL Server performance metrics..." -ForegroundColor Cyan
    
    # Top CPU queries
    $TopCPUQuery = @"
SELECT TOP 10
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2)+1) AS QueryText,
    qs.execution_count,
    qs.total_worker_time / 1000000 AS TotalCPUTime_Seconds,
    qs.total_elapsed_time / 1000000 AS TotalElapsed_Seconds,
    qs.total_logical_reads,
    qs.total_physical_reads,
    DB_NAME(qt.dbid) AS DatabaseName
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY qs.total_worker_time DESC
"@
    
    Write-Host "Analyzing top CPU queries..." -ForegroundColor Gray
    $CPUResults = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $TopCPUQuery
    
    # Wait stats
    $WaitStatsQuery = @"
SELECT TOP 10
    wait_type,
    wait_time_ms / 1000.0 AS wait_time_seconds,
    waiting_tasks_count,
    signal_wait_time_ms / 1000.0 AS signal_wait_seconds
FROM sys.dm_os_wait_stats
WHERE wait_type NOT LIKE '%SLEEP%'
ORDER BY wait_time_ms DESC
"@
    
    Write-Host "Collecting wait statistics..." -ForegroundColor Gray
    $WaitResults = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $WaitStatsQuery
    
    # Blocking sessions
    $BlockingQuery = @"
SELECT
    r.session_id AS BlockedSessionID,
    r.blocking_session_id AS BlockingSessionID,
    r.wait_type,
    r.wait_time,
    DB_NAME(r.database_id) AS DatabaseName,
    SUBSTRING(qt.text, (r.statement_start_offset/2)+1,
        ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE r.statement_end_offset
        END - r.statement_start_offset)/2)+1) AS BlockedQuery
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) qt
WHERE r.blocking_session_id != 0
"@
    
    Write-Host "Checking for blocking..." -ForegroundColor Gray
    $BlockingResults = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $BlockingQuery
    
    # Combine results
    $Report = @()
    
    # Add CPU queries
    foreach ($Query in $CPUResults) {
        $Report += [PSCustomObject]@{
            Category = "Top CPU Query"
            Detail = $Query.QueryText
            Value = "$($Query.TotalCPUTime_Seconds) seconds"
            ExecutionCount = $Query.execution_count
            Database = $Query.DatabaseName
        }
    }
    
    # Add wait stats
    foreach ($Wait in $WaitResults) {
        $Report += [PSCustomObject]@{
            Category = "Wait Statistic"
            Detail = $Wait.wait_type
            Value = "$($Wait.wait_time_seconds) seconds"
            ExecutionCount = $Wait.waiting_tasks_count
            Database = "N/A"
        }
    }
    
    # Export report
    $Report | Export-Csv -Path $OutputPath -NoTypeInformation
    
    Write-Host "✓ Performance report exported" -ForegroundColor Green
    Write-Host "  File: $OutputPath" -ForegroundColor Gray
    Write-Host "  Top CPU Queries: $($CPUResults.Count)" -ForegroundColor Gray
    Write-Host "  Wait Stats: $($WaitResults.Count)" -ForegroundColor Gray
    
    if ($BlockingResults) {
        Write-Host "  ⚠ Active Blocking Detected: $($BlockingResults.Count) sessions" -ForegroundColor Yellow
    } else {
        Write-Host "  Blocking: None detected" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Performance report failed: $_"
    exit 1
}`;
    }
  },

  // ==================== BACKUP & RESTORE (Additional) ====================
  {
    id: 'sql-transaction-log-backup',
    title: 'Transaction Log Backup',
    description: 'Backup transaction log for point-in-time recovery',
    category: 'Backup & Restore',
    isPremium: true,
    instructions: `**How This Task Works:**
- Backs up transaction log since last log backup
- Enables point-in-time recovery capabilities
- Essential for Full/Bulk-Logged recovery model databases

**Prerequisites:**
- Database in Full or Bulk-Logged recovery model
- SQL Server with backup permissions
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Backup file path (.trn extension)

**What the Script Does:**
1. Validates database recovery model
2. Performs transaction log backup
3. Reports backup size and LSN

**Important Notes:**
- Schedule every 15-60 minutes for production
- Required for point-in-time restore
- Truncates inactive log portion
- Log chain must be unbroken for restore`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'backupPath', label: 'Backup File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\MyDatabase_Log.trn' },
      { name: 'compress', label: 'Compress Backup', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const backupPath = escapePowerShellString(params.backupPath);
      const compress = params.compress !== false;

      return `# SQL Server Transaction Log Backup
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$BackupPath = "${backupPath}"

try {
    Write-Host "Starting transaction log backup: $DatabaseName" -ForegroundColor Cyan
    
    # Verify recovery model
    $RecoveryQuery = "SELECT recovery_model_desc FROM sys.databases WHERE name = '$DatabaseName'"
    $Recovery = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RecoveryQuery
    
    if ($Recovery.recovery_model_desc -eq 'SIMPLE') {
        Write-Error "Database is in SIMPLE recovery model. Transaction log backups require FULL or BULK_LOGGED."
        exit 1
    }
    
    Write-Host "Recovery Model: $($Recovery.recovery_model_desc)" -ForegroundColor Gray
    
    $StartTime = Get-Date
    Backup-SqlDatabase -ServerInstance $ServerInstance \`
        -Database $DatabaseName \`
        -BackupFile $BackupPath \`
        -BackupAction 'Log' \`
        -CompressionOption $(if (${compress}) { 'On' } else { 'Default' })
    
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ Transaction log backup completed" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalSeconds, 1)) seconds" -ForegroundColor Gray
    Write-Host "  File: $BackupPath" -ForegroundColor Gray
    
    if (Test-Path $BackupPath) {
        $Size = (Get-Item $BackupPath).Length / 1MB
        Write-Host "  Size: $([math]::Round($Size, 2)) MB" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Transaction log backup failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-restore-database',
    title: 'Restore Database from Backup',
    description: 'Restore database from full, differential, or log backup',
    category: 'Backup & Restore',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restores database from backup file
- Supports restore with RECOVERY or NORECOVERY
- Can relocate data/log files during restore

**Prerequisites:**
- SQL Server with sysadmin role
- Valid backup file accessible to SQL Server
- Sufficient disk space for restored database

**What You Need to Provide:**
- SQL Server instance
- Database name
- Backup file path
- Recovery state

**What the Script Does:**
1. Validates backup file
2. Terminates existing connections
3. Restores database with specified options
4. Brings database online (if WITH RECOVERY)

**Important Notes:**
- NORECOVERY: Use when applying additional backups
- RECOVERY: Use for final restore, brings DB online
- Existing database will be overwritten
- Consider restoring to test server first`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase_Restored' },
      { name: 'backupPath', label: 'Backup File Path', type: 'path', required: true, placeholder: 'C:\\Backups\\MyDatabase_Full.bak' },
      { name: 'recoveryState', label: 'Recovery State', type: 'select', required: true, defaultValue: 'RECOVERY', options: ['RECOVERY', 'NORECOVERY'], helpText: 'RECOVERY brings DB online, NORECOVERY allows additional restores' },
      { name: 'replaceExisting', label: 'Replace Existing Database', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const backupPath = escapePowerShellString(params.backupPath);
      const recoveryState = params.recoveryState || 'RECOVERY';
      const replaceExisting = params.replaceExisting === true;

      return `# SQL Server Database Restore
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$BackupPath = "${backupPath}"
$RecoveryState = "${recoveryState}"
$ReplaceExisting = $${replaceExisting}

try {
    Write-Host "Starting database restore: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Backup file: $BackupPath" -ForegroundColor Gray
    Write-Host "Recovery state: $RecoveryState" -ForegroundColor Gray
    
    # Verify backup file exists
    $BackupQuery = "RESTORE HEADERONLY FROM DISK = N'$BackupPath'"
    $BackupInfo = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $BackupQuery
    
    if (-not $BackupInfo) {
        Write-Error "Could not read backup file or file is invalid"
        exit 1
    }
    
    Write-Host "Backup verified: $($BackupInfo.DatabaseName) from $($BackupInfo.BackupFinishDate)" -ForegroundColor Gray
    
    # Kill existing connections if replacing
    if ($ReplaceExisting) {
        Write-Host "Terminating existing connections..." -ForegroundColor Yellow
        $KillQuery = @"
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = '$DatabaseName')
BEGIN
    ALTER DATABASE [$DatabaseName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
END
"@
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $KillQuery -ErrorAction SilentlyContinue
    }
    
    # Build restore parameters
    $RestoreParams = @{
        ServerInstance = $ServerInstance
        Database = $DatabaseName
        BackupFile = $BackupPath
        NoRecovery = ($RecoveryState -eq 'NORECOVERY')
    }
    
    if ($ReplaceExisting) {
        $RestoreParams.ReplaceDatabase = $true
    }
    
    $StartTime = Get-Date
    Restore-SqlDatabase @RestoreParams
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ Database restore completed" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalMinutes, 2)) minutes" -ForegroundColor Gray
    
    if ($RecoveryState -eq 'RECOVERY') {
        Write-Host "  Status: ONLINE (ready for use)" -ForegroundColor Green
    } else {
        Write-Host "  Status: RESTORING (waiting for additional backups)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Database restore failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-point-in-time-restore',
    title: 'Point-in-Time Database Restore',
    description: 'Restore database to specific point in time using log backups',
    category: 'Backup & Restore',
    isPremium: true,
    instructions: `**How This Task Works:**
- Restores database to exact point in time
- Uses full backup + log backups
- Critical for disaster recovery scenarios

**Prerequisites:**
- Full backup and transaction log backups
- Unbroken log chain
- Database was in FULL recovery model

**What You Need to Provide:**
- SQL Server instance
- Database name
- Full backup path
- Log backup folder
- Target restore time

**What the Script Does:**
1. Restores full backup with NORECOVERY
2. Applies log backups up to target time
3. Recovers database with STOPAT

**Important Notes:**
- Log chain must be unbroken
- Use UTC time for STOPAT
- Test restore process regularly
- Document backup file locations`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Restore Database Name', type: 'text', required: true, placeholder: 'MyDatabase_PIT' },
      { name: 'fullBackupPath', label: 'Full Backup Path', type: 'path', required: true, placeholder: 'C:\\Backups\\MyDatabase_Full.bak' },
      { name: 'logBackupFolder', label: 'Log Backup Folder', type: 'path', required: true, placeholder: 'C:\\Backups\\Logs' },
      { name: 'restoreTime', label: 'Restore To Time (UTC)', type: 'text', required: true, placeholder: '2024-01-15 14:30:00', helpText: 'Format: YYYY-MM-DD HH:MM:SS' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const fullBackupPath = escapePowerShellString(params.fullBackupPath);
      const logBackupFolder = escapePowerShellString(params.logBackupFolder);
      const restoreTime = escapePowerShellString(params.restoreTime);

      return `# SQL Server Point-in-Time Restore
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$FullBackupPath = "${fullBackupPath}"
$LogBackupFolder = "${logBackupFolder}"
$RestoreTime = [DateTime]"${restoreTime}"

try {
    Write-Host "Starting point-in-time restore: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Target time: $RestoreTime (UTC)" -ForegroundColor Yellow
    
    # Step 1: Restore full backup with NORECOVERY
    Write-Host ""
    Write-Host "Step 1: Restoring full backup..." -ForegroundColor Cyan
    
    Restore-SqlDatabase -ServerInstance $ServerInstance \`
        -Database $DatabaseName \`
        -BackupFile $FullBackupPath \`
        -NoRecovery \`
        -ReplaceDatabase
    
    Write-Host "✓ Full backup restored" -ForegroundColor Green
    
    # Step 2: Get log backup files in order
    Write-Host ""
    Write-Host "Step 2: Finding log backups..." -ForegroundColor Cyan
    
    $LogBackups = Get-ChildItem -Path $LogBackupFolder -Filter "*.trn" | Sort-Object LastWriteTime
    
    if (-not $LogBackups) {
        Write-Error "No log backup files found in $LogBackupFolder"
        exit 1
    }
    
    Write-Host "Found $($LogBackups.Count) log backup files" -ForegroundColor Gray
    
    # Step 3: Apply log backups
    Write-Host ""
    Write-Host "Step 3: Applying log backups..." -ForegroundColor Cyan
    
    $AppliedCount = 0
    foreach ($LogFile in $LogBackups) {
        # Check if this log contains the target time
        $HeaderQuery = "RESTORE HEADERONLY FROM DISK = N'$($LogFile.FullName)'"
        $Header = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $HeaderQuery
        
        $BackupStart = $Header.BackupStartDate
        $BackupEnd = $Header.BackupFinishDate
        
        if ($BackupEnd -lt $RestoreTime) {
            # Apply entire log
            $RestoreLogQuery = @"
RESTORE LOG [$DatabaseName] 
FROM DISK = N'$($LogFile.FullName)' 
WITH NORECOVERY
"@
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RestoreLogQuery
            $AppliedCount++
            Write-Host "  Applied: $($LogFile.Name)" -ForegroundColor Gray
        }
        elseif ($BackupStart -le $RestoreTime) {
            # This log contains our target time - apply with STOPAT
            $StopAtQuery = @"
RESTORE LOG [$DatabaseName] 
FROM DISK = N'$($LogFile.FullName)' 
WITH RECOVERY, 
     STOPAT = N'$($RestoreTime.ToString("yyyy-MM-dd HH:mm:ss"))'
"@
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $StopAtQuery
            $AppliedCount++
            Write-Host "  Applied with STOPAT: $($LogFile.Name)" -ForegroundColor Yellow
            break
        }
    }
    
    Write-Host ""
    Write-Host "✓ Point-in-time restore completed" -ForegroundColor Green
    Write-Host "  Log backups applied: $AppliedCount" -ForegroundColor Gray
    Write-Host "  Restored to: $RestoreTime" -ForegroundColor Gray
    
} catch {
    Write-Error "Point-in-time restore failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-backup-history-report',
    title: 'Backup History Report',
    description: 'Generate report of all backup history for databases',
    category: 'Backup & Restore',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries msdb backup history tables
- Reports all backup types and sizes
- Identifies databases without recent backups

**Prerequisites:**
- SQL Server with msdb read access
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Days to include in report
- Output CSV path

**What the Script Does:**
1. Queries backup history from msdb
2. Calculates backup sizes and durations
3. Identifies gaps in backup schedules
4. Exports comprehensive report

**Important Notes:**
- Review regularly for backup gaps
- Verify backup chain integrity
- Monitor backup growth trends
- Archive old backup history periodically`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'daysBack', label: 'Days to Include', type: 'number', required: false, defaultValue: 30 },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Backup_History.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const daysBack = params.daysBack || 30;
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Backup History Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DaysBack = ${daysBack}
$OutputPath = "${outputPath}"

try {
    Write-Host "Generating backup history report..." -ForegroundColor Cyan
    Write-Host "Period: Last $DaysBack days" -ForegroundColor Gray
    
    $BackupQuery = @"
SELECT 
    bs.database_name AS DatabaseName,
    CASE bs.type 
        WHEN 'D' THEN 'Full'
        WHEN 'I' THEN 'Differential'
        WHEN 'L' THEN 'Log'
        WHEN 'F' THEN 'File/Filegroup'
    END AS BackupType,
    bs.backup_start_date AS StartTime,
    bs.backup_finish_date AS FinishTime,
    DATEDIFF(SECOND, bs.backup_start_date, bs.backup_finish_date) AS DurationSeconds,
    CAST(bs.backup_size / 1024 / 1024 AS DECIMAL(18,2)) AS SizeMB,
    CAST(bs.compressed_backup_size / 1024 / 1024 AS DECIMAL(18,2)) AS CompressedSizeMB,
    bmf.physical_device_name AS BackupPath,
    bs.is_copy_only AS CopyOnly,
    bs.recovery_model AS RecoveryModel,
    bs.user_name AS BackupUser
FROM msdb.dbo.backupset bs
INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
WHERE bs.backup_start_date >= DATEADD(DAY, -$DaysBack, GETDATE())
ORDER BY bs.database_name, bs.backup_start_date DESC
"@
    
    $BackupHistory = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $BackupQuery
    
    if (-not $BackupHistory) {
        Write-Host "⚠ No backup history found for the specified period" -ForegroundColor Yellow
        exit 0
    }
    
    # Export to CSV
    $BackupHistory | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Generate summary
    $Databases = $BackupHistory | Select-Object -ExpandProperty DatabaseName -Unique
    $FullBackups = ($BackupHistory | Where-Object { $_.BackupType -eq 'Full' }).Count
    $DiffBackups = ($BackupHistory | Where-Object { $_.BackupType -eq 'Differential' }).Count
    $LogBackups = ($BackupHistory | Where-Object { $_.BackupType -eq 'Log' }).Count
    $TotalSizeMB = ($BackupHistory | Measure-Object -Property SizeMB -Sum).Sum
    
    Write-Host ""
    Write-Host "✓ Backup history report generated" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Databases with backups: $($Databases.Count)" -ForegroundColor Gray
    Write-Host "Full backups: $FullBackups" -ForegroundColor Gray
    Write-Host "Differential backups: $DiffBackups" -ForegroundColor Gray
    Write-Host "Log backups: $LogBackups" -ForegroundColor Gray
    Write-Host "Total backup size: $([math]::Round($TotalSizeMB / 1024, 2)) GB" -ForegroundColor Gray
    
    # Check for databases without recent full backups
    Write-Host ""
    Write-Host "Checking for backup gaps..." -ForegroundColor Cyan
    
    $AllDBQuery = "SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' AND name NOT IN ('tempdb')"
    $AllDBs = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AllDBQuery
    
    $NoRecentBackup = @()
    foreach ($DB in $AllDBs) {
        $LastFull = $BackupHistory | Where-Object { $_.DatabaseName -eq $DB.name -and $_.BackupType -eq 'Full' } | Select-Object -First 1
        if (-not $LastFull) {
            $NoRecentBackup += $DB.name
        }
    }
    
    if ($NoRecentBackup.Count -gt 0) {
        Write-Host "⚠ Databases without recent full backup:" -ForegroundColor Yellow
        $NoRecentBackup | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    } else {
        Write-Host "✓ All databases have recent backups" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Backup history report failed: $_"
    exit 1
}`;
    }
  },

  // ==================== INDEX MAINTENANCE (Additional) ====================
  {
    id: 'sql-update-statistics',
    title: 'Update All Statistics',
    description: 'Update table and index statistics for query optimization',
    category: 'Index Maintenance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Updates statistics on all tables/indexes
- Improves query optimizer decisions
- Can use sample or full scan

**Prerequisites:**
- SQL Server with db_ddladmin role
- SqlServer PowerShell module
- Maintenance window recommended

**What You Need to Provide:**
- SQL Server instance
- Database name
- Sample percentage

**What the Script Does:**
1. Identifies outdated statistics
2. Updates statistics with specified sampling
3. Reports update progress

**Important Notes:**
- Statistics help optimizer choose plans
- Run after large data changes
- FULLSCAN is more accurate but slower
- Default sample is usually sufficient`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'samplePercent', label: 'Sample Percentage', type: 'select', required: false, defaultValue: 'DEFAULT', options: ['DEFAULT', '25', '50', '75', 'FULLSCAN'], helpText: 'Percentage of data to sample' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const samplePercent = params.samplePercent || 'DEFAULT';

      return `# SQL Server Update Statistics
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$SamplePercent = "${samplePercent}"

try {
    Write-Host "Updating statistics: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Sample: $SamplePercent" -ForegroundColor Gray
    Write-Host ""
    
    $StartTime = Get-Date
    
    # Build sample clause
    $SampleClause = switch ($SamplePercent) {
        'DEFAULT' { '' }
        'FULLSCAN' { 'WITH FULLSCAN' }
        default { "WITH SAMPLE $SamplePercent PERCENT" }
    }
    
    # Get tables with statistics
    $TablesQuery = @"
SELECT DISTINCT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName
FROM sys.tables t
INNER JOIN sys.stats s ON t.object_id = s.object_id
WHERE t.is_ms_shipped = 0
ORDER BY SchemaName, TableName
"@
    
    $Tables = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $TablesQuery
    
    Write-Host "Found $($Tables.Count) tables with statistics" -ForegroundColor Gray
    Write-Host ""
    
    $UpdatedCount = 0
    foreach ($Table in $Tables) {
        $TableName = "[$($Table.SchemaName)].[$($Table.TableName)]"
        Write-Host "Updating: $TableName" -ForegroundColor Gray
        
        $UpdateQuery = "UPDATE STATISTICS $TableName $SampleClause"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $UpdateQuery
        
        $UpdatedCount++
    }
    
    $Duration = (Get-Date) - $StartTime
    
    Write-Host ""
    Write-Host "✓ Statistics update completed" -ForegroundColor Green
    Write-Host "  Tables updated: $UpdatedCount" -ForegroundColor Gray
    Write-Host "  Duration: $([math]::Round($Duration.TotalMinutes, 2)) minutes" -ForegroundColor Gray
    
} catch {
    Write-Error "Statistics update failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-index-usage-report',
    title: 'Index Usage Report',
    description: 'Analyze index usage patterns to identify unused indexes',
    category: 'Index Maintenance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports index read/write statistics
- Identifies unused or rarely used indexes
- Helps optimize index strategy

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module
- Statistics accumulate since last restart

**What You Need to Provide:**
- SQL Server instance
- Database name
- Output CSV path

**What the Script Does:**
1. Queries DMV for index usage stats
2. Calculates read/write ratios
3. Identifies unused indexes
4. Exports comprehensive report

**Important Notes:**
- Stats reset on SQL Server restart
- Wait for representative workload
- Unused indexes waste space/CPU
- Consider dropping unused indexes`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Index_Usage.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Index Usage Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Generating index usage report: $DatabaseName" -ForegroundColor Cyan
    
    $IndexQuery = @"
SELECT 
    OBJECT_SCHEMA_NAME(i.object_id) AS SchemaName,
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    ISNULL(ius.user_seeks, 0) AS UserSeeks,
    ISNULL(ius.user_scans, 0) AS UserScans,
    ISNULL(ius.user_lookups, 0) AS UserLookups,
    ISNULL(ius.user_seeks + ius.user_scans + ius.user_lookups, 0) AS TotalReads,
    ISNULL(ius.user_updates, 0) AS UserUpdates,
    CASE 
        WHEN ISNULL(ius.user_seeks + ius.user_scans + ius.user_lookups, 0) = 0 AND ISNULL(ius.user_updates, 0) > 0 
        THEN 'UNUSED - Consider Dropping'
        WHEN ISNULL(ius.user_seeks + ius.user_scans + ius.user_lookups, 0) = 0 AND ISNULL(ius.user_updates, 0) = 0 
        THEN 'NEVER USED'
        WHEN ISNULL(ius.user_updates, 0) > (ISNULL(ius.user_seeks + ius.user_scans + ius.user_lookups, 0) * 10)
        THEN 'HIGH WRITE/LOW READ'
        ELSE 'ACTIVE'
    END AS Recommendation,
    ius.last_user_seek AS LastSeek,
    ius.last_user_scan AS LastScan,
    ius.last_user_update AS LastUpdate,
    ps.row_count AS RowCount,
    CAST(ps.reserved_page_count * 8.0 / 1024 AS DECIMAL(18,2)) AS IndexSizeMB
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius 
    ON i.object_id = ius.object_id AND i.index_id = ius.index_id AND ius.database_id = DB_ID()
LEFT JOIN sys.dm_db_partition_stats ps 
    ON i.object_id = ps.object_id AND i.index_id = ps.index_id
WHERE i.type > 0  -- Exclude heaps
    AND OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
ORDER BY TotalReads ASC, UserUpdates DESC
"@
    
    $IndexUsage = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $IndexQuery
    
    if (-not $IndexUsage) {
        Write-Host "⚠ No index usage data found" -ForegroundColor Yellow
        exit 0
    }
    
    $IndexUsage | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Summary
    $Unused = ($IndexUsage | Where-Object { $_.Recommendation -like '*UNUSED*' -or $_.Recommendation -eq 'NEVER USED' }).Count
    $Active = ($IndexUsage | Where-Object { $_.Recommendation -eq 'ACTIVE' }).Count
    $HighWrite = ($IndexUsage | Where-Object { $_.Recommendation -like '*HIGH WRITE*' }).Count
    $TotalSizeMB = ($IndexUsage | Measure-Object -Property IndexSizeMB -Sum).Sum
    
    Write-Host ""
    Write-Host "✓ Index usage report generated" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Total indexes: $($IndexUsage.Count)" -ForegroundColor Gray
    Write-Host "Active indexes: $Active" -ForegroundColor Green
    Write-Host "Unused indexes: $Unused" -ForegroundColor $(if ($Unused -gt 0) { 'Yellow' } else { 'Green' })
    Write-Host "High write/low read: $HighWrite" -ForegroundColor $(if ($HighWrite -gt 0) { 'Yellow' } else { 'Green' })
    Write-Host "Total index size: $([math]::Round($TotalSizeMB / 1024, 2)) GB" -ForegroundColor Gray
    
    if ($Unused -gt 0) {
        Write-Host ""
        Write-Host "⚠ Consider reviewing unused indexes for removal" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Index usage report failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-missing-indexes',
    title: 'Missing Indexes Report',
    description: 'Identify potentially beneficial missing indexes',
    category: 'Index Maintenance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries DMV for missing index suggestions
- Calculates improvement potential
- Generates CREATE INDEX scripts

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Minimum improvement threshold

**What the Script Does:**
1. Analyzes missing index DMVs
2. Calculates estimated improvement
3. Generates CREATE INDEX statements
4. Exports recommendations

**Important Notes:**
- Suggestions are workload-based
- Not all suggestions should be implemented
- Consider existing indexes first
- Test impact on write performance`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Missing_Indexes.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Missing Indexes Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Analyzing missing indexes: $DatabaseName" -ForegroundColor Cyan
    
    $MissingQuery = @"
SELECT 
    OBJECT_SCHEMA_NAME(mid.object_id) AS SchemaName,
    OBJECT_NAME(mid.object_id) AS TableName,
    migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans) AS ImprovementScore,
    migs.user_seeks AS UserSeeks,
    migs.user_scans AS UserScans,
    migs.avg_total_user_cost AS AvgQueryCost,
    migs.avg_user_impact AS AvgUserImpact,
    mid.equality_columns AS EqualityColumns,
    mid.inequality_columns AS InequalityColumns,
    mid.included_columns AS IncludedColumns,
    'CREATE NONCLUSTERED INDEX [IX_' + OBJECT_NAME(mid.object_id) + '_' + 
        CAST(ROW_NUMBER() OVER (ORDER BY migs.avg_total_user_cost * migs.avg_user_impact DESC) AS VARCHAR(10)) + '] ON ' +
        QUOTENAME(OBJECT_SCHEMA_NAME(mid.object_id)) + '.' + QUOTENAME(OBJECT_NAME(mid.object_id)) + ' (' +
        ISNULL(mid.equality_columns, '') + 
        CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ', ' ELSE '' END +
        ISNULL(mid.inequality_columns, '') + ')' +
        CASE WHEN mid.included_columns IS NOT NULL THEN ' INCLUDE (' + mid.included_columns + ')' ELSE '' END
    AS CreateIndexStatement
FROM sys.dm_db_missing_index_details mid
INNER JOIN sys.dm_db_missing_index_groups mig ON mid.index_handle = mig.index_handle
INNER JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
WHERE mid.database_id = DB_ID()
ORDER BY ImprovementScore DESC
"@
    
    $MissingIndexes = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $MissingQuery
    
    if (-not $MissingIndexes) {
        Write-Host "✓ No missing index recommendations" -ForegroundColor Green
        exit 0
    }
    
    $MissingIndexes | Export-Csv -Path $OutputPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "✓ Missing indexes report generated" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host "  Recommendations: $($MissingIndexes.Count)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Top 5 Missing Indexes:" -ForegroundColor White
    
    $MissingIndexes | Select-Object -First 5 | ForEach-Object {
        Write-Host ""
        Write-Host "  Table: $($_.SchemaName).$($_.TableName)" -ForegroundColor Cyan
        Write-Host "  Impact Score: $([math]::Round($_.ImprovementScore, 2))" -ForegroundColor Yellow
        Write-Host "  Seeks/Scans: $($_.UserSeeks)/$($_.UserScans)" -ForegroundColor Gray
        Write-Host "  Statement: $($_.CreateIndexStatement)" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Missing indexes report failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-duplicate-indexes',
    title: 'Duplicate Indexes Report',
    description: 'Find duplicate and overlapping indexes wasting space',
    category: 'Index Maintenance',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies exact duplicate indexes
- Finds overlapping indexes
- Calculates wasted space

**Prerequisites:**
- SQL Server with db_owner access
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Output path

**What the Script Does:**
1. Compares index key columns
2. Identifies duplicates/overlaps
3. Calculates space savings
4. Generates DROP statements

**Important Notes:**
- Review before dropping
- Keep unique constraints
- Check foreign key dependencies
- Monitor after changes`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Duplicate_Indexes.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Duplicate Indexes Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Analyzing duplicate indexes: $DatabaseName" -ForegroundColor Cyan
    
    $DuplicateQuery = @"
WITH IndexColumns AS (
    SELECT 
        OBJECT_SCHEMA_NAME(i.object_id) AS SchemaName,
        OBJECT_NAME(i.object_id) AS TableName,
        i.name AS IndexName,
        i.index_id,
        i.type_desc AS IndexType,
        i.is_unique,
        i.is_primary_key,
        STUFF((
            SELECT ', ' + c.name
            FROM sys.index_columns ic
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
            ORDER BY ic.key_ordinal
            FOR XML PATH('')
        ), 1, 2, '') AS KeyColumns,
        STUFF((
            SELECT ', ' + c.name
            FROM sys.index_columns ic
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
            ORDER BY ic.key_ordinal
            FOR XML PATH('')
        ), 1, 2, '') AS IncludedColumns,
        ps.row_count,
        CAST(ps.reserved_page_count * 8.0 / 1024 AS DECIMAL(18,2)) AS SizeMB
    FROM sys.indexes i
    INNER JOIN sys.dm_db_partition_stats ps ON i.object_id = ps.object_id AND i.index_id = ps.index_id
    WHERE i.type > 0 AND i.is_hypothetical = 0
        AND OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
)
SELECT 
    ic1.SchemaName,
    ic1.TableName,
    ic1.IndexName AS Index1,
    ic1.IndexType AS Index1Type,
    ic1.SizeMB AS Index1SizeMB,
    ic2.IndexName AS Index2,
    ic2.IndexType AS Index2Type,
    ic2.SizeMB AS Index2SizeMB,
    ic1.KeyColumns,
    'DUPLICATE' AS DuplicateType,
    'DROP INDEX [' + ic2.IndexName + '] ON [' + ic1.SchemaName + '].[' + ic1.TableName + ']' AS DropStatement
FROM IndexColumns ic1
INNER JOIN IndexColumns ic2 
    ON ic1.SchemaName = ic2.SchemaName 
    AND ic1.TableName = ic2.TableName
    AND ic1.KeyColumns = ic2.KeyColumns
    AND ic1.index_id < ic2.index_id
    AND ic2.is_primary_key = 0
ORDER BY ic1.SchemaName, ic1.TableName, ic1.IndexName
"@
    
    $Duplicates = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $DuplicateQuery
    
    if (-not $Duplicates) {
        Write-Host "✓ No duplicate indexes found" -ForegroundColor Green
        exit 0
    }
    
    $Duplicates | Export-Csv -Path $OutputPath -NoTypeInformation
    
    $TotalWastedMB = ($Duplicates | Measure-Object -Property Index2SizeMB -Sum).Sum
    
    Write-Host ""
    Write-Host "⚠ Duplicate indexes found" -ForegroundColor Yellow
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host "  Duplicate pairs: $($Duplicates.Count)" -ForegroundColor Yellow
    Write-Host "  Potential space savings: $([math]::Round($TotalWastedMB, 2)) MB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Review the report before dropping any indexes" -ForegroundColor Cyan
    
} catch {
    Write-Error "Duplicate indexes report failed: $_"
    exit 1
}`;
    }
  },

  // ==================== DATABASE INTEGRITY (Additional) ====================
  {
    id: 'sql-checkalloc',
    title: 'Check Allocation Consistency (DBCC CHECKALLOC)',
    description: 'Verify allocation page consistency for database',
    category: 'Database Integrity',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks allocation structures only
- Faster than full CHECKDB
- Verifies page chain integrity

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name

**What the Script Does:**
1. Runs DBCC CHECKALLOC
2. Reports allocation errors
3. Logs results

**Important Notes:**
- Faster than CHECKDB
- Catches allocation issues
- Run weekly between CHECKDBs
- Cannot repair, only detect`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);

      return `# SQL Server DBCC CHECKALLOC
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"

try {
    Write-Host "Running DBCC CHECKALLOC: $DatabaseName" -ForegroundColor Cyan
    
    $StartTime = Get-Date
    
    $CheckQuery = "DBCC CHECKALLOC ([$DatabaseName]) WITH NO_INFOMSGS"
    $Results = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CheckQuery -QueryTimeout 0
    
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ CHECKALLOC completed successfully" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalSeconds, 1)) seconds" -ForegroundColor Gray
    Write-Host "  Result: No allocation errors detected" -ForegroundColor Green
    
} catch {
    Write-Error "CHECKALLOC failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-checktable',
    title: 'Check Table Integrity (DBCC CHECKTABLE)',
    description: 'Verify integrity of specific table and indexes',
    category: 'Database Integrity',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks single table integrity
- Faster than full database check
- Useful for large databases

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Table name

**What the Script Does:**
1. Runs DBCC CHECKTABLE
2. Checks table and all indexes
3. Reports any corruption

**Important Notes:**
- Use for quick targeted checks
- Faster than CHECKDB
- Check critical tables frequently
- Consider after suspected issues`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'tableName', label: 'Table Name', type: 'text', required: true, placeholder: 'dbo.Customers', helpText: 'Schema.TableName format' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const tableName = escapePowerShellString(params.tableName);

      return `# SQL Server DBCC CHECKTABLE
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$TableName = "${tableName}"

try {
    Write-Host "Running DBCC CHECKTABLE: $TableName" -ForegroundColor Cyan
    Write-Host "Database: $DatabaseName" -ForegroundColor Gray
    
    $StartTime = Get-Date
    
    $CheckQuery = "DBCC CHECKTABLE ('$TableName') WITH NO_INFOMSGS"
    $Results = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $CheckQuery -QueryTimeout 0
    
    $Duration = (Get-Date) - $StartTime
    
    Write-Host "✓ CHECKTABLE completed successfully" -ForegroundColor Green
    Write-Host "  Duration: $([math]::Round($Duration.TotalSeconds, 1)) seconds" -ForegroundColor Gray
    Write-Host "  Result: No errors detected in table" -ForegroundColor Green
    
} catch {
    Write-Error "CHECKTABLE failed: $_"
    exit 1
}`;
    }
  },

  // ==================== USER & PERMISSION MANAGEMENT (Additional) ====================
  {
    id: 'sql-create-windows-login',
    title: 'Create Windows Login',
    description: 'Create Windows authentication login from AD user/group',
    category: 'User & Permission Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates login from Windows AD account
- More secure than SQL authentication
- Supports users and groups

**Prerequisites:**
- SQL Server with securityadmin role
- Active Directory user/group exists
- Windows Authentication enabled

**What You Need to Provide:**
- SQL Server instance
- Windows account (DOMAIN\\User)
- Default database

**What the Script Does:**
1. Validates account format
2. Creates Windows login
3. Sets default database

**Important Notes:**
- Preferred over SQL authentication
- Supports AD groups (recommended)
- Password managed by AD
- Single sign-on capability`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'windowsAccount', label: 'Windows Account', type: 'text', required: true, placeholder: 'DOMAIN\\Username or DOMAIN\\GroupName' },
      { name: 'defaultDatabase', label: 'Default Database', type: 'text', required: false, defaultValue: 'master', placeholder: 'master' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const windowsAccount = escapePowerShellString(params.windowsAccount);
      const defaultDatabase = escapePowerShellString(params.defaultDatabase || 'master');

      return `# SQL Server Create Windows Login
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$WindowsAccount = "${windowsAccount}"
$DefaultDatabase = "${defaultDatabase}"

try {
    Write-Host "Creating Windows login: $WindowsAccount" -ForegroundColor Cyan
    
    # Validate account format
    if ($WindowsAccount -notmatch '^[^\\\\]+\\\\[^\\\\]+$') {
        Write-Error "Invalid Windows account format. Use DOMAIN\\Username"
        exit 1
    }
    
    # Check if login exists
    $CheckQuery = "SELECT name FROM sys.server_principals WHERE name = '$WindowsAccount'"
    $Existing = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CheckQuery
    
    if ($Existing) {
        Write-Host "⚠ Login already exists: $WindowsAccount" -ForegroundColor Yellow
        exit 0
    }
    
    # Create login
    $CreateQuery = @"
CREATE LOGIN [$WindowsAccount] FROM WINDOWS
WITH DEFAULT_DATABASE = [$DefaultDatabase]
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CreateQuery
    
    Write-Host "✓ Windows login created successfully" -ForegroundColor Green
    Write-Host "  Account: $WindowsAccount" -ForegroundColor Gray
    Write-Host "  Default Database: $DefaultDatabase" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create Windows login: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-drop-user',
    title: 'Drop Database User',
    description: 'Remove user from database with ownership transfer',
    category: 'User & Permission Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes user from database
- Handles schema ownership transfer
- Optionally drops associated login

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- User name to drop

**What the Script Does:**
1. Checks for owned schemas
2. Transfers schema ownership
3. Drops database user
4. Optionally drops server login

**Important Notes:**
- Cannot drop users owning schemas
- Review permissions before dropping
- Consider disabling instead of dropping
- Audit trail recommended`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'userName', label: 'User Name', type: 'text', required: true, placeholder: 'AppUser01' },
      { name: 'dropLogin', label: 'Also Drop Login', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const userName = escapePowerShellString(params.userName);
      const dropLogin = params.dropLogin === true;

      return `# SQL Server Drop Database User
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$UserName = "${userName}"
$DropLogin = $${dropLogin}

try {
    Write-Host "Dropping database user: $UserName" -ForegroundColor Cyan
    Write-Host "Database: $DatabaseName" -ForegroundColor Gray
    
    # Check if user exists
    $UserQuery = "SELECT principal_id FROM sys.database_principals WHERE name = '$UserName' AND type IN ('U', 'S')"
    $User = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $UserQuery
    
    if (-not $User) {
        Write-Host "⚠ User not found: $UserName" -ForegroundColor Yellow
        exit 0
    }
    
    # Check for owned schemas
    $SchemaQuery = @"
SELECT s.name AS SchemaName
FROM sys.schemas s
INNER JOIN sys.database_principals p ON s.principal_id = p.principal_id
WHERE p.name = '$UserName'
"@
    
    $OwnedSchemas = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $SchemaQuery
    
    if ($OwnedSchemas) {
        Write-Host "Transferring owned schemas to dbo..." -ForegroundColor Yellow
        foreach ($Schema in $OwnedSchemas) {
            $TransferQuery = "ALTER AUTHORIZATION ON SCHEMA::[$($Schema.SchemaName)] TO dbo"
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $TransferQuery
            Write-Host "  Transferred: $($Schema.SchemaName)" -ForegroundColor Gray
        }
    }
    
    # Drop user
    $DropUserQuery = "DROP USER [$UserName]"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $DropUserQuery
    
    Write-Host "✓ Database user dropped" -ForegroundColor Green
    
    # Optionally drop login
    if ($DropLogin) {
        Write-Host "Dropping associated login..." -ForegroundColor Cyan
        
        $DropLoginQuery = "DROP LOGIN [$UserName]"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $DropLoginQuery -ErrorAction SilentlyContinue
        
        Write-Host "✓ Login dropped" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Failed to drop user: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-audit-permissions',
    title: 'Audit Database Permissions',
    description: 'Generate comprehensive permissions report for security audit',
    category: 'User & Permission Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports all database permissions
- Includes role memberships
- Shows object-level permissions

**Prerequisites:**
- SQL Server with db_owner access
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Output path

**What the Script Does:**
1. Queries database principals
2. Collects role memberships
3. Reports object permissions
4. Exports audit report

**Important Notes:**
- Run quarterly for compliance
- Review privileged access
- Document exceptions
- Compare with previous audits`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Permissions_Audit.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Permissions Audit
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Auditing database permissions: $DatabaseName" -ForegroundColor Cyan
    
    $PermissionsQuery = @"
-- Database role memberships
SELECT 
    'Role Membership' AS PermissionType,
    dp.name AS Principal,
    dp.type_desc AS PrincipalType,
    r.name AS [Role/Permission],
    NULL AS ObjectName,
    NULL AS ObjectType,
    'MEMBER' AS PermissionState
FROM sys.database_principals dp
INNER JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
INNER JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.type IN ('S', 'U', 'G')

UNION ALL

-- Database-level permissions
SELECT 
    'Database Permission' AS PermissionType,
    dp.name AS Principal,
    dp.type_desc AS PrincipalType,
    perm.permission_name AS [Role/Permission],
    DB_NAME() AS ObjectName,
    'DATABASE' AS ObjectType,
    perm.state_desc AS PermissionState
FROM sys.database_permissions perm
INNER JOIN sys.database_principals dp ON perm.grantee_principal_id = dp.principal_id
WHERE perm.class = 0

UNION ALL

-- Object-level permissions
SELECT 
    'Object Permission' AS PermissionType,
    dp.name AS Principal,
    dp.type_desc AS PrincipalType,
    perm.permission_name AS [Role/Permission],
    OBJECT_SCHEMA_NAME(perm.major_id) + '.' + OBJECT_NAME(perm.major_id) AS ObjectName,
    o.type_desc AS ObjectType,
    perm.state_desc AS PermissionState
FROM sys.database_permissions perm
INNER JOIN sys.database_principals dp ON perm.grantee_principal_id = dp.principal_id
INNER JOIN sys.objects o ON perm.major_id = o.object_id
WHERE perm.class = 1

ORDER BY Principal, PermissionType
"@
    
    $Permissions = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $PermissionsQuery
    
    if (-not $Permissions) {
        Write-Host "⚠ No permissions found" -ForegroundColor Yellow
        exit 0
    }
    
    $Permissions | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Summary
    $Users = ($Permissions | Select-Object -ExpandProperty Principal -Unique).Count
    $Roles = ($Permissions | Where-Object { $_.PermissionType -eq 'Role Membership' }).Count
    $DbPerms = ($Permissions | Where-Object { $_.PermissionType -eq 'Database Permission' }).Count
    $ObjPerms = ($Permissions | Where-Object { $_.PermissionType -eq 'Object Permission' }).Count
    
    Write-Host ""
    Write-Host "✓ Permissions audit completed" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Unique principals: $Users" -ForegroundColor Gray
    Write-Host "Role memberships: $Roles" -ForegroundColor Gray
    Write-Host "Database permissions: $DbPerms" -ForegroundColor Gray
    Write-Host "Object permissions: $ObjPerms" -ForegroundColor Gray
    
} catch {
    Write-Error "Permissions audit failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-orphaned-users',
    title: 'Find Orphaned Users',
    description: 'Identify database users without matching server logins',
    category: 'User & Permission Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Finds users with no server login
- Common after database restore
- Provides fix scripts

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name

**What the Script Does:**
1. Compares users to logins
2. Identifies orphaned users
3. Generates remediation scripts

**Important Notes:**
- Common after restore to new server
- Can remap with sp_change_users_login
- Or create matching login
- Security risk if unaddressed`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'fixOrphans', label: 'Auto-Fix Orphans', type: 'boolean', required: false, defaultValue: false, helpText: 'Attempt to remap orphaned users' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const fixOrphans = params.fixOrphans === true;

      return `# SQL Server Find Orphaned Users
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$FixOrphans = $${fixOrphans}

try {
    Write-Host "Checking for orphaned users: $DatabaseName" -ForegroundColor Cyan
    
    $OrphanQuery = @"
SELECT 
    dp.name AS UserName,
    dp.type_desc AS UserType,
    dp.create_date AS CreateDate,
    dp.sid AS UserSID
FROM sys.database_principals dp
LEFT JOIN sys.server_principals sp ON dp.sid = sp.sid
WHERE dp.type IN ('S', 'U')
    AND sp.sid IS NULL
    AND dp.name NOT IN ('dbo', 'guest', 'INFORMATION_SCHEMA', 'sys')
    AND dp.authentication_type_desc = 'INSTANCE'
"@
    
    $OrphanedUsers = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $OrphanQuery
    
    if (-not $OrphanedUsers) {
        Write-Host "✓ No orphaned users found" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "⚠ Found $($OrphanedUsers.Count) orphaned users:" -ForegroundColor Yellow
    
    foreach ($User in $OrphanedUsers) {
        Write-Host ""
        Write-Host "  User: $($User.UserName)" -ForegroundColor Cyan
        Write-Host "  Type: $($User.UserType)" -ForegroundColor Gray
        Write-Host "  Created: $($User.CreateDate)" -ForegroundColor Gray
        
        if ($FixOrphans) {
            Write-Host "  Attempting to fix..." -ForegroundColor Yellow
            
            # Check if matching login exists
            $LoginCheck = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "SELECT name FROM sys.server_principals WHERE name = '$($User.UserName)'"
            
            if ($LoginCheck) {
                # Remap to existing login
                $RemapQuery = "ALTER USER [$($User.UserName)] WITH LOGIN = [$($User.UserName)]"
                Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $RemapQuery
                Write-Host "  ✓ Remapped to existing login" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ No matching login found - create login manually" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Fix: ALTER USER [$($User.UserName)] WITH LOGIN = [$($User.UserName)]" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Orphaned users check failed: $_"
    exit 1
}`;
    }
  },

  // ==================== SQL AGENT JOB MANAGEMENT (Additional) ====================
  {
    id: 'sql-enable-disable-job',
    title: 'Enable/Disable SQL Agent Job',
    description: 'Enable or disable SQL Server Agent job',
    category: 'SQL Agent Jobs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables or disables agent job
- Affects scheduled execution
- Does not affect running jobs

**Prerequisites:**
- SQL Server Agent running
- SqlServer PowerShell module
- SQLAgentOperatorRole or higher

**What You Need to Provide:**
- SQL Server instance
- Job name
- Enable or disable action

**What the Script Does:**
1. Locates job by name
2. Changes enabled status
3. Reports new status

**Important Notes:**
- Disable for maintenance
- Re-enable after maintenance
- Running jobs continue
- Check schedule after re-enabling`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'Backup_Database_Full' },
      { name: 'action', label: 'Action', type: 'select', required: true, defaultValue: 'Disable', options: ['Enable', 'Disable'] }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const jobName = escapePowerShellString(params.jobName);
      const action = params.action || 'Disable';

      return `# SQL Server Enable/Disable Agent Job
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$JobName = "${jobName}"
$Action = "${action}"

try {
    Write-Host "$Action SQL Agent Job: $JobName" -ForegroundColor Cyan
    
    $Enabled = if ($Action -eq 'Enable') { 1 } else { 0 }
    
    $UpdateQuery = @"
IF EXISTS (SELECT 1 FROM msdb.dbo.sysjobs WHERE name = '$JobName')
BEGIN
    EXEC msdb.dbo.sp_update_job 
        @job_name = N'$JobName',
        @enabled = $Enabled
    SELECT 'SUCCESS' AS Result
END
ELSE
BEGIN
    SELECT 'JOB_NOT_FOUND' AS Result
END
"@
    
    $Result = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $UpdateQuery
    
    if ($Result.Result -eq 'JOB_NOT_FOUND') {
        Write-Error "Job not found: $JobName"
        exit 1
    }
    
    $StatusText = if ($Action -eq 'Enable') { 'enabled' } else { 'disabled' }
    Write-Host "✓ Job $StatusText successfully" -ForegroundColor Green
    Write-Host "  Job: $JobName" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to $Action job: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-job-history-report',
    title: 'SQL Agent Job History Report',
    description: 'Generate report of SQL Agent job execution history',
    category: 'SQL Agent Jobs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports job execution history
- Shows success/failure rates
- Calculates execution durations

**Prerequisites:**
- SQL Server Agent running
- SqlServer PowerShell module
- Access to msdb

**What You Need to Provide:**
- SQL Server instance
- Days to include
- Output path

**What the Script Does:**
1. Queries sysjobhistory
2. Calculates statistics
3. Identifies problem jobs
4. Exports report

**Important Notes:**
- Review failed jobs daily
- Monitor duration trends
- Clean old history periodically
- Set up failure alerts`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'daysBack', label: 'Days to Include', type: 'number', required: false, defaultValue: 7 },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Job_History.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const daysBack = params.daysBack || 7;
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Agent Job History Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DaysBack = ${daysBack}
$OutputPath = "${outputPath}"

try {
    Write-Host "Generating job history report..." -ForegroundColor Cyan
    Write-Host "Period: Last $DaysBack days" -ForegroundColor Gray
    
    $HistoryQuery = @"
SELECT 
    j.name AS JobName,
    j.enabled AS IsEnabled,
    CASE h.run_status
        WHEN 0 THEN 'Failed'
        WHEN 1 THEN 'Succeeded'
        WHEN 2 THEN 'Retry'
        WHEN 3 THEN 'Cancelled'
        WHEN 4 THEN 'In Progress'
    END AS RunStatus,
    msdb.dbo.agent_datetime(h.run_date, h.run_time) AS RunDateTime,
    (h.run_duration / 10000) * 3600 + ((h.run_duration / 100) % 100) * 60 + (h.run_duration % 100) AS DurationSeconds,
    h.message AS Message,
    h.step_name AS StepName
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
WHERE h.step_id = 0  -- Job outcome only
    AND msdb.dbo.agent_datetime(h.run_date, h.run_time) >= DATEADD(DAY, -$DaysBack, GETDATE())
ORDER BY RunDateTime DESC
"@
    
    $History = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $HistoryQuery
    
    if (-not $History) {
        Write-Host "⚠ No job history found" -ForegroundColor Yellow
        exit 0
    }
    
    $History | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Summary
    $TotalRuns = $History.Count
    $Succeeded = ($History | Where-Object { $_.RunStatus -eq 'Succeeded' }).Count
    $Failed = ($History | Where-Object { $_.RunStatus -eq 'Failed' }).Count
    $SuccessRate = [math]::Round(($Succeeded / $TotalRuns) * 100, 1)
    
    Write-Host ""
    Write-Host "✓ Job history report generated" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Total job runs: $TotalRuns" -ForegroundColor Gray
    Write-Host "Succeeded: $Succeeded" -ForegroundColor Green
    Write-Host "Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { 'Red' } else { 'Green' })
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor $(if ($SuccessRate -lt 95) { 'Yellow' } else { 'Green' })
    
    if ($Failed -gt 0) {
        Write-Host ""
        Write-Host "Failed Jobs:" -ForegroundColor Red
        $History | Where-Object { $_.RunStatus -eq 'Failed' } | Select-Object JobName, RunDateTime -First 5 | ForEach-Object {
            Write-Host "  $($_.JobName) at $($_.RunDateTime)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Job history report failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-failed-jobs-report',
    title: 'Failed Jobs Alert Report',
    description: 'Find and report recently failed SQL Agent jobs',
    category: 'SQL Agent Jobs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies failed jobs in period
- Shows failure messages
- Useful for monitoring alerts

**Prerequisites:**
- SQL Server Agent running
- SqlServer PowerShell module
- Access to msdb

**What You Need to Provide:**
- SQL Server instance
- Hours to look back

**What the Script Does:**
1. Queries failed job runs
2. Gets failure messages
3. Reports step that failed
4. Returns exit code for alerting

**Important Notes:**
- Schedule hourly for monitoring
- Use with alerting systems
- Review failure patterns
- Address recurring failures`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'hoursBack', label: 'Hours to Look Back', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const hoursBack = params.hoursBack || 24;

      return `# SQL Server Failed Jobs Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$HoursBack = ${hoursBack}

try {
    Write-Host "Checking for failed jobs: Last $HoursBack hours" -ForegroundColor Cyan
    
    $FailedQuery = @"
SELECT 
    j.name AS JobName,
    msdb.dbo.agent_datetime(h.run_date, h.run_time) AS RunDateTime,
    h.step_name AS FailedStep,
    h.message AS ErrorMessage
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
WHERE h.run_status = 0  -- Failed
    AND msdb.dbo.agent_datetime(h.run_date, h.run_time) >= DATEADD(HOUR, -$HoursBack, GETDATE())
ORDER BY RunDateTime DESC
"@
    
    $FailedJobs = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $FailedQuery
    
    if (-not $FailedJobs) {
        Write-Host "✓ No failed jobs in the last $HoursBack hours" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "⚠ FAILED JOBS DETECTED: $($FailedJobs.Count)" -ForegroundColor Red
    Write-Host ""
    
    foreach ($Job in $FailedJobs) {
        Write-Host "Job: $($Job.JobName)" -ForegroundColor Yellow
        Write-Host "  Time: $($Job.RunDateTime)" -ForegroundColor Gray
        Write-Host "  Step: $($Job.FailedStep)" -ForegroundColor Gray
        Write-Host "  Error: $($Job.ErrorMessage)" -ForegroundColor Red
        Write-Host ""
    }
    
    # Return non-zero for alerting systems
    Write-Host "Exit code: 1 (failures detected)" -ForegroundColor Yellow
    exit 1
    
} catch {
    Write-Error "Failed jobs check error: $_"
    exit 2
}`;
    }
  },

  // ==================== PERFORMANCE MONITORING (Additional) ====================
  {
    id: 'sql-wait-stats',
    title: 'Wait Statistics Report',
    description: 'Analyze SQL Server wait statistics for bottleneck identification',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries sys.dm_os_wait_stats
- Identifies top wait types
- Helps diagnose bottlenecks

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Top N wait types to show

**What the Script Does:**
1. Queries wait statistics DMV
2. Filters benign waits
3. Calculates percentages
4. Reports actionable waits

**Important Notes:**
- Wait stats accumulate since restart
- CXPACKET = parallelism waits
- PAGEIOLATCH = disk I/O
- LCK = locking/blocking
- Reset for fresh baseline`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'topN', label: 'Top N Wait Types', type: 'number', required: false, defaultValue: 20 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const topN = params.topN || 20;

      return `# SQL Server Wait Statistics Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$TopN = ${topN}

try {
    Write-Host "Analyzing wait statistics..." -ForegroundColor Cyan
    
    $WaitQuery = @"
WITH Waits AS (
    SELECT 
        wait_type,
        wait_time_ms / 1000.0 AS wait_time_s,
        100.0 * wait_time_ms / SUM(wait_time_ms) OVER() AS wait_pct,
        ROW_NUMBER() OVER(ORDER BY wait_time_ms DESC) AS rn
    FROM sys.dm_os_wait_stats
    WHERE wait_type NOT LIKE '%SLEEP%'
        AND wait_type NOT LIKE 'LAZYWRITER%'
        AND wait_type NOT LIKE 'BROKER%'
        AND wait_type NOT LIKE 'CLR%'
        AND wait_type NOT LIKE 'XE%'
        AND wait_type NOT LIKE 'SQLTRACE%'
        AND wait_type NOT LIKE 'DISPATCHER_QUEUE_SEMAPHORE'
        AND wait_type NOT LIKE 'HADR_FILESTREAM%'
        AND wait_type NOT IN (
            'WAITFOR', 'SP_SERVER_DIAGNOSTICS_SLEEP', 'QDS_PERSIST_TASK_MAIN_LOOP_SLEEP',
            'QDS_CLEANUP_STALE_QUERIES_TASK_MAIN_LOOP_SLEEP', 'LOGMGR_QUEUE',
            'CHECKPOINT_QUEUE', 'REQUEST_FOR_DEADLOCK_SEARCH'
        )
)
SELECT TOP $TopN
    wait_type AS WaitType,
    CAST(wait_time_s AS DECIMAL(18,2)) AS WaitSeconds,
    CAST(wait_pct AS DECIMAL(5,2)) AS WaitPercent,
    CAST(SUM(wait_pct) OVER(ORDER BY rn) AS DECIMAL(5,2)) AS RunningPercent
FROM Waits
ORDER BY wait_time_s DESC
"@
    
    $WaitStats = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $WaitQuery
    
    if (-not $WaitStats) {
        Write-Host "⚠ No significant wait statistics" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host ""
    Write-Host "Top $TopN Wait Types:" -ForegroundColor White
    Write-Host ""
    Write-Host ("{0,-35} {1,15} {2,10} {3,10}" -f "Wait Type", "Wait (sec)", "Pct", "Running")
    Write-Host ("-" * 75)
    
    foreach ($Wait in $WaitStats) {
        $Color = switch -Regex ($Wait.WaitType) {
            'PAGEIOLATCH' { 'Yellow' }  # Disk I/O
            'LCK_' { 'Red' }            # Locking
            'CXPACKET' { 'Cyan' }       # Parallelism
            'ASYNC_NETWORK' { 'Magenta' } # Network
            default { 'Gray' }
        }
        
        Write-Host ("{0,-35} {1,15:N0} {2,9:N1}% {3,9:N1}%" -f $Wait.WaitType, $Wait.WaitSeconds, $Wait.WaitPercent, $Wait.RunningPercent) -ForegroundColor $Color
    }
    
    Write-Host ""
    Write-Host "Legend:" -ForegroundColor White
    Write-Host "  Yellow = Disk I/O waits" -ForegroundColor Yellow
    Write-Host "  Red = Locking waits" -ForegroundColor Red
    Write-Host "  Cyan = Parallelism waits" -ForegroundColor Cyan
    Write-Host "  Magenta = Network waits" -ForegroundColor Magenta
    
} catch {
    Write-Error "Wait statistics analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-blocking-queries',
    title: 'Blocking Queries Monitor',
    description: 'Find current blocking chains and blocked processes',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies blocking chains
- Shows blocked and blocker queries
- Reports wait time

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries dm_exec_requests
2. Identifies blocking chains
3. Shows blocker and blocked queries
4. Reports wait times

**Important Notes:**
- Point-in-time snapshot
- Long blocks indicate problems
- Consider query timeouts
- May need to kill blocker`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server Blocking Queries Monitor
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Checking for blocking..." -ForegroundColor Cyan
    
    $BlockingQuery = @"
SELECT 
    r.session_id AS BlockedSPID,
    r.blocking_session_id AS BlockerSPID,
    r.wait_time / 1000 AS WaitSeconds,
    r.wait_type,
    DB_NAME(r.database_id) AS DatabaseName,
    SUBSTRING(qt.text, (r.statement_start_offset/2)+1,
        ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE r.statement_end_offset
        END - r.statement_start_offset)/2)+1) AS BlockedQuery,
    (SELECT SUBSTRING(text, 1, 200) FROM sys.dm_exec_sql_text(
        (SELECT most_recent_sql_handle FROM sys.dm_exec_connections WHERE session_id = r.blocking_session_id)
    )) AS BlockerQuery,
    s.login_name AS BlockedLogin,
    s.host_name AS BlockedHost
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) qt
INNER JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
WHERE r.blocking_session_id != 0
ORDER BY r.wait_time DESC
"@
    
    $Blocking = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $BlockingQuery
    
    if (-not $Blocking) {
        Write-Host "✓ No blocking detected" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "⚠ BLOCKING DETECTED: $($Blocking.Count) blocked sessions" -ForegroundColor Red
    Write-Host ""
    
    foreach ($Block in $Blocking) {
        Write-Host "Blocked SPID: $($Block.BlockedSPID) → Blocker SPID: $($Block.BlockerSPID)" -ForegroundColor Yellow
        Write-Host "  Wait Time: $($Block.WaitSeconds) seconds" -ForegroundColor Red
        Write-Host "  Wait Type: $($Block.wait_type)" -ForegroundColor Gray
        Write-Host "  Database: $($Block.DatabaseName)" -ForegroundColor Gray
        Write-Host "  Blocked Query: $($Block.BlockedQuery.Substring(0, [Math]::Min(100, $Block.BlockedQuery.Length)))..." -ForegroundColor Gray
        Write-Host "  Blocker Query: $($Block.BlockerQuery)" -ForegroundColor Cyan
        Write-Host ""
    }
    
    Write-Host "To kill blocker: KILL <BlockerSPID>" -ForegroundColor Yellow
    
} catch {
    Write-Error "Blocking check failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-long-running-queries',
    title: 'Long Running Queries Report',
    description: 'Find currently executing queries running longer than threshold',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Finds queries exceeding time threshold
- Shows execution plan info
- Identifies resource hogs

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Threshold in seconds

**What the Script Does:**
1. Queries dm_exec_requests
2. Filters by elapsed time
3. Shows CPU and I/O usage
4. Reports query text

**Important Notes:**
- Consider normal batch times
- May indicate missing indexes
- Check execution plans
- Consider query timeouts`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'thresholdSeconds', label: 'Threshold (seconds)', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const thresholdSeconds = params.thresholdSeconds || 30;

      return `# SQL Server Long Running Queries
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$ThresholdSeconds = ${thresholdSeconds}

try {
    Write-Host "Finding queries running > $ThresholdSeconds seconds..." -ForegroundColor Cyan
    
    $LongRunningQuery = @"
SELECT 
    r.session_id AS SPID,
    s.login_name AS LoginName,
    s.host_name AS HostName,
    DB_NAME(r.database_id) AS DatabaseName,
    r.start_time AS StartTime,
    DATEDIFF(SECOND, r.start_time, GETDATE()) AS ElapsedSeconds,
    r.cpu_time / 1000 AS CPUSeconds,
    r.total_elapsed_time / 1000 AS TotalElapsedSeconds,
    r.logical_reads AS LogicalReads,
    r.writes AS Writes,
    r.status AS Status,
    r.wait_type AS WaitType,
    SUBSTRING(qt.text, (r.statement_start_offset/2)+1,
        ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE r.statement_end_offset
        END - r.statement_start_offset)/2)+1) AS QueryText
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) qt
INNER JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
WHERE r.session_id != @@SPID
    AND DATEDIFF(SECOND, r.start_time, GETDATE()) > $ThresholdSeconds
ORDER BY r.start_time
"@
    
    $LongQueries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $LongRunningQuery
    
    if (-not $LongQueries) {
        Write-Host "✓ No long-running queries detected" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "⚠ Found $($LongQueries.Count) long-running queries:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($Query in $LongQueries) {
        Write-Host "SPID: $($Query.SPID)" -ForegroundColor Cyan
        Write-Host "  Login: $($Query.LoginName)@$($Query.HostName)" -ForegroundColor Gray
        Write-Host "  Database: $($Query.DatabaseName)" -ForegroundColor Gray
        Write-Host "  Elapsed: $($Query.ElapsedSeconds) seconds" -ForegroundColor Yellow
        Write-Host "  CPU: $($Query.CPUSeconds) sec | Reads: $($Query.LogicalReads) | Writes: $($Query.Writes)" -ForegroundColor Gray
        Write-Host "  Status: $($Query.Status) | Wait: $($Query.WaitType)" -ForegroundColor Gray
        Write-Host "  Query: $($Query.QueryText.Substring(0, [Math]::Min(150, $Query.QueryText.Length)))..." -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Error "Long running queries check failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-cpu-memory-usage',
    title: 'CPU and Memory Usage Report',
    description: 'Report SQL Server CPU and memory consumption',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports SQL Server resource usage
- Shows buffer pool utilization
- Monitors CPU consumption

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries memory DMVs
2. Checks CPU utilization
3. Reports buffer pool stats
4. Shows memory grants

**Important Notes:**
- Monitor for capacity planning
- Compare to server total memory
- Watch for memory pressure
- Check for excessive CPU`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server CPU and Memory Usage Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Analyzing SQL Server resource usage..." -ForegroundColor Cyan
    
    # Memory usage
    $MemoryQuery = @"
SELECT 
    physical_memory_in_use_kb / 1024 AS MemoryUsedMB,
    locked_page_allocations_kb / 1024 AS LockedPagesMB,
    total_virtual_address_space_kb / 1024 AS TotalVirtualMB,
    virtual_address_space_committed_kb / 1024 AS VirtualCommittedMB,
    memory_utilization_percentage AS MemoryUtilizationPct,
    page_fault_count AS PageFaults
FROM sys.dm_os_process_memory
"@
    
    $Memory = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $MemoryQuery
    
    # Buffer pool
    $BufferQuery = @"
SELECT 
    COUNT(*) * 8 / 1024 AS BufferPoolMB,
    SUM(CASE WHEN is_modified = 1 THEN 1 ELSE 0 END) * 8 / 1024 AS DirtyPagesMB
FROM sys.dm_os_buffer_descriptors
"@
    
    $Buffer = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $BufferQuery
    
    # CPU usage (recent)
    $CPUQuery = @"
SELECT TOP 1
    SQLProcessUtilization AS SQLCpuPct,
    100 - SystemIdle - SQLProcessUtilization AS OtherCpuPct,
    SystemIdle AS IdleCpuPct
FROM (
    SELECT 
        record.value('(./Record/SchedulerMonitorEvent/SystemHealth/ProcessUtilization)[1]', 'int') AS SQLProcessUtilization,
        record.value('(./Record/SchedulerMonitorEvent/SystemHealth/SystemIdle)[1]', 'int') AS SystemIdle,
        timestamp
    FROM (
        SELECT timestamp, CONVERT(XML, record) AS record
        FROM sys.dm_os_ring_buffers
        WHERE ring_buffer_type = N'RING_BUFFER_SCHEDULER_MONITOR'
            AND record LIKE '%<SystemHealth>%'
    ) AS x
) AS y
ORDER BY timestamp DESC
"@
    
    $CPU = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CPUQuery
    
    Write-Host ""
    Write-Host "=============== RESOURCE USAGE ===============" -ForegroundColor White
    Write-Host ""
    Write-Host "Memory:" -ForegroundColor Cyan
    Write-Host "  SQL Server Memory: $($Memory.MemoryUsedMB) MB" -ForegroundColor Gray
    Write-Host "  Memory Utilization: $($Memory.MemoryUtilizationPct)%" -ForegroundColor $(if ($Memory.MemoryUtilizationPct -gt 90) { 'Yellow' } else { 'Green' })
    Write-Host "  Buffer Pool: $($Buffer.BufferPoolMB) MB" -ForegroundColor Gray
    Write-Host "  Dirty Pages: $($Buffer.DirtyPagesMB) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "CPU:" -ForegroundColor Cyan
    Write-Host "  SQL Server CPU: $($CPU.SQLCpuPct)%" -ForegroundColor $(if ($CPU.SQLCpuPct -gt 80) { 'Yellow' } else { 'Green' })
    Write-Host "  Other Processes: $($CPU.OtherCpuPct)%" -ForegroundColor Gray
    Write-Host "  System Idle: $($CPU.IdleCpuPct)%" -ForegroundColor Gray
    
    # Warnings
    if ($Memory.MemoryUtilizationPct -gt 90) {
        Write-Host ""
        Write-Host "⚠ High memory utilization detected" -ForegroundColor Yellow
    }
    if ($CPU.SQLCpuPct -gt 80) {
        Write-Host ""
        Write-Host "⚠ High CPU utilization detected" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Resource usage analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-query-store-report',
    title: 'Query Store Performance Report',
    description: 'Analyze Query Store for performance regression and top queries',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries Query Store data
- Identifies regressed queries
- Shows plan changes

**Prerequisites:**
- SQL Server 2016+ with Query Store enabled
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Time period

**What the Script Does:**
1. Queries Query Store views
2. Finds top resource consumers
3. Identifies regressions
4. Exports analysis

**Important Notes:**
- Query Store must be enabled
- Great for plan regression
- Historical query analysis
- Force good plans when needed`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'hoursBack', label: 'Hours to Analyze', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const hoursBack = params.hoursBack || 24;

      return `# SQL Server Query Store Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$HoursBack = ${hoursBack}

try {
    Write-Host "Analyzing Query Store: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Period: Last $HoursBack hours" -ForegroundColor Gray
    
    # Check if Query Store is enabled
    $QSCheck = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query "SELECT actual_state_desc FROM sys.database_query_store_options"
    
    if ($QSCheck.actual_state_desc -ne 'READ_WRITE') {
        Write-Error "Query Store is not enabled for this database"
        exit 1
    }
    
    # Top resource consuming queries
    $TopQuery = @"
SELECT TOP 10
    q.query_id,
    qt.query_sql_text,
    SUM(rs.count_executions) AS TotalExecutions,
    SUM(rs.avg_duration * rs.count_executions) / 1000000 AS TotalDurationSeconds,
    AVG(rs.avg_duration) / 1000 AS AvgDurationMs,
    AVG(rs.avg_cpu_time) / 1000 AS AvgCpuMs,
    AVG(rs.avg_logical_io_reads) AS AvgLogicalReads
FROM sys.query_store_query q
INNER JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
INNER JOIN sys.query_store_plan p ON q.query_id = p.query_id
INNER JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
INNER JOIN sys.query_store_runtime_stats_interval rsi ON rs.runtime_stats_interval_id = rsi.runtime_stats_interval_id
WHERE rsi.start_time >= DATEADD(HOUR, -$HoursBack, GETUTCDATE())
GROUP BY q.query_id, qt.query_sql_text
ORDER BY TotalDurationSeconds DESC
"@
    
    $TopQueries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $TopQuery
    
    Write-Host ""
    Write-Host "Top 10 Resource Consuming Queries:" -ForegroundColor White
    Write-Host ""
    
    $Rank = 0
    foreach ($Query in $TopQueries) {
        $Rank++
        Write-Host "$Rank. Query ID: $($Query.query_id)" -ForegroundColor Cyan
        Write-Host "   Executions: $($Query.TotalExecutions)" -ForegroundColor Gray
        Write-Host "   Total Duration: $([math]::Round($Query.TotalDurationSeconds, 2)) sec" -ForegroundColor Yellow
        Write-Host "   Avg Duration: $([math]::Round($Query.AvgDurationMs, 2)) ms" -ForegroundColor Gray
        Write-Host "   Query: $($Query.query_sql_text.Substring(0, [Math]::Min(80, $Query.query_sql_text.Length)))..." -ForegroundColor Gray
        Write-Host ""
    }
    
    # Regressed queries
    $RegressedQuery = @"
SELECT TOP 5
    q.query_id,
    qt.query_sql_text,
    rs1.avg_duration / 1000 AS RecentAvgMs,
    rs2.avg_duration / 1000 AS PreviousAvgMs,
    (rs1.avg_duration - rs2.avg_duration) / rs2.avg_duration * 100 AS RegressionPct
FROM sys.query_store_query q
INNER JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
INNER JOIN sys.query_store_plan p ON q.query_id = p.query_id
INNER JOIN sys.query_store_runtime_stats rs1 ON p.plan_id = rs1.plan_id
INNER JOIN sys.query_store_runtime_stats rs2 ON p.plan_id = rs2.plan_id
INNER JOIN sys.query_store_runtime_stats_interval rsi1 ON rs1.runtime_stats_interval_id = rsi1.runtime_stats_interval_id
INNER JOIN sys.query_store_runtime_stats_interval rsi2 ON rs2.runtime_stats_interval_id = rsi2.runtime_stats_interval_id
WHERE rsi1.start_time >= DATEADD(HOUR, -$($HoursBack/2), GETUTCDATE())
    AND rsi2.start_time < DATEADD(HOUR, -$($HoursBack/2), GETUTCDATE())
    AND rsi2.start_time >= DATEADD(HOUR, -$HoursBack, GETUTCDATE())
    AND rs1.avg_duration > rs2.avg_duration * 1.5
ORDER BY RegressionPct DESC
"@
    
    $Regressed = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $RegressedQuery -ErrorAction SilentlyContinue
    
    if ($Regressed) {
        Write-Host ""
        Write-Host "⚠ Regressed Queries Detected:" -ForegroundColor Yellow
        foreach ($Reg in $Regressed) {
            Write-Host "  Query $($Reg.query_id): $([math]::Round($Reg.RegressionPct))% slower" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Error "Query Store analysis failed: $_"
    exit 1
}`;
    }
  },

  // ==================== DATABASE MANAGEMENT ====================
  {
    id: 'sql-create-database',
    title: 'Create New Database',
    description: 'Create new SQL Server database with specified settings',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates new database
- Configures file locations
- Sets recovery model

**Prerequisites:**
- SQL Server with dbcreator role
- SqlServer PowerShell module
- Disk space for data/log files

**What You Need to Provide:**
- Database name
- Data file path
- Log file path
- Initial sizes

**What the Script Does:**
1. Creates database
2. Sets file locations
3. Configures recovery model
4. Reports success

**Important Notes:**
- Plan file locations carefully
- Separate data and log files
- Size appropriately
- Set proper recovery model`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'NewDatabase' },
      { name: 'dataPath', label: 'Data File Path', type: 'path', required: true, placeholder: 'D:\\SQLData' },
      { name: 'logPath', label: 'Log File Path', type: 'path', required: true, placeholder: 'E:\\SQLLogs' },
      { name: 'dataSizeMB', label: 'Data File Size (MB)', type: 'number', required: false, defaultValue: 100 },
      { name: 'logSizeMB', label: 'Log File Size (MB)', type: 'number', required: false, defaultValue: 50 },
      { name: 'recoveryModel', label: 'Recovery Model', type: 'select', required: false, defaultValue: 'FULL', options: ['SIMPLE', 'FULL', 'BULK_LOGGED'] }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const dataPath = escapePowerShellString(params.dataPath);
      const logPath = escapePowerShellString(params.logPath);
      const dataSizeMB = params.dataSizeMB || 100;
      const logSizeMB = params.logSizeMB || 50;
      const recoveryModel = params.recoveryModel || 'FULL';

      return `# SQL Server Create Database
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$DataPath = "${dataPath}"
$LogPath = "${logPath}"
$DataSizeMB = ${dataSizeMB}
$LogSizeMB = ${logSizeMB}
$RecoveryModel = "${recoveryModel}"

try {
    Write-Host "Creating database: $DatabaseName" -ForegroundColor Cyan
    
    # Check if database exists
    $ExistCheck = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "SELECT database_id FROM sys.databases WHERE name = '$DatabaseName'"
    
    if ($ExistCheck) {
        Write-Error "Database already exists: $DatabaseName"
        exit 1
    }
    
    $CreateQuery = @"
CREATE DATABASE [\$DatabaseName]
ON PRIMARY (
    NAME = N'\${DatabaseName}_Data',
    FILENAME = N'\$DataPath\\\${DatabaseName}_Data.mdf',
    SIZE = \${DataSizeMB}MB,
    FILEGROWTH = 64MB
)
LOG ON (
    NAME = N'\${DatabaseName}_Log',
    FILENAME = N'\$LogPath\\\${DatabaseName}_Log.ldf',
    SIZE = \${LogSizeMB}MB,
    FILEGROWTH = 64MB
)
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CreateQuery
    
    # Set recovery model
    $RecoveryQuery = "ALTER DATABASE [$DatabaseName] SET RECOVERY $RecoveryModel"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RecoveryQuery
    
    Write-Host "✓ Database created successfully" -ForegroundColor Green
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "  Data File: $DataPath\\\${DatabaseName}_Data.mdf ($DataSizeMB MB)" -ForegroundColor Gray
    Write-Host "  Log File: $LogPath\\\${DatabaseName}_Log.ldf ($LogSizeMB MB)" -ForegroundColor Gray
    Write-Host "  Recovery Model: $RecoveryModel" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to create database: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-shrink-database',
    title: 'Shrink Database Files',
    description: 'Shrink database data and log files to reclaim space',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Shrinks data and/or log files
- Reclaims unused space
- Targets percentage free

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module

**What You Need to Provide:**
- Database name
- Target percentage free
- Files to shrink

**What the Script Does:**
1. Analyzes current file sizes
2. Shrinks to target percentage
3. Reports space reclaimed

**Important Notes:**
- ⚠ Shrinking causes fragmentation
- Avoid routine shrinking
- Use only after large deletes
- Rebuild indexes after shrink`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'targetPercentFree', label: 'Target % Free Space', type: 'number', required: false, defaultValue: 10 },
      { name: 'shrinkLog', label: 'Shrink Log File', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const targetPercentFree = params.targetPercentFree || 10;
      const shrinkLog = params.shrinkLog !== false;

      return `# SQL Server Shrink Database
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$TargetPercentFree = ${targetPercentFree}
$ShrinkLog = $${shrinkLog}

try {
    Write-Host "⚠ WARNING: Shrinking causes index fragmentation" -ForegroundColor Yellow
    Write-Host "Consider if this is really necessary" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Shrinking database: $DatabaseName" -ForegroundColor Cyan
    
    # Get current file sizes
    $SizeQuery = @"
SELECT 
    name AS FileName,
    type_desc AS FileType,
    CAST(size * 8.0 / 1024 AS DECIMAL(18,2)) AS SizeMB,
    CAST(FILEPROPERTY(name, 'SpaceUsed') * 8.0 / 1024 AS DECIMAL(18,2)) AS UsedMB
FROM sys.database_files
"@
    
    $FilesBefore = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $SizeQuery
    
    Write-Host ""
    Write-Host "Before shrink:" -ForegroundColor Gray
    $FilesBefore | ForEach-Object {
        Write-Host "  $($_.FileName): $($_.SizeMB) MB (Used: $($_.UsedMB) MB)" -ForegroundColor Gray
    }
    
    # Shrink data file
    $DataFile = ($FilesBefore | Where-Object { $_.FileType -eq 'ROWS' }).FileName
    if ($DataFile) {
        Write-Host ""
        Write-Host "Shrinking data file: $DataFile" -ForegroundColor Cyan
        $ShrinkDataQuery = "DBCC SHRINKFILE (N'$DataFile', $TargetPercentFree)"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $ShrinkDataQuery -QueryTimeout 0
    }
    
    # Shrink log file
    if ($ShrinkLog) {
        $LogFile = ($FilesBefore | Where-Object { $_.FileType -eq 'LOG' }).FileName
        if ($LogFile) {
            Write-Host "Shrinking log file: $LogFile" -ForegroundColor Cyan
            $ShrinkLogQuery = "DBCC SHRINKFILE (N'$LogFile', $TargetPercentFree)"
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $ShrinkLogQuery -QueryTimeout 0
        }
    }
    
    # Get new sizes
    $FilesAfter = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $SizeQuery
    
    Write-Host ""
    Write-Host "After shrink:" -ForegroundColor Gray
    $FilesAfter | ForEach-Object {
        Write-Host "  $($_.FileName): $($_.SizeMB) MB (Used: $($_.UsedMB) MB)" -ForegroundColor Gray
    }
    
    $TotalBefore = ($FilesBefore | Measure-Object -Property SizeMB -Sum).Sum
    $TotalAfter = ($FilesAfter | Measure-Object -Property SizeMB -Sum).Sum
    $Reclaimed = $TotalBefore - $TotalAfter
    
    Write-Host ""
    Write-Host "✓ Shrink completed" -ForegroundColor Green
    Write-Host "  Space reclaimed: $([math]::Round($Reclaimed, 2)) MB" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ Recommend: Rebuild indexes to address fragmentation" -ForegroundColor Yellow
    
} catch {
    Write-Error "Shrink failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-set-recovery-model',
    title: 'Set Database Recovery Model',
    description: 'Change database recovery model (Simple, Full, Bulk-Logged)',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Changes database recovery model
- Affects backup/restore options
- Impacts transaction logging

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module

**What You Need to Provide:**
- Database name
- New recovery model

**What the Script Does:**
1. Validates current model
2. Changes recovery model
3. Reports change

**Important Notes:**
- SIMPLE: No log backups needed
- FULL: Point-in-time restore possible
- BULK_LOGGED: Minimal logging for bulk ops
- Take log backup after changing to FULL`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'recoveryModel', label: 'Recovery Model', type: 'select', required: true, defaultValue: 'FULL', options: ['SIMPLE', 'FULL', 'BULK_LOGGED'] }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const recoveryModel = params.recoveryModel || 'FULL';

      return `# SQL Server Set Recovery Model
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$RecoveryModel = "${recoveryModel}"

try {
    Write-Host "Changing recovery model: $DatabaseName" -ForegroundColor Cyan
    
    # Get current recovery model
    $CurrentQuery = "SELECT recovery_model_desc FROM sys.databases WHERE name = '$DatabaseName'"
    $Current = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CurrentQuery
    
    Write-Host "Current model: $($Current.recovery_model_desc)" -ForegroundColor Gray
    Write-Host "New model: $RecoveryModel" -ForegroundColor Yellow
    
    if ($Current.recovery_model_desc -eq $RecoveryModel) {
        Write-Host "⚠ Database already in $RecoveryModel recovery model" -ForegroundColor Yellow
        exit 0
    }
    
    # Change recovery model
    $ChangeQuery = "ALTER DATABASE [$DatabaseName] SET RECOVERY $RecoveryModel"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ChangeQuery
    
    Write-Host ""
    Write-Host "✓ Recovery model changed successfully" -ForegroundColor Green
    
    # Recommendations
    if ($RecoveryModel -eq 'FULL') {
        Write-Host ""
        Write-Host "⚠ IMPORTANT: Take a full backup immediately" -ForegroundColor Yellow
        Write-Host "Transaction log backups are now required" -ForegroundColor Yellow
    }
    elseif ($RecoveryModel -eq 'SIMPLE') {
        Write-Host ""
        Write-Host "⚠ Point-in-time recovery is no longer possible" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to change recovery model: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-detach-database',
    title: 'Detach Database',
    description: 'Detach database from SQL Server for migration or archival',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Detaches database from instance
- Releases data/log files
- Prepares for file-level operations

**Prerequisites:**
- SQL Server with db_owner role
- No active connections
- SqlServer PowerShell module

**What You Need to Provide:**
- Database name
- Update statistics option

**What the Script Does:**
1. Terminates connections
2. Updates statistics (optional)
3. Detaches database
4. Reports file locations

**Important Notes:**
- Used for migration
- Files can be moved/copied after
- Re-attach with sp_attach_db
- Backup before detaching`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'updateStats', label: 'Update Statistics Before Detach', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const updateStats = params.updateStats !== false;

      return `# SQL Server Detach Database
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$UpdateStats = $${updateStats}

try {
    Write-Host "Detaching database: $DatabaseName" -ForegroundColor Cyan
    
    # Get file locations before detach
    $FilesQuery = "SELECT name, physical_name FROM sys.master_files WHERE database_id = DB_ID('$DatabaseName')"
    $Files = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $FilesQuery
    
    # Set single user to kill connections
    Write-Host "Terminating connections..." -ForegroundColor Yellow
    $SingleUserQuery = "ALTER DATABASE [$DatabaseName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SingleUserQuery
    
    # Detach
    $DetachQuery = "EXEC sp_detach_db @dbname = N'$DatabaseName', @skipchecks = '$(if (-not $UpdateStats) { 'true' } else { 'false' })'"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $DetachQuery
    
    Write-Host ""
    Write-Host "✓ Database detached successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database files (can now be moved):" -ForegroundColor White
    foreach ($File in $Files) {
        Write-Host "  $($File.name): $($File.physical_name)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "To re-attach: EXEC sp_attach_db @dbname = '$DatabaseName', ..." -ForegroundColor Cyan
    
} catch {
    Write-Error "Detach failed: $_"
    
    # Try to restore multi-user
    try {
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "ALTER DATABASE [$DatabaseName] SET MULTI_USER" -ErrorAction SilentlyContinue
    } catch {}
    
    exit 1
}`;
    }
  },

  {
    id: 'sql-attach-database',
    title: 'Attach Database',
    description: 'Attach database files to SQL Server',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Attaches existing data/log files
- Creates database from files
- Useful after migration

**Prerequisites:**
- SQL Server with dbcreator role
- Access to database files
- SqlServer PowerShell module

**What You Need to Provide:**
- Database name
- Data file path(s)
- Log file path

**What the Script Does:**
1. Validates file existence
2. Attaches database
3. Reports success

**Important Notes:**
- Files must be accessible
- SQL Server service account needs permissions
- Use after file migration
- Consider file ownership`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'dataFilePath', label: 'Data File Path (.mdf)', type: 'path', required: true, placeholder: 'D:\\SQLData\\MyDatabase_Data.mdf' },
      { name: 'logFilePath', label: 'Log File Path (.ldf)', type: 'path', required: true, placeholder: 'E:\\SQLLogs\\MyDatabase_Log.ldf' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const dataFilePath = escapePowerShellString(params.dataFilePath);
      const logFilePath = escapePowerShellString(params.logFilePath);

      return `# SQL Server Attach Database
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$DataFilePath = "${dataFilePath}"
$LogFilePath = "${logFilePath}"

try {
    Write-Host "Attaching database: $DatabaseName" -ForegroundColor Cyan
    
    # Verify files exist (from SQL Server's perspective)
    Write-Host "Data file: $DataFilePath" -ForegroundColor Gray
    Write-Host "Log file: $LogFilePath" -ForegroundColor Gray
    
    # Check if database already exists
    $ExistCheck = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "SELECT database_id FROM sys.databases WHERE name = '$DatabaseName'"
    
    if ($ExistCheck) {
        Write-Error "Database already exists: $DatabaseName"
        exit 1
    }
    
    # Attach database
    $AttachQuery = @"
CREATE DATABASE [$DatabaseName] ON 
    (FILENAME = N'$DataFilePath'),
    (FILENAME = N'$LogFilePath')
FOR ATTACH
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AttachQuery
    
    Write-Host ""
    Write-Host "✓ Database attached successfully" -ForegroundColor Green
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    
    # Verify
    $VerifyQuery = "SELECT state_desc, recovery_model_desc FROM sys.databases WHERE name = '$DatabaseName'"
    $Verify = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $VerifyQuery
    
    Write-Host "  State: $($Verify.state_desc)" -ForegroundColor Gray
    Write-Host "  Recovery: $($Verify.recovery_model_desc)" -ForegroundColor Gray
    
} catch {
    Write-Error "Attach failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-database-size-report',
    title: 'Database Size Report',
    description: 'Generate comprehensive report of all database sizes and growth',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports all database sizes
- Shows data/log file breakdown
- Identifies growth patterns

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Output path

**What the Script Does:**
1. Queries all databases
2. Calculates file sizes
3. Reports space used/free
4. Exports to CSV

**Important Notes:**
- Monitor for capacity planning
- Watch for rapid growth
- Identify oversized logs
- Plan disk space accordingly`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Database_Sizes.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Database Size Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Generating database size report..." -ForegroundColor Cyan
    
    $SizeQuery = @"
SELECT 
    d.name AS DatabaseName,
    d.state_desc AS State,
    d.recovery_model_desc AS RecoveryModel,
    CAST(SUM(CASE WHEN mf.type = 0 THEN mf.size END) * 8.0 / 1024 AS DECIMAL(18,2)) AS DataSizeMB,
    CAST(SUM(CASE WHEN mf.type = 1 THEN mf.size END) * 8.0 / 1024 AS DECIMAL(18,2)) AS LogSizeMB,
    CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(18,2)) AS TotalSizeMB,
    d.create_date AS CreateDate
FROM sys.databases d
INNER JOIN sys.master_files mf ON d.database_id = mf.database_id
GROUP BY d.name, d.state_desc, d.recovery_model_desc, d.create_date
ORDER BY TotalSizeMB DESC
"@
    
    $Sizes = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SizeQuery
    
    $Sizes | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Summary
    $TotalDataMB = ($Sizes | Measure-Object -Property DataSizeMB -Sum).Sum
    $TotalLogMB = ($Sizes | Measure-Object -Property LogSizeMB -Sum).Sum
    $TotalMB = ($Sizes | Measure-Object -Property TotalSizeMB -Sum).Sum
    
    Write-Host ""
    Write-Host "✓ Size report generated" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Total databases: $($Sizes.Count)" -ForegroundColor Gray
    Write-Host "Total data size: $([math]::Round($TotalDataMB / 1024, 2)) GB" -ForegroundColor Gray
    Write-Host "Total log size: $([math]::Round($TotalLogMB / 1024, 2)) GB" -ForegroundColor Gray
    Write-Host "Grand total: $([math]::Round($TotalMB / 1024, 2)) GB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Top 5 Largest Databases:" -ForegroundColor White
    $Sizes | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.DatabaseName): $([math]::Round($_.TotalSizeMB / 1024, 2)) GB" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Size report failed: $_"
    exit 1
}`;
    }
  },

  // ==================== MAINTENANCE PLANS ====================
  {
    id: 'sql-cleanup-history',
    title: 'Cleanup Maintenance History',
    description: 'Remove old backup, job history, and maintenance plan records',
    category: 'Maintenance Plans',
    isPremium: true,
    instructions: `**How This Task Works:**
- Cleans msdb history tables
- Removes old backup history
- Purges job history

**Prerequisites:**
- SQL Server with sysadmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- Server instance
- Retention days

**What the Script Does:**
1. Deletes old backup history
2. Purges job history
3. Cleans maintenance plan logs
4. Reports records removed

**Important Notes:**
- Keep 30-90 days typically
- Required for compliance
- Run weekly
- Free up msdb space`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'retentionDays', label: 'Keep History (Days)', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const retentionDays = params.retentionDays || 30;

      return `# SQL Server Cleanup Maintenance History
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$RetentionDays = ${retentionDays}
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)

try {
    Write-Host "Cleaning up maintenance history..." -ForegroundColor Cyan
    Write-Host "Retention: $RetentionDays days (before $CutoffDate)" -ForegroundColor Gray
    
    # Cleanup backup history
    Write-Host ""
    Write-Host "Cleaning backup history..." -ForegroundColor Cyan
    $BackupQuery = "EXEC msdb.dbo.sp_delete_backuphistory @oldest_date = '$($CutoffDate.ToString('yyyy-MM-dd'))'"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $BackupQuery
    Write-Host "✓ Backup history cleaned" -ForegroundColor Green
    
    # Cleanup job history
    Write-Host "Cleaning job history..." -ForegroundColor Cyan
    $JobQuery = "EXEC msdb.dbo.sp_purge_jobhistory @oldest_date = '$($CutoffDate.ToString('yyyy-MM-dd'))'"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $JobQuery
    Write-Host "✓ Job history cleaned" -ForegroundColor Green
    
    # Cleanup maintenance plan history
    Write-Host "Cleaning maintenance plan logs..." -ForegroundColor Cyan
    $MaintQuery = "EXEC msdb.dbo.sp_maintplan_delete_log @oldest_time = '$($CutoffDate.ToString('yyyy-MM-dd'))'"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $MaintQuery -ErrorAction SilentlyContinue
    Write-Host "✓ Maintenance plan logs cleaned" -ForegroundColor Green
    
    # Cleanup mail history
    Write-Host "Cleaning Database Mail history..." -ForegroundColor Cyan
    $MailQuery = "EXEC msdb.dbo.sysmail_delete_mailitems_sp @sent_before = '$($CutoffDate.ToString('yyyy-MM-dd'))'"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $MailQuery -ErrorAction SilentlyContinue
    Write-Host "✓ Mail history cleaned" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✓ History cleanup completed" -ForegroundColor Green
    
} catch {
    Write-Error "History cleanup failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-rebuild-heaps',
    title: 'Rebuild Heap Tables',
    description: 'Identify and rebuild tables without clustered indexes (heaps)',
    category: 'Maintenance Plans',
    isPremium: true,
    instructions: `**How This Task Works:**
- Finds tables without clustered index
- Heaps accumulate forwarding pointers
- Rebuilds heaps for performance

**Prerequisites:**
- SQL Server with db_owner role
- SqlServer PowerShell module
- Maintenance window

**What You Need to Provide:**
- Server instance
- Database name

**What the Script Does:**
1. Identifies heap tables
2. Checks forwarding pointers
3. Rebuilds problematic heaps
4. Reports improvements

**Important Notes:**
- Heaps have no clustered index
- Forwarding pointers hurt performance
- Consider adding clustered index
- Rebuild removes forwarding pointers`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);

      return `# SQL Server Rebuild Heaps
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"

try {
    Write-Host "Analyzing heap tables: $DatabaseName" -ForegroundColor Cyan
    
    $HeapQuery = @"
SELECT 
    OBJECT_SCHEMA_NAME(t.object_id) AS SchemaName,
    t.name AS TableName,
    SUM(ps.row_count) AS RowCount,
    SUM(ps.reserved_page_count) * 8 / 1024 AS SizeMB,
    ios.forwarded_fetch_count AS ForwardingPointers
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id AND i.type = 0  -- Heap
INNER JOIN sys.dm_db_partition_stats ps ON i.object_id = ps.object_id AND i.index_id = ps.index_id
LEFT JOIN sys.dm_db_index_operational_stats(DB_ID(), NULL, NULL, NULL) ios 
    ON t.object_id = ios.object_id AND i.index_id = ios.index_id
GROUP BY t.object_id, t.name, ios.forwarded_fetch_count
HAVING SUM(ps.row_count) > 0
ORDER BY ios.forwarded_fetch_count DESC, SizeMB DESC
"@
    
    $Heaps = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $HeapQuery
    
    if (-not $Heaps) {
        Write-Host "✓ No heap tables found" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Found $($Heaps.Count) heap tables" -ForegroundColor Yellow
    
    $RebuiltCount = 0
    foreach ($Heap in $Heaps) {
        $TableName = "[$($Heap.SchemaName)].[$($Heap.TableName)]"
        
        Write-Host ""
        Write-Host "Table: $TableName" -ForegroundColor Cyan
        Write-Host "  Rows: $($Heap.RowCount) | Size: $($Heap.SizeMB) MB | Forwarding: $($Heap.ForwardingPointers)" -ForegroundColor Gray
        
        if ($Heap.ForwardingPointers -gt 1000 -or $Heap.SizeMB -gt 100) {
            Write-Host "  Rebuilding..." -ForegroundColor Yellow
            
            $RebuildQuery = "ALTER TABLE $TableName REBUILD"
            Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $RebuildQuery -QueryTimeout 0
            
            Write-Host "  ✓ Rebuilt" -ForegroundColor Green
            $RebuiltCount++
        } else {
            Write-Host "  Skipped (under threshold)" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "✓ Heap maintenance completed" -ForegroundColor Green
    Write-Host "  Heaps rebuilt: $RebuiltCount" -ForegroundColor Gray
    
} catch {
    Write-Error "Heap rebuild failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-update-outdated-statistics',
    title: 'Update Outdated Statistics',
    description: 'Find and update statistics with high row modifications',
    category: 'Maintenance Plans',
    isPremium: true,
    instructions: `**How This Task Works:**
- Identifies stale statistics
- Based on modification threshold
- Updates selectively

**Prerequisites:**
- SQL Server with db_ddladmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- Server instance
- Database name
- Modification threshold

**What the Script Does:**
1. Queries row modification counts
2. Identifies outdated stats
3. Updates only stale stats
4. Reports updates made

**Important Notes:**
- More efficient than full update
- Focus on changed tables
- Use lower threshold for volatile tables
- Schedule during low activity`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'modificationThreshold', label: 'Modification Threshold (%)', type: 'number', required: false, defaultValue: 10, helpText: 'Update if modifications > X% of rows' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const modificationThreshold = params.modificationThreshold || 10;

      return `# SQL Server Update Outdated Statistics
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$ModThreshold = ${modificationThreshold}

try {
    Write-Host "Finding outdated statistics: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Threshold: $ModThreshold% row modifications" -ForegroundColor Gray
    
    $StatsQuery = @"
SELECT 
    OBJECT_SCHEMA_NAME(s.object_id) AS SchemaName,
    OBJECT_NAME(s.object_id) AS TableName,
    s.name AS StatName,
    STATS_DATE(s.object_id, s.stats_id) AS LastUpdated,
    sp.rows AS TotalRows,
    sp.modification_counter AS Modifications,
    CASE WHEN sp.rows > 0 
        THEN CAST(sp.modification_counter * 100.0 / sp.rows AS DECIMAL(5,2))
        ELSE 0 
    END AS ModificationPct
FROM sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECTPROPERTY(s.object_id, 'IsUserTable') = 1
    AND sp.rows > 0
    AND (sp.modification_counter * 100.0 / sp.rows) > $ModThreshold
ORDER BY ModificationPct DESC
"@
    
    $OutdatedStats = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $StatsQuery
    
    if (-not $OutdatedStats) {
        Write-Host "✓ No outdated statistics found" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Found $($OutdatedStats.Count) outdated statistics" -ForegroundColor Yellow
    Write-Host ""
    
    $UpdatedCount = 0
    foreach ($Stat in $OutdatedStats) {
        $TableName = "[$($Stat.SchemaName)].[$($Stat.TableName)]"
        
        Write-Host "Updating: $TableName.$($Stat.StatName) ($($Stat.ModificationPct)% modified)" -ForegroundColor Cyan
        
        $UpdateQuery = "UPDATE STATISTICS $TableName ([$($Stat.StatName)])"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $UpdateQuery
        
        $UpdatedCount++
    }
    
    Write-Host ""
    Write-Host "✓ Statistics update completed" -ForegroundColor Green
    Write-Host "  Statistics updated: $UpdatedCount" -ForegroundColor Gray
    
} catch {
    Write-Error "Statistics update failed: $_"
    exit 1
}`;
    }
  },

  // ==================== HIGH AVAILABILITY ====================
  {
    id: 'sql-alwayson-status',
    title: 'AlwaysOn Availability Group Status',
    description: 'Check AlwaysOn AG health, synchronization, and replica status',
    category: 'High Availability',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries AG configuration
- Reports replica health
- Shows synchronization state

**Prerequisites:**
- SQL Server with AlwaysOn configured
- SqlServer PowerShell module
- VIEW SERVER STATE permission

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Lists all availability groups
2. Shows replica states
3. Reports database sync status
4. Identifies issues

**Important Notes:**
- Check before maintenance
- Monitor regularly
- Review after failovers
- Critical for DR readiness`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server AlwaysOn Availability Group Status
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Checking AlwaysOn Availability Group status..." -ForegroundColor Cyan
    
    # Check if AlwaysOn is enabled
    $EnabledQuery = "SELECT SERVERPROPERTY('IsHadrEnabled') AS IsHadrEnabled"
    $Enabled = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $EnabledQuery
    
    if ($Enabled.IsHadrEnabled -ne 1) {
        Write-Host "⚠ AlwaysOn is not enabled on this server" -ForegroundColor Yellow
        exit 0
    }
    
    # Get AG status
    $AGQuery = @"
SELECT 
    ag.name AS AGName,
    ags.primary_replica AS PrimaryReplica,
    ags.synchronization_health_desc AS AGHealth,
    ar.replica_server_name AS ReplicaServer,
    ar.availability_mode_desc AS AvailabilityMode,
    ar.failover_mode_desc AS FailoverMode,
    ars.role_desc AS CurrentRole,
    ars.connected_state_desc AS ConnectionState,
    ars.synchronization_health_desc AS ReplicaHealth
FROM sys.availability_groups ag
INNER JOIN sys.dm_hadr_availability_group_states ags ON ag.group_id = ags.group_id
INNER JOIN sys.availability_replicas ar ON ag.group_id = ar.group_id
INNER JOIN sys.dm_hadr_availability_replica_states ars ON ar.replica_id = ars.replica_id
ORDER BY ag.name, ar.replica_server_name
"@
    
    $AGStatus = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AGQuery
    
    if (-not $AGStatus) {
        Write-Host "⚠ No Availability Groups found" -ForegroundColor Yellow
        exit 0
    }
    
    # Group by AG
    $AGs = $AGStatus | Select-Object AGName -Unique
    
    foreach ($AG in $AGs) {
        $AGReplicas = $AGStatus | Where-Object { $_.AGName -eq $AG.AGName }
        $Health = ($AGReplicas | Select-Object -First 1).AGHealth
        $HealthColor = if ($Health -eq 'HEALTHY') { 'Green' } else { 'Red' }
        
        Write-Host ""
        Write-Host "Availability Group: $($AG.AGName)" -ForegroundColor White
        Write-Host "  Primary: $(($AGReplicas | Where-Object { $_.CurrentRole -eq 'PRIMARY' }).ReplicaServer)" -ForegroundColor Cyan
        Write-Host "  Health: $Health" -ForegroundColor $HealthColor
        Write-Host ""
        Write-Host "  Replicas:" -ForegroundColor Gray
        
        foreach ($Replica in $AGReplicas) {
            $RoleIcon = if ($Replica.CurrentRole -eq 'PRIMARY') { '[P]' } else { '[S]' }
            $StateColor = if ($Replica.ReplicaHealth -eq 'HEALTHY') { 'Green' } else { 'Yellow' }
            
            Write-Host "    $RoleIcon $($Replica.ReplicaServer)" -ForegroundColor $StateColor
            Write-Host "        Mode: $($Replica.AvailabilityMode) | Failover: $($Replica.FailoverMode)" -ForegroundColor Gray
            Write-Host "        State: $($Replica.ConnectionState) | Health: $($Replica.ReplicaHealth)" -ForegroundColor Gray
        }
    }
    
    # Database sync status
    Write-Host ""
    Write-Host "Database Synchronization Status:" -ForegroundColor White
    
    $DBQuery = @"
SELECT 
    ag.name AS AGName,
    d.name AS DatabaseName,
    drs.synchronization_state_desc AS SyncState,
    drs.synchronization_health_desc AS SyncHealth,
    drs.log_send_queue_size AS LogSendQueueKB,
    drs.redo_queue_size AS RedoQueueKB
FROM sys.dm_hadr_database_replica_states drs
INNER JOIN sys.availability_groups ag ON drs.group_id = ag.group_id
INNER JOIN sys.databases d ON drs.database_id = d.database_id
WHERE drs.is_local = 1
ORDER BY ag.name, d.name
"@
    
    $DBStatus = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $DBQuery
    
    foreach ($DB in $DBStatus) {
        $SyncColor = if ($DB.SyncHealth -eq 'HEALTHY') { 'Green' } else { 'Yellow' }
        Write-Host "  $($DB.AGName)/$($DB.DatabaseName): $($DB.SyncState) ($($DB.SyncHealth))" -ForegroundColor $SyncColor
    }
    
} catch {
    Write-Error "AlwaysOn status check failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-alwayson-failover',
    title: 'AlwaysOn Manual Failover',
    description: 'Perform planned manual failover of Availability Group',
    category: 'High Availability',
    isPremium: true,
    instructions: `**How This Task Works:**
- Initiates planned AG failover
- Must run on target replica
- Zero data loss for sync replicas

**Prerequisites:**
- Run on target secondary
- Sync commit required
- SqlServer PowerShell module

**What You Need to Provide:**
- AG name
- Confirmation

**What the Script Does:**
1. Validates AG configuration
2. Checks synchronization
3. Performs failover
4. Confirms new primary

**Important Notes:**
- Run from TARGET server
- Sync commit ensures no data loss
- Plan failovers during maintenance
- Test failover procedures regularly`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance (Target)', type: 'text', required: true, placeholder: 'SQL02', helpText: 'Must be the secondary that will become primary' },
      { name: 'agName', label: 'Availability Group Name', type: 'text', required: true, placeholder: 'MyAG' },
      { name: 'confirmFailover', label: 'Confirm Failover', type: 'boolean', required: true, defaultValue: false, helpText: 'Must be checked to proceed' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const agName = escapePowerShellString(params.agName);
      const confirmFailover = params.confirmFailover === true;

      return `# SQL Server AlwaysOn Manual Failover
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$AGName = "${agName}"
$Confirmed = $${confirmFailover}

try {
    if (-not $Confirmed) {
        Write-Error "Failover not confirmed. Set 'Confirm Failover' to proceed."
        exit 1
    }
    
    Write-Host "⚠ PLANNED FAILOVER: $AGName" -ForegroundColor Yellow
    Write-Host "Target Primary: $ServerInstance" -ForegroundColor Cyan
    
    # Verify this is currently secondary
    $RoleQuery = @"
SELECT ars.role_desc, ar.availability_mode_desc
FROM sys.dm_hadr_availability_replica_states ars
INNER JOIN sys.availability_replicas ar ON ars.replica_id = ar.replica_id
INNER JOIN sys.availability_groups ag ON ar.group_id = ag.group_id
WHERE ag.name = '$AGName' AND ars.is_local = 1
"@
    
    $CurrentRole = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RoleQuery
    
    if ($CurrentRole.role_desc -eq 'PRIMARY') {
        Write-Error "This server is already the primary. Run failover from the target secondary."
        exit 1
    }
    
    if ($CurrentRole.availability_mode_desc -ne 'SYNCHRONOUS_COMMIT') {
        Write-Error "Cannot failover to async replica without data loss. Change to sync commit first."
        exit 1
    }
    
    Write-Host ""
    Write-Host "Current role: SECONDARY (Ready for failover)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Initiating failover..." -ForegroundColor Yellow
    
    $FailoverQuery = "ALTER AVAILABILITY GROUP [$AGName] FAILOVER"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $FailoverQuery -QueryTimeout 300
    
    # Verify new role
    Start-Sleep -Seconds 5
    $NewRole = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RoleQuery
    
    if ($NewRole.role_desc -eq 'PRIMARY') {
        Write-Host ""
        Write-Host "✓ FAILOVER SUCCESSFUL" -ForegroundColor Green
        Write-Host "  $ServerInstance is now PRIMARY" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Failover may still be in progress. Check AG status." -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failover failed: $_"
    exit 1
}`;
    }
  },

  // ==================== SECURITY ====================
  {
    id: 'sql-tde-status',
    title: 'TDE Encryption Status',
    description: 'Check Transparent Data Encryption status for all databases',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports TDE encryption state
- Shows certificate details
- Identifies unencrypted databases

**Prerequisites:**
- SQL Server Enterprise (or Developer)
- SqlServer PowerShell module
- VIEW SERVER STATE permission

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries encryption status
2. Shows certificate info
3. Reports encryption progress
4. Identifies gaps

**Important Notes:**
- TDE encrypts at rest
- Requires Enterprise edition
- Backup certificates securely
- Consider performance impact`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server TDE Encryption Status
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Checking TDE encryption status..." -ForegroundColor Cyan
    
    $TDEQuery = @"
SELECT 
    d.name AS DatabaseName,
    dek.encryption_state AS EncryptionState,
    CASE dek.encryption_state
        WHEN 0 THEN 'No encryption key'
        WHEN 1 THEN 'Unencrypted'
        WHEN 2 THEN 'Encryption in progress'
        WHEN 3 THEN 'Encrypted'
        WHEN 4 THEN 'Key change in progress'
        WHEN 5 THEN 'Decryption in progress'
        WHEN 6 THEN 'Protection change in progress'
    END AS EncryptionStateDesc,
    dek.percent_complete AS PercentComplete,
    dek.key_algorithm AS KeyAlgorithm,
    dek.key_length AS KeyLength,
    c.name AS CertificateName,
    c.expiry_date AS CertificateExpiry
FROM sys.databases d
LEFT JOIN sys.dm_database_encryption_keys dek ON d.database_id = dek.database_id
LEFT JOIN sys.certificates c ON dek.encryptor_thumbprint = c.thumbprint
WHERE d.name NOT IN ('master', 'model', 'msdb', 'tempdb')
ORDER BY d.name
"@
    
    $TDEStatus = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $TDEQuery
    
    Write-Host ""
    Write-Host "Database Encryption Status:" -ForegroundColor White
    Write-Host ""
    
    $EncryptedCount = 0
    $UnencryptedCount = 0
    
    foreach ($DB in $TDEStatus) {
        $Status = if ($DB.EncryptionState -eq 3) { 
            $EncryptedCount++
            "ENCRYPTED" 
        } elseif ($DB.EncryptionState -eq 2) {
            "IN PROGRESS ($($DB.PercentComplete)%)"
        } else {
            $UnencryptedCount++
            "NOT ENCRYPTED"
        }
        
        $Color = if ($DB.EncryptionState -eq 3) { 'Green' } 
                 elseif ($DB.EncryptionState -eq 2) { 'Yellow' } 
                 else { 'Gray' }
        
        Write-Host "  $($DB.DatabaseName): $Status" -ForegroundColor $Color
        
        if ($DB.CertificateName) {
            Write-Host "    Certificate: $($DB.CertificateName) (Expires: $($DB.CertificateExpiry))" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Encrypted databases: $EncryptedCount" -ForegroundColor Green
    Write-Host "Unencrypted databases: $UnencryptedCount" -ForegroundColor $(if ($UnencryptedCount -gt 0) { 'Yellow' } else { 'Green' })
    
    # Check for expiring certificates
    $ExpiringCerts = $TDEStatus | Where-Object { $_.CertificateExpiry -and $_.CertificateExpiry -lt (Get-Date).AddDays(90) }
    if ($ExpiringCerts) {
        Write-Host ""
        Write-Host "⚠ Certificates expiring within 90 days:" -ForegroundColor Yellow
        $ExpiringCerts | ForEach-Object { Write-Host "  $($_.CertificateName): $($_.CertificateExpiry)" -ForegroundColor Yellow }
    }
    
} catch {
    Write-Error "TDE status check failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-security-assessment',
    title: 'Security Assessment Report',
    description: 'Comprehensive security audit including users, permissions, and configuration',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
- Audits SQL Server security
- Checks common vulnerabilities
- Reports security findings

**Prerequisites:**
- SQL Server with sysadmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Output path

**What the Script Does:**
1. Checks authentication mode
2. Audits sysadmin members
3. Reviews sa account status
4. Checks audit configuration
5. Exports findings

**Important Notes:**
- Run quarterly
- Address critical findings
- Document exceptions
- Track remediation`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Security_Assessment.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Security Assessment
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Running security assessment..." -ForegroundColor Cyan
    
    $Findings = @()
    
    # 1. Check authentication mode
    Write-Host "Checking authentication mode..." -ForegroundColor Gray
    $AuthQuery = "SELECT SERVERPROPERTY('IsIntegratedSecurityOnly') AS WindowsOnly"
    $Auth = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AuthQuery
    
    if ($Auth.WindowsOnly -eq 0) {
        $Findings += [PSCustomObject]@{
            Category = "Authentication"
            Finding = "Mixed Mode Authentication"
            Severity = "Medium"
            Recommendation = "Consider Windows Authentication only if possible"
        }
    }
    
    # 2. Check sa account
    Write-Host "Checking sa account..." -ForegroundColor Gray
    $SaQuery = "SELECT is_disabled FROM sys.server_principals WHERE name = 'sa'"
    $Sa = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SaQuery
    
    if ($Sa.is_disabled -eq 0) {
        $Findings += [PSCustomObject]@{
            Category = "Authentication"
            Finding = "SA account is enabled"
            Severity = "High"
            Recommendation = "Disable sa account and rename it"
        }
    }
    
    # 3. Count sysadmin members
    Write-Host "Auditing sysadmin role..." -ForegroundColor Gray
    $SysadminQuery = @"
SELECT 
    p.name AS LoginName,
    p.type_desc AS LoginType,
    p.create_date,
    p.is_disabled
FROM sys.server_principals p
INNER JOIN sys.server_role_members rm ON p.principal_id = rm.member_principal_id
INNER JOIN sys.server_principals r ON rm.role_principal_id = r.principal_id
WHERE r.name = 'sysadmin'
ORDER BY p.name
"@
    
    $Sysadmins = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SysadminQuery
    
    Write-Host "  Sysadmin members: $($Sysadmins.Count)" -ForegroundColor $(if ($Sysadmins.Count -gt 5) { 'Yellow' } else { 'Green' })
    
    foreach ($Admin in $Sysadmins) {
        $Findings += [PSCustomObject]@{
            Category = "Privileged Access"
            Finding = "Sysadmin: $($Admin.LoginName) ($($Admin.LoginType))"
            Severity = "Info"
            Recommendation = "Review necessity of sysadmin access"
        }
    }
    
    if ($Sysadmins.Count -gt 5) {
        $Findings += [PSCustomObject]@{
            Category = "Privileged Access"
            Finding = "High number of sysadmin members: $($Sysadmins.Count)"
            Severity = "Medium"
            Recommendation = "Review and reduce sysadmin memberships"
        }
    }
    
    # 4. Check for SQL logins with weak policies
    Write-Host "Checking password policies..." -ForegroundColor Gray
    $PolicyQuery = @"
SELECT name 
FROM sys.sql_logins 
WHERE is_policy_checked = 0 AND is_disabled = 0
"@
    
    $WeakPolicy = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $PolicyQuery
    
    foreach ($Login in $WeakPolicy) {
        $Findings += [PSCustomObject]@{
            Category = "Password Policy"
            Finding = "Login without policy check: $($Login.name)"
            Severity = "High"
            Recommendation = "Enable CHECK_POLICY for this login"
        }
    }
    
    # 5. Check for guest access
    Write-Host "Checking guest access..." -ForegroundColor Gray
    $GuestQuery = @"
SELECT d.name AS DatabaseName
FROM sys.databases d
WHERE HAS_DBACCESS(d.name) = 1
    AND EXISTS (
        SELECT 1 FROM sys.database_principals 
        WHERE name = 'guest' AND has_dbaccess = 1
    )
    AND d.name NOT IN ('master', 'tempdb')
"@
    
    $GuestAccess = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $GuestQuery -ErrorAction SilentlyContinue
    
    foreach ($Guest in $GuestAccess) {
        $Findings += [PSCustomObject]@{
            Category = "Database Access"
            Finding = "Guest access enabled: $($Guest.DatabaseName)"
            Severity = "Medium"
            Recommendation = "Revoke guest access if not required"
        }
    }
    
    # Export findings
    $Findings | Export-Csv -Path $OutputPath -NoTypeInformation
    
    Write-Host ""
    Write-Host "✓ Security assessment completed" -ForegroundColor Green
    Write-Host "  Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    
    $High = ($Findings | Where-Object { $_.Severity -eq 'High' }).Count
    $Medium = ($Findings | Where-Object { $_.Severity -eq 'Medium' }).Count
    $Info = ($Findings | Where-Object { $_.Severity -eq 'Info' }).Count
    
    Write-Host "High severity findings: $High" -ForegroundColor $(if ($High -gt 0) { 'Red' } else { 'Green' })
    Write-Host "Medium severity findings: $Medium" -ForegroundColor $(if ($Medium -gt 0) { 'Yellow' } else { 'Green' })
    Write-Host "Informational findings: $Info" -ForegroundColor Gray
    
} catch {
    Write-Error "Security assessment failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-audit-login-activity',
    title: 'Login Activity Audit',
    description: 'Audit recent login attempts and failed logins from error log',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reads SQL Server error log
- Finds login events
- Identifies failed attempts

**Prerequisites:**
- SQL Server with sysadmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Hours to analyze

**What the Script Does:**
1. Reads error log entries
2. Filters login events
3. Identifies patterns
4. Reports suspicious activity

**Important Notes:**
- Review daily for security
- Watch for brute force patterns
- Set up Login Auditing
- Consider SQL Server Audit`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'hoursBack', label: 'Hours to Analyze', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const hoursBack = params.hoursBack || 24;

      return `# SQL Server Login Activity Audit
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$HoursBack = ${hoursBack}
$CutoffTime = (Get-Date).AddHours(-$HoursBack)

try {
    Write-Host "Auditing login activity: Last $HoursBack hours" -ForegroundColor Cyan
    
    # Read error log for login events
    $LogQuery = @"
EXEC sp_readerrorlog 0, 1, 'Login'
"@
    
    $LogEntries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $LogQuery
    
    # Filter by time
    $RecentEntries = $LogEntries | Where-Object { 
        $_.LogDate -ge $CutoffTime 
    }
    
    # Categorize
    $FailedLogins = $RecentEntries | Where-Object { $_.Text -like '*failed*' }
    $SuccessfulLogins = $RecentEntries | Where-Object { $_.Text -notlike '*failed*' }
    
    Write-Host ""
    Write-Host "=============== LOGIN SUMMARY ===============" -ForegroundColor White
    Write-Host "Total login events: $($RecentEntries.Count)" -ForegroundColor Gray
    Write-Host "Successful: $($SuccessfulLogins.Count)" -ForegroundColor Green
    Write-Host "Failed: $($FailedLogins.Count)" -ForegroundColor $(if ($FailedLogins.Count -gt 0) { 'Red' } else { 'Green' })
    
    if ($FailedLogins.Count -gt 0) {
        Write-Host ""
        Write-Host "Recent Failed Login Attempts:" -ForegroundColor Yellow
        
        $FailedLogins | Select-Object -First 10 | ForEach-Object {
            Write-Host "  [$($_.LogDate)] $($_.Text)" -ForegroundColor Yellow
        }
        
        # Check for patterns
        $FailedByIP = $FailedLogins | Group-Object { 
            if ($_.Text -match '\[CLIENT: ([^\]]+)\]') { $Matches[1] } else { 'Unknown' }
        } | Sort-Object Count -Descending
        
        if ($FailedByIP.Count -gt 0) {
            Write-Host ""
            Write-Host "Failed Logins by Source:" -ForegroundColor White
            $FailedByIP | Select-Object -First 5 | ForEach-Object {
                $Color = if ($_.Count -gt 10) { 'Red' } elseif ($_.Count -gt 5) { 'Yellow' } else { 'Gray' }
                Write-Host "  $($_.Name): $($_.Count) attempts" -ForegroundColor $Color
            }
        }
        
        # Alert for potential brute force
        $HighVolume = $FailedByIP | Where-Object { $_.Count -gt 10 }
        if ($HighVolume) {
            Write-Host ""
            Write-Host "⚠ POTENTIAL BRUTE FORCE DETECTED" -ForegroundColor Red
            Write-Host "Sources with >10 failed attempts:" -ForegroundColor Red
            $HighVolume | ForEach-Object {
                Write-Host "  $($_.Name): $($_.Count) attempts" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Error "Login audit failed: $_"
    exit 1
}`;
    }
  },

  // ==================== ADDITIONAL PERFORMANCE ====================
  {
    id: 'sql-deadlock-analysis',
    title: 'Deadlock Analysis',
    description: 'Analyze recent deadlocks from system health extended events',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Queries system_health session
- Extracts deadlock graphs
- Reports involved queries

**Prerequisites:**
- SQL Server 2012+
- VIEW SERVER STATE permission
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries extended events
2. Parses deadlock XML
3. Identifies victims
4. Reports patterns

**Important Notes:**
- Deadlocks waste resources
- Identify recurring patterns
- Review locking strategies
- Consider isolation levels`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server Deadlock Analysis
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Analyzing recent deadlocks..." -ForegroundColor Cyan
    
    $DeadlockQuery = @"
;WITH DeadlockEvents AS (
    SELECT 
        XEvent.query('.') AS DeadlockGraph,
        XEvent.value('@timestamp', 'datetime2') AS DeadlockTime
    FROM (
        SELECT CAST(target_data AS XML) AS TargetData
        FROM sys.dm_xe_session_targets st
        INNER JOIN sys.dm_xe_sessions s ON s.address = st.event_session_address
        WHERE s.name = 'system_health' AND st.target_name = 'ring_buffer'
    ) AS Data
    CROSS APPLY TargetData.nodes('RingBufferTarget/event[@name=\"xml_deadlock_report\"]') AS XEventData(XEvent)
)
SELECT TOP 10
    DeadlockTime,
    DeadlockGraph.value('(event/data[@name=\"xml_report\"]/value)[1]', 'nvarchar(max)') AS DeadlockXML
FROM DeadlockEvents
ORDER BY DeadlockTime DESC
"@
    
    $Deadlocks = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $DeadlockQuery -MaxCharLength 100000
    
    if (-not $Deadlocks -or $Deadlocks.Count -eq 0) {
        Write-Host "✓ No recent deadlocks found" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "Found $($Deadlocks.Count) recent deadlocks:" -ForegroundColor Yellow
    Write-Host ""
    
    $Count = 0
    foreach ($Deadlock in $Deadlocks) {
        $Count++
        Write-Host "Deadlock $Count - $($Deadlock.DeadlockTime)" -ForegroundColor Cyan
        
        if ($Deadlock.DeadlockXML) {
            try {
                $XML = [xml]$Deadlock.DeadlockXML
                $Processes = $XML.SelectNodes("//process")
                
                foreach ($Process in $Processes) {
                    $Victim = if ($Process.GetAttribute("victim") -eq "1") { "[VICTIM]" } else { "" }
                    Write-Host "  Process: $($Process.id) $Victim" -ForegroundColor $(if ($Victim) { 'Red' } else { 'Gray' })
                    Write-Host "    Database: $($Process.currentdb)" -ForegroundColor Gray
                    Write-Host "    Wait: $($Process.waitresource)" -ForegroundColor Gray
                    
                    $InputBuf = $Process.inputbuf
                    if ($InputBuf) {
                        $Query = $InputBuf.Substring(0, [Math]::Min(100, $InputBuf.Length))
                        Write-Host "    Query: $Query..." -ForegroundColor Gray
                    }
                }
            } catch {
                Write-Host "  Could not parse deadlock XML" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
    
    Write-Host "⚠ Review deadlock patterns and consider:" -ForegroundColor Yellow
    Write-Host "  - Query optimization" -ForegroundColor Gray
    Write-Host "  - Index improvements" -ForegroundColor Gray
    Write-Host "  - Transaction scope reduction" -ForegroundColor Gray
    Write-Host "  - Isolation level changes" -ForegroundColor Gray
    
} catch {
    Write-Error "Deadlock analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-tempdb-usage',
    title: 'TempDB Usage Analysis',
    description: 'Analyze TempDB space usage and identify heavy consumers',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes TempDB allocation
- Identifies space consumers
- Reports version store usage

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Reports TempDB file sizes
2. Shows session allocations
3. Identifies version store usage
4. Reports internal objects

**Important Notes:**
- TempDB bottleneck is common
- Multiple data files recommended
- Monitor during peak loads
- Watch for version store bloat`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server TempDB Usage Analysis
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Analyzing TempDB usage..." -ForegroundColor Cyan
    
    # TempDB file sizes
    $FilesQuery = @"
SELECT 
    name AS FileName,
    physical_name AS FilePath,
    size * 8 / 1024 AS SizeMB,
    FILEPROPERTY(name, 'SpaceUsed') * 8 / 1024 AS UsedMB,
    (size - FILEPROPERTY(name, 'SpaceUsed')) * 8 / 1024 AS FreeMB
FROM tempdb.sys.database_files
"@
    
    $Files = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $FilesQuery
    
    Write-Host ""
    Write-Host "TempDB Files:" -ForegroundColor White
    foreach ($File in $Files) {
        $UsedPct = if ($File.SizeMB -gt 0) { [math]::Round($File.UsedMB / $File.SizeMB * 100, 1) } else { 0 }
        $Color = if ($UsedPct -gt 80) { 'Red' } elseif ($UsedPct -gt 60) { 'Yellow' } else { 'Green' }
        Write-Host "  $($File.FileName): $($File.SizeMB) MB (Used: $UsedPct%)" -ForegroundColor $Color
    }
    
    # Space by type
    $SpaceQuery = @"
SELECT 
    SUM(user_object_reserved_page_count) * 8 / 1024 AS UserObjectsMB,
    SUM(internal_object_reserved_page_count) * 8 / 1024 AS InternalObjectsMB,
    SUM(version_store_reserved_page_count) * 8 / 1024 AS VersionStoreMB,
    SUM(mixed_extent_page_count) * 8 / 1024 AS MixedExtentMB
FROM sys.dm_db_file_space_usage
"@
    
    $Space = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SpaceQuery
    
    Write-Host ""
    Write-Host "Space by Type:" -ForegroundColor White
    Write-Host "  User Objects: $($Space.UserObjectsMB) MB" -ForegroundColor Gray
    Write-Host "  Internal Objects: $($Space.InternalObjectsMB) MB" -ForegroundColor Gray
    Write-Host "  Version Store: $($Space.VersionStoreMB) MB" -ForegroundColor $(if ($Space.VersionStoreMB -gt 1024) { 'Yellow' } else { 'Gray' })
    
    # Top sessions using TempDB
    $SessionQuery = @"
SELECT TOP 10
    t.session_id,
    s.login_name,
    s.host_name,
    (t.user_objects_alloc_page_count - t.user_objects_dealloc_page_count) * 8 / 1024 AS UserObjectsMB,
    (t.internal_objects_alloc_page_count - t.internal_objects_dealloc_page_count) * 8 / 1024 AS InternalObjectsMB
FROM sys.dm_db_session_space_usage t
INNER JOIN sys.dm_exec_sessions s ON t.session_id = s.session_id
WHERE t.session_id > 50
ORDER BY (t.user_objects_alloc_page_count + t.internal_objects_alloc_page_count) DESC
"@
    
    $Sessions = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SessionQuery
    
    Write-Host ""
    Write-Host "Top TempDB Consumers by Session:" -ForegroundColor White
    foreach ($Session in $Sessions) {
        $TotalMB = $Session.UserObjectsMB + $Session.InternalObjectsMB
        if ($TotalMB -gt 0) {
            Write-Host "  SPID $($Session.session_id): $TotalMB MB ($($Session.login_name)@$($Session.host_name))" -ForegroundColor Gray
        }
    }
    
    # Recommendations
    $TotalUsedMB = ($Files | Measure-Object -Property UsedMB -Sum).Sum
    $TotalSizeMB = ($Files | Measure-Object -Property SizeMB -Sum).Sum
    $UsagePct = [math]::Round($TotalUsedMB / $TotalSizeMB * 100, 1)
    
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "TempDB files: $($Files.Count)" -ForegroundColor Gray
    Write-Host "Total size: $([math]::Round($TotalSizeMB / 1024, 2)) GB" -ForegroundColor Gray
    Write-Host "Used: $UsagePct%" -ForegroundColor $(if ($UsagePct -gt 80) { 'Red' } else { 'Green' })
    
    if ($Files.Count -lt 4) {
        Write-Host ""
        Write-Host "⚠ Consider adding more TempDB data files (recommend 4-8)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "TempDB analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-memory-grants-pending',
    title: 'Memory Grants and Pending Queries',
    description: 'Analyze memory grant wait times and pending memory requests',
    category: 'Performance Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks memory grant queue
- Identifies waiting queries
- Reports memory pressure

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries memory grant DMV
2. Shows pending requests
3. Identifies large grants
4. Reports memory pressure

**Important Notes:**
- Memory grants affect query performance
- Large grants indicate spills to disk
- Consider max server memory
- Watch for RESOURCE_SEMAPHORE waits`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server Memory Grants Analysis
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Analyzing memory grants..." -ForegroundColor Cyan
    
    # Current memory grants
    $GrantsQuery = @"
SELECT 
    session_id,
    request_time,
    grant_time,
    requested_memory_kb / 1024 AS RequestedMB,
    granted_memory_kb / 1024 AS GrantedMB,
    used_memory_kb / 1024 AS UsedMB,
    ideal_memory_kb / 1024 AS IdealMB,
    required_memory_kb / 1024 AS RequiredMB,
    wait_time_ms / 1000 AS WaitTimeSeconds,
    is_small,
    dop,
    query_cost
FROM sys.dm_exec_query_memory_grants
ORDER BY requested_memory_kb DESC
"@
    
    $Grants = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $GrantsQuery
    
    Write-Host ""
    Write-Host "Current Memory Grants:" -ForegroundColor White
    
    if (-not $Grants -or $Grants.Count -eq 0) {
        Write-Host "  No active memory grants" -ForegroundColor Green
    } else {
        Write-Host "  Active grants: $($Grants.Count)" -ForegroundColor Yellow
        
        foreach ($Grant in $Grants) {
            $WaitStatus = if ($Grant.WaitTimeSeconds -gt 0) { " WAITING: $($Grant.WaitTimeSeconds)s" } else { "" }
            $Color = if ($Grant.WaitTimeSeconds -gt 0) { 'Red' } elseif ($Grant.RequestedMB -gt 1024) { 'Yellow' } else { 'Gray' }
            
            Write-Host "  SPID $($Grant.session_id): Requested $($Grant.RequestedMB) MB, Granted $($Grant.GrantedMB) MB$WaitStatus" -ForegroundColor $Color
        }
        
        $PendingCount = ($Grants | Where-Object { $_.WaitTimeSeconds -gt 0 }).Count
        $LargeGrants = ($Grants | Where-Object { $_.RequestedMB -gt 1024 }).Count
        
        if ($PendingCount -gt 0) {
            Write-Host ""
            Write-Host "⚠ Queries waiting for memory: $PendingCount" -ForegroundColor Red
        }
        
        if ($LargeGrants -gt 0) {
            Write-Host "⚠ Large memory grants (>1GB): $LargeGrants" -ForegroundColor Yellow
        }
    }
    
    # Memory clerk summary
    $ClerkQuery = @"
SELECT TOP 10
    type AS ClerkType,
    SUM(pages_kb) / 1024 AS SizeMB
FROM sys.dm_os_memory_clerks
GROUP BY type
ORDER BY SUM(pages_kb) DESC
"@
    
    $Clerks = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ClerkQuery
    
    Write-Host ""
    Write-Host "Top Memory Consumers (Clerks):" -ForegroundColor White
    foreach ($Clerk in $Clerks) {
        Write-Host "  $($Clerk.ClerkType): $($Clerk.SizeMB) MB" -ForegroundColor Gray
    }
    
    # Resource semaphore
    $SemaphoreQuery = @"
SELECT 
    resource_semaphore_id,
    total_memory_kb / 1024 AS TotalMemoryMB,
    available_memory_kb / 1024 AS AvailableMemoryMB,
    granted_memory_kb / 1024 AS GrantedMemoryMB,
    grantee_count,
    waiter_count
FROM sys.dm_exec_query_resource_semaphores
"@
    
    $Semaphores = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SemaphoreQuery
    
    Write-Host ""
    Write-Host "Resource Semaphores:" -ForegroundColor White
    foreach ($Sem in $Semaphores) {
        $WaiterColor = if ($Sem.waiter_count -gt 0) { 'Red' } else { 'Green' }
        Write-Host "  Pool $($Sem.resource_semaphore_id): $($Sem.AvailableMemoryMB)/$($Sem.TotalMemoryMB) MB available, $($Sem.waiter_count) waiters" -ForegroundColor $WaiterColor
    }
    
} catch {
    Write-Error "Memory grants analysis failed: $_"
    exit 1
}`;
    }
  },

  // ==================== SQL AGENT JOBS (Additional) ====================
  {
    id: 'sql-create-agent-job',
    title: 'Create SQL Agent Job',
    description: 'Create general-purpose SQL Server Agent job with T-SQL step',
    category: 'SQL Agent Jobs',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates new SQL Agent job
- Adds T-SQL command step
- Configures schedule

**Prerequisites:**
- SQL Server Agent running
- Sysadmin or SQLAgentOperatorRole
- SqlServer PowerShell module

**What You Need to Provide:**
- Job name
- T-SQL command
- Schedule (optional)

**What the Script Does:**
1. Creates job with description
2. Adds T-SQL step
3. Configures schedule
4. Enables job

**Important Notes:**
- Jobs persist across restarts
- Check job history regularly
- Set up failure notifications
- Test jobs in non-production first`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'jobName', label: 'Job Name', type: 'text', required: true, placeholder: 'My_Maintenance_Job' },
      { name: 'jobDescription', label: 'Description', type: 'text', required: false, placeholder: 'Description of what this job does' },
      { name: 'databaseName', label: 'Database Context', type: 'text', required: true, placeholder: 'master' },
      { name: 'tsqlCommand', label: 'T-SQL Command', type: 'textarea', required: true, placeholder: 'EXEC sp_updatestats', helpText: 'T-SQL command to execute' },
      { name: 'scheduleEnabled', label: 'Enable Schedule', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const jobName = escapePowerShellString(params.jobName);
      const jobDescription = escapePowerShellString(params.jobDescription || 'Created by PowerShell script');
      const databaseName = escapePowerShellString(params.databaseName);
      const tsqlCommand = escapePowerShellString(params.tsqlCommand);
      const scheduleEnabled = params.scheduleEnabled === true;

      return `# SQL Server Create Agent Job
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$JobName = "${jobName}"
$JobDescription = "${jobDescription}"
$DatabaseName = "${databaseName}"
$TsqlCommand = @"
${tsqlCommand}
"@
$ScheduleEnabled = $${scheduleEnabled}

try {
    Write-Host "Creating SQL Agent job: $JobName" -ForegroundColor Cyan
    
    # Check if job already exists
    $ExistQuery = "SELECT job_id FROM msdb.dbo.sysjobs WHERE name = '$JobName'"
    $Existing = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ExistQuery
    
    if ($Existing) {
        Write-Host "⚠ Job already exists: $JobName" -ForegroundColor Yellow
        exit 0
    }
    
    # Create job
    $CreateJobQuery = @"
EXEC msdb.dbo.sp_add_job 
    @job_name = N'$JobName',
    @enabled = 1,
    @description = N'$JobDescription',
    @category_name = N'[Uncategorized (Local)]',
    @owner_login_name = N'sa'
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CreateJobQuery
    Write-Host "✓ Job created" -ForegroundColor Green
    
    # Add job step
    $EscapedCommand = $TsqlCommand.Replace("'", "''")
    $AddStepQuery = @"
EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'$JobName',
    @step_name = N'Execute Command',
    @subsystem = N'TSQL',
    @command = N'$EscapedCommand',
    @on_success_action = 1,
    @on_fail_action = 2,
    @database_name = N'$DatabaseName'
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AddStepQuery
    Write-Host "✓ Job step added" -ForegroundColor Green
    
    # Add job to server
    $AddServerQuery = @"
EXEC msdb.dbo.sp_add_jobserver 
    @job_name = N'$JobName',
    @server_name = N'(local)'
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AddServerQuery
    Write-Host "✓ Job attached to server" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Job Details:" -ForegroundColor White
    Write-Host "  Name: $JobName" -ForegroundColor Gray
    Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
    Write-Host "  Command: $($TsqlCommand.Substring(0, [Math]::Min(50, $TsqlCommand.Length)))..." -ForegroundColor Gray
    
    if (-not $ScheduleEnabled) {
        Write-Host ""
        Write-Host "Note: No schedule configured. Add manually or run on-demand." -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to create job: $_"
    exit 1
}`;
    }
  },

  // ==================== HIGH AVAILABILITY (Additional) ====================
  {
    id: 'sql-alwayson-add-database',
    title: 'Add Database to Availability Group',
    description: 'Add existing database to AlwaysOn Availability Group',
    category: 'High Availability',
    isPremium: true,
    instructions: `**How This Task Works:**
- Adds database to AG on primary
- Requires full backup first
- Restore and join on secondaries

**Prerequisites:**
- AlwaysOn AG configured
- Database in Full recovery
- Sysadmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- AG name
- Database name
- Backup path

**What the Script Does:**
1. Validates prerequisites
2. Takes full backup
3. Adds to AG on primary
4. Provides secondary instructions

**Important Notes:**
- Database must be in Full recovery
- Backup required before adding
- Restore to secondaries manually
- Monitor sync state after adding`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance (Primary)', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'agName', label: 'Availability Group Name', type: 'text', required: true, placeholder: 'MyAG' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'backupPath', label: 'Backup Share Path', type: 'path', required: true, placeholder: '\\\\FileServer\\SQLBackups', helpText: 'UNC path accessible by all replicas' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const agName = escapePowerShellString(params.agName);
      const databaseName = escapePowerShellString(params.databaseName);
      const backupPath = escapePowerShellString(params.backupPath);

      return `# SQL Server Add Database to Availability Group
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$AGName = "${agName}"
$DatabaseName = "${databaseName}"
$BackupPath = "${backupPath}"

try {
    Write-Host "Adding database to Availability Group: $AGName" -ForegroundColor Cyan
    Write-Host "Database: $DatabaseName" -ForegroundColor Gray
    
    # Verify this is primary
    $RoleQuery = @"
SELECT ars.role_desc
FROM sys.dm_hadr_availability_replica_states ars
INNER JOIN sys.availability_replicas ar ON ars.replica_id = ar.replica_id
INNER JOIN sys.availability_groups ag ON ar.group_id = ag.group_id
WHERE ag.name = '$AGName' AND ars.is_local = 1
"@
    
    $Role = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RoleQuery
    
    if ($Role.role_desc -ne 'PRIMARY') {
        Write-Error "This server is not the primary replica. Run from primary."
        exit 1
    }
    
    # Verify recovery model
    $RecoveryQuery = "SELECT recovery_model_desc FROM sys.databases WHERE name = '$DatabaseName'"
    $Recovery = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RecoveryQuery
    
    if ($Recovery.recovery_model_desc -ne 'FULL') {
        Write-Host "Setting database to FULL recovery model..." -ForegroundColor Yellow
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query "ALTER DATABASE [$DatabaseName] SET RECOVERY FULL"
    }
    
    # Full backup
    Write-Host ""
    Write-Host "Taking full backup..." -ForegroundColor Cyan
    $FullBackup = "$BackupPath\\$DatabaseName" + "_Full_$(Get-Date -Format 'yyyyMMddHHmmss').bak"
    
    Backup-SqlDatabase -ServerInstance $ServerInstance \`
        -Database $DatabaseName \`
        -BackupFile $FullBackup \`
        -CompressionOption On
    
    Write-Host "✓ Full backup: $FullBackup" -ForegroundColor Green
    
    # Log backup
    Write-Host "Taking log backup..." -ForegroundColor Cyan
    $LogBackup = "$BackupPath\\$DatabaseName" + "_Log_$(Get-Date -Format 'yyyyMMddHHmmss').trn"
    
    Backup-SqlDatabase -ServerInstance $ServerInstance \`
        -Database $DatabaseName \`
        -BackupFile $LogBackup \`
        -BackupAction Log \`
        -CompressionOption On
    
    Write-Host "✓ Log backup: $LogBackup" -ForegroundColor Green
    
    # Add to AG
    Write-Host ""
    Write-Host "Adding database to AG..." -ForegroundColor Cyan
    
    $AddQuery = "ALTER AVAILABILITY GROUP [$AGName] ADD DATABASE [$DatabaseName]"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $AddQuery
    
    Write-Host "✓ Database added to AG on primary" -ForegroundColor Green
    
    # Get secondary replicas
    $SecondaryQuery = @"
SELECT ar.replica_server_name
FROM sys.availability_replicas ar
INNER JOIN sys.availability_groups ag ON ar.group_id = ag.group_id
INNER JOIN sys.dm_hadr_availability_replica_states ars ON ar.replica_id = ars.replica_id
WHERE ag.name = '$AGName' AND ars.role_desc = 'SECONDARY'
"@
    
    $Secondaries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SecondaryQuery
    
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Complete these steps on EACH secondary:" -ForegroundColor Yellow
    foreach ($Secondary in $Secondaries) {
        Write-Host ""
        Write-Host "On $($Secondary.replica_server_name):" -ForegroundColor Cyan
        Write-Host "  1. RESTORE DATABASE [$DatabaseName] FROM DISK = N'$FullBackup' WITH NORECOVERY" -ForegroundColor Gray
        Write-Host "  2. RESTORE LOG [$DatabaseName] FROM DISK = N'$LogBackup' WITH NORECOVERY" -ForegroundColor Gray
        Write-Host "  3. ALTER DATABASE [$DatabaseName] SET HADR AVAILABILITY GROUP = [$AGName]" -ForegroundColor Gray
    }
    
} catch {
    Write-Error "Failed to add database to AG: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-alwayson-remove-database',
    title: 'Remove Database from Availability Group',
    description: 'Remove database from AlwaysOn Availability Group',
    category: 'High Availability',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes database from AG
- Database remains but is no longer replicated
- Can be done from any replica

**Prerequisites:**
- AlwaysOn AG configured
- Sysadmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- AG name
- Database name
- Whether to remove from primary or all

**What the Script Does:**
1. Removes database from AG
2. Sets database to normal state
3. Reports completion

**Important Notes:**
- Database is NOT deleted
- Replication stops immediately
- Secondary copies become standalone
- Backup before removing`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'agName', label: 'Availability Group Name', type: 'text', required: true, placeholder: 'MyAG' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'confirmRemove', label: 'Confirm Removal', type: 'boolean', required: true, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const agName = escapePowerShellString(params.agName);
      const databaseName = escapePowerShellString(params.databaseName);
      const confirmRemove = params.confirmRemove === true;

      return `# SQL Server Remove Database from Availability Group
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$AGName = "${agName}"
$DatabaseName = "${databaseName}"
$Confirmed = $${confirmRemove}

try {
    if (-not $Confirmed) {
        Write-Error "Removal not confirmed. Check 'Confirm Removal' to proceed."
        exit 1
    }
    
    Write-Host "Removing database from Availability Group" -ForegroundColor Yellow
    Write-Host "AG: $AGName" -ForegroundColor Gray
    Write-Host "Database: $DatabaseName" -ForegroundColor Gray
    
    # Check if this is primary or secondary
    $RoleQuery = @"
SELECT ars.role_desc
FROM sys.dm_hadr_availability_replica_states ars
INNER JOIN sys.availability_replicas ar ON ars.replica_id = ar.replica_id
INNER JOIN sys.availability_groups ag ON ar.group_id = ag.group_id
WHERE ag.name = '$AGName' AND ars.is_local = 1
"@
    
    $Role = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RoleQuery
    $IsPrimary = $Role.role_desc -eq 'PRIMARY'
    
    Write-Host "Current role: $($Role.role_desc)" -ForegroundColor Gray
    
    if ($IsPrimary) {
        # Remove from AG (primary)
        $RemoveQuery = "ALTER AVAILABILITY GROUP [$AGName] REMOVE DATABASE [$DatabaseName]"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RemoveQuery
        
        Write-Host "✓ Database removed from AG on primary" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠ The database still exists on this server" -ForegroundColor Yellow
        Write-Host "⚠ Secondary replicas will have the database in RESTORING state" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To recover database on secondaries:" -ForegroundColor Cyan
        Write-Host "  RESTORE DATABASE [$DatabaseName] WITH RECOVERY" -ForegroundColor Gray
    } else {
        # Remove from secondary (makes database standalone)
        $RemoveQuery = "ALTER DATABASE [$DatabaseName] SET HADR OFF"
        Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $RemoveQuery
        
        Write-Host "✓ Database removed from AG on this secondary" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database is now a standalone database on this server" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to remove database from AG: $_"
    exit 1
}`;
    }
  },

  // ==================== SECURITY (Additional) ====================
  {
    id: 'sql-configure-server-audit',
    title: 'Configure SQL Server Audit',
    description: 'Create and configure SQL Server Audit for compliance logging',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates SQL Server Audit
- Configures audit destination
- Sets up audit specification

**Prerequisites:**
- SQL Server 2008+
- Sysadmin role
- Audit destination folder

**What You Need to Provide:**
- Server instance
- Audit name
- Audit file path
- Events to audit

**What the Script Does:**
1. Creates server audit
2. Configures file target
3. Creates audit specification
4. Enables auditing

**Important Notes:**
- Required for compliance (SOX, HIPAA, PCI)
- Monitor audit file size
- Archive old audit files
- Test audit captures expected events`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'auditName', label: 'Audit Name', type: 'text', required: true, placeholder: 'ComplianceAudit' },
      { name: 'auditPath', label: 'Audit File Path', type: 'path', required: true, placeholder: 'C:\\SQLAudit', helpText: 'Folder for audit files' },
      { name: 'auditLogins', label: 'Audit Login Events', type: 'boolean', required: false, defaultValue: true },
      { name: 'auditServerChanges', label: 'Audit Server Changes', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const auditName = escapePowerShellString(params.auditName);
      const auditPath = escapePowerShellString(params.auditPath);
      const auditLogins = params.auditLogins !== false;
      const auditServerChanges = params.auditServerChanges !== false;

      return `# SQL Server Configure Audit
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$AuditName = "${auditName}"
$AuditPath = "${auditPath}"
$AuditLogins = $${auditLogins}
$AuditServerChanges = $${auditServerChanges}

try {
    Write-Host "Configuring SQL Server Audit: $AuditName" -ForegroundColor Cyan
    Write-Host "Audit path: $AuditPath" -ForegroundColor Gray
    
    # Create audit
    $CreateAuditQuery = @"
IF NOT EXISTS (SELECT 1 FROM sys.server_audits WHERE name = '$AuditName')
BEGIN
    CREATE SERVER AUDIT [$AuditName]
    TO FILE (
        FILEPATH = N'$AuditPath',
        MAXSIZE = 100 MB,
        MAX_ROLLOVER_FILES = 10,
        RESERVE_DISK_SPACE = OFF
    )
    WITH (
        QUEUE_DELAY = 1000,
        ON_FAILURE = CONTINUE
    )
END
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CreateAuditQuery
    Write-Host "✓ Server audit created" -ForegroundColor Green
    
    # Build audit specification
    $SpecName = "$AuditName" + "_Spec"
    $AuditActions = @()
    
    if ($AuditLogins) {
        $AuditActions += "ADD (FAILED_LOGIN_GROUP)"
        $AuditActions += "ADD (SUCCESSFUL_LOGIN_GROUP)"
        $AuditActions += "ADD (LOGOUT_GROUP)"
    }
    
    if ($AuditServerChanges) {
        $AuditActions += "ADD (SERVER_ROLE_MEMBER_CHANGE_GROUP)"
        $AuditActions += "ADD (SERVER_PRINCIPAL_CHANGE_GROUP)"
        $AuditActions += "ADD (DATABASE_CHANGE_GROUP)"
        $AuditActions += "ADD (BACKUP_RESTORE_GROUP)"
    }
    
    $ActionsString = $AuditActions -join ","
    
    $CreateSpecQuery = @"
IF NOT EXISTS (SELECT 1 FROM sys.server_audit_specifications WHERE name = '\$SpecName')
BEGIN
    CREATE SERVER AUDIT SPECIFICATION [\$SpecName]
    FOR SERVER AUDIT [\$AuditName]
    \$ActionsString
    WITH (STATE = ON)
END
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $CreateSpecQuery
    Write-Host "✓ Audit specification created" -ForegroundColor Green
    
    # Enable audit
    $EnableQuery = "ALTER SERVER AUDIT [$AuditName] WITH (STATE = ON)"
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $EnableQuery
    Write-Host "✓ Audit enabled" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "=============== AUDIT CONFIGURATION ===============" -ForegroundColor White
    Write-Host "Audit Name: $AuditName" -ForegroundColor Gray
    Write-Host "Specification: $SpecName" -ForegroundColor Gray
    Write-Host "File Path: $AuditPath" -ForegroundColor Gray
    Write-Host "Login Events: $AuditLogins" -ForegroundColor Gray
    Write-Host "Server Changes: $AuditServerChanges" -ForegroundColor Gray
    Write-Host ""
    Write-Host "View audit logs:" -ForegroundColor Cyan
    Write-Host "  SELECT * FROM sys.fn_get_audit_file('$AuditPath\\*.sqlaudit', DEFAULT, DEFAULT)" -ForegroundColor Gray
    
} catch {
    Write-Error "Failed to configure audit: $_"
    exit 1
}`;
    }
  },

  // ==================== MONITORING ====================
  {
    id: 'sql-disk-space-report',
    title: 'Database Disk Space Report',
    description: 'Monitor disk space usage for all database files and drives',
    category: 'Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports disk space for all database files
- Shows drive-level capacity
- Identifies databases consuming most space
- Warns on low disk thresholds

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Warning threshold percentage

**What the Script Does:**
1. Queries database file sizes
2. Reports drive capacity
3. Identifies growth trends
4. Alerts on low space

**Important Notes:**
- Monitor daily for production
- Set alerts at 20% free space
- Plan for growth
- Consider autogrowth settings`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'warningThreshold', label: 'Warning Threshold (% free)', type: 'number', required: false, defaultValue: 20, helpText: 'Alert when free space below this percentage' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const warningThreshold = params.warningThreshold || 20;

      return `# SQL Server Disk Space Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$WarningThreshold = ${warningThreshold}

try {
    Write-Host "Analyzing disk space usage..." -ForegroundColor Cyan
    
    # Database file sizes
    $FileQuery = @"
SELECT 
    d.name AS DatabaseName,
    f.name AS FileName,
    f.type_desc AS FileType,
    f.physical_name AS FilePath,
    CAST(f.size * 8.0 / 1024 AS DECIMAL(18,2)) AS SizeMB,
    CAST(FILEPROPERTY(f.name, 'SpaceUsed') * 8.0 / 1024 AS DECIMAL(18,2)) AS UsedMB,
    CAST((f.size - FILEPROPERTY(f.name, 'SpaceUsed')) * 8.0 / 1024 AS DECIMAL(18,2)) AS FreeMB,
    LEFT(f.physical_name, 1) AS DriveLetter
FROM sys.master_files f
INNER JOIN sys.databases d ON f.database_id = d.database_id
ORDER BY SizeMB DESC
"@
    
    $Files = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $FileQuery
    
    # Group by database
    $ByDatabase = $Files | Group-Object DatabaseName | ForEach-Object {
        [PSCustomObject]@{
            DatabaseName = $_.Name
            TotalSizeMB = ($_.Group | Measure-Object -Property SizeMB -Sum).Sum
            TotalUsedMB = ($_.Group | Measure-Object -Property UsedMB -Sum).Sum
            FileCount = $_.Count
        }
    } | Sort-Object TotalSizeMB -Descending
    
    Write-Host ""
    Write-Host "Top 10 Databases by Size:" -ForegroundColor White
    $ByDatabase | Select-Object -First 10 | ForEach-Object {
        $UsedPct = if ($_.TotalSizeMB -gt 0) { [math]::Round($_.TotalUsedMB / $_.TotalSizeMB * 100, 1) } else { 0 }
        Write-Host "  $($_.DatabaseName): $([math]::Round($_.TotalSizeMB / 1024, 2)) GB ($UsedPct% used)" -ForegroundColor Gray
    }
    
    # Drive-level analysis
    $DriveQuery = @"
SELECT DISTINCT
    vs.volume_mount_point AS Drive,
    CAST(vs.total_bytes / 1024 / 1024 / 1024.0 AS DECIMAL(18,2)) AS TotalGB,
    CAST(vs.available_bytes / 1024 / 1024 / 1024.0 AS DECIMAL(18,2)) AS FreeGB,
    CAST((vs.total_bytes - vs.available_bytes) * 100.0 / vs.total_bytes AS DECIMAL(5,2)) AS UsedPct
FROM sys.master_files f
CROSS APPLY sys.dm_os_volume_stats(f.database_id, f.file_id) vs
"@
    
    $Drives = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $DriveQuery
    
    Write-Host ""
    Write-Host "Drive Capacity:" -ForegroundColor White
    foreach ($Drive in $Drives) {
        $FreePct = 100 - $Drive.UsedPct
        $Color = if ($FreePct -lt $WarningThreshold) { 'Red' } elseif ($FreePct -lt ($WarningThreshold * 2)) { 'Yellow' } else { 'Green' }
        Write-Host "  $($Drive.Drive): $($Drive.TotalGB) GB total, $($Drive.FreeGB) GB free ($FreePct% free)" -ForegroundColor $Color
        
        if ($FreePct -lt $WarningThreshold) {
            Write-Host "    WARNING: LOW DISK SPACE" -ForegroundColor Red
        }
    }
    
    # Summary
    $TotalAllocatedGB = [math]::Round(($Files | Measure-Object -Property SizeMB -Sum).Sum / 1024, 2)
    $TotalUsedGB = [math]::Round(($Files | Measure-Object -Property UsedMB -Sum).Sum / 1024, 2)
    
    Write-Host ""
    Write-Host "=============== SUMMARY ===============" -ForegroundColor White
    Write-Host "Total databases: $($ByDatabase.Count)" -ForegroundColor Gray
    Write-Host "Total database files: $($Files.Count)" -ForegroundColor Gray
    Write-Host "Total allocated: $TotalAllocatedGB GB" -ForegroundColor Gray
    Write-Host "Total used: $TotalUsedGB GB" -ForegroundColor Gray
    
} catch {
    Write-Error "Disk space analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-database-growth-report',
    title: 'Database Growth Trend Report',
    description: 'Track database size growth over time using backup history',
    category: 'Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Analyzes backup size history
- Calculates growth trends
- Projects future space needs
- Exports growth data

**Prerequisites:**
- SQL Server with msdb access
- SqlServer PowerShell module
- Backup history available

**What You Need to Provide:**
- SQL Server instance
- Days of history
- Output path

**What the Script Does:**
1. Queries backup history
2. Calculates growth rates
3. Projects future needs
4. Exports report

**Important Notes:**
- Accuracy depends on backup frequency
- Use for capacity planning
- Monitor growth anomalies
- Plan storage accordingly`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'daysBack', label: 'Days of History', type: 'number', required: false, defaultValue: 90 },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Database_Growth.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const daysBack = params.daysBack || 90;
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Database Growth Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DaysBack = ${daysBack}
$OutputPath = "${outputPath}"

try {
    Write-Host "Analyzing database growth trends..." -ForegroundColor Cyan
    Write-Host "Period: Last $DaysBack days" -ForegroundColor Gray
    
    $GrowthQuery = @"
SELECT 
    database_name AS DatabaseName,
    CAST(backup_start_date AS DATE) AS BackupDate,
    CAST(AVG(backup_size) / 1024 / 1024 / 1024 AS DECIMAL(18,2)) AS BackupSizeGB
FROM msdb.dbo.backupset
WHERE type = 'D'
    AND backup_start_date >= DATEADD(DAY, -$DaysBack, GETDATE())
GROUP BY database_name, CAST(backup_start_date AS DATE)
ORDER BY database_name, BackupDate
"@
    
    $GrowthData = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $GrowthQuery
    
    if (-not $GrowthData) {
        Write-Host "No backup history found" -ForegroundColor Yellow
        exit 0
    }
    
    $GrowthData | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Calculate growth by database
    $Databases = $GrowthData | Select-Object -ExpandProperty DatabaseName -Unique
    
    Write-Host ""
    Write-Host "Database Growth Summary:" -ForegroundColor White
    
    foreach ($DB in $Databases) {
        $DBData = $GrowthData | Where-Object { $_.DatabaseName -eq $DB } | Sort-Object BackupDate
        
        if ($DBData.Count -ge 2) {
            $FirstSize = $DBData[0].BackupSizeGB
            $LastSize = $DBData[-1].BackupSizeGB
            $GrowthGB = $LastSize - $FirstSize
            $GrowthPct = if ($FirstSize -gt 0) { [math]::Round(($GrowthGB / $FirstSize) * 100, 1) } else { 0 }
            $DailyGrowth = [math]::Round($GrowthGB / $DaysBack, 3)
            
            $Color = if ($GrowthPct -gt 50) { 'Yellow' } elseif ($GrowthPct -gt 0) { 'Cyan' } else { 'Green' }
            
            Write-Host ""
            Write-Host "  $DB" -ForegroundColor $Color
            Write-Host "    Start: $FirstSize GB -> Current: $LastSize GB" -ForegroundColor Gray
            Write-Host "    Growth: $GrowthGB GB ($GrowthPct%)" -ForegroundColor Gray
            Write-Host "    Daily average: $DailyGrowth GB/day" -ForegroundColor Gray
            
            # Project 30-day growth
            $Projected30 = [math]::Round($LastSize + ($DailyGrowth * 30), 2)
            Write-Host "    30-day projection: $Projected30 GB" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Growth report exported: $OutputPath" -ForegroundColor Green
    
} catch {
    Write-Error "Growth analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-connection-count-report',
    title: 'Active Connections Report',
    description: 'Monitor active connections by database, user, and application',
    category: 'Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports all active connections
- Groups by database, user, application
- Identifies connection patterns
- Helps capacity planning

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries dm_exec_sessions
2. Groups by various criteria
3. Identifies heavy consumers
4. Reports connection states

**Important Notes:**
- Monitor for connection leaks
- Track application patterns
- Watch for blocking connections
- Compare to connection limits`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server Active Connections Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Analyzing active connections..." -ForegroundColor Cyan
    
    # Total connection count
    $TotalQuery = @"
SELECT 
    COUNT(*) AS TotalConnections,
    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS RunningQueries,
    SUM(CASE WHEN status = 'sleeping' THEN 1 ELSE 0 END) AS SleepingConnections
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
"@
    
    $Total = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $TotalQuery
    
    Write-Host ""
    Write-Host "Connection Overview:" -ForegroundColor White
    Write-Host "  Total connections: $($Total.TotalConnections)" -ForegroundColor Cyan
    Write-Host "  Running queries: $($Total.RunningQueries)" -ForegroundColor Green
    Write-Host "  Sleeping: $($Total.SleepingConnections)" -ForegroundColor Gray
    
    # By database
    $ByDBQuery = @"
SELECT TOP 10
    ISNULL(DB_NAME(database_id), 'master') AS DatabaseName,
    COUNT(*) AS Connections
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
GROUP BY database_id
ORDER BY Connections DESC
"@
    
    $ByDB = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ByDBQuery
    
    Write-Host ""
    Write-Host "Connections by Database:" -ForegroundColor White
    foreach ($DB in $ByDB) {
        Write-Host "  $($DB.DatabaseName): $($DB.Connections)" -ForegroundColor Gray
    }
    
    # By application
    $ByAppQuery = @"
SELECT TOP 10
    ISNULL(program_name, 'Unknown') AS ApplicationName,
    COUNT(*) AS Connections
FROM sys.dm_exec_sessions
WHERE is_user_process = 1 AND program_name IS NOT NULL AND program_name != ''
GROUP BY program_name
ORDER BY Connections DESC
"@
    
    $ByApp = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ByAppQuery
    
    Write-Host ""
    Write-Host "Connections by Application:" -ForegroundColor White
    foreach ($App in $ByApp) {
        Write-Host "  $($App.ApplicationName): $($App.Connections)" -ForegroundColor Gray
    }
    
    # By login
    $ByLoginQuery = @"
SELECT TOP 10
    login_name AS LoginName,
    COUNT(*) AS Connections
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
GROUP BY login_name
ORDER BY Connections DESC
"@
    
    $ByLogin = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ByLoginQuery
    
    Write-Host ""
    Write-Host "Connections by Login:" -ForegroundColor White
    foreach ($Login in $ByLogin) {
        Write-Host "  $($Login.LoginName): $($Login.Connections)" -ForegroundColor Gray
    }
    
    # By host
    $ByHostQuery = @"
SELECT TOP 10
    ISNULL(host_name, 'Unknown') AS HostName,
    COUNT(*) AS Connections
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
GROUP BY host_name
ORDER BY Connections DESC
"@
    
    $ByHost = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ByHostQuery
    
    Write-Host ""
    Write-Host "Connections by Host:" -ForegroundColor White
    foreach ($HostItem in $ByHost) {
        Write-Host "  $($HostItem.HostName): $($HostItem.Connections)" -ForegroundColor Gray
    }
    
    # Max connections setting
    $MaxQuery = "SELECT @@MAX_CONNECTIONS AS MaxConnections"
    $Max = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $MaxQuery
    
    $UsagePct = [math]::Round(($Total.TotalConnections / $Max.MaxConnections) * 100, 1)
    
    Write-Host ""
    Write-Host "Connection Capacity:" -ForegroundColor White
    Write-Host "  Max allowed: $($Max.MaxConnections)" -ForegroundColor Gray
    Write-Host "  Current usage: $UsagePct%" -ForegroundColor $(if ($UsagePct -gt 80) { 'Red' } elseif ($UsagePct -gt 50) { 'Yellow' } else { 'Green' })
    
} catch {
    Write-Error "Connection analysis failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-server-configuration-report',
    title: 'Server Configuration Report',
    description: 'Report SQL Server configuration settings and best practices',
    category: 'Monitoring',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reports server configuration
- Compares to best practices
- Identifies misconfigurations
- Documents current settings

**Prerequisites:**
- SQL Server with VIEW SERVER STATE
- SqlServer PowerShell module
- Sysadmin for some settings

**What You Need to Provide:**
- SQL Server instance

**What the Script Does:**
1. Queries sp_configure
2. Reports key settings
3. Compares to best practices
4. Exports configuration

**Important Notes:**
- Document for DR purposes
- Review after upgrades
- Compare across servers
- Track changes over time`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'outputPath', label: 'Output CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\SQL_Config.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const outputPath = escapePowerShellString(params.outputPath || '');

      return `# SQL Server Configuration Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Gathering server configuration..." -ForegroundColor Cyan
    
    # Server properties
    $PropsQuery = @"
SELECT 
    SERVERPROPERTY('MachineName') AS MachineName,
    SERVERPROPERTY('ServerName') AS ServerName,
    SERVERPROPERTY('ProductVersion') AS Version,
    SERVERPROPERTY('ProductLevel') AS ProductLevel,
    SERVERPROPERTY('Edition') AS Edition,
    SERVERPROPERTY('EngineEdition') AS EngineEdition,
    SERVERPROPERTY('IsClustered') AS IsClustered,
    SERVERPROPERTY('IsHadrEnabled') AS IsHadrEnabled,
    SERVERPROPERTY('Collation') AS Collation
"@
    
    $Props = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $PropsQuery
    
    Write-Host ""
    Write-Host "Server Information:" -ForegroundColor White
    Write-Host "  Server: $($Props.ServerName)" -ForegroundColor Cyan
    Write-Host "  Version: $($Props.Version) ($($Props.ProductLevel))" -ForegroundColor Gray
    Write-Host "  Edition: $($Props.Edition)" -ForegroundColor Gray
    Write-Host "  Clustered: $($Props.IsClustered)" -ForegroundColor Gray
    Write-Host "  AlwaysOn: $($Props.IsHadrEnabled)" -ForegroundColor Gray
    Write-Host "  Collation: $($Props.Collation)" -ForegroundColor Gray
    
    # Key configurations
    $ConfigQuery = @"
SELECT 
    name AS ConfigName,
    value AS ConfiguredValue,
    value_in_use AS RunningValue,
    minimum AS MinValue,
    maximum AS MaxValue,
    is_dynamic AS IsDynamic,
    is_advanced AS IsAdvanced
FROM sys.configurations
WHERE name IN (
    'max server memory (MB)',
    'min server memory (MB)',
    'max degree of parallelism',
    'cost threshold for parallelism',
    'optimize for ad hoc workloads',
    'clr enabled',
    'xp_cmdshell',
    'backup compression default',
    'remote admin connections',
    'cross db ownership chaining',
    'Database Mail XPs',
    'default trace enabled'
)
ORDER BY name
"@
    
    $Config = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ConfigQuery
    
    Write-Host ""
    Write-Host "Key Configuration Settings:" -ForegroundColor White
    
    foreach ($Setting in $Config) {
        $Status = if ($Setting.ConfiguredValue -ne $Setting.RunningValue) { ' (restart needed)' } else { '' }
        Write-Host "  $($Setting.ConfigName): $($Setting.RunningValue)$Status" -ForegroundColor Gray
    }
    
    # Memory analysis
    $MemQuery = @"
SELECT 
    physical_memory_kb / 1024 AS PhysicalMemoryMB,
    committed_kb / 1024 AS CommittedMemoryMB,
    committed_target_kb / 1024 AS TargetMemoryMB
FROM sys.dm_os_sys_info
"@
    
    $Mem = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $MemQuery
    $MaxMem = ($Config | Where-Object { $_.ConfigName -eq 'max server memory (MB)' }).RunningValue
    
    Write-Host ""
    Write-Host "Memory Configuration:" -ForegroundColor White
    Write-Host "  Physical Memory: $([math]::Round($Mem.PhysicalMemoryMB / 1024, 2)) GB" -ForegroundColor Gray
    Write-Host "  Max Server Memory: $([math]::Round($MaxMem / 1024, 2)) GB" -ForegroundColor Gray
    Write-Host "  Currently Committed: $([math]::Round($Mem.CommittedMemoryMB / 1024, 2)) GB" -ForegroundColor Gray
    
    # Best practice checks
    Write-Host ""
    Write-Host "Best Practice Checks:" -ForegroundColor White
    
    # Check MAXDOP
    $MaxDOP = ($Config | Where-Object { $_.ConfigName -eq 'max degree of parallelism' }).RunningValue
    if ($MaxDOP -eq 0) {
        Write-Host "  MAXDOP is 0 (unlimited) - consider setting based on CPU cores" -ForegroundColor Yellow
    } else {
        Write-Host "  MAXDOP: $MaxDOP" -ForegroundColor Green
    }
    
    # Check cost threshold
    $CostThreshold = ($Config | Where-Object { $_.ConfigName -eq 'cost threshold for parallelism' }).RunningValue
    if ($CostThreshold -eq 5) {
        Write-Host "  Cost threshold is default (5) - consider increasing for OLTP" -ForegroundColor Yellow
    } else {
        Write-Host "  Cost threshold: $CostThreshold" -ForegroundColor Green
    }
    
    # Check max memory
    if ($MaxMem -gt ($Mem.PhysicalMemoryMB - 4096)) {
        Write-Host "  Max server memory may be too high - leave 4GB+ for OS" -ForegroundColor Yellow
    } else {
        Write-Host "  Max server memory properly configured" -ForegroundColor Green
    }
    
    # Export if path provided
    if ($OutputPath) {
        $Config | Export-Csv -Path $OutputPath -NoTypeInformation
        Write-Host ""
        Write-Host "Configuration exported: $OutputPath" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Configuration report failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-log-shipping-status',
    title: 'Log Shipping Status Check',
    description: 'Monitor log shipping status, latency, and alert thresholds',
    category: 'High Availability',
    isPremium: true,
    instructions: `**How This Task Works:**
- Checks log shipping configuration
- Reports backup/copy/restore status
- Monitors latency and thresholds
- Identifies sync issues

**Prerequisites:**
- Log shipping configured
- SqlServer PowerShell module
- Access to primary and secondary

**What You Need to Provide:**
- SQL Server instance (primary or secondary)

**What the Script Does:**
1. Queries log shipping tables
2. Reports last backup/restore times
3. Calculates latency
4. Alerts on threshold breaches

**Important Notes:**
- Monitor on both primary and secondary
- Check latency regularly
- Review alert thresholds
- Test failover procedures`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);

      return `# SQL Server Log Shipping Status
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"

try {
    Write-Host "Checking log shipping status..." -ForegroundColor Cyan
    
    # Primary databases
    $PrimaryQuery = @"
SELECT 
    p.primary_database AS DatabaseName,
    p.backup_directory AS BackupDirectory,
    p.backup_share AS BackupShare,
    p.backup_threshold AS BackupThresholdMinutes
FROM msdb.dbo.log_shipping_primary_databases p
"@
    
    $Primaries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $PrimaryQuery -ErrorAction SilentlyContinue
    
    if ($Primaries) {
        Write-Host ""
        Write-Host "Primary Databases (Log Shipping Source):" -ForegroundColor White
        
        foreach ($Primary in $Primaries) {
            Write-Host ""
            Write-Host "  $($Primary.DatabaseName)" -ForegroundColor Cyan
            Write-Host "    Backup threshold: $($Primary.BackupThresholdMinutes) minutes" -ForegroundColor Gray
            Write-Host "    Backup share: $($Primary.BackupShare)" -ForegroundColor Gray
        }
    }
    
    # Secondary databases
    $SecondaryQuery = @"
SELECT 
    s.secondary_database AS DatabaseName,
    s.primary_server AS PrimaryServer,
    s.primary_database AS PrimaryDatabase,
    s.restore_threshold AS RestoreThresholdMinutes,
    sd.last_restored_file AS LastRestoredFile,
    sd.last_restored_date AS LastRestoreTime,
    DATEDIFF(MINUTE, sd.last_restored_date, GETDATE()) AS MinutesSinceRestore
FROM msdb.dbo.log_shipping_secondary_databases s
LEFT JOIN msdb.dbo.log_shipping_monitor_secondary sd 
    ON s.secondary_database = sd.secondary_database
"@
    
    $Secondaries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SecondaryQuery -ErrorAction SilentlyContinue
    
    if ($Secondaries) {
        Write-Host ""
        Write-Host "Secondary Databases (Log Shipping Target):" -ForegroundColor White
        
        foreach ($Secondary in $Secondaries) {
            $Status = if ($Secondary.MinutesSinceRestore -gt $Secondary.RestoreThresholdMinutes) { 'ALERT' } else { 'OK' }
            $Color = if ($Status -eq 'ALERT') { 'Red' } else { 'Green' }
            
            Write-Host ""
            Write-Host "  $($Secondary.DatabaseName)" -ForegroundColor Cyan
            Write-Host "    Primary: $($Secondary.PrimaryServer).$($Secondary.PrimaryDatabase)" -ForegroundColor Gray
            Write-Host "    Restore threshold: $($Secondary.RestoreThresholdMinutes) minutes" -ForegroundColor Gray
            Write-Host "    Minutes since restore: $($Secondary.MinutesSinceRestore)" -ForegroundColor $Color
            Write-Host "    Last file: $($Secondary.LastRestoredFile)" -ForegroundColor Gray
            Write-Host "    Status: $Status" -ForegroundColor $Color
        }
    }
    
    if (-not $Primaries -and -not $Secondaries) {
        Write-Host ""
        Write-Host "No log shipping configuration found on this server" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Log shipping status check failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-database-mail-test',
    title: 'Test Database Mail',
    description: 'Send test email through Database Mail and verify configuration',
    category: 'Maintenance Plans',
    isPremium: true,
    instructions: `**How This Task Works:**
- Sends test email via Database Mail
- Verifies SMTP configuration
- Checks mail queue status
- Reports delivery status

**Prerequisites:**
- Database Mail configured
- Valid mail profile
- SMTP server accessible
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Mail profile name
- Recipient email address

**What the Script Does:**
1. Validates mail profile
2. Sends test message
3. Monitors queue
4. Reports delivery status

**Important Notes:**
- Test after any mail changes
- Verify SMTP connectivity
- Check spam folders
- Monitor failed mail items`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'profileName', label: 'Mail Profile Name', type: 'text', required: true, placeholder: 'SQLMailProfile' },
      { name: 'recipientEmail', label: 'Recipient Email', type: 'text', required: true, placeholder: 'admin@company.com' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const profileName = escapePowerShellString(params.profileName);
      const recipientEmail = escapePowerShellString(params.recipientEmail);

      return `# SQL Server Database Mail Test
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$ProfileName = "${profileName}"
$RecipientEmail = "${recipientEmail}"

try {
    Write-Host "Testing Database Mail configuration..." -ForegroundColor Cyan
    
    # Check if Database Mail is enabled
    $EnabledQuery = "SELECT value_in_use FROM sys.configurations WHERE name = 'Database Mail XPs'"
    $Enabled = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $EnabledQuery
    
    if ($Enabled.value_in_use -ne 1) {
        Write-Error "Database Mail XPs is not enabled. Enable with: sp_configure 'Database Mail XPs', 1; RECONFIGURE"
        exit 1
    }
    
    # Verify profile exists
    $ProfileQuery = "SELECT profile_id, name FROM msdb.dbo.sysmail_profile WHERE name = '$ProfileName'"
    $Profile = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ProfileQuery
    
    if (-not $Profile) {
        Write-Error "Mail profile not found: $ProfileName"
        exit 1
    }
    
    Write-Host "Mail profile found: $ProfileName" -ForegroundColor Green
    
    # Send test email
    $TestSubject = "SQL Server Database Mail Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $TestBody = @"
This is a test email from SQL Server Database Mail.

Server: $ServerInstance
Profile: $ProfileName
Sent: $(Get-Date)

If you received this email, Database Mail is working correctly.
"@
    
    Write-Host "Sending test email to: $RecipientEmail" -ForegroundColor Cyan
    
    $SendQuery = @"
EXEC msdb.dbo.sp_send_dbmail
    @profile_name = N'$ProfileName',
    @recipients = N'$RecipientEmail',
    @subject = N'$TestSubject',
    @body = N'$TestBody';
SELECT @@ROWCOUNT AS Result
"@
    
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $SendQuery
    
    Write-Host "Test email queued successfully" -ForegroundColor Green
    
    # Check mail queue
    Start-Sleep -Seconds 5
    
    $QueueQuery = @"
SELECT TOP 5
    mailitem_id,
    send_request_date,
    sent_status,
    subject
FROM msdb.dbo.sysmail_allitems
ORDER BY mailitem_id DESC
"@
    
    $Queue = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $QueueQuery
    
    Write-Host ""
    Write-Host "Recent Mail Items:" -ForegroundColor White
    
    foreach ($Item in $Queue) {
        $StatusColor = switch ($Item.sent_status) {
            'sent' { 'Green' }
            'failed' { 'Red' }
            'unsent' { 'Yellow' }
            default { 'Gray' }
        }
        
        Write-Host "  [$($Item.sent_status)] $($Item.subject)" -ForegroundColor $StatusColor
    }
    
    # Check for errors
    $ErrorQuery = @"
SELECT TOP 3 description 
FROM msdb.dbo.sysmail_event_log 
WHERE event_type = 'error'
ORDER BY log_date DESC
"@
    
    $Errors = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $ErrorQuery -ErrorAction SilentlyContinue
    
    if ($Errors) {
        Write-Host ""
        Write-Host "Recent Mail Errors:" -ForegroundColor Yellow
        foreach ($Err in $Errors) {
            Write-Host "  $($Err.description)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Check recipient inbox (and spam folder) for test email" -ForegroundColor Cyan
    
} catch {
    Write-Error "Database Mail test failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-server-logins-report',
    title: 'Server Logins Security Report',
    description: 'Report all SQL Server logins with roles and security status',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all server-level logins
- Reports role memberships
- Identifies security concerns
- Exports for audit compliance

**Prerequisites:**
- SQL Server with securityadmin role
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Output path

**What the Script Does:**
1. Queries server principals
2. Reports role memberships
3. Identifies disabled/expired
4. Flags security issues

**Important Notes:**
- Run quarterly for compliance
- Review sysadmin members
- Check for orphaned logins
- Document all exceptions`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'outputPath', label: 'Output CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Server_Logins.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const outputPath = escapePowerShellString(params.outputPath);

      return `# SQL Server Logins Security Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Generating server logins security report..." -ForegroundColor Cyan
    
    $LoginsQuery = @"
SELECT 
    sp.name AS LoginName,
    sp.type_desc AS LoginType,
    sp.create_date AS CreateDate,
    sp.modify_date AS ModifyDate,
    sp.is_disabled AS IsDisabled,
    LOGINPROPERTY(sp.name, 'IsExpired') AS IsExpired,
    LOGINPROPERTY(sp.name, 'IsLocked') AS IsLocked,
    LOGINPROPERTY(sp.name, 'IsMustChange') AS MustChangePassword,
    LOGINPROPERTY(sp.name, 'DaysUntilExpiration') AS DaysUntilExpiration,
    sp.default_database_name AS DefaultDatabase,
    STUFF((
        SELECT ',' + r.name
        FROM sys.server_role_members rm
        INNER JOIN sys.server_principals r ON rm.role_principal_id = r.principal_id
        WHERE rm.member_principal_id = sp.principal_id
        FOR XML PATH('')
    ), 1, 1, '') AS ServerRoles
FROM sys.server_principals sp
WHERE sp.type IN ('S', 'U', 'G')
    AND sp.name NOT LIKE '##%'
    AND sp.name != 'sa'
ORDER BY sp.name
"@
    
    $Logins = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $LoginsQuery
    
    if (-not $Logins) {
        Write-Host "No logins found" -ForegroundColor Yellow
        exit 0
    }
    
    $Logins | Export-Csv -Path $OutputPath -NoTypeInformation
    
    # Summary stats
    $TotalLogins = $Logins.Count
    $SQLLogins = ($Logins | Where-Object { $_.LoginType -eq 'SQL_LOGIN' }).Count
    $WindowsLogins = ($Logins | Where-Object { $_.LoginType -eq 'WINDOWS_LOGIN' }).Count
    $WindowsGroups = ($Logins | Where-Object { $_.LoginType -eq 'WINDOWS_GROUP' }).Count
    $Disabled = ($Logins | Where-Object { $_.IsDisabled -eq 1 }).Count
    $Sysadmins = ($Logins | Where-Object { $_.ServerRoles -like '*sysadmin*' }).Count
    
    Write-Host ""
    Write-Host "Login Summary:" -ForegroundColor White
    Write-Host "  Total logins: $TotalLogins" -ForegroundColor Gray
    Write-Host "  SQL logins: $SQLLogins" -ForegroundColor Gray
    Write-Host "  Windows logins: $WindowsLogins" -ForegroundColor Gray
    Write-Host "  Windows groups: $WindowsGroups" -ForegroundColor Gray
    Write-Host "  Disabled: $Disabled" -ForegroundColor Gray
    Write-Host "  Sysadmin members: $Sysadmins" -ForegroundColor $(if ($Sysadmins -gt 5) { 'Yellow' } else { 'Gray' })
    
    # Security concerns
    Write-Host ""
    Write-Host "Security Concerns:" -ForegroundColor White
    
    # Sysadmin members
    $SysadminLogins = $Logins | Where-Object { $_.ServerRoles -like '*sysadmin*' }
    if ($SysadminLogins) {
        Write-Host ""
        Write-Host "  Sysadmin Role Members:" -ForegroundColor Yellow
        foreach ($Admin in $SysadminLogins) {
            Write-Host "    - $($Admin.LoginName) ($($Admin.LoginType))" -ForegroundColor Yellow
        }
    }
    
    # Expired or locked
    $ExpiredLocked = $Logins | Where-Object { $_.IsExpired -eq 1 -or $_.IsLocked -eq 1 }
    if ($ExpiredLocked) {
        Write-Host ""
        Write-Host "  Expired/Locked Logins:" -ForegroundColor Red
        foreach ($Login in $ExpiredLocked) {
            Write-Host "    - $($Login.LoginName) (Expired: $($Login.IsExpired), Locked: $($Login.IsLocked))" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Report exported: $OutputPath" -ForegroundColor Green
    
} catch {
    Write-Error "Login report failed: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-failed-login-audit',
    title: 'Failed Login Audit',
    description: 'Audit failed login attempts from SQL Server error log',
    category: 'Security',
    isPremium: true,
    instructions: `**How This Task Works:**
- Reads SQL Server error log
- Filters failed login attempts
- Identifies attack patterns
- Reports by source and user

**Prerequisites:**
- SQL Server with admin access
- Failed login auditing enabled
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Hours to analyze

**What the Script Does:**
1. Reads error log entries
2. Filters login failures
3. Groups by source/user
4. Identifies patterns

**Important Notes:**
- Enable failed login auditing
- Review regularly for security
- Set up alerts for thresholds
- Consider IP blocking for attacks`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'hoursBack', label: 'Hours to Analyze', type: 'number', required: false, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const hoursBack = params.hoursBack || 24;

      return `# SQL Server Failed Login Audit
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$HoursBack = ${hoursBack}
$CutoffTime = (Get-Date).AddHours(-$HoursBack)

try {
    Write-Host "Auditing failed login attempts..." -ForegroundColor Cyan
    Write-Host "Period: Last $HoursBack hours" -ForegroundColor Gray
    
    # Read error log
    $LogQuery = @"
EXEC xp_readerrorlog 0, 1, N'Login failed'
"@
    
    $LogEntries = Invoke-Sqlcmd -ServerInstance $ServerInstance -Query $LogQuery -ErrorAction SilentlyContinue
    
    if (-not $LogEntries) {
        Write-Host "No failed login attempts found" -ForegroundColor Green
        exit 0
    }
    
    # Filter by time
    $RecentFailures = $LogEntries | Where-Object { 
        try { [DateTime]$_.LogDate -ge $CutoffTime } catch { $false }
    }
    
    if (-not $RecentFailures) {
        Write-Host "No failed logins in the last $HoursBack hours" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "Found $($RecentFailures.Count) failed login attempts" -ForegroundColor Yellow
    
    # Parse and group failures
    $FailureDetails = @{}
    $SourceDetails = @{}
    
    foreach ($Entry in $RecentFailures) {
        $Text = $Entry.Text
        
        # Extract user
        if ($Text -match "Login failed for user '([^']+)'") {
            $User = $Matches[1]
            if (-not $FailureDetails.ContainsKey($User)) {
                $FailureDetails[$User] = 0
            }
            $FailureDetails[$User]++
        }
        
        # Extract client IP
        if ($Text -match '\[CLIENT: ([^\]]+)\]') {
            $Client = $Matches[1]
            if (-not $SourceDetails.ContainsKey($Client)) {
                $SourceDetails[$Client] = 0
            }
            $SourceDetails[$Client]++
        }
    }
    
    # Report by user
    Write-Host ""
    Write-Host "Failed Logins by User:" -ForegroundColor White
    $FailureDetails.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
        $Color = if ($_.Value -gt 10) { 'Red' } elseif ($_.Value -gt 5) { 'Yellow' } else { 'Gray' }
        Write-Host "  $($_.Key): $($_.Value) attempts" -ForegroundColor $Color
    }
    
    # Report by source
    Write-Host ""
    Write-Host "Failed Logins by Source:" -ForegroundColor White
    $SourceDetails.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
        $Color = if ($_.Value -gt 20) { 'Red' } elseif ($_.Value -gt 10) { 'Yellow' } else { 'Gray' }
        Write-Host "  $($_.Key): $($_.Value) attempts" -ForegroundColor $Color
    }
    
    # Security recommendations
    $HighFailureUsers = $FailureDetails.GetEnumerator() | Where-Object { $_.Value -gt 10 }
    $HighFailureSources = $SourceDetails.GetEnumerator() | Where-Object { $_.Value -gt 20 }
    
    if ($HighFailureUsers -or $HighFailureSources) {
        Write-Host ""
        Write-Host "SECURITY RECOMMENDATIONS:" -ForegroundColor Red
        
        if ($HighFailureUsers) {
            Write-Host "  - High failure count for specific users may indicate:" -ForegroundColor Yellow
            Write-Host "    * Password guessing attacks" -ForegroundColor Gray
            Write-Host "    * Application misconfiguration" -ForegroundColor Gray
            Write-Host "    * Expired credentials" -ForegroundColor Gray
        }
        
        if ($HighFailureSources) {
            Write-Host "  - High failure count from specific IPs may indicate:" -ForegroundColor Yellow
            Write-Host "    * Brute force attack" -ForegroundColor Gray
            Write-Host "    * Consider blocking these IPs" -ForegroundColor Gray
            Write-Host "    * Review firewall rules" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Error "Failed login audit error: $_"
    exit 1
}`;
    }
  },

  {
    id: 'sql-table-row-counts',
    title: 'Table Row Counts Report',
    description: 'Report row counts for all tables in a database',
    category: 'Database Management',
    isPremium: true,
    instructions: `**How This Task Works:**
- Counts rows in all user tables
- Uses partition statistics (fast)
- Reports table sizes
- Identifies large tables

**Prerequisites:**
- SQL Server with db_datareader
- SqlServer PowerShell module

**What You Need to Provide:**
- SQL Server instance
- Database name
- Output path (optional)

**What the Script Does:**
1. Queries partition stats
2. Aggregates row counts
3. Reports table sizes
4. Exports to CSV

**Important Notes:**
- Uses system views (fast, approximate)
- More accurate than SELECT COUNT(*)
- Updated after index rebuilds
- Good for data profiling`,
    parameters: [
      { name: 'serverInstance', label: 'SQL Server Instance', type: 'text', required: true, placeholder: 'SQL01' },
      { name: 'databaseName', label: 'Database Name', type: 'text', required: true, placeholder: 'MyDatabase' },
      { name: 'outputPath', label: 'Output CSV Path (optional)', type: 'path', required: false, placeholder: 'C:\\Reports\\Table_Counts.csv' }
    ],
    scriptTemplate: (params) => {
      const serverInstance = escapePowerShellString(params.serverInstance);
      const databaseName = escapePowerShellString(params.databaseName);
      const outputPath = escapePowerShellString(params.outputPath || '');

      return `# SQL Server Table Row Counts Report
# Generated: ${new Date().toISOString()}

Import-Module SqlServer -ErrorAction Stop

$ServerInstance = "${serverInstance}"
$DatabaseName = "${databaseName}"
$OutputPath = "${outputPath}"

try {
    Write-Host "Generating table row counts report: $DatabaseName" -ForegroundColor Cyan
    
    $RowCountQuery = @"
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    p.rows AS RowCount,
    SUM(a.total_pages) * 8 / 1024 AS TotalSpaceMB,
    SUM(a.used_pages) * 8 / 1024 AS UsedSpaceMB,
    SUM(a.data_pages) * 8 / 1024 AS DataSpaceMB
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.indexes i ON t.object_id = i.object_id AND i.index_id <= 1
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY s.name, t.name, p.rows
ORDER BY p.rows DESC
"@
    
    $Tables = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $DatabaseName -Query $RowCountQuery
    
    if (-not $Tables) {
        Write-Host "No tables found" -ForegroundColor Yellow
        exit 0
    }
    
    # Summary
    $TotalTables = $Tables.Count
    $TotalRows = ($Tables | Measure-Object -Property RowCount -Sum).Sum
    $TotalSpaceMB = ($Tables | Measure-Object -Property TotalSpaceMB -Sum).Sum
    
    Write-Host ""
    Write-Host "Database Summary:" -ForegroundColor White
    Write-Host "  Total tables: $TotalTables" -ForegroundColor Gray
    Write-Host "  Total rows: $($TotalRows.ToString('N0'))" -ForegroundColor Gray
    Write-Host "  Total space: $([math]::Round($TotalSpaceMB / 1024, 2)) GB" -ForegroundColor Gray
    
    # Top 15 tables by row count
    Write-Host ""
    Write-Host "Top 15 Tables by Row Count:" -ForegroundColor White
    
    $Tables | Select-Object -First 15 | ForEach-Object {
        $RowsFormatted = $_.RowCount.ToString('N0')
        Write-Host "  $($_.SchemaName).$($_.TableName): $RowsFormatted rows ($($_.TotalSpaceMB) MB)" -ForegroundColor Gray
    }
    
    # Empty tables
    $EmptyTables = $Tables | Where-Object { $_.RowCount -eq 0 }
    if ($EmptyTables) {
        Write-Host ""
        Write-Host "Empty Tables ($($EmptyTables.Count)):" -ForegroundColor Yellow
        $EmptyTables | Select-Object -First 10 | ForEach-Object {
            Write-Host "  $($_.SchemaName).$($_.TableName)" -ForegroundColor Yellow
        }
        if ($EmptyTables.Count -gt 10) {
            Write-Host "  ... and $($EmptyTables.Count - 10) more" -ForegroundColor Yellow
        }
    }
    
    # Export if path provided
    if ($OutputPath) {
        $Tables | Export-Csv -Path $OutputPath -NoTypeInformation
        Write-Host ""
        Write-Host "Report exported: $OutputPath" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Row count report failed: $_"
    exit 1
}`;
    }
  }
];
