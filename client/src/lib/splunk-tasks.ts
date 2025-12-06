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
  // ============================================
  // SEARCH & REPORTING (10 tasks)
  // ============================================
  {
    id: 'splunk-run-search',
    name: 'Run Search Query',
    category: 'Search & Reporting',
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
    do {
        Start-Sleep -Seconds 2
        $StatusUri = "$SplunkUrl/services/search/jobs/$JobId?output_mode=json"
        $Status = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers -SkipCertificateCheck
    } while ($Status.entry.content.dispatchState -ne "DONE")
    
    # Get results
    $ResultsUri = "$SplunkUrl/services/search/jobs/$JobId/results?output_mode=json&count=0"
    $Results = Invoke-RestMethod -Uri $ResultsUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Export to CSV
    $Results.results | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "Results exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Results: $($Results.results.Count) rows" -ForegroundColor Cyan
    
} catch {
    Write-Error "Search failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-saved-search',
    name: 'Create Saved Search',
    category: 'Search & Reporting',
    description: 'Create a new saved search for reuse',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'searchName', label: 'Search Name', type: 'text', required: true, placeholder: 'My Saved Search' },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true, placeholder: 'index=main | stats count by host' },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search', placeholder: 'search' },
      { id: 'description', label: 'Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const searchName = escapePowerShellString(params.searchName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const description = escapePowerShellString(params.description || '');
      
      return `# Splunk Create Saved Search
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/servicesNS/nobody/${appContext}/saved/searches"
    $Body = @{
        name = "${searchName}"
        search = "${searchQuery}"
        description = "${description}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Saved search created: ${searchName}" -ForegroundColor Green
    Write-Host "  App: ${appContext}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create saved search: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-saved-searches',
    name: 'List Saved Searches',
    category: 'Search & Reporting',
    description: 'List all saved searches in an app',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Saved Searches
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/servicesNS/-/${appContext}/saved/searches?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Searches = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            Search = $_.content.search
            IsScheduled = $_.content.is_scheduled
            CronSchedule = $_.content.cron_schedule
            Owner = $_.acl.owner
            App = $_.acl.app
        }
    }
    
    Write-Host "Found $($Searches.Count) saved searches in ${appContext}:" -ForegroundColor Green
    $Searches | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Searches | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list saved searches: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-delete-saved-search',
    name: 'Delete Saved Search',
    category: 'Search & Reporting',
    description: 'Delete an existing saved search',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'searchName', label: 'Search Name', type: 'text', required: true },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' },
      { id: 'owner', label: 'Owner', type: 'text', required: false, defaultValue: 'nobody' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const searchName = escapePowerShellString(params.searchName);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const owner = escapePowerShellString(params.owner || 'nobody');
      
      return `# Splunk Delete Saved Search
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Confirm = Read-Host "Are you sure you want to delete saved search '${searchName}'? (yes/no)"
    
    if ($Confirm -eq 'yes') {
        $EncodedName = [System.Web.HttpUtility]::UrlEncode("${searchName}")
        $Uri = "$SplunkUrl/servicesNS/${owner}/${appContext}/saved/searches/$EncodedName"
        
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -SkipCertificateCheck
        
        Write-Host "Saved search deleted: ${searchName}" -ForegroundColor Green
    } else {
        Write-Host "Delete cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete saved search: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-schedule-reports',
    name: 'Schedule Report',
    category: 'Search & Reporting',
    description: 'Schedule automated reports with email delivery',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'reportName', label: 'Report Name', type: 'text', required: true },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true },
      { id: 'cronSchedule', label: 'Cron Schedule', type: 'text', required: true, placeholder: '0 9 * * *', defaultValue: '0 9 * * *' },
      { id: 'emailTo', label: 'Email Recipients', type: 'text', required: true },
      { id: 'emailFormat', label: 'Email Format', type: 'select', required: true, options: ['pdf', 'csv', 'html', 'plain'], defaultValue: 'pdf' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const reportName = escapePowerShellString(params.reportName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const cronSchedule = escapePowerShellString(params.cronSchedule);
      const emailTo = escapePowerShellString(params.emailTo);
      const emailFormat = params.emailFormat || 'pdf';
      
      return `# Splunk Schedule Report
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
        "action.email.format" = "${emailFormat}"
        "action.email.sendresults" = "1"
        "action.email.inline" = "1"
        "action.email.subject" = "Splunk Report: ${reportName}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Scheduled report created: ${reportName}" -ForegroundColor Green
    Write-Host "  Schedule: ${cronSchedule}" -ForegroundColor Cyan
    Write-Host "  Recipients: ${emailTo}" -ForegroundColor Cyan
    Write-Host "  Format: ${emailFormat}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report scheduling failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-dashboard',
    name: 'Create Dashboard',
    category: 'Search & Reporting',
    description: 'Create a new Splunk dashboard',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'dashboardName', label: 'Dashboard Name', type: 'text', required: true, placeholder: 'my_dashboard' },
      { id: 'dashboardLabel', label: 'Dashboard Label', type: 'text', required: true, placeholder: 'My Dashboard' },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' },
      { id: 'description', label: 'Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const dashboardName = escapePowerShellString(params.dashboardName);
      const dashboardLabel = escapePowerShellString(params.dashboardLabel);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const description = escapePowerShellString(params.description || '');
      
      return `# Splunk Create Dashboard
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

$DashboardXml = @"
<dashboard>
  <label>${dashboardLabel}</label>
  <description>${description}</description>
  <row>
    <panel>
      <title>Add your first panel</title>
      <html>
        <p>Edit this dashboard to add panels with your searches.</p>
      </html>
    </panel>
  </row>
</dashboard>
"@

try {
    $Uri = "$SplunkUrl/servicesNS/nobody/${appContext}/data/ui/views"
    $Body = @{
        name = "${dashboardName}"
        "eai:data" = $DashboardXml
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Dashboard created: ${dashboardName}" -ForegroundColor Green
    Write-Host "  Label: ${dashboardLabel}" -ForegroundColor Cyan
    Write-Host "  App: ${appContext}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create dashboard: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-dashboards',
    name: 'List All Dashboards',
    category: 'Search & Reporting',
    description: 'List all dashboards in an app',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List All Dashboards
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/servicesNS/-/${appContext}/data/ui/views?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Dashboards = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            Label = $_.content.label
            App = $_.acl.app
            Owner = $_.acl.owner
            IsDashboard = $_.content.isDashboard
            IsVisible = $_.content.isVisible
        }
    }
    
    Write-Host "Found $($Dashboards.Count) dashboards in ${appContext}:" -ForegroundColor Green
    $Dashboards | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Dashboards | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list dashboards: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-export-dashboard',
    name: 'Export Dashboard',
    category: 'Search & Reporting',
    description: 'Export a Splunk dashboard definition to file',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'dashboardName', label: 'Dashboard Name', type: 'text', required: true },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' },
      { id: 'exportPath', label: 'Export Path', type: 'path', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const dashboardName = escapePowerShellString(params.dashboardName);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Splunk Export Dashboard
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/servicesNS/-/${appContext}/data/ui/views/${dashboardName}?output_mode=json"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $DashboardXml = $Response.entry.content.'eai:data'
    $DashboardXml | Out-File -FilePath "${exportPath}" -Encoding UTF8
    
    Write-Host "Dashboard exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Dashboard: ${dashboardName}" -ForegroundColor Cyan
    Write-Host "  App: ${appContext}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Dashboard export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-clone-dashboard',
    name: 'Clone Dashboard',
    category: 'Search & Reporting',
    description: 'Clone an existing dashboard to a new name',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'sourceDashboard', label: 'Source Dashboard Name', type: 'text', required: true },
      { id: 'targetDashboard', label: 'New Dashboard Name', type: 'text', required: true },
      { id: 'targetLabel', label: 'New Dashboard Label', type: 'text', required: true },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const sourceDashboard = escapePowerShellString(params.sourceDashboard);
      const targetDashboard = escapePowerShellString(params.targetDashboard);
      const targetLabel = escapePowerShellString(params.targetLabel);
      const appContext = escapePowerShellString(params.appContext || 'search');
      
      return `# Splunk Clone Dashboard
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Get source dashboard
    $SourceUri = "$SplunkUrl/servicesNS/-/${appContext}/data/ui/views/${sourceDashboard}?output_mode=json"
    $SourceResponse = Invoke-RestMethod -Uri $SourceUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $DashboardXml = $SourceResponse.entry.content.'eai:data'
    
    # Update label in XML
    $DashboardXml = $DashboardXml -replace '<label>.*?</label>', "<label>${targetLabel}</label>"
    
    # Create new dashboard
    $CreateUri = "$SplunkUrl/servicesNS/nobody/${appContext}/data/ui/views"
    $Body = @{
        name = "${targetDashboard}"
        "eai:data" = $DashboardXml
    }
    
    Invoke-RestMethod -Uri $CreateUri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Dashboard cloned successfully" -ForegroundColor Green
    Write-Host "  Source: ${sourceDashboard}" -ForegroundColor Cyan
    Write-Host "  Target: ${targetDashboard}" -ForegroundColor Cyan
    Write-Host "  Label: ${targetLabel}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to clone dashboard: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-run-realtime-search',
    name: 'Run Real-time Search',
    category: 'Search & Reporting',
    description: 'Execute a real-time streaming search',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true, placeholder: 'index=main | head 100' },
      { id: 'durationSeconds', label: 'Duration (seconds)', type: 'number', required: true, defaultValue: 60 }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const durationSeconds = params.durationSeconds || 60;
      
      return `# Splunk Run Real-time Search
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Create real-time search job
    $Uri = "$SplunkUrl/services/search/jobs"
    $Body = @{
        search = "search ${searchQuery}"
        search_mode = "realtime"
        earliest_time = "rt-1m"
        latest_time = "rt"
    }
    
    $JobResponse = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    $JobId = $JobResponse.sid
    
    Write-Host "Real-time search started: $JobId" -ForegroundColor Cyan
    Write-Host "Running for ${durationSeconds} seconds..." -ForegroundColor Yellow
    
    $EndTime = (Get-Date).AddSeconds(${durationSeconds})
    $ResultCount = 0
    
    while ((Get-Date) -lt $EndTime) {
        Start-Sleep -Seconds 5
        
        $ResultsUri = "$SplunkUrl/services/search/jobs/$JobId/results?output_mode=json&count=10"
        $Results = Invoke-RestMethod -Uri $ResultsUri -Method Get -Headers $Headers -SkipCertificateCheck
        
        if ($Results.results.Count -gt 0) {
            $ResultCount += $Results.results.Count
            Write-Host "  Events found: $ResultCount" -ForegroundColor Cyan
        }
    }
    
    # Cancel the job
    $CancelUri = "$SplunkUrl/services/search/jobs/$JobId/control"
    Invoke-RestMethod -Uri $CancelUri -Method Post -Headers $Headers -Body @{action="cancel"} -SkipCertificateCheck
    
    Write-Host "Real-time search completed" -ForegroundColor Green
    Write-Host "  Total events: $ResultCount" -ForegroundColor Cyan
    
} catch {
    Write-Error "Real-time search failed: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // ALERT MANAGEMENT (6 tasks)
  // ============================================
  {
    id: 'splunk-create-alert',
    name: 'Create Alert',
    category: 'Alert Management',
    description: 'Create a new scheduled alert with email notification',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true, placeholder: 'High Error Rate' },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true },
      { id: 'cronSchedule', label: 'Cron Schedule', type: 'text', required: true, placeholder: '*/5 * * * *' },
      { id: 'emailTo', label: 'Email Recipients', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const cronSchedule = escapePowerShellString(params.cronSchedule);
      const emailTo = escapePowerShellString(params.emailTo);
      
      return `# Splunk Create Alert
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
        alert_type = "number of events"
        alert_comparator = "greater than"
        alert_threshold = "0"
        actions = "email"
        "action.email.to" = "${emailTo}"
        "action.email.subject" = "Splunk Alert: ${alertName}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Alert created: ${alertName}" -ForegroundColor Green
    Write-Host "  Schedule: ${cronSchedule}" -ForegroundColor Cyan
    Write-Host "  Email: ${emailTo}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Alert creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-configure-alert-thresholds',
    name: 'Configure Alert Thresholds',
    category: 'Alert Management',
    description: 'Create alerts with specific threshold conditions',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true },
      { id: 'searchQuery', label: 'Search Query', type: 'textarea', required: true },
      { id: 'threshold', label: 'Threshold Count', type: 'number', required: true, defaultValue: 100 },
      { id: 'comparator', label: 'Comparator', type: 'select', required: true, options: ['greater than', 'less than', 'equal to', 'not equal to', 'drops by', 'rises by'], defaultValue: 'greater than' },
      { id: 'emailTo', label: 'Email Recipients', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const searchQuery = escapePowerShellString(params.searchQuery);
      const threshold = params.threshold;
      const comparator = params.comparator || 'greater than';
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
        search = "search ${searchQuery}"
        is_scheduled = "1"
        cron_schedule = "*/15 * * * *"
        alert_type = "number of events"
        alert_comparator = "${comparator}"
        alert_threshold = "${threshold}"
        actions = "email"
        "action.email.to" = "${emailTo}"
        "action.email.subject" = "Splunk Alert: ${alertName}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Alert with threshold created: ${alertName}" -ForegroundColor Green
    Write-Host "  Condition: ${comparator} ${threshold}" -ForegroundColor Cyan
    Write-Host "  Recipients: ${emailTo}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Alert creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-alerts',
    name: 'List Alerts',
    category: 'Alert Management',
    description: 'List all configured alerts',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const appContext = escapePowerShellString(params.appContext || 'search');
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Alerts
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/servicesNS/-/${appContext}/saved/searches?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Alerts = $Response.entry | Where-Object { $_.content.alert_type } | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            AlertType = $_.content.alert_type
            Threshold = $_.content.alert_threshold
            Comparator = $_.content.alert_comparator
            IsScheduled = $_.content.is_scheduled
            CronSchedule = $_.content.cron_schedule
            Actions = $_.content.actions
            Disabled = $_.content.disabled
        }
    }
    
    Write-Host "Found $($Alerts.Count) alerts:" -ForegroundColor Green
    $Alerts | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Alerts | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list alerts: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-enable-disable-alert',
    name: 'Enable/Disable Alert',
    category: 'Alert Management',
    description: 'Enable or disable an existing alert',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const action = params.action;
      const appContext = escapePowerShellString(params.appContext || 'search');
      
      return `# Splunk Enable/Disable Alert
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $EncodedName = [System.Web.HttpUtility]::UrlEncode("${alertName}")
    $Uri = "$SplunkUrl/servicesNS/-/${appContext}/saved/searches/$EncodedName"
    
    $Body = @{
        disabled = $(if ("${action}" -eq "Disable") { "1" } else { "0" })
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Alert ${action.toLowerCase()}d: ${alertName}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to ${action.toLowerCase()} alert: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-delete-alert',
    name: 'Delete Alert',
    category: 'Alert Management',
    description: 'Delete an existing alert',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const appContext = escapePowerShellString(params.appContext || 'search');
      
      return `# Splunk Delete Alert
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Confirm = Read-Host "Are you sure you want to delete alert '${alertName}'? (yes/no)"
    
    if ($Confirm -eq 'yes') {
        $EncodedName = [System.Web.HttpUtility]::UrlEncode("${alertName}")
        $Uri = "$SplunkUrl/servicesNS/-/${appContext}/saved/searches/$EncodedName"
        
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -SkipCertificateCheck
        
        Write-Host "Alert deleted: ${alertName}" -ForegroundColor Green
    } else {
        Write-Host "Delete cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete alert: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-configure-alert-actions',
    name: 'Configure Alert Actions',
    category: 'Alert Management',
    description: 'Configure webhook, script, or other alert actions',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true },
      { id: 'actionType', label: 'Action Type', type: 'select', required: true, options: ['webhook', 'script', 'email', 'slack'], defaultValue: 'webhook' },
      { id: 'webhookUrl', label: 'Webhook URL (if webhook)', type: 'text', required: false },
      { id: 'scriptPath', label: 'Script Path (if script)', type: 'text', required: false },
      { id: 'appContext', label: 'App Context', type: 'text', required: false, defaultValue: 'search' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const alertName = escapePowerShellString(params.alertName);
      const actionType = params.actionType || 'webhook';
      const webhookUrl = escapePowerShellString(params.webhookUrl || '');
      const scriptPath = escapePowerShellString(params.scriptPath || '');
      const appContext = escapePowerShellString(params.appContext || 'search');
      
      return `# Splunk Configure Alert Actions
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $EncodedName = [System.Web.HttpUtility]::UrlEncode("${alertName}")
    $Uri = "$SplunkUrl/servicesNS/-/${appContext}/saved/searches/$EncodedName"
    
    $Body = @{}
    
    switch ("${actionType}") {
        "webhook" {
            $Body["actions"] = "webhook"
            $Body["action.webhook.param.url"] = "${webhookUrl}"
        }
        "script" {
            $Body["actions"] = "script"
            $Body["action.script.filename"] = "${scriptPath}"
        }
        "email" {
            # Email is typically already configured
            Write-Host "Email action - use Create Alert to configure email" -ForegroundColor Yellow
        }
        "slack" {
            $Body["actions"] = "slack"
            $Body["action.slack.param.channel"] = "#alerts"
        }
    }
    
    if ($Body.Count -gt 0) {
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
        Write-Host "Alert action configured: ${actionType}" -ForegroundColor Green
        Write-Host "  Alert: ${alertName}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to configure alert action: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // DATA MANAGEMENT (10 tasks)
  // ============================================
  {
    id: 'splunk-create-index',
    name: 'Create Index',
    category: 'Data Management',
    description: 'Create a new Splunk index with retention settings',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'indexName', label: 'Index Name', type: 'text', required: true, placeholder: 'my_index' },
      { id: 'maxDataSizeMB', label: 'Max Data Size (MB)', type: 'number', required: false, defaultValue: 500000 },
      { id: 'frozenTimePeriodDays', label: 'Retention Period (days)', type: 'number', required: false, defaultValue: 90 },
      { id: 'homePath', label: 'Home Path', type: 'path', required: false },
      { id: 'coldPath', label: 'Cold Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexName = escapePowerShellString(params.indexName);
      const maxDataSizeMB = params.maxDataSizeMB || 500000;
      const frozenTimePeriodDays = params.frozenTimePeriodDays || 90;
      const homePath = escapePowerShellString(params.homePath || '');
      const coldPath = escapePowerShellString(params.coldPath || '');
      
      return `# Splunk Create Index
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
        maxDataSize = "auto_high_volume"
        maxTotalDataSizeMB = ${maxDataSizeMB}
        frozenTimePeriodInSecs = $([int]${frozenTimePeriodDays} * 86400)
    }
    
    if ("${homePath}") {
        $Body["homePath"] = "${homePath}"
    }
    if ("${coldPath}") {
        $Body["coldPath"] = "${coldPath}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Index created: ${indexName}" -ForegroundColor Green
    Write-Host "  Max Size: ${maxDataSizeMB} MB" -ForegroundColor Cyan
    Write-Host "  Retention: ${frozenTimePeriodDays} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Index creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-indexes',
    name: 'List Indexes',
    category: 'Data Management',
    description: 'List all indexes with their statistics',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Indexes
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/indexes?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Indexes = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            TotalEventCount = $_.content.totalEventCount
            CurrentDBSizeMB = [math]::Round($_.content.currentDBSizeMB, 2)
            MaxTotalDataSizeMB = $_.content.maxTotalDataSizeMB
            FrozenTimePeriodDays = [math]::Round($_.content.frozenTimePeriodInSecs / 86400, 0)
            Disabled = $_.content.disabled
            IsInternal = $_.content.isInternal
        }
    }
    
    Write-Host "Found $($Indexes.Count) indexes:" -ForegroundColor Green
    $Indexes | Sort-Object -Property CurrentDBSizeMB -Descending | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Indexes | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list indexes: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-update-index-retention',
    name: 'Update Index Retention',
    category: 'Data Management',
    description: 'Modify retention settings for an existing index',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'indexName', label: 'Index Name', type: 'text', required: true },
      { id: 'frozenTimePeriodDays', label: 'New Retention Period (days)', type: 'number', required: true, defaultValue: 90 },
      { id: 'maxTotalDataSizeMB', label: 'Max Total Data Size (MB)', type: 'number', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexName = escapePowerShellString(params.indexName);
      const frozenTimePeriodDays = params.frozenTimePeriodDays || 90;
      const maxTotalDataSizeMB = params.maxTotalDataSizeMB;
      
      return `# Splunk Update Index Retention
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/indexes/${indexName}"
    $Body = @{
        frozenTimePeriodInSecs = $([int]${frozenTimePeriodDays} * 86400)
    }
    
    ${maxTotalDataSizeMB ? `$Body["maxTotalDataSizeMB"] = ${maxTotalDataSizeMB}` : ''}
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Index retention updated: ${indexName}" -ForegroundColor Green
    Write-Host "  Retention: ${frozenTimePeriodDays} days" -ForegroundColor Cyan
    ${maxTotalDataSizeMB ? `Write-Host "  Max Size: ${maxTotalDataSizeMB} MB" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Failed to update index retention: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-data-input',
    name: 'Create Monitor Data Input',
    category: 'Data Management',
    description: 'Configure a file or directory monitoring input',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true },
      { id: 'sourcePath', label: 'Source Path', type: 'path', required: true, placeholder: 'C:\\Logs\\*.log' },
      { id: 'sourceType', label: 'Source Type', type: 'text', required: true, placeholder: 'syslog' },
      { id: 'index', label: 'Target Index', type: 'text', required: true, placeholder: 'main' },
      { id: 'host', label: 'Host Override', type: 'text', required: false },
      { id: 'recursive', label: 'Recursive', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const sourcePath = escapePowerShellString(params.sourcePath);
      const sourceType = escapePowerShellString(params.sourceType);
      const index = escapePowerShellString(params.index);
      const host = escapePowerShellString(params.host || '');
      const recursive = params.recursive !== false;
      
      return `# Splunk Create Monitor Data Input
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
        recursive = $(if (${recursive}) { "true" } else { "false" })
    }
    
    if ("${host}") {
        $Body["host"] = "${host}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Data input created" -ForegroundColor Green
    Write-Host "  Path: ${sourcePath}" -ForegroundColor Cyan
    Write-Host "  Type: ${sourceType}" -ForegroundColor Cyan
    Write-Host "  Index: ${index}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Data input creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-hec-input',
    name: 'Create HTTP Event Collector',
    category: 'Data Management',
    description: 'Create an HTTP Event Collector (HEC) token',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'tokenName', label: 'Token Name', type: 'text', required: true, placeholder: 'my_hec_token' },
      { id: 'index', label: 'Default Index', type: 'text', required: true, placeholder: 'main' },
      { id: 'sourceType', label: 'Default Source Type', type: 'text', required: false },
      { id: 'allowedIndexes', label: 'Allowed Indexes (comma-separated)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const tokenName = escapePowerShellString(params.tokenName);
      const index = escapePowerShellString(params.index);
      const sourceType = escapePowerShellString(params.sourceType || '');
      const allowedIndexes = escapePowerShellString(params.allowedIndexes || '');
      
      return `# Splunk Create HTTP Event Collector
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/data/inputs/http"
    $Body = @{
        name = "${tokenName}"
        index = "${index}"
        useACK = "false"
    }
    
    if ("${sourceType}") {
        $Body["sourcetype"] = "${sourceType}"
    }
    if ("${allowedIndexes}") {
        $Body["indexes"] = "${allowedIndexes}"
    }
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    # Get the token value
    $TokenUri = "$SplunkUrl/services/data/inputs/http/${tokenName}?output_mode=json"
    $TokenResponse = Invoke-RestMethod -Uri $TokenUri -Method Get -Headers $Headers -SkipCertificateCheck
    $Token = $TokenResponse.entry.content.token
    
    Write-Host "HEC Token created: ${tokenName}" -ForegroundColor Green
    Write-Host "  Token: $Token" -ForegroundColor Yellow
    Write-Host "  Index: ${index}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Use this token to send data via HTTP to your Splunk HEC endpoint" -ForegroundColor Cyan
    
} catch {
    Write-Error "HEC token creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-data-inputs',
    name: 'List Data Inputs',
    category: 'Data Management',
    description: 'List all configured data inputs',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'inputType', label: 'Input Type', type: 'select', required: true, options: ['all', 'monitor', 'http', 'tcp', 'udp', 'script'], defaultValue: 'all' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const inputType = params.inputType || 'all';
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Data Inputs
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $AllInputs = @()
    $InputTypes = @()
    
    if ("${inputType}" -eq "all") {
        $InputTypes = @("monitor", "http", "tcp/cooked", "tcp/raw", "udp", "script")
    } else {
        $InputTypes = @("${inputType}")
    }
    
    foreach ($Type in $InputTypes) {
        try {
            $Uri = "$SplunkUrl/services/data/inputs/$Type" + "?output_mode=json&count=0"
            $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
            
            $Response.entry | ForEach-Object {
                $AllInputs += [PSCustomObject]@{
                    Type = $Type
                    Name = $_.name
                    Index = $_.content.index
                    SourceType = $_.content.sourcetype
                    Disabled = $_.content.disabled
                }
            }
        } catch {
            # Some input types may not exist
        }
    }
    
    Write-Host "Found $($AllInputs.Count) data inputs:" -ForegroundColor Green
    $AllInputs | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $AllInputs | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list data inputs: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-sourcetype',
    name: 'Create Source Type',
    category: 'Data Management',
    description: 'Create a new source type with parsing rules',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'sourceTypeName', label: 'Source Type Name', type: 'text', required: true, placeholder: 'custom_log' },
      { id: 'category', label: 'Category', type: 'select', required: true, options: ['Application', 'Database', 'Email', 'Metrics', 'Network', 'Operating System', 'Web'], defaultValue: 'Application' },
      { id: 'timeFormat', label: 'Time Format', type: 'text', required: false, placeholder: '%Y-%m-%d %H:%M:%S' },
      { id: 'lineBreaker', label: 'Line Breaker Regex', type: 'text', required: false, placeholder: '([\\r\\n]+)' },
      { id: 'description', label: 'Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const sourceTypeName = escapePowerShellString(params.sourceTypeName);
      const category = escapePowerShellString(params.category || 'Application');
      const timeFormat = escapePowerShellString(params.timeFormat || '');
      const lineBreaker = escapePowerShellString(params.lineBreaker || '');
      const description = escapePowerShellString(params.description || '');
      
      return `# Splunk Create Source Type
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/saved/sourcetypes"
    $Body = @{
        name = "${sourceTypeName}"
        "pulldown_type" = "1"
        category = "${category}"
        description = "${description}"
    }
    
    if ("${timeFormat}") {
        $Body["TIME_FORMAT"] = "${timeFormat}"
    }
    if ("${lineBreaker}") {
        $Body["LINE_BREAKER"] = "${lineBreaker}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Source type created: ${sourceTypeName}" -ForegroundColor Green
    Write-Host "  Category: ${category}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Source type creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-sourcetypes',
    name: 'List Source Types',
    category: 'Data Management',
    description: 'List all configured source types',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Source Types
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/saved/sourcetypes?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $SourceTypes = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            Category = $_.content.category
            Description = $_.content.description
            PulldownType = $_.content.pulldown_type
        }
    }
    
    Write-Host "Found $($SourceTypes.Count) source types:" -ForegroundColor Green
    $SourceTypes | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $SourceTypes | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list source types: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-delete-index',
    name: 'Delete Index',
    category: 'Data Management',
    description: 'Delete an existing index (caution: data loss)',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'indexName', label: 'Index Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexName = escapePowerShellString(params.indexName);
      
      return `# Splunk Delete Index
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    Write-Host "WARNING: Deleting an index will permanently remove all data!" -ForegroundColor Red
    $Confirm = Read-Host "Type the index name '${indexName}' to confirm deletion"
    
    if ($Confirm -eq "${indexName}") {
        # First disable the index
        $DisableUri = "$SplunkUrl/services/data/indexes/${indexName}"
        $Body = @{ disabled = "1" }
        Invoke-RestMethod -Uri $DisableUri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
        
        # Then delete it
        $DeleteUri = "$SplunkUrl/services/data/indexes/${indexName}"
        Invoke-RestMethod -Uri $DeleteUri -Method Delete -Headers $Headers -SkipCertificateCheck
        
        Write-Host "Index deleted: ${indexName}" -ForegroundColor Green
    } else {
        Write-Host "Delete cancelled - name did not match" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete index: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-configure-forwarding',
    name: 'Configure Data Forwarding',
    category: 'Data Management',
    description: 'Configure Splunk forwarder outputs',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk Forwarder URL', type: 'text', required: true },
      { id: 'indexerHost', label: 'Indexer Host', type: 'text', required: true, placeholder: 'indexer.company.com' },
      { id: 'indexerPort', label: 'Indexer Port', type: 'number', required: true, defaultValue: 9997 },
      { id: 'sslEnabled', label: 'SSL Enabled', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexerHost = escapePowerShellString(params.indexerHost);
      const indexerPort = params.indexerPort || 9997;
      const sslEnabled = params.sslEnabled !== false;
      
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
        ssl = $(if (${sslEnabled}) { "true" } else { "false" })
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Data forwarding configured" -ForegroundColor Green
    Write-Host "  Indexer: ${indexerHost}:${indexerPort}" -ForegroundColor Cyan
    Write-Host "  SSL: ${sslEnabled}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Forwarding configuration failed: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // USER MANAGEMENT (8 tasks)
  // ============================================
  {
    id: 'splunk-create-user',
    name: 'Create User',
    category: 'User Management',
    description: 'Create a new Splunk user account',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'fullName', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'role', label: 'Role', type: 'select', required: true, options: ['admin', 'power', 'user', 'can_delete'], defaultValue: 'user' },
      { id: 'defaultApp', label: 'Default App', type: 'text', required: false, defaultValue: 'search' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const username = escapePowerShellString(params.username);
      const fullName = escapePowerShellString(params.fullName);
      const email = escapePowerShellString(params.email);
      const role = params.role || 'user';
      const defaultApp = escapePowerShellString(params.defaultApp || 'search');
      
      return `# Splunk Create User
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Password = Read-Host -AsSecureString -Prompt "Enter password for new user ${username}"
    $PasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    
    $Uri = "$SplunkUrl/services/authentication/users"
    $Body = @{
        name = "${username}"
        password = $PasswordPlain
        roles = "${role}"
        realname = "${fullName}"
        email = "${email}"
        defaultApp = "${defaultApp}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "User created: ${username}" -ForegroundColor Green
    Write-Host "  Full Name: ${fullName}" -ForegroundColor Cyan
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    Write-Host "  Role: ${role}" -ForegroundColor Cyan
    
} catch {
    Write-Error "User creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-users',
    name: 'List Users',
    category: 'User Management',
    description: 'List all Splunk users and their roles',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Users
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/authentication/users?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Users = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Username = $_.name
            RealName = $_.content.realname
            Email = $_.content.email
            Roles = ($_.content.roles -join ", ")
            DefaultApp = $_.content.defaultApp
            AuthType = $_.content.type
            Locked = $_.content.locked_out
        }
    }
    
    Write-Host "Found $($Users.Count) users:" -ForegroundColor Green
    $Users | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Users | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list users: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-update-user-role',
    name: 'Update User Role',
    category: 'User Management',
    description: 'Modify user role assignments',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'roles', label: 'Roles (comma-separated)', type: 'text', required: true, placeholder: 'user,power' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const username = escapePowerShellString(params.username);
      const roles = escapePowerShellString(params.roles);
      
      return `# Splunk Update User Role
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/authentication/users/${username}"
    $Body = @{
        roles = "${roles}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "User roles updated: ${username}" -ForegroundColor Green
    Write-Host "  Roles: ${roles}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to update user role: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-delete-user',
    name: 'Delete User',
    category: 'User Management',
    description: 'Delete a Splunk user account',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'username', label: 'Username', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const username = escapePowerShellString(params.username);
      
      return `# Splunk Delete User
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Confirm = Read-Host "Are you sure you want to delete user '${username}'? (yes/no)"
    
    if ($Confirm -eq 'yes') {
        $Uri = "$SplunkUrl/services/authentication/users/${username}"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -SkipCertificateCheck
        
        Write-Host "User deleted: ${username}" -ForegroundColor Green
    } else {
        Write-Host "Delete cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to delete user: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-reset-user-password',
    name: 'Reset User Password',
    category: 'User Management',
    description: 'Reset a user password',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'username', label: 'Username', type: 'text', required: true },
      { id: 'forceChange', label: 'Force Password Change', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const username = escapePowerShellString(params.username);
      const forceChange = params.forceChange !== false;
      
      return `# Splunk Reset User Password
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $NewPassword = Read-Host -AsSecureString -Prompt "Enter new password for ${username}"
    $PasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($NewPassword))
    
    $Uri = "$SplunkUrl/services/authentication/users/${username}"
    $Body = @{
        password = $PasswordPlain
        force_change_pass = $(if (${forceChange}) { "true" } else { "false" })
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Password reset for: ${username}" -ForegroundColor Green
    Write-Host "  Force change on login: ${forceChange}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to reset password: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-role',
    name: 'Create Custom Role',
    category: 'User Management',
    description: 'Create a new custom role with specific capabilities',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'custom_analyst' },
      { id: 'importedRoles', label: 'Inherited Roles (comma-separated)', type: 'text', required: false, placeholder: 'user' },
      { id: 'capabilities', label: 'Capabilities (comma-separated)', type: 'text', required: false, placeholder: 'search,schedule_search' },
      { id: 'allowedIndexes', label: 'Allowed Indexes (comma-separated)', type: 'text', required: false, placeholder: 'main,security' },
      { id: 'defaultApp', label: 'Default App', type: 'text', required: false, defaultValue: 'search' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const roleName = escapePowerShellString(params.roleName);
      const importedRoles = escapePowerShellString(params.importedRoles || '');
      const capabilities = escapePowerShellString(params.capabilities || '');
      const allowedIndexes = escapePowerShellString(params.allowedIndexes || '');
      const defaultApp = escapePowerShellString(params.defaultApp || 'search');
      
      return `# Splunk Create Custom Role
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/authorization/roles"
    $Body = @{
        name = "${roleName}"
        defaultApp = "${defaultApp}"
    }
    
    if ("${importedRoles}") {
        $Body["imported_roles"] = "${importedRoles}"
    }
    if ("${capabilities}") {
        $Body["capabilities"] = "${capabilities}"
    }
    if ("${allowedIndexes}") {
        $Body["srchIndexesAllowed"] = "${allowedIndexes}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Role created: ${roleName}" -ForegroundColor Green
    Write-Host "  Inherited roles: ${importedRoles}" -ForegroundColor Cyan
    Write-Host "  Capabilities: ${capabilities}" -ForegroundColor Cyan
    Write-Host "  Allowed indexes: ${allowedIndexes}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Role creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-roles',
    name: 'List Roles',
    category: 'User Management',
    description: 'List all roles and their capabilities',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Roles
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/authorization/roles?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Roles = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            DefaultApp = $_.content.defaultApp
            ImportedRoles = ($_.content.imported_roles -join ", ")
            Capabilities = (($_.content.capabilities | Select-Object -First 5) -join ", ")
            AllowedIndexes = ($_.content.srchIndexesAllowed -join ", ")
        }
    }
    
    Write-Host "Found $($Roles.Count) roles:" -ForegroundColor Green
    $Roles | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Roles | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list roles: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-unlock-user',
    name: 'Unlock User Account',
    category: 'User Management',
    description: 'Unlock a locked user account',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'username', label: 'Username', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const username = escapePowerShellString(params.username);
      
      return `# Splunk Unlock User Account
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/authentication/users/${username}"
    $Body = @{
        locked_out = "false"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "User account unlocked: ${username}" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to unlock user: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // CLUSTER ADMINISTRATION (6 tasks)
  // ============================================
  {
    id: 'splunk-get-cluster-status',
    name: 'Get Cluster Status',
    category: 'Cluster Administration',
    description: 'Get the current status of the indexer cluster',
    parameters: [
      { id: 'splunkUrl', label: 'Cluster Master URL', type: 'text', required: true, placeholder: 'https://cluster-master.company.com:8089' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      
      return `# Splunk Get Cluster Status
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Get cluster master info
    $MasterUri = "$SplunkUrl/services/cluster/master/info?output_mode=json"
    $MasterInfo = Invoke-RestMethod -Uri $MasterUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get cluster health
    $HealthUri = "$SplunkUrl/services/cluster/master/health?output_mode=json"
    $Health = Invoke-RestMethod -Uri $HealthUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "=== Cluster Master Status ===" -ForegroundColor Cyan
    Write-Host "Label: $($MasterInfo.entry.content.label)" -ForegroundColor White
    Write-Host "Mode: $($MasterInfo.entry.content.mode)" -ForegroundColor White
    Write-Host "Replication Factor: $($MasterInfo.entry.content.replication_factor)" -ForegroundColor White
    Write-Host "Search Factor: $($MasterInfo.entry.content.search_factor)" -ForegroundColor White
    Write-Host ""
    Write-Host "=== Cluster Health ===" -ForegroundColor Cyan
    Write-Host "Status: $($Health.entry.content.all_data_is_searchable)" -ForegroundColor $(if ($Health.entry.content.all_data_is_searchable -eq "1") { "Green" } else { "Red" })
    Write-Host "Peers: $($MasterInfo.entry.content.active_bundle_count)" -ForegroundColor White
    
} catch {
    Write-Error "Failed to get cluster status: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-cluster-peers',
    name: 'List Cluster Peers',
    category: 'Cluster Administration',
    description: 'List all indexer cluster peers and their status',
    parameters: [
      { id: 'splunkUrl', label: 'Cluster Master URL', type: 'text', required: true, placeholder: 'https://cluster-master.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Cluster Peers
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/cluster/master/peers?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Peers = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Label = $_.content.label
            Guid = $_.name
            Status = $_.content.status
            IsSearchable = $_.content.is_searchable
            ReplicationCount = $_.content.replication_count
            SearchCount = $_.content.search_count
            BucketCount = $_.content.bucket_count
            LastHeartbeat = $_.content.last_heartbeat
        }
    }
    
    Write-Host "Found $($Peers.Count) cluster peers:" -ForegroundColor Green
    $Peers | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Peers | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list cluster peers: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-check-bucket-replication',
    name: 'Check Bucket Replication',
    category: 'Cluster Administration',
    description: 'Check bucket replication status across cluster',
    parameters: [
      { id: 'splunkUrl', label: 'Cluster Master URL', type: 'text', required: true, placeholder: 'https://cluster-master.company.com:8089' },
      { id: 'indexName', label: 'Index Name (optional)', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const indexName = escapePowerShellString(params.indexName || '');
      
      return `# Splunk Check Bucket Replication
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/cluster/master/buckets?output_mode=json&count=100"
    ${indexName ? `$Uri += "&filter=index=${indexName}"` : ''}
    
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Buckets = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            BucketId = $_.name
            Index = $_.content.index
            SearchState = $_.content.search_state
            ReplicationCount = $_.content.rep_count_by_site.default
            Searchable = $_.content.searchable
            Standalone = $_.content.standalone
            PrimariesByPeer = $_.content.primaries_by_peer
        }
    }
    
    $SearchableCount = ($Buckets | Where-Object { $_.Searchable -eq "1" }).Count
    $TotalCount = $Buckets.Count
    
    Write-Host "=== Bucket Replication Status ===" -ForegroundColor Cyan
    Write-Host "Total Buckets: $TotalCount" -ForegroundColor White
    Write-Host "Searchable: $SearchableCount" -ForegroundColor $(if ($SearchableCount -eq $TotalCount) { "Green" } else { "Yellow" })
    Write-Host ""
    Write-Host "Sample Buckets:" -ForegroundColor Cyan
    $Buckets | Select-Object -First 10 | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to check bucket replication: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-rolling-restart-cluster',
    name: 'Rolling Restart Cluster',
    category: 'Cluster Administration',
    description: 'Initiate a rolling restart of cluster peers',
    parameters: [
      { id: 'splunkUrl', label: 'Cluster Master URL', type: 'text', required: true, placeholder: 'https://cluster-master.company.com:8089' },
      { id: 'searchableRolling', label: 'Maintain Searchability', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const searchableRolling = params.searchableRolling !== false;
      
      return `# Splunk Rolling Restart Cluster
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    Write-Host "WARNING: This will initiate a rolling restart of all cluster peers." -ForegroundColor Yellow
    $Confirm = Read-Host "Type 'RESTART' to confirm"
    
    if ($Confirm -eq 'RESTART') {
        $Uri = "$SplunkUrl/services/cluster/master/control/control/rolling_restart"
        $Body = @{
            searchable = $(if (${searchableRolling}) { "true" } else { "false" })
        }
        
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
        
        Write-Host "Rolling restart initiated" -ForegroundColor Green
        Write-Host "  Searchable during restart: ${searchableRolling}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Monitor progress via cluster master UI or status endpoint" -ForegroundColor Yellow
    } else {
        Write-Host "Restart cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to initiate rolling restart: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-remove-cluster-peer',
    name: 'Remove Cluster Peer',
    category: 'Cluster Administration',
    description: 'Remove a peer from the indexer cluster',
    parameters: [
      { id: 'splunkUrl', label: 'Cluster Master URL', type: 'text', required: true, placeholder: 'https://cluster-master.company.com:8089' },
      { id: 'peerGuid', label: 'Peer GUID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const peerGuid = escapePowerShellString(params.peerGuid);
      
      return `# Splunk Remove Cluster Peer
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    Write-Host "WARNING: Removing a cluster peer will initiate bucket rebalancing." -ForegroundColor Yellow
    $Confirm = Read-Host "Type the peer GUID '${peerGuid}' to confirm removal"
    
    if ($Confirm -eq "${peerGuid}") {
        $Uri = "$SplunkUrl/services/cluster/master/control/control/remove_peers"
        $Body = @{
            peers = "${peerGuid}"
        }
        
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
        
        Write-Host "Cluster peer removal initiated: ${peerGuid}" -ForegroundColor Green
        Write-Host ""
        Write-Host "Bucket rebalancing will begin automatically" -ForegroundColor Yellow
    } else {
        Write-Host "Removal cancelled - GUID did not match" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to remove cluster peer: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-cluster-searchheads',
    name: 'List Search Head Cluster Members',
    category: 'Cluster Administration',
    description: 'List all search head cluster members and captain',
    parameters: [
      { id: 'splunkUrl', label: 'Search Head URL', type: 'text', required: true, placeholder: 'https://searchhead.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Search Head Cluster Members
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Get SHC captain info
    $CaptainUri = "$SplunkUrl/services/shcluster/captain/info?output_mode=json"
    $CaptainInfo = Invoke-RestMethod -Uri $CaptainUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get members
    $MembersUri = "$SplunkUrl/services/shcluster/captain/members?output_mode=json&count=0"
    $MembersResponse = Invoke-RestMethod -Uri $MembersUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "=== Search Head Cluster Captain ===" -ForegroundColor Cyan
    Write-Host "Captain: $($CaptainInfo.entry.content.label)" -ForegroundColor White
    Write-Host "Dynamic Captain: $($CaptainInfo.entry.content.dynamic_captain)" -ForegroundColor White
    Write-Host ""
    
    $Members = $MembersResponse.entry | ForEach-Object {
        [PSCustomObject]@{
            Label = $_.content.label
            Guid = $_.name
            Status = $_.content.status
            IsCaptain = $_.content.is_captain
            LastHeartbeat = $_.content.last_heartbeat
            ReplicationCount = $_.content.replication_count
        }
    }
    
    Write-Host "=== Cluster Members ===" -ForegroundColor Cyan
    $Members | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Members | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list search head cluster: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // DEPLOYMENT (5 tasks)
  // ============================================
  {
    id: 'splunk-list-deployment-apps',
    name: 'List Deployment Apps',
    category: 'Deployment',
    description: 'List apps on deployment server',
    parameters: [
      { id: 'splunkUrl', label: 'Deployment Server URL', type: 'text', required: true, placeholder: 'https://deployment.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Deployment Apps
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/deployment/server/applications?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Apps = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            ServerClasses = ($_.content.serverclasses -join ", ")
            Disabled = $_.content.disabled
        }
    }
    
    Write-Host "Found $($Apps.Count) deployment apps:" -ForegroundColor Green
    $Apps | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Apps | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list deployment apps: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-server-classes',
    name: 'List Server Classes',
    category: 'Deployment',
    description: 'List all server classes on deployment server',
    parameters: [
      { id: 'splunkUrl', label: 'Deployment Server URL', type: 'text', required: true, placeholder: 'https://deployment.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Server Classes
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/deployment/server/serverclasses?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $ServerClasses = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            Whitelist = $_.content.whitelist
            Blacklist = $_.content.blacklist
            MachineTypesFilter = $_.content.machineTypesFilter
            RestartSplunkd = $_.content.restartSplunkd
        }
    }
    
    Write-Host "Found $($ServerClasses.Count) server classes:" -ForegroundColor Green
    $ServerClasses | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $ServerClasses | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list server classes: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-create-server-class',
    name: 'Create Server Class',
    category: 'Deployment',
    description: 'Create a new server class for forwarder management',
    parameters: [
      { id: 'splunkUrl', label: 'Deployment Server URL', type: 'text', required: true, placeholder: 'https://deployment.company.com:8089' },
      { id: 'serverClassName', label: 'Server Class Name', type: 'text', required: true, placeholder: 'production_linux' },
      { id: 'whitelist', label: 'Whitelist Pattern', type: 'text', required: false, placeholder: '*.prod.company.com' },
      { id: 'blacklist', label: 'Blacklist Pattern', type: 'text', required: false },
      { id: 'restartSplunkd', label: 'Restart Splunkd', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const serverClassName = escapePowerShellString(params.serverClassName);
      const whitelist = escapePowerShellString(params.whitelist || '');
      const blacklist = escapePowerShellString(params.blacklist || '');
      const restartSplunkd = params.restartSplunkd || false;
      
      return `# Splunk Create Server Class
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/deployment/server/serverclasses"
    $Body = @{
        name = "${serverClassName}"
        restartSplunkd = $(if (${restartSplunkd}) { "true" } else { "false" })
    }
    
    if ("${whitelist}") {
        $Body["whitelist.0"] = "${whitelist}"
    }
    if ("${blacklist}") {
        $Body["blacklist.0"] = "${blacklist}"
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "Server class created: ${serverClassName}" -ForegroundColor Green
    Write-Host "  Whitelist: ${whitelist}" -ForegroundColor Cyan
    Write-Host "  Blacklist: ${blacklist}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to create server class: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-forwarders',
    name: 'List Deployment Clients',
    category: 'Deployment',
    description: 'List all forwarders registered with deployment server',
    parameters: [
      { id: 'splunkUrl', label: 'Deployment Server URL', type: 'text', required: true, placeholder: 'https://deployment.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Deployment Clients (Forwarders)
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/deployment/server/clients?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Clients = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Hostname = $_.content.hostname
            ClientName = $_.name
            IP = $_.content.ip
            MachineType = $_.content.utsname
            LastPhoneHomeTime = $_.content.lastPhoneHomeTime
            ServerClasses = ($_.content.serverClasses -join ", ")
        }
    }
    
    Write-Host "Found $($Clients.Count) deployment clients:" -ForegroundColor Green
    $Clients | Sort-Object -Property Hostname | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Clients | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list deployment clients: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-reload-deployment-server',
    name: 'Reload Deployment Server',
    category: 'Deployment',
    description: 'Reload deployment server configuration',
    parameters: [
      { id: 'splunkUrl', label: 'Deployment Server URL', type: 'text', required: true, placeholder: 'https://deployment.company.com:8089' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      
      return `# Splunk Reload Deployment Server
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/deployment/server/config/_reload"
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -SkipCertificateCheck
    
    Write-Host "Deployment server configuration reloaded" -ForegroundColor Green
    Write-Host ""
    Write-Host "Clients will receive updates on their next phone-home interval" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to reload deployment server: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // MONITORING (5 tasks)
  // ============================================
  {
    id: 'splunk-license-usage',
    name: 'Get License Usage',
    category: 'Monitoring',
    description: 'Get current license usage and quota information',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      
      return `# Splunk Get License Usage
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Get license pools
    $PoolsUri = "$SplunkUrl/services/licenser/pools?output_mode=json"
    $Pools = Invoke-RestMethod -Uri $PoolsUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get usage
    $UsageUri = "$SplunkUrl/services/licenser/usage?output_mode=json"
    $Usage = Invoke-RestMethod -Uri $UsageUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "=== License Usage ===" -ForegroundColor Cyan
    
    foreach ($Pool in $Pools.entry) {
        $UsedBytes = $Pool.content.used_bytes
        $QuotaBytes = $Pool.content.effective_quota
        $UsedGB = [math]::Round($UsedBytes / 1GB, 2)
        $QuotaGB = [math]::Round($QuotaBytes / 1GB, 2)
        $Percentage = [math]::Round(($UsedBytes / $QuotaBytes) * 100, 1)
        
        $Color = if ($Percentage -lt 70) { "Green" } elseif ($Percentage -lt 90) { "Yellow" } else { "Red" }
        
        Write-Host ""
        Write-Host "Pool: $($Pool.name)" -ForegroundColor White
        Write-Host "  Used: $UsedGB GB / $QuotaGB GB ($Percentage%)" -ForegroundColor $Color
        Write-Host "  Slaves: $($Pool.content.slaves_usage_bytes.Count)" -ForegroundColor White
    }
    
    # Check for violations
    $ViolationsUri = "$SplunkUrl/services/licenser/messages?output_mode=json"
    $Violations = Invoke-RestMethod -Uri $ViolationsUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $ViolationCount = ($Violations.entry | Where-Object { $_.content.severity -eq "ERROR" }).Count
    
    Write-Host ""
    Write-Host "=== Violations ===" -ForegroundColor Cyan
    Write-Host "Active violations: $ViolationCount" -ForegroundColor $(if ($ViolationCount -eq 0) { "Green" } else { "Red" })
    
} catch {
    Write-Error "Failed to get license usage: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-system-health',
    name: 'Get System Health',
    category: 'Monitoring',
    description: 'Get overall system health and component status',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      
      return `# Splunk Get System Health
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Get server info
    $InfoUri = "$SplunkUrl/services/server/info?output_mode=json"
    $Info = Invoke-RestMethod -Uri $InfoUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get health status
    $HealthUri = "$SplunkUrl/services/server/health/splunkd/details?output_mode=json"
    $Health = Invoke-RestMethod -Uri $HealthUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    # Get server status
    $StatusUri = "$SplunkUrl/services/server/status?output_mode=json"
    $Status = Invoke-RestMethod -Uri $StatusUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "=== Splunk Server Info ===" -ForegroundColor Cyan
    Write-Host "Server: $($Info.entry.content.serverName)" -ForegroundColor White
    Write-Host "Version: $($Info.entry.content.version)" -ForegroundColor White
    Write-Host "OS: $($Info.entry.content.os_name) $($Info.entry.content.os_version)" -ForegroundColor White
    Write-Host "CPU Cores: $($Info.entry.content.numberOfCores)" -ForegroundColor White
    Write-Host "Physical Memory: $([math]::Round($Info.entry.content.physicalMemoryMB / 1024, 1)) GB" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== Health Status ===" -ForegroundColor Cyan
    
    $HealthColor = switch ($Health.entry.content.health) {
        "green" { "Green" }
        "yellow" { "Yellow" }
        "red" { "Red" }
        default { "White" }
    }
    Write-Host "Overall Health: $($Health.entry.content.health)" -ForegroundColor $HealthColor
    
    # Show feature health
    if ($Health.entry.content.features) {
        Write-Host ""
        Write-Host "Feature Health:" -ForegroundColor White
        $Health.entry.content.features.PSObject.Properties | ForEach-Object {
            $FeatureColor = switch ($_.Value.health) {
                "green" { "Green" }
                "yellow" { "Yellow" }
                "red" { "Red" }
                default { "White" }
            }
            Write-Host "  $($_.Name): $($_.Value.health)" -ForegroundColor $FeatureColor
        }
    }
    
} catch {
    Write-Error "Failed to get system health: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-resource-usage',
    name: 'Get Resource Usage',
    category: 'Monitoring',
    description: 'Get CPU, memory, and disk usage metrics',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      
      return `# Splunk Get Resource Usage
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Get introspection data
    $IntrospectionUri = "$SplunkUrl/services/server/status/resource-usage/hostwide?output_mode=json"
    $ResourceUsage = Invoke-RestMethod -Uri $IntrospectionUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Usage = $ResourceUsage.entry.content
    
    Write-Host "=== Resource Usage ===" -ForegroundColor Cyan
    Write-Host ""
    
    # CPU
    $CpuPct = [math]::Round($Usage.cpu_system_pct + $Usage.cpu_user_pct, 1)
    $CpuColor = if ($CpuPct -lt 70) { "Green" } elseif ($CpuPct -lt 90) { "Yellow" } else { "Red" }
    Write-Host "CPU Usage: $CpuPct%" -ForegroundColor $CpuColor
    Write-Host "  System: $([math]::Round($Usage.cpu_system_pct, 1))%" -ForegroundColor White
    Write-Host "  User: $([math]::Round($Usage.cpu_user_pct, 1))%" -ForegroundColor White
    
    Write-Host ""
    
    # Memory
    $MemUsedGB = [math]::Round($Usage.mem_used / 1024, 2)
    $MemPct = [math]::Round($Usage.normalized_mem_used * 100, 1)
    $MemColor = if ($MemPct -lt 70) { "Green" } elseif ($MemPct -lt 90) { "Yellow" } else { "Red" }
    Write-Host "Memory Usage: $MemUsedGB GB ($MemPct%)" -ForegroundColor $MemColor
    
    Write-Host ""
    
    # Swap
    if ($Usage.swap_used) {
        $SwapUsedGB = [math]::Round($Usage.swap_used / 1024, 2)
        Write-Host "Swap Usage: $SwapUsedGB GB" -ForegroundColor $(if ($SwapUsedGB -gt 0.5) { "Yellow" } else { "Green" })
    }
    
    Write-Host ""
    
    # Disk (via separate endpoint)
    $DiskUri = "$SplunkUrl/services/server/status/partitions-space?output_mode=json"
    $DiskUsage = Invoke-RestMethod -Uri $DiskUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    Write-Host "=== Disk Usage ===" -ForegroundColor Cyan
    $DiskUsage.entry | ForEach-Object {
        $UsedPct = [math]::Round((1 - ($_.content.available / $_.content.capacity)) * 100, 1)
        $DiskColor = if ($UsedPct -lt 70) { "Green" } elseif ($UsedPct -lt 90) { "Yellow" } else { "Red" }
        Write-Host "$($_.content.mount_point): $UsedPct% used" -ForegroundColor $DiskColor
    }
    
} catch {
    Write-Error "Failed to get resource usage: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-search-job-inspector',
    name: 'Inspect Search Job',
    category: 'Monitoring',
    description: 'Get detailed information about a search job',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'searchId', label: 'Search ID (SID)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const searchId = escapePowerShellString(params.searchId);
      
      return `# Splunk Inspect Search Job
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/search/jobs/${searchId}?output_mode=json"
    $Job = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Content = $Job.entry.content
    
    Write-Host "=== Search Job Details ===" -ForegroundColor Cyan
    Write-Host "SID: ${searchId}" -ForegroundColor White
    Write-Host "Status: $($Content.dispatchState)" -ForegroundColor $(if ($Content.dispatchState -eq "DONE") { "Green" } else { "Yellow" })
    Write-Host ""
    
    Write-Host "=== Performance ===" -ForegroundColor Cyan
    Write-Host "Run Duration: $([math]::Round($Content.runDuration, 2)) seconds" -ForegroundColor White
    Write-Host "Scan Count: $($Content.scanCount)" -ForegroundColor White
    Write-Host "Event Count: $($Content.eventCount)" -ForegroundColor White
    Write-Host "Result Count: $($Content.resultCount)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== Resources ===" -ForegroundColor Cyan
    Write-Host "Disk Usage: $([math]::Round($Content.diskUsage / 1MB, 2)) MB" -ForegroundColor White
    Write-Host "Priority: $($Content.priority)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== Search ===" -ForegroundColor Cyan
    Write-Host "Query: $($Content.search)" -ForegroundColor White
    Write-Host "Earliest: $($Content.earliestTime)" -ForegroundColor White
    Write-Host "Latest: $($Content.latestTime)" -ForegroundColor White
    
    if ($Content.messages) {
        Write-Host ""
        Write-Host "=== Messages ===" -ForegroundColor Cyan
        $Content.messages | ForEach-Object {
            $MsgColor = switch ($_.type) {
                "ERROR" { "Red" }
                "WARN" { "Yellow" }
                default { "White" }
            }
            Write-Host "[$($_.type)] $($_.text)" -ForegroundColor $MsgColor
        }
    }
    
} catch {
    Write-Error "Failed to inspect search job: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-list-running-searches',
    name: 'List Running Searches',
    category: 'Monitoring',
    description: 'List all currently running search jobs',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Running Searches
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/search/jobs?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $RunningJobs = $Response.entry | Where-Object { 
        $_.content.dispatchState -in @("QUEUED", "PARSING", "RUNNING")
    } | ForEach-Object {
        [PSCustomObject]@{
            SID = $_.name
            Owner = $_.acl.owner
            Status = $_.content.dispatchState
            RunDuration = [math]::Round($_.content.runDuration, 1)
            ScanCount = $_.content.scanCount
            EventCount = $_.content.eventCount
            Priority = $_.content.priority
            Search = ($_.content.search | Out-String).Substring(0, [Math]::Min(50, $_.content.search.Length))
        }
    }
    
    Write-Host "Found $($RunningJobs.Count) running searches:" -ForegroundColor Green
    $RunningJobs | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $RunningJobs | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list running searches: $_"
}`;
    },
    isPremium: true
  },
  
  // ============================================
  // APP MANAGEMENT (4 tasks)
  // ============================================
  {
    id: 'splunk-list-apps',
    name: 'List Installed Apps',
    category: 'App Management',
    description: 'List all installed Splunk apps',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const exportPath = escapePowerShellString(params.exportPath || '');
      
      return `# Splunk List Installed Apps
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/apps/local?output_mode=json&count=0"
    $Response = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers -SkipCertificateCheck
    
    $Apps = $Response.entry | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.name
            Label = $_.content.label
            Version = $_.content.version
            Visible = $_.content.visible
            Disabled = $_.content.disabled
            Author = $_.content.author
            Description = ($_.content.description | Out-String).Substring(0, [Math]::Min(50, ($_.content.description ?? "").Length))
        }
    }
    
    Write-Host "Found $($Apps.Count) installed apps:" -ForegroundColor Green
    $Apps | Sort-Object -Property Label | Format-Table -AutoSize
    
    if ("${exportPath}") {
        $Apps | Export-Csv -Path "${exportPath}" -NoTypeInformation
        Write-Host "Exported to: ${exportPath}" -ForegroundColor Cyan
    }
    
} catch {
    Write-Error "Failed to list apps: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-enable-disable-app',
    name: 'Enable/Disable App',
    category: 'App Management',
    description: 'Enable or disable a Splunk app',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'appName', label: 'App Name', type: 'text', required: true },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'], defaultValue: 'Enable' }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const appName = escapePowerShellString(params.appName);
      const action = params.action;
      
      return `# Splunk Enable/Disable App
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    $Uri = "$SplunkUrl/services/apps/local/${appName}"
    $Body = @{
        disabled = $(if ("${action}" -eq "Disable") { "1" } else { "0" })
    }
    
    Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -SkipCertificateCheck
    
    Write-Host "App ${action.toLowerCase()}d: ${appName}" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Splunk may require a restart for changes to take effect" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to ${action.toLowerCase()} app: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-update-app',
    name: 'Update App',
    category: 'App Management',
    description: 'Check for and apply app updates',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'appName', label: 'App Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const appName = escapePowerShellString(params.appName);
      
      return `# Splunk Update App
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    # Check for update
    $CheckUri = "$SplunkUrl/services/apps/local/${appName}/update?output_mode=json"
    $UpdateInfo = Invoke-RestMethod -Uri $CheckUri -Method Get -Headers $Headers -SkipCertificateCheck
    
    if ($UpdateInfo.entry.content.update_available) {
        Write-Host "Update available for ${appName}" -ForegroundColor Yellow
        Write-Host "  Current: $($UpdateInfo.entry.content.version)" -ForegroundColor White
        Write-Host "  Available: $($UpdateInfo.entry.content.update_version)" -ForegroundColor White
        
        $Confirm = Read-Host "Apply update? (yes/no)"
        
        if ($Confirm -eq 'yes') {
            $UpdateUri = "$SplunkUrl/services/apps/local/${appName}/update"
            Invoke-RestMethod -Uri $UpdateUri -Method Post -Headers $Headers -SkipCertificateCheck
            
            Write-Host "App updated: ${appName}" -ForegroundColor Green
            Write-Host ""
            Write-Host "Note: Splunk may require a restart for changes to take effect" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No update available for ${appName}" -ForegroundColor Green
        Write-Host "  Current version: $($UpdateInfo.entry.content.version)" -ForegroundColor White
    }
    
} catch {
    Write-Error "Failed to update app: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'splunk-delete-app',
    name: 'Uninstall App',
    category: 'App Management',
    description: 'Uninstall a Splunk app',
    parameters: [
      { id: 'splunkUrl', label: 'Splunk URL', type: 'text', required: true, placeholder: 'https://splunk.company.com:8089' },
      { id: 'appName', label: 'App Name', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const splunkUrl = escapePowerShellString(params.splunkUrl);
      const appName = escapePowerShellString(params.appName);
      
      return `# Splunk Uninstall App
# Generated: ${new Date().toISOString()}

$SplunkUrl = "${splunkUrl}"
$Credential = Get-Credential -Message "Enter Splunk admin credentials"

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Credential.UserName):$($Credential.GetNetworkCredential().Password)"))
}

try {
    Write-Host "WARNING: This will permanently remove the app and its data" -ForegroundColor Red
    $Confirm = Read-Host "Type 'UNINSTALL' to confirm removal of ${appName}"
    
    if ($Confirm -eq 'UNINSTALL') {
        $Uri = "$SplunkUrl/services/apps/local/${appName}"
        Invoke-RestMethod -Uri $Uri -Method Delete -Headers $Headers -SkipCertificateCheck
        
        Write-Host "App uninstalled: ${appName}" -ForegroundColor Green
        Write-Host ""
        Write-Host "Note: Splunk requires a restart to complete the removal" -ForegroundColor Yellow
    } else {
        Write-Host "Uninstall cancelled" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to uninstall app: $_"
}`;
    },
    isPremium: true
  }
];
