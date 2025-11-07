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
  }
];
