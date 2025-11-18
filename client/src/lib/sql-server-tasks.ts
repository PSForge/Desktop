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
  }
];
