import { escapePowerShellString } from './powershell-utils';

export interface SplunkTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface SplunkTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: SplunkTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const splunkTasks: SplunkTask[] = [
  {
    id: 'splunk-run-search',
    name: 'Run Search Query',
    category: 'Search Management',
    description: 'Execute a Splunk search query and export results',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true, placeholder: 'search index=main error | stats count by source' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Splunk Run Search Query
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

$SearchQuery = "${searchQuery}"

try {
    # Create search job
    $CreateSearchUri = "$SplunkUrl/services/search/jobs"
    $SearchBody = @{ search = "search $SearchQuery" }
    
    $JobResponse = Invoke-RestMethod -Uri $CreateSearchUri -Method Post -Headers $Headers -Body $SearchBody -SkipCertificateCheck
    $JobId = $JobResponse.sid
    
    Write-Host "Search job created: $JobId" -ForegroundColor Cyan
    Write-Host "Waiting for results..." -ForegroundColor Yellow
    
    # Wait for job to complete
    Start-Sleep -Seconds 5
    
    # Get results
    $ResultsUri = "$SplunkUrl/services/search/jobs/$JobId/results?output_mode=json&count=0"
    $Results = Invoke-RestMethod -Uri $ResultsUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Export to CSV
    $Results.results | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Results exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Results: $($Results.results.Count) rows" -ForegroundColor Cyan
    
} catch {
    Write-Error "Search failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'splunk-create-alert',
    name: 'Create Saved Alert',
    category: 'Alert Management',
    description: 'Create a new saved alert',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true, placeholder: 'High Error Rate' },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true },
      { id: 'cronSchedule', label: 'Cron Schedule', type: 'text', required: true, placeholder: '*/5 * * * *' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const cronSchedule = escapePowerShellString(params.cronSchedule);
      
      return `# Splunk Create Saved Alert
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/saved/searches"
    $Body = @{
        name = "${alertName}"
        search = "search ${searchQuery}"
        cron_schedule = "${cronSchedule}"
        is_scheduled = "1"
        actions = "email"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Alert created: ${alertName}" -ForegroundColor Green
    
} catch {
    Write-Error "Alert creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'splunk-manage-indexes',
    name: 'Manage Indexes and Retention',
    category: 'Common Admin Tasks',
    description: 'Create or modify Splunk indexes and retention policies',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'indexName', label: 'Index Name', type: 'text', required: true, placeholder: 'my_index' },
      { id: 'maxDataSize', label: 'Max Data Size (MB)', type: 'number', required: false, defaultValue: 500000 },
      { id: 'frozenTimePeriod', label: 'Frozen Time Period (days)', type: 'number', required: false, defaultValue: 90 }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexName = escapePowerShellString(params.indexName);
      const maxDataSize = params.maxDataSize || 500000;
      const frozenTimePeriod = params.frozenTimePeriod || 90;
      
      return `# Splunk Manage Indexes and Retention
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/indexes"
    $Body = @{
        name = "${indexName}"
        maxDataSize = "${maxDataSize}"
        frozenTimePeriodInSecs = $([int]${frozenTimePeriod} * 86400)
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Index created: ${indexName}" -ForegroundColor Green
    Write-Host "  Max Size: ${maxDataSize} MB" -ForegroundColor Cyan
    Write-Host "  Retention: ${frozenTimePeriod} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Index creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-manage-data-sources',
    name: 'Manage Data Sources',
    category: 'Common Admin Tasks',
    description: 'Add or configure Splunk data inputs',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: 'C:\\Logs\\*.log' },
      { id: 'sourceType', label: 'Source Type', type: 'text', required: true, placeholder: 'windows_event_log' },
      { id: 'index', label: 'Target Index', type: 'text', required: true, placeholder: 'main' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const sourcePath = escapePowerShellString(params.sourcePath);
      const sourceType = escapePowerShellString(params.sourceType);
      const index = escapePowerShellString(params.index);
      
      return `# Splunk Manage Data Sources
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/inputs/monitor"
    $Body = @{
        name = "${sourcePath}"
        sourcetype = "${sourceType}"
        index = "${index}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Data source configured" -ForegroundColor Green
    Write-Host "  Path: ${sourcePath}" -ForegroundColor Cyan
    Write-Host "  Type: ${sourceType}" -ForegroundColor Cyan
    Write-Host "  Index: ${index}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Data source configuration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-configure-alert-thresholds',
    name: 'Configure Alert Thresholds',
    category: 'Common Admin Tasks',
    description: 'Create alerts with specific threshold conditions',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true },
      { id: 'threshold', label: 'Threshold Count', type: 'number', required: true, defaultValue: 100 },
      { id: 'emailTo', label: 'Email Recipients (comma-separated)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const threshold = params.threshold;
      const emailTo = escapePowerShellString(params.emailTo);
      
      return `# Splunk Configure Alert Thresholds
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/saved/searches"
    $Body = @{
        name = "${alertName}"
        search = "search ${searchQuery} | where count > ${threshold}"
        is_scheduled = "1"
        cron_schedule = "*/15 * * * *"
        actions = "email"
        "action.email.to" = "${emailTo}"
        "alert.threshold" = "${threshold}"
        "alert.comparator" = "greater than"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Alert with threshold created: ${alertName}" -ForegroundColor Green
    Write-Host "  Threshold: ${threshold}" -ForegroundColor Cyan
    Write-Host "  Recipients: ${emailTo}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Alert creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-export-dashboard',
    name: 'Collect Performance Dashboards',
    category: 'Common Admin Tasks',
    description: 'Export Splunk dashboard data',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'dashboardName', label: 'Dashboard Name', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const dashboardName = escapePowerShellString(params.dashboardName);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Splunk Collect Performance Dashboards
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/ui/views/${dashboardName}"
    $Dashboard = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Dashboard | Out-File -FilePath "${exportPath}"
    
    Write-Host "✓ Dashboard exported: ${exportPath}" -ForegroundColor Green
    
} catch {
    Write-Error "Dashboard export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-schedule-reports',
    name: 'Automate Report Scheduling',
    category: 'Common Admin Tasks',
    description: 'Schedule automated reports in Splunk',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'reportName', label: 'Report Name', type: 'text', required: true },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true },
      { id: 'cronSchedule', label: 'Cron Schedule', type: 'text', required: true, placeholder: '0 9 * * *', defaultValue: '0 9 * * *' },
      { id: 'emailTo', label: 'Email Recipients', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const reportName = escapePowerShellString(params.reportName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const cronSchedule = escapePowerShellString(params.cronSchedule);
      const emailTo = escapePowerShellString(params.emailTo);
      
      return `# Splunk Automate Report Scheduling
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/saved/searches"
    $Body = @{
        name = "${reportName}"
        search = "search ${searchQuery}"
        is_scheduled = "1"
        cron_schedule = "${cronSchedule}"
        actions = "email"
        "action.email.to" = "${emailTo}"
        "action.email.format" = "pdf"
        "action.email.sendresults" = "1"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Scheduled report created: ${reportName}" -ForegroundColor Green
    Write-Host "  Schedule: ${cronSchedule}" -ForegroundColor Cyan
    Write-Host "  Recipients: ${emailTo}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report scheduling failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-manage-users',
    name: 'Manage User Roles and Permissions',
    category: 'Common Admin Tasks',
    description: 'Create or modify Splunk user roles',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'role', label: 'Role', type: 'select', required: true, options: ['admin', 'power', 'user', 'can_delete'], defaultValue: 'user' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Update'], defaultValue: 'Create' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const username = escapePowerShellString(params.username);
      const role = params.role;
      const action = params.action;
      
      return `# Splunk Manage User Roles and Permissions
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    ${action === 'Create' ? `
    $Uri = "$SplunkUrl/services/authentication/users"
    $Password = Read-Host -AsSecureString -Prompt "Enter password for ${username}"
    $PasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    
    $Body = @{
        name = "${username}"
        password = $PasswordPlain
        roles = "${role}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    Write-Host "✓ User created: ${username}" -ForegroundColor Green
    ` : `
    $Uri = "$SplunkUrl/services/authentication/users/${username}"
    $Body = @{
        roles = "${role}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    Write-Host "✓ User updated: ${username}" -ForegroundColor Green
    `}
    Write-Host "  Role: ${role}" -ForegroundColor Cyan
    
} catch {
    Write-Error "User management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-configure-forwarding',
    name: 'Configure Data Forwarding',
    category: 'Common Admin Tasks',
    description: 'Configure Splunk forwarder to send data to indexers',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk Forwarder URL', type: 'text', required: true },
      { id: 'indexerHost', label: 'Indexer Host', type: 'text', required: true, placeholder: 'indexer.company.com' },
      { id: 'indexerPort', label: 'Indexer Port', type: 'number', required: true, defaultValue: 9997 }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexerHost = escapePowerShellString(params.indexerHost);
      const indexerPort = params.indexerPort;
      
      return `# Splunk Configure Data Forwarding
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/outputs/tcp/server"
    $Body = @{
        name = "${indexerHost}:${indexerPort}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "✓ Data forwarding configured" -ForegroundColor Green
    Write-Host "  Indexer: ${indexerHost}:${indexerPort}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Forwarding configuration failed: $_"
}`;
    },
    isPremium: true
  }
];
