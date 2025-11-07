import { escapePowerShellString } from './powershell-utils';

export interface ServiceNowTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface ServiceNowTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: ServiceNowTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const servicenowTasks: ServiceNowTask[] = [
  {
    id: 'snow-bulk-create-incidents',
    name: 'Bulk Create Incidents',
    category: 'Bulk Operations',
    description: 'Create multiple incidents from a list',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true, placeholder: 'company.service-now.com' },
      { id: 'shortDescriptions', label: 'Short Descriptions (one per line)', type: 'textarea', required: true },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['1 - Critical', '2 - High', '3 - Moderate', '4 - Low'], defaultValue: '3 - Moderate' }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const descriptions = (params.shortDescriptions as string).split('\n').filter((d: string) => d.trim());
      const priority = params.priority.split(' - ')[0];
      
      return `# ServiceNow Bulk Create Incidents
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/incident"

# Credentials - retrieve from secure store or prompt
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

$Headers = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

$Descriptions = @(
${descriptions.map(d => `    "${escapePowerShellString(d.trim())}"`).join(',\n')}
)

try {
    foreach ($Description in $Descriptions) {
        $Body = @{
            short_description = $Description
            priority = "${priority}"
            urgency = "3"
            impact = "3"
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri $ApiUrl \`
            -Method Post \`
            -Headers $Headers \`
            -Credential $Credential \`
            -Body $Body
        
        Write-Host "✓ Incident created: $($Response.result.number) - $Description" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Created $($Descriptions.Count) incidents!" -ForegroundColor Green
    
} catch {
    Write-Error "Failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'snow-query-incidents',
    name: 'Query Incidents',
    category: 'Incident Management',
    description: 'Retrieve and filter incidents',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'state', label: 'State', type: 'select', required: true, options: ['New', 'In Progress', 'Resolved', 'Closed', 'All'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export CSV Path (optional)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const state = params.state;
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Query ServiceNow Incidents
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$ApiUrl = "https://$Instance/api/now/table/incident"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
${state !== 'All' ? `    $StateFilter = "?sysparm_query=state=${state}"
    $Uri = $ApiUrl + $StateFilter` : `    $Uri = $ApiUrl`}
    
    $Response = Invoke-RestMethod -Uri $Uri \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    $Incidents = $Response.result | Select-Object \`
        number,
        short_description,
        state,
        priority,
        assigned_to,
        opened_at,
        sys_updated_on
    
    Write-Host "Found $($Incidents.Count) incidents" -ForegroundColor Cyan
    $Incidents | Format-Table -AutoSize
    
${exportPath ? `    $Incidents | Export-Csv -Path "${exportPath}" -NoTypeInformation
    Write-Host "✓ Exported to: ${exportPath}" -ForegroundColor Green` : ''}
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'snow-update-cmdb',
    name: 'Update CMDB Records',
    category: 'CMDB Management',
    description: 'Update Configuration Management Database records',
    parameters: [
      { id: 'instance', label: 'ServiceNow Instance', type: 'text', required: true },
      { id: 'ciName', label: 'CI Name', type: 'text', required: true, placeholder: 'SERVER01' },
      { id: 'field', label: 'Field to Update', type: 'text', required: true, placeholder: 'ip_address' },
      { id: 'value', label: 'New Value', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const instance = escapePowerShellString(params.instance);
      const ciName = escapePowerShellString(params.ciName);
      const field = escapePowerShellString(params.field);
      const value = escapePowerShellString(params.value);
      
      return `# Update ServiceNow CMDB Record
# Generated: ${new Date().toISOString()}

$Instance = "${instance}"
$Credential = Get-Credential -Message "Enter ServiceNow credentials"

try {
    # Find CI
    $SearchUrl = "https://$Instance/api/now/table/cmdb_ci?sysparm_query=name=${ciName}"
    $CI = Invoke-RestMethod -Uri $SearchUrl \`
        -Method Get \`
        -Credential $Credential \`
        -Headers @{"Accept"="application/json"}
    
    if ($CI.result) {
        $CIId = $CI.result[0].sys_id
        $UpdateUrl = "https://$Instance/api/now/table/cmdb_ci/$CIId"
        
        $Body = @{ "${field}" = "${value}" } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $UpdateUrl \`
            -Method Patch \`
            -Credential $Credential \`
            -Headers @{"Accept"="application/json";"Content-Type"="application/json"} \`
            -Body $Body
        
        Write-Host "✓ CI '${ciName}' updated: ${field} = ${value}" -ForegroundColor Green
    } else {
        Write-Host "⚠ CI not found: ${ciName}" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Update failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
