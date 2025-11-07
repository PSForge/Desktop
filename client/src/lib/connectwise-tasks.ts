import { escapePowerShellString } from './powershell-utils';

export interface ConnectWiseTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface ConnectWiseTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: ConnectWiseTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const connectwiseTasks: ConnectWiseTask[] = [
  {
    id: 'cw-bulk-patch-deploy',
    name: 'Bulk Deploy Patches',
    category: 'Bulk Operations',
    description: 'Deploy Windows patches to multiple endpoints',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true, placeholder: 'automate.company.com' },
      { id: 'computerIds', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'approvalList', label: 'Patch Approval List', type: 'text', required: true, placeholder: 'Critical-Patches' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const computerIdsRaw = (params.computerIds as string).split(',').map((n: string) => n.trim());
      const approvalList = escapePowerShellString(params.approvalList);
      
      return `# ConnectWise Automate - Bulk Patch Deployment
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $ComputerIds = @(${computerIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    foreach ($ComputerId in $ComputerIds) {
        Write-Host "Deploying patches to computer: $ComputerId..." -ForegroundColor Yellow
        
        Start-CWAPatchDeploy -ComputerId $ComputerId -ApprovalList "${approvalList}"
        
        Write-Host "✓ Patch deployment initiated for $ComputerId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk patch deployment completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cw-query-agents',
    name: 'Query and Manage Agents',
    category: 'Agent Management',
    description: 'Retrieve agent status and information',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\CW-Agents.csv' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise - Query Agents
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $Agents = Get-CWAComputer | Select-Object \`
        ComputerId,
        Name,
        DomainName,
        LastContact,
        OperatingSystem,
        AgentVersion,
        IsOnline
    
    $Agents | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "✓ Agent inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Agents: $($Agents.Count)" -ForegroundColor Cyan
    Write-Host "  Online: $(($Agents | Where-Object IsOnline).Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'cw-create-ticket',
    name: 'Create Service Ticket',
    category: 'Ticket Management',
    description: 'Create a new service ticket in ConnectWise Manage',
    parameters: [
      { id: 'company', label: 'Company Name', type: 'text', required: true },
      { id: 'summary', label: 'Ticket Summary', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const company = escapePowerShellString(params.company);
      const summary = escapePowerShellString(params.summary);
      const description = escapePowerShellString(params.description);
      
      return `# Create ConnectWise Manage Ticket
# Generated: ${new Date().toISOString()}

$ApiUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
}

$Body = @{
    company = @{ identifier = "${company}" }
    summary = "${summary}"
    initialDescription = "${description}"
    board = @{ name = "Service Board" }
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers -Body $Body
    
    Write-Host "✓ Ticket created: #$($Response.id) - ${summary}" -ForegroundColor Green
    
} catch {
    Write-Error "Ticket creation failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
