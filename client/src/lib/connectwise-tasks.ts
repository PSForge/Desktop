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
        
        Write-Host "[SUCCESS] Patch deployment initiated for $ComputerId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Bulk patch deployment completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Deployment failed: $_"
}`;
    },
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
    
    Write-Host "[SUCCESS] Agent inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Agents: $($Agents.Count)" -ForegroundColor Cyan
    Write-Host "  Online: $(($Agents | Where-Object IsOnline).Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Query failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-ticket',
    name: 'Create Service Ticket',
    category: 'Ticket Management',
    description: 'Create a new service ticket in ConnectWise Manage',
    parameters: [
      { id: 'company', label: 'Company Identifier', type: 'text', required: true, placeholder: 'CompanyABC' },
      { id: 'summary', label: 'Ticket Summary', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: true },
      { id: 'board', label: 'Service Board', type: 'text', required: true, placeholder: 'Service Board' },
      { id: 'priority', label: 'Priority', type: 'select', required: true, options: ['Priority 1 - Critical', 'Priority 2 - High', 'Priority 3 - Medium', 'Priority 4 - Low'], defaultValue: 'Priority 3 - Medium' }
    ],
    scriptTemplate: (params) => {
      const company = escapePowerShellString(params.company);
      const summary = escapePowerShellString(params.summary);
      const description = escapePowerShellString(params.description);
      const board = escapePowerShellString(params.board);
      const priority = escapePowerShellString(params.priority);
      
      return `# Create ConnectWise Manage Ticket
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    company = @{ identifier = "${company}" }
    summary = "${summary}"
    initialDescription = "${description}"
    board = @{ name = "${board}" }
    priority = @{ name = "${priority}" }
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/service/tickets" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Ticket created successfully!" -ForegroundColor Green
    Write-Host "  Ticket ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Summary: ${summary}" -ForegroundColor Cyan
    Write-Host "  Board: ${board}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Ticket creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-update-ticket',
    name: 'Update Service Ticket',
    category: 'Ticket Management',
    description: 'Update an existing service ticket in ConnectWise Manage',
    parameters: [
      { id: 'ticketId', label: 'Ticket ID', type: 'number', required: true },
      { id: 'status', label: 'New Status', type: 'select', required: false, options: ['New', 'In Progress', 'Waiting Customer', 'Scheduled', 'Completed', 'Closed'] },
      { id: 'notes', label: 'Internal Notes', type: 'textarea', required: false },
      { id: 'priority', label: 'Priority', type: 'select', required: false, options: ['Priority 1 - Critical', 'Priority 2 - High', 'Priority 3 - Medium', 'Priority 4 - Low'] }
    ],
    scriptTemplate: (params) => {
      const ticketId = params.ticketId;
      const status = escapePowerShellString(params.status);
      const notes = escapePowerShellString(params.notes);
      const priority = escapePowerShellString(params.priority);
      
      return `# Update ConnectWise Manage Ticket
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$TicketId = ${ticketId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Updates = @()
${status ? `$Updates += @{ op = "replace"; path = "status"; value = @{ name = "${status}" } }` : '# No status update'}
${priority ? `$Updates += @{ op = "replace"; path = "priority"; value = @{ name = "${priority}" } }` : '# No priority update'}

try {
    if ($Updates.Count -gt 0) {
        $Body = $Updates | ConvertTo-Json -Depth 5
        $Response = Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId" -Method Patch -Headers $Headers -Body $Body
        Write-Host "[SUCCESS] Ticket #$TicketId updated!" -ForegroundColor Green
    }
    
    ${notes ? `# Add internal note
    $NoteBody = @{
        text = "${notes}"
        internalAnalysisFlag = $true
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId/notes" -Method Post -Headers $Headers -Body $NoteBody
    Write-Host "[SUCCESS] Note added to ticket #$TicketId" -ForegroundColor Green` : '# No notes to add'}
    
} catch {
    Write-Error "Ticket update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-close-ticket',
    name: 'Close Service Ticket',
    category: 'Ticket Management',
    description: 'Close a service ticket with resolution notes',
    parameters: [
      { id: 'ticketId', label: 'Ticket ID', type: 'number', required: true },
      { id: 'resolution', label: 'Resolution Notes', type: 'textarea', required: true },
      { id: 'closedStatus', label: 'Closed Status', type: 'text', required: true, defaultValue: 'Closed', placeholder: 'Closed' }
    ],
    scriptTemplate: (params) => {
      const ticketId = params.ticketId;
      const resolution = escapePowerShellString(params.resolution);
      const closedStatus = escapePowerShellString(params.closedStatus);
      
      return `# Close ConnectWise Manage Ticket
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$TicketId = ${ticketId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Add resolution note
    $NoteBody = @{
        text = "${resolution}"
        resolutionFlag = $true
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId/notes" -Method Post -Headers $Headers -Body $NoteBody
    
    # Update status to closed
    $StatusUpdate = @(
        @{ op = "replace"; path = "status"; value = @{ name = "${closedStatus}" } }
        @{ op = "replace"; path = "closedFlag"; value = $true }
    ) | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId" -Method Patch -Headers $Headers -Body $StatusUpdate
    
    Write-Host "[SUCCESS] Ticket #$TicketId closed successfully!" -ForegroundColor Green
    Write-Host "  Resolution added" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to close ticket: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-ticket-report',
    name: 'Generate Ticket Report',
    category: 'Ticket Management',
    description: 'Generate a report of tickets with filtering options',
    parameters: [
      { id: 'board', label: 'Service Board', type: 'text', required: false, placeholder: 'Service Board' },
      { id: 'status', label: 'Status Filter', type: 'select', required: false, options: ['All', 'Open', 'Closed', 'In Progress'] },
      { id: 'daysBack', label: 'Days Back', type: 'number', required: true, defaultValue: 30 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\TicketReport.csv' }
    ],
    scriptTemplate: (params) => {
      const board = escapePowerShellString(params.board);
      const status = params.status;
      const daysBack = params.daysBack || 30;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Manage Ticket Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $DateFilter = (Get-Date).AddDays(-${daysBack}).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $Conditions = "dateEntered > [$DateFilter]"
    ${board ? `$Conditions += " and board/name='${board}'"` : ''}
    ${status && status !== 'All' ? `$Conditions += " and status/name contains '${status}'"` : ''}
    
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/service/tickets?conditions=$EncodedConditions&pageSize=1000"
    
    $Tickets = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Tickets | Select-Object \`
        id,
        summary,
        @{N='Company';E={$_.company.name}},
        @{N='Board';E={$_.board.name}},
        @{N='Status';E={$_.status.name}},
        @{N='Priority';E={$_.priority.name}},
        @{N='DateEntered';E={$_.dateEntered}},
        @{N='DateClosed';E={$_.closedDate}},
        @{N='AssignedTo';E={$_.owner.name}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Ticket report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Tickets: $($Report.Count)" -ForegroundColor Cyan
    Write-Host "  Date Range: Last ${daysBack} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-bulk-close-tickets',
    name: 'Bulk Close Tickets',
    category: 'Ticket Management',
    description: 'Close multiple tickets at once with resolution',
    parameters: [
      { id: 'ticketIds', label: 'Ticket IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'resolution', label: 'Resolution Notes', type: 'textarea', required: true },
      { id: 'closedStatus', label: 'Closed Status', type: 'text', required: true, defaultValue: 'Closed' }
    ],
    scriptTemplate: (params) => {
      const ticketIdsRaw = (params.ticketIds as string).split(',').map((n: string) => n.trim());
      const resolution = escapePowerShellString(params.resolution);
      const closedStatus = escapePowerShellString(params.closedStatus);
      
      return `# Bulk Close ConnectWise Manage Tickets
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$TicketIds = @(${ticketIdsRaw.map(id => id).join(', ')})
$ClosedCount = 0
$FailedCount = 0

foreach ($TicketId in $TicketIds) {
    try {
        # Add resolution note
        $NoteBody = @{
            text = "${resolution}"
            resolutionFlag = $true
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId/notes" -Method Post -Headers $Headers -Body $NoteBody
        
        # Update status to closed
        $StatusUpdate = @(
            @{ op = "replace"; path = "status"; value = @{ name = "${closedStatus}" } }
            @{ op = "replace"; path = "closedFlag"; value = $true }
        ) | ConvertTo-Json -Depth 5
        
        Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId" -Method Patch -Headers $Headers -Body $StatusUpdate
        
        Write-Host "[SUCCESS] Ticket #$TicketId closed" -ForegroundColor Green
        $ClosedCount++
        
    } catch {
        Write-Warning "Failed to close ticket #$TicketId: $_"
        $FailedCount++
    }
}

Write-Host ""
Write-Host "=== Bulk Close Summary ===" -ForegroundColor Cyan
Write-Host "Closed: $ClosedCount" -ForegroundColor Green
Write-Host "Failed: $FailedCount" -ForegroundColor $(if ($FailedCount -gt 0) { "Red" } else { "Gray" })`;
    },
    isPremium: true
  },
  {
    id: 'cw-assign-ticket',
    name: 'Assign Ticket to Resource',
    category: 'Ticket Management',
    description: 'Assign a ticket to a specific team member',
    parameters: [
      { id: 'ticketId', label: 'Ticket ID', type: 'number', required: true },
      { id: 'memberId', label: 'Member ID', type: 'number', required: true },
      { id: 'notes', label: 'Assignment Notes', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const ticketId = params.ticketId;
      const memberId = params.memberId;
      const notes = escapePowerShellString(params.notes);
      
      return `# Assign ConnectWise Ticket to Resource
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$TicketId = ${ticketId}
$MemberId = ${memberId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Update = @(
        @{ op = "replace"; path = "owner"; value = @{ id = $MemberId } }
    ) | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId" -Method Patch -Headers $Headers -Body $Update
    
    ${notes ? `# Add assignment note
    $NoteBody = @{
        text = "${notes}"
        internalAnalysisFlag = $true
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId/notes" -Method Post -Headers $Headers -Body $NoteBody` : ''}
    
    Write-Host "[SUCCESS] Ticket #$TicketId assigned to member $MemberId" -ForegroundColor Green
    
} catch {
    Write-Error "Assignment failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-company',
    name: 'Create Company',
    category: 'Company Management',
    description: 'Create a new company in ConnectWise Manage',
    parameters: [
      { id: 'companyName', label: 'Company Name', type: 'text', required: true },
      { id: 'identifier', label: 'Company Identifier', type: 'text', required: true, placeholder: 'CompanyABC' },
      { id: 'addressLine1', label: 'Address', type: 'text', required: true },
      { id: 'city', label: 'City', type: 'text', required: true },
      { id: 'state', label: 'State', type: 'text', required: true },
      { id: 'zip', label: 'Zip Code', type: 'text', required: true },
      { id: 'phone', label: 'Phone Number', type: 'text', required: false },
      { id: 'website', label: 'Website', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const companyName = escapePowerShellString(params.companyName);
      const identifier = escapePowerShellString(params.identifier);
      const addressLine1 = escapePowerShellString(params.addressLine1);
      const city = escapePowerShellString(params.city);
      const state = escapePowerShellString(params.state);
      const zip = escapePowerShellString(params.zip);
      const phone = escapePowerShellString(params.phone);
      const website = escapePowerShellString(params.website);
      
      return `# Create ConnectWise Company
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    name = "${companyName}"
    identifier = "${identifier}"
    status = @{ name = "Active" }
    addressLine1 = "${addressLine1}"
    city = "${city}"
    state = "${state}"
    zip = "${zip}"
    ${phone ? `phoneNumber = "${phone}"` : ''}
    ${website ? `website = "${website}"` : ''}
    types = @(
        @{ name = "Client" }
    )
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/company/companies" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Company created successfully!" -ForegroundColor Green
    Write-Host "  Company ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${companyName}" -ForegroundColor Cyan
    Write-Host "  Identifier: ${identifier}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Company creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-contact',
    name: 'Create Contact',
    category: 'Company Management',
    description: 'Create a new contact for a company',
    parameters: [
      { id: 'companyId', label: 'Company ID', type: 'number', required: true },
      { id: 'firstName', label: 'First Name', type: 'text', required: true },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'phone', label: 'Phone Number', type: 'text', required: false },
      { id: 'title', label: 'Job Title', type: 'text', required: false },
      { id: 'defaultFlag', label: 'Primary Contact', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const companyId = params.companyId;
      const firstName = escapePowerShellString(params.firstName);
      const lastName = escapePowerShellString(params.lastName);
      const email = escapePowerShellString(params.email);
      const phone = escapePowerShellString(params.phone);
      const title = escapePowerShellString(params.title);
      const defaultFlag = params.defaultFlag ? '$true' : '$false';
      
      return `# Create ConnectWise Contact
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    firstName = "${firstName}"
    lastName = "${lastName}"
    company = @{ id = ${companyId} }
    defaultFlag = ${defaultFlag}
    communicationItems = @(
        @{
            type = @{ name = "Email" }
            value = "${email}"
            defaultFlag = $true
        }
        ${phone ? `,@{
            type = @{ name = "Direct" }
            value = "${phone}"
        }` : ''}
    )
    ${title ? `title = "${title}"` : ''}
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/company/contacts" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Contact created successfully!" -ForegroundColor Green
    Write-Host "  Contact ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${firstName} ${lastName}" -ForegroundColor Cyan
    Write-Host "  Email: ${email}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Contact creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-site',
    name: 'Create Company Site',
    category: 'Company Management',
    description: 'Add a new site location for a company',
    parameters: [
      { id: 'companyId', label: 'Company ID', type: 'number', required: true },
      { id: 'siteName', label: 'Site Name', type: 'text', required: true, placeholder: 'Main Office' },
      { id: 'addressLine1', label: 'Address', type: 'text', required: true },
      { id: 'city', label: 'City', type: 'text', required: true },
      { id: 'state', label: 'State', type: 'text', required: true },
      { id: 'zip', label: 'Zip Code', type: 'text', required: true },
      { id: 'defaultFlag', label: 'Default Site', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const companyId = params.companyId;
      const siteName = escapePowerShellString(params.siteName);
      const addressLine1 = escapePowerShellString(params.addressLine1);
      const city = escapePowerShellString(params.city);
      const state = escapePowerShellString(params.state);
      const zip = escapePowerShellString(params.zip);
      const defaultFlag = params.defaultFlag ? '$true' : '$false';
      
      return `# Create ConnectWise Company Site
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    name = "${siteName}"
    company = @{ id = ${companyId} }
    addressLine1 = "${addressLine1}"
    city = "${city}"
    stateReference = @{ identifier = "${state}" }
    zip = "${zip}"
    defaultFlag = ${defaultFlag}
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/company/companies/${companyId}/sites" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Site created successfully!" -ForegroundColor Green
    Write-Host "  Site ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${siteName}" -ForegroundColor Cyan
    Write-Host "  Address: ${addressLine1}, ${city}, ${state} ${zip}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Site creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-company-report',
    name: 'Company Report',
    category: 'Company Management',
    description: 'Generate a report of all companies with details',
    parameters: [
      { id: 'status', label: 'Status Filter', type: 'select', required: false, options: ['All', 'Active', 'Inactive', 'Not Approved'] },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Companies.csv' }
    ],
    scriptTemplate: (params) => {
      const status = params.status;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Company Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    ${status && status !== 'All' ? `$Conditions = "status/name='${status}'"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/company/companies?conditions=$EncodedConditions&pageSize=1000"` : `$Uri = "$BaseUrl/company/companies?pageSize=1000"`}
    
    $Companies = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Companies | Select-Object \`
        id,
        name,
        identifier,
        @{N='Status';E={$_.status.name}},
        phoneNumber,
        website,
        addressLine1,
        city,
        state,
        zip,
        @{N='Type';E={($_.types | ForEach-Object { $_.name }) -join ", "}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Company report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Companies: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-update-company',
    name: 'Update Company Details',
    category: 'Company Management',
    description: 'Update company information in ConnectWise Manage',
    parameters: [
      { id: 'companyId', label: 'Company ID', type: 'number', required: true },
      { id: 'phone', label: 'Phone Number', type: 'text', required: false },
      { id: 'website', label: 'Website', type: 'text', required: false },
      { id: 'status', label: 'Status', type: 'select', required: false, options: ['Active', 'Inactive', 'Not Approved'] }
    ],
    scriptTemplate: (params) => {
      const companyId = params.companyId;
      const phone = escapePowerShellString(params.phone);
      const website = escapePowerShellString(params.website);
      const status = escapePowerShellString(params.status);
      
      return `# Update ConnectWise Company
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$TargetCompanyId = ${companyId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Updates = @()
${phone ? `$Updates += @{ op = "replace"; path = "phoneNumber"; value = "${phone}" }` : ''}
${website ? `$Updates += @{ op = "replace"; path = "website"; value = "${website}" }` : ''}
${status ? `$Updates += @{ op = "replace"; path = "status"; value = @{ name = "${status}" } }` : ''}

try {
    if ($Updates.Count -eq 0) {
        Write-Warning "No updates specified"
        return
    }
    
    $Body = $Updates | ConvertTo-Json -Depth 5
    $Response = Invoke-RestMethod -Uri "$BaseUrl/company/companies/$TargetCompanyId" -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Company #$TargetCompanyId updated!" -ForegroundColor Green
    
} catch {
    Write-Error "Company update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-agreement',
    name: 'Create Agreement',
    category: 'Agreement Management',
    description: 'Create a new service agreement for a company',
    parameters: [
      { id: 'companyId', label: 'Company ID', type: 'number', required: true },
      { id: 'agreementName', label: 'Agreement Name', type: 'text', required: true },
      { id: 'agreementType', label: 'Agreement Type', type: 'text', required: true, placeholder: 'Managed Services' },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: false },
      { id: 'billCycle', label: 'Billing Cycle', type: 'select', required: true, options: ['Monthly', 'Quarterly', 'Annually'], defaultValue: 'Monthly' }
    ],
    scriptTemplate: (params) => {
      const companyId = params.companyId;
      const agreementName = escapePowerShellString(params.agreementName);
      const agreementType = escapePowerShellString(params.agreementType);
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const billCycle = escapePowerShellString(params.billCycle);
      
      return `# Create ConnectWise Agreement
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    name = "${agreementName}"
    company = @{ id = ${companyId} }
    type = @{ name = "${agreementType}" }
    startDate = "${startDate}T00:00:00Z"
    ${endDate ? `endDate = "${endDate}T00:00:00Z"` : ''}
    billCycleId = @{ name = "${billCycle}" }
    billableWorkRoleId = @{ name = "Default" }
    billableWorkTypeId = @{ name = "Default" }
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Agreement created successfully!" -ForegroundColor Green
    Write-Host "  Agreement ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${agreementName}" -ForegroundColor Cyan
    Write-Host "  Type: ${agreementType}" -ForegroundColor Cyan
    Write-Host "  Billing: ${billCycle}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Agreement creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-add-agreement-addition',
    name: 'Add Agreement Addition',
    category: 'Agreement Management',
    description: 'Add a recurring service addition to an agreement',
    parameters: [
      { id: 'agreementId', label: 'Agreement ID', type: 'number', required: true },
      { id: 'productId', label: 'Product ID', type: 'number', required: true },
      { id: 'quantity', label: 'Quantity', type: 'number', required: true, defaultValue: 1 },
      { id: 'description', label: 'Description', type: 'text', required: false },
      { id: 'billCustomer', label: 'Bill Customer', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const agreementId = params.agreementId;
      const productId = params.productId;
      const quantity = params.quantity || 1;
      const description = escapePowerShellString(params.description);
      const billCustomer = params.billCustomer ? '$true' : '$false';
      
      return `# Add ConnectWise Agreement Addition
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$AgreementId = ${agreementId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    product = @{ id = ${productId} }
    quantity = ${quantity}
    billCustomer = ${billCustomer}
    ${description ? `description = "${description}"` : ''}
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements/$AgreementId/additions" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Addition added to agreement #$AgreementId" -ForegroundColor Green
    Write-Host "  Addition ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Quantity: ${quantity}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add agreement addition: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-agreement-billing-report',
    name: 'Agreement Billing Report',
    category: 'Agreement Management',
    description: 'Generate billing report for all agreements',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\AgreementBilling.csv' },
      { id: 'activeOnly', label: 'Active Agreements Only', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      const activeOnly = params.activeOnly;
      
      return `# ConnectWise Agreement Billing Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    ${activeOnly ? `$Conditions = "cancelledFlag=false and endDate=null"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/finance/agreements?conditions=$EncodedConditions&pageSize=1000"` : `$Uri = "$BaseUrl/finance/agreements?pageSize=1000"`}
    
    $Agreements = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Agreements | Select-Object \`
        id,
        name,
        @{N='Company';E={$_.company.name}},
        @{N='Type';E={$_.type.name}},
        startDate,
        endDate,
        @{N='BillCycle';E={$_.billCycleId.name}},
        @{N='BillAmount';E={$_.billAmount}},
        @{N='Cancelled';E={$_.cancelledFlag}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalBilling = ($Report | Measure-Object -Property BillAmount -Sum).Sum
    
    Write-Host "[SUCCESS] Agreement billing report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Agreements: $($Report.Count)" -ForegroundColor Cyan
    Write-Host "  Total Monthly Billing: $([Math]::Round($TotalBilling, 2))" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-renew-agreement',
    name: 'Renew Agreement',
    category: 'Agreement Management',
    description: 'Renew an existing agreement with new dates',
    parameters: [
      { id: 'agreementId', label: 'Agreement ID', type: 'number', required: true },
      { id: 'newEndDate', label: 'New End Date (YYYY-MM-DD)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const agreementId = params.agreementId;
      const newEndDate = escapePowerShellString(params.newEndDate);
      
      return `# Renew ConnectWise Agreement
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$AgreementId = ${agreementId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Update = @(
        @{ op = "replace"; path = "endDate"; value = "${newEndDate}T00:00:00Z" }
    ) | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements/$AgreementId" -Method Patch -Headers $Headers -Body $Update
    
    Write-Host "[SUCCESS] Agreement #$AgreementId renewed!" -ForegroundColor Green
    Write-Host "  New End Date: ${newEndDate}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Agreement renewal failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-add-time-entry',
    name: 'Add Time Entry',
    category: 'Time Entry',
    description: 'Add a time entry to a service ticket',
    parameters: [
      { id: 'ticketId', label: 'Ticket ID', type: 'number', required: true },
      { id: 'memberId', label: 'Member ID', type: 'number', required: true },
      { id: 'hours', label: 'Hours Worked', type: 'number', required: true },
      { id: 'notes', label: 'Time Notes', type: 'textarea', required: true },
      { id: 'workType', label: 'Work Type', type: 'text', required: true, placeholder: 'Regular' },
      { id: 'billable', label: 'Billable', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const ticketId = params.ticketId;
      const memberId = params.memberId;
      const hours = params.hours;
      const notes = escapePowerShellString(params.notes);
      const workType = escapePowerShellString(params.workType);
      const billable = params.billable ? 'Billable' : 'NonBillable';
      
      return `# Add ConnectWise Time Entry
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    chargeToId = ${ticketId}
    chargeToType = "ServiceTicket"
    member = @{ id = ${memberId} }
    timeStart = (Get-Date).ToString("yyyy-MM-ddT08:00:00Z")
    timeEnd = (Get-Date).AddHours(${hours}).ToString("yyyy-MM-ddTHH:mm:ssZ")
    actualHours = ${hours}
    notes = "${notes}"
    workType = @{ name = "${workType}" }
    billableOption = "${billable}"
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/time/entries" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Time entry added successfully!" -ForegroundColor Green
    Write-Host "  Entry ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Ticket: #${ticketId}" -ForegroundColor Cyan
    Write-Host "  Hours: ${hours}" -ForegroundColor Cyan
    Write-Host "  Billable: ${billable}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Time entry failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-approve-time-entries',
    name: 'Approve Time Entries',
    category: 'Time Entry',
    description: 'Approve pending time entries for billing',
    parameters: [
      { id: 'memberId', label: 'Member ID (optional)', type: 'number', required: false },
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const memberId = params.memberId;
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      
      return `# Approve ConnectWise Time Entries
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "timeStart >= [${startDate}T00:00:00Z] and timeEnd <= [${endDate}T23:59:59Z]"
    ${memberId ? `$Conditions += " and member/id=${memberId}"` : ''}
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $ApprovedCount = 0
    foreach ($Entry in $TimeEntries) {
        try {
            $Update = @(
                @{ op = "replace"; path = "status"; value = "Approved" }
            ) | ConvertTo-Json -Depth 5
            
            Invoke-RestMethod -Uri "$BaseUrl/time/entries/$($Entry.id)" -Method Patch -Headers $Headers -Body $Update
            $ApprovedCount++
        } catch {
            Write-Warning "Failed to approve entry $($Entry.id): $_"
        }
    }
    
    Write-Host "[SUCCESS] Time entries approved!" -ForegroundColor Green
    Write-Host "  Approved: $ApprovedCount of $($TimeEntries.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Time approval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-billable-hours-report',
    name: 'Billable Hours Report',
    category: 'Time Entry',
    description: 'Generate report of billable hours by member or company',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'groupBy', label: 'Group By', type: 'select', required: true, options: ['Member', 'Company', 'Project'], defaultValue: 'Member' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\BillableHours.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const groupBy = params.groupBy;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Billable Hours Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "timeStart >= [${startDate}T00:00:00Z] and timeEnd <= [${endDate}T23:59:59Z] and billableOption='Billable'"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $Report = $TimeEntries | Select-Object \`
        @{N='${groupBy}';E={
            switch ("${groupBy}") {
                "Member" { $_.member.name }
                "Company" { $_.company.name }
                "Project" { $_.project.name }
            }
        }},
        @{N='Date';E={$_.timeStart}},
        actualHours,
        @{N='WorkType';E={$_.workType.name}},
        notes,
        @{N='TicketId';E={$_.chargeToId}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalHours = ($Report | Measure-Object -Property actualHours -Sum).Sum
    
    Write-Host "[SUCCESS] Billable hours report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Date Range: ${startDate} to ${endDate}" -ForegroundColor Cyan
    Write-Host "  Total Entries: $($Report.Count)" -ForegroundColor Cyan
    Write-Host "  Total Billable Hours: $([Math]::Round($TotalHours, 2))" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-time-summary-by-member',
    name: 'Time Summary by Member',
    category: 'Time Entry',
    description: 'Get time summary for each team member',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\TimeSummary.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Time Summary by Member
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "timeStart >= [${startDate}T00:00:00Z] and timeEnd <= [${endDate}T23:59:59Z]"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $Summary = $TimeEntries | Group-Object { $_.member.name } | ForEach-Object {
        $Billable = ($_.Group | Where-Object { $_.billableOption -eq 'Billable' } | Measure-Object -Property actualHours -Sum).Sum
        $NonBillable = ($_.Group | Where-Object { $_.billableOption -ne 'Billable' } | Measure-Object -Property actualHours -Sum).Sum
        
        [PSCustomObject]@{
            Member = $_.Name
            TotalHours = [Math]::Round(($_.Group | Measure-Object -Property actualHours -Sum).Sum, 2)
            BillableHours = [Math]::Round($Billable, 2)
            NonBillableHours = [Math]::Round($NonBillable, 2)
            Utilization = if ($Billable + $NonBillable -gt 0) { [Math]::Round(($Billable / ($Billable + $NonBillable)) * 100, 1) } else { 0 }
            EntryCount = $_.Count
        }
    }
    
    $Summary | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Time summary generated: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    $Summary | Format-Table -AutoSize
    
} catch {
    Write-Error "Summary generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-project',
    name: 'Create Project',
    category: 'Project Management',
    description: 'Create a new project in ConnectWise Manage',
    parameters: [
      { id: 'companyId', label: 'Company ID', type: 'number', required: true },
      { id: 'projectName', label: 'Project Name', type: 'text', required: true },
      { id: 'projectType', label: 'Project Type', type: 'text', required: true, placeholder: 'Implementation' },
      { id: 'estimatedHours', label: 'Estimated Hours', type: 'number', required: true },
      { id: 'managerId', label: 'Project Manager ID', type: 'number', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const companyId = params.companyId;
      const projectName = escapePowerShellString(params.projectName);
      const projectType = escapePowerShellString(params.projectType);
      const estimatedHours = params.estimatedHours;
      const managerId = params.managerId;
      const description = escapePowerShellString(params.description);
      
      return `# Create ConnectWise Project
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    name = "${projectName}"
    company = @{ id = ${companyId} }
    type = @{ name = "${projectType}" }
    estimatedHours = ${estimatedHours}
    manager = @{ id = ${managerId} }
    status = @{ name = "Open" }
    ${description ? `description = "${description}"` : ''}
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/project/projects" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Project created successfully!" -ForegroundColor Green
    Write-Host "  Project ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${projectName}" -ForegroundColor Cyan
    Write-Host "  Estimated Hours: ${estimatedHours}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Project creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-project-phase',
    name: 'Create Project Phase',
    category: 'Project Management',
    description: 'Add a phase to an existing project',
    parameters: [
      { id: 'projectId', label: 'Project ID', type: 'number', required: true },
      { id: 'phaseName', label: 'Phase Name', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'scheduledHours', label: 'Scheduled Hours', type: 'number', required: false }
    ],
    scriptTemplate: (params) => {
      const projectId = params.projectId;
      const phaseName = escapePowerShellString(params.phaseName);
      const description = escapePowerShellString(params.description);
      const scheduledHours = params.scheduledHours;
      
      return `# Create ConnectWise Project Phase
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$ProjectId = ${projectId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    description = "${phaseName}"
    ${description ? `notes = "${description}"` : ''}
    ${scheduledHours ? `scheduledHours = ${scheduledHours}` : ''}
} | ConvertTo-Json -Depth 5

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/project/projects/$ProjectId/phases" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Phase created successfully!" -ForegroundColor Green
    Write-Host "  Phase ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Name: ${phaseName}" -ForegroundColor Cyan
    Write-Host "  Project: #$ProjectId" -ForegroundColor Cyan
    
} catch {
    Write-Error "Phase creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-update-project-status',
    name: 'Update Project Status',
    category: 'Project Management',
    description: 'Update the status of a project',
    parameters: [
      { id: 'projectId', label: 'Project ID', type: 'number', required: true },
      { id: 'status', label: 'New Status', type: 'select', required: true, options: ['Open', 'In Progress', 'On Hold', 'Completed', 'Cancelled'] },
      { id: 'percentComplete', label: 'Percent Complete', type: 'number', required: false }
    ],
    scriptTemplate: (params) => {
      const projectId = params.projectId;
      const status = escapePowerShellString(params.status);
      const percentComplete = params.percentComplete;
      
      return `# Update ConnectWise Project Status
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$ProjectId = ${projectId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Updates = @(
    @{ op = "replace"; path = "status"; value = @{ name = "${status}" } }
    ${percentComplete !== undefined ? `@{ op = "replace"; path = "percentComplete"; value = ${percentComplete} }` : ''}
)

try {
    $Body = $Updates | ConvertTo-Json -Depth 5
    $Response = Invoke-RestMethod -Uri "$BaseUrl/project/projects/$ProjectId" -Method Patch -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Project #$ProjectId updated!" -ForegroundColor Green
    Write-Host "  Status: ${status}" -ForegroundColor Cyan
    ${percentComplete !== undefined ? `Write-Host "  Progress: ${percentComplete}%" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Project update failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-project-report',
    name: 'Project Status Report',
    category: 'Project Management',
    description: 'Generate a report of all projects with status and hours',
    parameters: [
      { id: 'status', label: 'Status Filter', type: 'select', required: false, options: ['All', 'Open', 'In Progress', 'Completed'] },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Projects.csv' }
    ],
    scriptTemplate: (params) => {
      const status = params.status;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Project Status Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    ${status && status !== 'All' ? `$Conditions = "status/name='${status}'"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/project/projects?conditions=$EncodedConditions&pageSize=1000"` : `$Uri = "$BaseUrl/project/projects?pageSize=1000"`}
    
    $Projects = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Projects | Select-Object \`
        id,
        name,
        @{N='Company';E={$_.company.name}},
        @{N='Status';E={$_.status.name}},
        @{N='Manager';E={$_.manager.name}},
        estimatedHours,
        actualHours,
        @{N='PercentComplete';E={$_.percentComplete}},
        @{N='HoursVariance';E={$_.estimatedHours - $_.actualHours}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Project report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Projects: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-schedule-script',
    name: 'Schedule Automate Script',
    category: 'Automation',
    description: 'Schedule a script to run on specific computers',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'scriptId', label: 'Script ID', type: 'number', required: true },
      { id: 'computerIds', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'scheduleTime', label: 'Schedule Time (HH:mm)', type: 'text', required: true, placeholder: '02:00' },
      { id: 'recurring', label: 'Recurring', type: 'select', required: true, options: ['Once', 'Daily', 'Weekly', 'Monthly'], defaultValue: 'Once' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const scriptId = params.scriptId;
      const computerIdsRaw = (params.computerIds as string).split(',').map((n: string) => n.trim());
      const scheduleTime = escapePowerShellString(params.scheduleTime);
      const recurring = params.recurring;
      
      return `# Schedule ConnectWise Automate Script
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $ComputerIds = @(${computerIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $ScriptId = ${scriptId}
    $ScheduleTime = [DateTime]::Today.AddHours(${scheduleTime.split(':')[0]}).AddMinutes(${scheduleTime.split(':')[1]})
    
    foreach ($ComputerId in $ComputerIds) {
        $ScheduleParams = @{
            ScriptId = $ScriptId
            ComputerId = $ComputerId
            StartTime = $ScheduleTime
            RecurringType = "${recurring}"
        }
        
        New-CWAScheduledScript @ScheduleParams
        
        Write-Host "[SUCCESS] Script scheduled for computer $ComputerId" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Script scheduling completed!" -ForegroundColor Green
    Write-Host "  Script ID: $ScriptId" -ForegroundColor Cyan
    Write-Host "  Computers: $($ComputerIds.Count)" -ForegroundColor Cyan
    Write-Host "  Schedule: $ScheduleTime (${recurring})" -ForegroundColor Cyan
    
} catch {
    Write-Error "Script scheduling failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-alert-rule',
    name: 'Create Alert Rule',
    category: 'Automation',
    description: 'Create a monitoring alert rule in Automate',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'alertName', label: 'Alert Name', type: 'text', required: true },
      { id: 'alertType', label: 'Alert Type', type: 'select', required: true, options: ['Disk Space', 'CPU Usage', 'Memory Usage', 'Service Status', 'Event Log'] },
      { id: 'threshold', label: 'Threshold', type: 'text', required: true, placeholder: '90%' },
      { id: 'createTicket', label: 'Create Ticket', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const alertName = escapePowerShellString(params.alertName);
      const alertType = params.alertType;
      const threshold = escapePowerShellString(params.threshold);
      const createTicket = params.createTicket ? '$true' : '$false';
      
      return `# Create ConnectWise Automate Alert Rule
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $AlertConfig = @{
        Name = "${alertName}"
        AlertType = "${alertType}"
        Threshold = "${threshold}"
        CreateTicket = ${createTicket}
        Enabled = $true
    }
    
    switch ("${alertType}") {
        "Disk Space" {
            $AlertConfig.MonitorType = "DiskSpace"
            $AlertConfig.CompareOperator = "LessThan"
        }
        "CPU Usage" {
            $AlertConfig.MonitorType = "CPUUsage"
            $AlertConfig.CompareOperator = "GreaterThan"
        }
        "Memory Usage" {
            $AlertConfig.MonitorType = "MemoryUsage"
            $AlertConfig.CompareOperator = "GreaterThan"
        }
        "Service Status" {
            $AlertConfig.MonitorType = "ServiceStatus"
            $AlertConfig.CompareOperator = "NotEquals"
        }
        "Event Log" {
            $AlertConfig.MonitorType = "EventLog"
            $AlertConfig.CompareOperator = "Contains"
        }
    }
    
    New-CWAAlertRule @AlertConfig
    
    Write-Host "[SUCCESS] Alert rule created: ${alertName}" -ForegroundColor Green
    Write-Host "  Type: ${alertType}" -ForegroundColor Cyan
    Write-Host "  Threshold: ${threshold}" -ForegroundColor Cyan
    Write-Host "  Create Ticket: ${createTicket}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Alert rule creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-monitor',
    name: 'Create Remote Monitor',
    category: 'Automation',
    description: 'Create a remote monitor for endpoints',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'monitorName', label: 'Monitor Name', type: 'text', required: true },
      { id: 'monitorType', label: 'Monitor Type', type: 'select', required: true, options: ['SNMP', 'WMI', 'Process', 'Service', 'TCP Port', 'HTTP'] },
      { id: 'target', label: 'Target (IP/Host)', type: 'text', required: true },
      { id: 'interval', label: 'Check Interval (minutes)', type: 'number', required: true, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const monitorName = escapePowerShellString(params.monitorName);
      const monitorType = params.monitorType;
      const target = escapePowerShellString(params.target);
      const interval = params.interval || 5;
      
      return `# Create ConnectWise Automate Remote Monitor
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $MonitorConfig = @{
        Name = "${monitorName}"
        MonitorType = "${monitorType}"
        Target = "${target}"
        CheckInterval = ${interval}
        Enabled = $true
        AlertOnFailure = $true
    }
    
    switch ("${monitorType}") {
        "SNMP" {
            $MonitorConfig.SNMPCommunity = "public"
            $MonitorConfig.SNMPVersion = "v2c"
        }
        "WMI" {
            $MonitorConfig.WMINamespace = "root\\cimv2"
        }
        "TCP Port" {
            $MonitorConfig.Port = 80
            $MonitorConfig.Timeout = 30
        }
        "HTTP" {
            $MonitorConfig.ExpectedResponse = 200
            $MonitorConfig.Timeout = 30
        }
    }
    
    New-CWARemoteMonitor @MonitorConfig
    
    Write-Host "[SUCCESS] Remote monitor created: ${monitorName}" -ForegroundColor Green
    Write-Host "  Type: ${monitorType}" -ForegroundColor Cyan
    Write-Host "  Target: ${target}" -ForegroundColor Cyan
    Write-Host "  Interval: ${interval} minutes" -ForegroundColor Cyan
    
} catch {
    Write-Error "Monitor creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-run-script-now',
    name: 'Run Script Immediately',
    category: 'Automation',
    description: 'Execute a script immediately on selected computers',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'scriptId', label: 'Script ID', type: 'number', required: true },
      { id: 'computerIds', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'parameters', label: 'Script Parameters', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const scriptId = params.scriptId;
      const computerIdsRaw = (params.computerIds as string).split(',').map((n: string) => n.trim());
      const parameters = escapePowerShellString(params.parameters);
      
      return `# Run ConnectWise Automate Script Immediately
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $ComputerIds = @(${computerIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    $ScriptId = ${scriptId}
    
    $Results = @()
    foreach ($ComputerId in $ComputerIds) {
        try {
            $RunParams = @{
                ScriptId = $ScriptId
                ComputerId = $ComputerId
                ${parameters ? `Parameters = "${parameters}"` : ''}
            }
            
            $Result = Invoke-CWAScript @RunParams
            
            $Results += [PSCustomObject]@{
                ComputerId = $ComputerId
                Status = "Success"
                JobId = $Result.JobId
            }
            
            Write-Host "[SUCCESS] Script started on computer $ComputerId" -ForegroundColor Green
            
        } catch {
            $Results += [PSCustomObject]@{
                ComputerId = $ComputerId
                Status = "Failed"
                Error = $_.Exception.Message
            }
            Write-Warning "Failed on computer $ComputerId: $_"
        }
    }
    
    Write-Host ""
    Write-Host "=== Script Execution Summary ===" -ForegroundColor Cyan
    $Results | Format-Table -AutoSize
    
} catch {
    Write-Error "Script execution failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-revenue-report',
    name: 'Revenue Report',
    category: 'Reporting',
    description: 'Generate revenue report by company or date range',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'groupBy', label: 'Group By', type: 'select', required: true, options: ['Company', 'Board', 'Member'], defaultValue: 'Company' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Revenue.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const groupBy = params.groupBy;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Revenue Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Get time entries for revenue calculation
    $Conditions = "timeStart >= [${startDate}T00:00:00Z] and timeEnd <= [${endDate}T23:59:59Z] and billableOption='Billable'"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $Revenue = $TimeEntries | Group-Object { 
        switch ("${groupBy}") {
            "Company" { $_.company.name }
            "Board" { $_.board.name }
            "Member" { $_.member.name }
        }
    } | ForEach-Object {
        $TotalHours = ($_.Group | Measure-Object -Property actualHours -Sum).Sum
        $EstimatedRevenue = $TotalHours * 150  # Default hourly rate - adjust as needed
        
        [PSCustomObject]@{
            "${groupBy}" = $_.Name
            BillableHours = [Math]::Round($TotalHours, 2)
            EstimatedRevenue = [Math]::Round($EstimatedRevenue, 2)
            EntryCount = $_.Count
        }
    }
    
    $Revenue | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalRevenue = ($Revenue | Measure-Object -Property EstimatedRevenue -Sum).Sum
    
    Write-Host "[SUCCESS] Revenue report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Date Range: ${startDate} to ${endDate}" -ForegroundColor Cyan
    Write-Host "  Total Estimated Revenue: $([Math]::Round($TotalRevenue, 2))" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-sla-report',
    name: 'SLA Compliance Report',
    category: 'Reporting',
    description: 'Generate SLA compliance report for tickets',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'board', label: 'Service Board', type: 'text', required: false },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\SLA.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const board = escapePowerShellString(params.board);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise SLA Compliance Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "dateEntered >= [${startDate}T00:00:00Z] and dateEntered <= [${endDate}T23:59:59Z]"
    ${board ? `$Conditions += " and board/name='${board}'"` : ''}
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $Tickets = Invoke-RestMethod -Uri "$BaseUrl/service/tickets?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $SLAReport = $Tickets | Select-Object \`
        id,
        summary,
        @{N='Company';E={$_.company.name}},
        @{N='Priority';E={$_.priority.name}},
        @{N='Status';E={$_.status.name}},
        dateEntered,
        @{N='ResponseTime';E={
            if ($_.respondedDate) {
                ([DateTime]$_.respondedDate - [DateTime]$_.dateEntered).TotalMinutes
            } else { $null }
        }},
        @{N='ResolutionTime';E={
            if ($_.closedDate) {
                ([DateTime]$_.closedDate - [DateTime]$_.dateEntered).TotalHours
            } else { $null }
        }},
        @{N='SLAMet';E={
            # Customize SLA targets based on priority
            $Target = switch ($_.priority.name) {
                "Priority 1 - Critical" { 4 }  # 4 hours
                "Priority 2 - High" { 8 }      # 8 hours
                "Priority 3 - Medium" { 24 }   # 24 hours
                default { 48 }                  # 48 hours
            }
            if ($_.closedDate) {
                $ResTime = ([DateTime]$_.closedDate - [DateTime]$_.dateEntered).TotalHours
                if ($ResTime -le $Target) { "Yes" } else { "No" }
            } else { "Open" }
        }}
    
    $SLAReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalClosed = ($SLAReport | Where-Object SLAMet -ne "Open").Count
    $SLAMet = ($SLAReport | Where-Object SLAMet -eq "Yes").Count
    $Compliance = if ($TotalClosed -gt 0) { [Math]::Round(($SLAMet / $TotalClosed) * 100, 1) } else { 0 }
    
    Write-Host "[SUCCESS] SLA report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Date Range: ${startDate} to ${endDate}" -ForegroundColor Cyan
    Write-Host "  Total Tickets: $($SLAReport.Count)" -ForegroundColor Cyan
    Write-Host "  SLA Compliance: $Compliance%" -ForegroundColor $(if ($Compliance -ge 90) { "Green" } elseif ($Compliance -ge 75) { "Yellow" } else { "Red" })
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-utilization-report',
    name: 'Resource Utilization Report',
    category: 'Reporting',
    description: 'Generate utilization report for team members',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'targetUtilization', label: 'Target Utilization %', type: 'number', required: true, defaultValue: 80 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Utilization.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const targetUtilization = params.targetUtilization || 80;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Resource Utilization Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "timeStart >= [${startDate}T00:00:00Z] and timeEnd <= [${endDate}T23:59:59Z]"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    # Calculate working days in range
    $Start = [DateTime]"${startDate}"
    $End = [DateTime]"${endDate}"
    $WorkingDays = 0
    for ($d = $Start; $d -le $End; $d = $d.AddDays(1)) {
        if ($d.DayOfWeek -notin @([DayOfWeek]::Saturday, [DayOfWeek]::Sunday)) {
            $WorkingDays++
        }
    }
    $AvailableHours = $WorkingDays * 8  # 8-hour workday
    
    $Utilization = $TimeEntries | Group-Object { $_.member.name } | ForEach-Object {
        $TotalHours = ($_.Group | Measure-Object -Property actualHours -Sum).Sum
        $BillableHours = ($_.Group | Where-Object { $_.billableOption -eq 'Billable' } | Measure-Object -Property actualHours -Sum).Sum
        $UtilRate = if ($AvailableHours -gt 0) { [Math]::Round(($BillableHours / $AvailableHours) * 100, 1) } else { 0 }
        
        [PSCustomObject]@{
            Member = $_.Name
            TotalHours = [Math]::Round($TotalHours, 2)
            BillableHours = [Math]::Round($BillableHours, 2)
            AvailableHours = $AvailableHours
            UtilizationPct = $UtilRate
            MeetsTarget = if ($UtilRate -ge ${targetUtilization}) { "Yes" } else { "No" }
            Variance = [Math]::Round($UtilRate - ${targetUtilization}, 1)
        }
    }
    
    $Utilization | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $AvgUtilization = ($Utilization | Measure-Object -Property UtilizationPct -Average).Average
    $MetTarget = ($Utilization | Where-Object MeetsTarget -eq "Yes").Count
    
    Write-Host "[SUCCESS] Utilization report generated: ${exportPath}" -ForegroundColor Green
    Write-Host "  Date Range: ${startDate} to ${endDate}" -ForegroundColor Cyan
    Write-Host "  Working Days: $WorkingDays" -ForegroundColor Cyan
    Write-Host "  Avg Utilization: $([Math]::Round($AvgUtilization, 1))%" -ForegroundColor Cyan
    Write-Host "  Meeting Target (${targetUtilization}%): $MetTarget of $($Utilization.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-aging-tickets-report',
    name: 'Aging Tickets Report',
    category: 'Reporting',
    description: 'Generate report of tickets by age',
    parameters: [
      { id: 'board', label: 'Service Board', type: 'text', required: false },
      { id: 'ageThresholds', label: 'Age Thresholds (days, comma-separated)', type: 'text', required: true, defaultValue: '7,14,30,60' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\AgingTickets.csv' }
    ],
    scriptTemplate: (params) => {
      const board = escapePowerShellString(params.board);
      const ageThresholds = params.ageThresholds || '7,14,30,60';
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Aging Tickets Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "closedFlag=false"
    ${board ? `$Conditions += " and board/name='${board}'"` : ''}
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $Tickets = Invoke-RestMethod -Uri "$BaseUrl/service/tickets?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $AgingReport = $Tickets | Select-Object \`
        id,
        summary,
        @{N='Company';E={$_.company.name}},
        @{N='Priority';E={$_.priority.name}},
        @{N='Status';E={$_.status.name}},
        @{N='AssignedTo';E={$_.owner.name}},
        dateEntered,
        @{N='AgeDays';E={
            [Math]::Round(((Get-Date) - [DateTime]$_.dateEntered).TotalDays, 0)
        }},
        @{N='AgeBucket';E={
            $Age = ((Get-Date) - [DateTime]$_.dateEntered).TotalDays
            $Thresholds = @(${ageThresholds.split(',').map((t: string) => t.trim()).join(', ')})
            if ($Age -le $Thresholds[0]) { "0-$($Thresholds[0]) days" }
            elseif ($Age -le $Thresholds[1]) { "$($Thresholds[0]+1)-$($Thresholds[1]) days" }
            elseif ($Age -le $Thresholds[2]) { "$($Thresholds[1]+1)-$($Thresholds[2]) days" }
            elseif ($Age -le $Thresholds[3]) { "$($Thresholds[2]+1)-$($Thresholds[3]) days" }
            else { "Over $($Thresholds[3]) days" }
        }}
    
    $AgingReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Aging tickets report generated: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Aging Summary ===" -ForegroundColor Cyan
    $AgingReport | Group-Object AgeBucket | Sort-Object { 
        [int]($_.Name -replace '[^0-9].*', '')
    } | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) tickets" -ForegroundColor $(
            if ($_.Name -match "Over|60") { "Red" }
            elseif ($_.Name -match "30") { "Yellow" }
            else { "White" }
        )
    }
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-technician-performance',
    name: 'Technician Performance Report',
    category: 'Reporting',
    description: 'Generate performance metrics for technicians',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\TechPerformance.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Technician Performance Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Get closed tickets in date range
    $TicketConditions = "closedDate >= [${startDate}T00:00:00Z] and closedDate <= [${endDate}T23:59:59Z]"
    $EncodedTicketConditions = [System.Web.HttpUtility]::UrlEncode($TicketConditions)
    $Tickets = Invoke-RestMethod -Uri "$BaseUrl/service/tickets?conditions=$EncodedTicketConditions&pageSize=1000" -Method Get -Headers $Headers
    
    # Get time entries
    $TimeConditions = "timeStart >= [${startDate}T00:00:00Z] and timeEnd <= [${endDate}T23:59:59Z]"
    $EncodedTimeConditions = [System.Web.HttpUtility]::UrlEncode($TimeConditions)
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedTimeConditions&pageSize=1000" -Method Get -Headers $Headers
    
    # Build performance metrics
    $Members = $TimeEntries | Select-Object -ExpandProperty member -Unique
    
    $Performance = foreach ($Member in $Members) {
        $MemberTickets = $Tickets | Where-Object { $_.owner.id -eq $Member.id }
        $MemberTime = $TimeEntries | Where-Object { $_.member.id -eq $Member.id }
        
        $TicketsClosed = $MemberTickets.Count
        $TotalHours = ($MemberTime | Measure-Object -Property actualHours -Sum).Sum
        $BillableHours = ($MemberTime | Where-Object { $_.billableOption -eq 'Billable' } | Measure-Object -Property actualHours -Sum).Sum
        $AvgResTime = if ($MemberTickets.Count -gt 0) {
            ($MemberTickets | ForEach-Object { 
                if ($_.closedDate -and $_.dateEntered) {
                    ([DateTime]$_.closedDate - [DateTime]$_.dateEntered).TotalHours
                }
            } | Measure-Object -Average).Average
        } else { 0 }
        
        [PSCustomObject]@{
            Member = $Member.name
            TicketsClosed = $TicketsClosed
            TotalHours = [Math]::Round($TotalHours, 2)
            BillableHours = [Math]::Round($BillableHours, 2)
            UtilizationPct = if ($TotalHours -gt 0) { [Math]::Round(($BillableHours / $TotalHours) * 100, 1) } else { 0 }
            AvgResolutionHours = [Math]::Round($AvgResTime, 2)
            HoursPerTicket = if ($TicketsClosed -gt 0) { [Math]::Round($TotalHours / $TicketsClosed, 2) } else { 0 }
        }
    }
    
    $Performance | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Technician performance report generated: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    $Performance | Sort-Object TicketsClosed -Descending | Format-Table -AutoSize
    
} catch {
    Write-Error "Report generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-maintenance-window',
    name: 'Create Scheduled Maintenance Windows',
    category: 'Automation',
    description: 'Schedule maintenance windows for computers',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'windowName', label: 'Maintenance Window Name', type: 'text', required: true, placeholder: 'Monthly-Patching' },
      { id: 'startTime', label: 'Start Time (HH:mm)', type: 'text', required: true, placeholder: '02:00' },
      { id: 'duration', label: 'Duration (hours)', type: 'number', required: true, defaultValue: 4 },
      { id: 'computers', label: 'Computer IDs (comma-separated)', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const windowName = escapePowerShellString(params.windowName);
      const startTime = escapePowerShellString(params.startTime);
      const duration = params.duration || 4;
      const computersRaw = (params.computers as string).split(',').map((n: string) => n.trim());
      
      return `# Create ConnectWise Maintenance Window
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    $ComputerIds = @(${computersRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    # Create maintenance window
    $StartDateTime = [DateTime]::Today.AddHours(${startTime.split(':')[0]}).AddMinutes(${startTime.split(':')[1]})
    $EndDateTime = $StartDateTime.AddHours(${duration})
    
    $MaintenanceWindow = New-CWAMaintenanceWindow \`
        -Name "${windowName}" \`
        -StartTime $StartDateTime \`
        -EndTime $EndDateTime \`
        -ComputerIds $ComputerIds \`
        -SuppressAlerts $true
    
    Write-Host "[SUCCESS] Maintenance window '${windowName}' created!" -ForegroundColor Green
    Write-Host "  Start: $StartDateTime" -ForegroundColor Cyan
    Write-Host "  End: $EndDateTime" -ForegroundColor Cyan
    Write-Host "  Computers: $($ComputerIds.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Maintenance window creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-manage-patch-approvals',
    name: 'Manage Patch Approval Lists',
    category: 'Automation',
    description: 'Create and manage patch approval policies',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'approvalListName', label: 'Approval List Name', type: 'text', required: true, placeholder: 'Production-Approved' },
      { id: 'autoApprove', label: 'Auto-Approve', type: 'select', required: true, options: ['Critical Only', 'Critical and Important', 'All', 'Manual'], defaultValue: 'Critical Only' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const approvalListName = escapePowerShellString(params.approvalListName);
      const autoApprove = params.autoApprove;
      
      return `# Manage ConnectWise Patch Approval Lists
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    # Create or update approval list
    $ApprovalSettings = @{
        Name = "${approvalListName}"
        AutoApprove = "${autoApprove}"
        ApprovalType = switch ("${autoApprove}") {
            "Critical Only" { "CriticalOnly" }
            "Critical and Important" { "CriticalAndImportant" }
            "All" { "All" }
            "Manual" { "Manual" }
        }
    }
    
    New-CWAPatchApprovalList @ApprovalSettings
    
    Write-Host "[SUCCESS] Patch approval list '${approvalListName}' configured!" -ForegroundColor Green
    Write-Host "  Auto-Approve: ${autoApprove}" -ForegroundColor Cyan
    
    # List current approval policies
    Write-Host ""
    Write-Host "Current Approval Lists:" -ForegroundColor Yellow
    Get-CWAPatchApprovalList | Format-Table Name, AutoApprove, PatchCount -AutoSize
    
} catch {
    Write-Error "Approval list management failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-collect-inventory',
    name: 'Collect System Inventory Reports',
    category: 'Agent Management',
    description: 'Generate comprehensive system inventory reports',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\CW-Inventory.csv' },
      { id: 'inventoryType', label: 'Inventory Type', type: 'select', required: true, options: ['Hardware', 'Software', 'Network', 'All'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = escapePowerShellString(params.exportPath);
      const inventoryType = params.inventoryType;
      
      return `# ConnectWise System Inventory Report
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    Write-Host "Collecting ${inventoryType} inventory..." -ForegroundColor Cyan
    
    $Computers = Get-CWAComputer
    
    $Inventory = $Computers | Select-Object \`
        ComputerId,
        Name,
        DomainName,
${inventoryType === 'All' || inventoryType === 'Hardware' ? `        @{N='CPU';E={$_.Hardware.Processor}},
        @{N='RAM_GB';E={[Math]::Round($_.Hardware.Memory / 1GB, 2)}},
        @{N='Disk_GB';E={[Math]::Round($_.Hardware.TotalDisk / 1GB, 2)}},` : ''}
${inventoryType === 'All' || inventoryType === 'Software' ? `        @{N='OS';E={$_.OperatingSystem}},
        @{N='OSVersion';E={$_.OSVersion}},` : ''}
${inventoryType === 'All' || inventoryType === 'Network' ? `        @{N='IPAddress';E={$_.Network.IPAddress}},
        @{N='MACAddress';E={$_.Network.MACAddress}},
        @{N='Gateway';E={$_.Network.Gateway}},` : ''}
        LastContact,
        AgentVersion
    
    $Inventory | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Inventory exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Computers: $($Inventory.Count)" -ForegroundColor Cyan
    Write-Host "  Type: ${inventoryType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Inventory collection failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-automate-ticket-alerts',
    name: 'Automate Ticket Creation from Alerts',
    category: 'Automation',
    description: 'Automatically create tickets based on monitoring alerts',
    parameters: [
      { id: 'company', label: 'Company Name', type: 'text', required: true },
      { id: 'alertType', label: 'Alert Type', type: 'text', required: true, placeholder: 'Disk Space Low' },
      { id: 'threshold', label: 'Threshold Value', type: 'text', required: true, placeholder: '10%' },
      { id: 'priority', label: 'Ticket Priority', type: 'select', required: true, options: ['Priority 1 - Critical', 'Priority 2 - High', 'Priority 3 - Medium', 'Priority 4 - Low'], defaultValue: 'Priority 3 - Medium' }
    ],
    scriptTemplate: (params) => {
      const company = escapePowerShellString(params.company);
      const alertType = escapePowerShellString(params.alertType);
      const threshold = escapePowerShellString(params.threshold);
      const priority = params.priority;
      
      return `# Automate ConnectWise Ticket Creation from Alerts
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Example: Check system condition
    # Replace this with your actual monitoring logic
    $AlertTriggered = $true  # Your alert condition here
    
    if ($AlertTriggered) {
        $Body = @{
            company = @{ identifier = "${company}" }
            summary = "Automated Alert: ${alertType}"
            initialDescription = "Alert Type: ${alertType}\nThreshold: ${threshold}\nTriggered: $(Get-Date)\n\nThis ticket was automatically created by monitoring system."
            priority = @{ name = "${priority}" }
            board = @{ name = "Service Board" }
        } | ConvertTo-Json -Depth 5
        
        $Response = Invoke-RestMethod -Uri "$BaseUrl/service/tickets" -Method Post -Headers $Headers -Body $Body
        
        Write-Host "[SUCCESS] Automated ticket created: #$($Response.id)" -ForegroundColor Green
        Write-Host "  Alert: ${alertType}" -ForegroundColor Cyan
        Write-Host "  Priority: ${priority}" -ForegroundColor Cyan
    } else {
        Write-Host "No alerts triggered" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Automated ticket creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-integrate-email-alerts',
    name: 'Integrate Alerts with Email',
    category: 'Automation',
    description: 'Configure email notifications for ConnectWise alerts',
    parameters: [
      { id: 'smtpServer', label: 'SMTP Server', type: 'text', required: true, placeholder: 'smtp.office365.com' },
      { id: 'fromEmail', label: 'From Email', type: 'email', required: true, placeholder: 'alerts@company.com' },
      { id: 'toEmail', label: 'To Email', type: 'email', required: true, placeholder: 'it-team@company.com' },
      { id: 'alertSubject', label: 'Alert Subject', type: 'text', required: true, placeholder: 'ConnectWise Alert' }
    ],
    scriptTemplate: (params) => {
      const smtpServer = escapePowerShellString(params.smtpServer);
      const fromEmail = escapePowerShellString(params.fromEmail);
      const toEmail = escapePowerShellString(params.toEmail);
      const alertSubject = escapePowerShellString(params.alertSubject);
      
      return `# ConnectWise Email Alert Integration
# Generated: ${new Date().toISOString()}

try {
    # Configure SMTP settings
    $SMTPSettings = @{
        SmtpServer = "${smtpServer}"
        Port = 587
        UseSsl = $true
        From = "${fromEmail}"
        To = "${toEmail}"
    }
    
    # Prompt for email credentials
    $Credential = Get-Credential -Message "Enter SMTP credentials for ${fromEmail}"
    
    # Example alert email
    $AlertMessage = @"
ConnectWise Alert Notification
Generated: $(Get-Date)

Alert Type: System Monitoring
Status: Active

This is a test alert from ConnectWise integration.
Configure your monitoring rules to send actual alerts.
"@
    
    Send-MailMessage @SMTPSettings \`
        -Subject "${alertSubject} - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" \`
        -Body $AlertMessage \`
        -Credential $Credential
    
    Write-Host "[SUCCESS] Email alert integration configured!" -ForegroundColor Green
    Write-Host "  SMTP: ${smtpServer}" -ForegroundColor Cyan
    Write-Host "  From: ${fromEmail}" -ForegroundColor Cyan
    Write-Host "  To: ${toEmail}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Test email sent successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Email integration failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-integrate-teams-alerts',
    name: 'Integrate Alerts with Teams',
    category: 'Automation',
    description: 'Send ConnectWise alerts to Microsoft Teams channel',
    parameters: [
      { id: 'webhookUrl', label: 'Teams Webhook URL', type: 'text', required: true, placeholder: 'https://outlook.office.com/webhook/...' },
      { id: 'alertTitle', label: 'Alert Title', type: 'text', required: true, placeholder: 'ConnectWise Alert' }
    ],
    scriptTemplate: (params) => {
      const webhookUrl = escapePowerShellString(params.webhookUrl);
      const alertTitle = escapePowerShellString(params.alertTitle);
      
      return `# ConnectWise Teams Alert Integration
# Generated: ${new Date().toISOString()}

try {
    # Create Teams message card
    $TeamsMessage = @{
        "@type" = "MessageCard"
        "@context" = "https://schema.org/extensions"
        summary = "${alertTitle}"
        themeColor = "0078D7"
        title = "${alertTitle}"
        sections = @(
            @{
                activityTitle = "ConnectWise Monitoring Alert"
                activitySubtitle = "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                facts = @(
                    @{
                        name = "Status"
                        value = "Active"
                    },
                    @{
                        name = "Source"
                        value = "ConnectWise Automate"
                    },
                    @{
                        name = "Computer"
                        value = $env:COMPUTERNAME
                    }
                )
                text = "This is a test alert from ConnectWise integration. Configure your monitoring rules to send actual alerts to Teams."
            }
        )
    } | ConvertTo-Json -Depth 10
    
    # Send to Teams
    Invoke-RestMethod -Uri "${webhookUrl}" \`
        -Method Post \`
        -ContentType "application/json" \`
        -Body $TeamsMessage
    
    Write-Host "[SUCCESS] Teams alert integration configured!" -ForegroundColor Green
    Write-Host "  Webhook configured" -ForegroundColor Cyan
    Write-Host "  Test message sent to Teams channel" -ForegroundColor Green
    
} catch {
    Write-Error "Teams integration failed: $_"
    Write-Host "Please verify your webhook URL is correct" -ForegroundColor Yellow
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-monitor-agent-health',
    name: 'Monitor Agent Health Status',
    category: 'Agent Management',
    description: 'Monitor and report on ConnectWise agent health',
    parameters: [
      { id: 'server', label: 'Automate Server', type: 'text', required: true },
      { id: 'exportPath', label: 'Export Report Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Agent-Health.csv' },
      { id: 'offlineThreshold', label: 'Offline Threshold (hours)', type: 'number', required: true, defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const server = escapePowerShellString(params.server);
      const exportPath = escapePowerShellString(params.exportPath);
      const offlineThreshold = params.offlineThreshold || 24;
      
      return `# ConnectWise Agent Health Monitor
# Generated: ${new Date().toISOString()}

Import-Module ConnectWiseAutomateAPI

try {
    Connect-CWAServer -Server "${server}"
    
    Write-Host "Checking agent health status..." -ForegroundColor Cyan
    
    $Agents = Get-CWAComputer
    $OfflineThreshold = (Get-Date).AddHours(-${offlineThreshold})
    
    $HealthReport = $Agents | Select-Object \`
        ComputerId,
        Name,
        @{N='Status';E={
            if ($_.IsOnline) { "Online" }
            elseif ($_.LastContact -gt $OfflineThreshold) { "Recently Online" }
            else { "Offline" }
        }},
        @{N='LastContact';E={$_.LastContact}},
        @{N='HoursSinceContact';E={
            [Math]::Round(((Get-Date) - $_.LastContact).TotalHours, 2)
        }},
        AgentVersion,
        @{N='HealthStatus';E={
            if ($_.IsOnline -and $_.AgentVersion -eq $LatestVersion) { "Healthy" }
            elseif ($_.IsOnline) { "Needs Update" }
            else { "Critical" }
        }}
    
    $HealthReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    # Summary statistics
    $TotalAgents = $HealthReport.Count
    $OnlineAgents = ($HealthReport | Where-Object Status -eq "Online").Count
    $OfflineAgents = ($HealthReport | Where-Object Status -eq "Offline").Count
    $CriticalAgents = ($HealthReport | Where-Object HealthStatus -eq "Critical").Count
    
    Write-Host "[SUCCESS] Agent health report generated: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Agent Health Summary ===" -ForegroundColor Cyan
    Write-Host "Total Agents: $TotalAgents" -ForegroundColor White
    Write-Host "Online: $OnlineAgents" -ForegroundColor Green
    Write-Host "Offline (>${offlineThreshold}h): $OfflineAgents" -ForegroundColor Yellow
    Write-Host "Critical: $CriticalAgents" -ForegroundColor Red
    
    if ($CriticalAgents -gt 0) {
        Write-Host ""
        Write-Host "Critical Agents Requiring Attention:" -ForegroundColor Red
        $HealthReport | Where-Object HealthStatus -eq "Critical" | Format-Table Name, HoursSinceContact -AutoSize
    }
    
} catch {
    Write-Error "Agent health monitoring failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-get-products',
    name: 'Get Products Catalog',
    category: 'Agreement Management',
    description: 'Retrieve products from the ConnectWise catalog',
    parameters: [
      { id: 'category', label: 'Product Category', type: 'text', required: false },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Products.csv' }
    ],
    scriptTemplate: (params) => {
      const category = escapePowerShellString(params.category);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Get ConnectWise Products Catalog
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    ${category ? `$Conditions = "category/name='${category}'"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/procurement/catalog?conditions=$EncodedConditions&pageSize=1000"` : `$Uri = "$BaseUrl/procurement/catalog?pageSize=1000"`}
    
    $Products = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Products | Select-Object \`
        id,
        identifier,
        description,
        @{N='Category';E={$_.category.name}},
        price,
        cost,
        @{N='UnitOfMeasure';E={$_.unitOfMeasure.name}},
        recurringFlag,
        taxableFlag
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Products catalog exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Products: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Catalog retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-get-members',
    name: 'Get Team Members',
    category: 'Reporting',
    description: 'Retrieve all team members from ConnectWise',
    parameters: [
      { id: 'activeOnly', label: 'Active Members Only', type: 'boolean', required: true, defaultValue: true },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Members.csv' }
    ],
    scriptTemplate: (params) => {
      const activeOnly = params.activeOnly;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Get ConnectWise Team Members
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    ${activeOnly ? `$Conditions = "inactiveFlag=false"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/system/members?conditions=$EncodedConditions&pageSize=1000"` : `$Uri = "$BaseUrl/system/members?pageSize=1000"`}
    
    $Members = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    $Report = $Members | Select-Object \`
        id,
        identifier,
        firstName,
        lastName,
        @{N='FullName';E={"$($_.firstName) $($_.lastName)"}},
        title,
        email,
        @{N='Department';E={$_.department.name}},
        @{N='Inactive';E={$_.inactiveFlag}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Team members exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Members: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Member retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-get-boards',
    name: 'Get Service Boards',
    category: 'Ticket Management',
    description: 'Retrieve all service boards from ConnectWise',
    parameters: [
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\ServiceBoards.csv' }
    ],
    scriptTemplate: (params) => {
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Get ConnectWise Service Boards
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Boards = Invoke-RestMethod -Uri "$BaseUrl/service/boards?pageSize=1000" -Method Get -Headers $Headers
    
    $Report = $Boards | Select-Object \`
        id,
        name,
        @{N='Location';E={$_.location.name}},
        @{N='Department';E={$_.department.name}},
        inactiveFlag,
        projectFlag,
        @{N='DefaultTeam';E={$_.team.name}}
    
    $Report | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Service boards exported: ${exportPath}" -ForegroundColor Green
    Write-Host "  Total Boards: $($Report.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Board retrieval failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-add-ticket-note',
    name: 'Add Ticket Note',
    category: 'Ticket Management',
    description: 'Add a note to an existing ticket',
    parameters: [
      { id: 'ticketId', label: 'Ticket ID', type: 'number', required: true },
      { id: 'noteText', label: 'Note Text', type: 'textarea', required: true },
      { id: 'internalFlag', label: 'Internal Note', type: 'boolean', required: true, defaultValue: true },
      { id: 'detailDescription', label: 'Detailed Description', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const ticketId = params.ticketId;
      const noteText = escapePowerShellString(params.noteText);
      const internalFlag = params.internalFlag ? '$true' : '$false';
      const detailDescription = params.detailDescription ? '$true' : '$false';
      
      return `# Add Note to ConnectWise Ticket
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$TicketId = ${ticketId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$Body = @{
    text = "${noteText}"
    internalAnalysisFlag = ${internalFlag}
    detailDescriptionFlag = ${detailDescription}
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId/notes" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Note added to ticket #$TicketId" -ForegroundColor Green
    Write-Host "  Note ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Internal: ${internalFlag}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add note: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-search-tickets',
    name: 'Search Tickets',
    category: 'Ticket Management',
    description: 'Search for tickets with custom criteria',
    parameters: [
      { id: 'searchTerm', label: 'Search Term', type: 'text', required: true },
      { id: 'board', label: 'Service Board', type: 'text', required: false },
      { id: 'status', label: 'Status', type: 'select', required: false, options: ['Open', 'Closed', 'All'] },
      { id: 'maxResults', label: 'Max Results', type: 'number', required: true, defaultValue: 100 }
    ],
    scriptTemplate: (params) => {
      const searchTerm = escapePowerShellString(params.searchTerm);
      const board = escapePowerShellString(params.board);
      const status = params.status;
      const maxResults = params.maxResults || 100;
      
      return `# Search ConnectWise Tickets
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "summary contains '${searchTerm}' or initialDescription contains '${searchTerm}'"
    ${board ? `$Conditions += " and board/name='${board}'"` : ''}
    ${status && status !== 'All' ? `$Conditions += " and closedFlag=${status === 'Closed' ? 'true' : 'false'}"` : ''}
    
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    $Uri = "$BaseUrl/service/tickets?conditions=$EncodedConditions&pageSize=${maxResults}"
    
    $Tickets = Invoke-RestMethod -Uri $Uri -Method Get -Headers $Headers
    
    Write-Host "[SUCCESS] Search completed!" -ForegroundColor Green
    Write-Host "  Found: $($Tickets.Count) tickets" -ForegroundColor Cyan
    Write-Host ""
    
    $Tickets | Select-Object id, summary, @{N='Company';E={$_.company.name}}, @{N='Status';E={$_.status.name}} | Format-Table -AutoSize
    
} catch {
    Write-Error "Search failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-get-ticket-time-entries',
    name: 'Get Ticket Time Entries',
    category: 'Time Entry',
    description: 'Retrieve all time entries for a specific ticket',
    parameters: [
      { id: 'ticketId', label: 'Ticket ID', type: 'number', required: true }
    ],
    scriptTemplate: (params) => {
      const ticketId = params.ticketId;
      
      return `# Get ConnectWise Ticket Time Entries
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$TicketId = ${ticketId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "chargeToId=$TicketId and chargeToType='ServiceTicket'"
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $TotalHours = ($TimeEntries | Measure-Object -Property actualHours -Sum).Sum
    $BillableHours = ($TimeEntries | Where-Object { $_.billableOption -eq 'Billable' } | Measure-Object -Property actualHours -Sum).Sum
    
    Write-Host "[SUCCESS] Time entries retrieved for ticket #$TicketId" -ForegroundColor Green
    Write-Host "  Total Entries: $($TimeEntries.Count)" -ForegroundColor Cyan
    Write-Host "  Total Hours: $([Math]::Round($TotalHours, 2))" -ForegroundColor Cyan
    Write-Host "  Billable Hours: $([Math]::Round($BillableHours, 2))" -ForegroundColor Cyan
    Write-Host ""
    
    $TimeEntries | Select-Object @{N='Member';E={$_.member.name}}, actualHours, billableOption, notes, timeStart | Format-Table -AutoSize
    
} catch {
    Write-Error "Failed to retrieve time entries: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-weekly-summary-report',
    name: 'Weekly Summary Report',
    category: 'Reporting',
    description: 'Generate weekly summary of tickets, time, and billing',
    parameters: [
      { id: 'weekOffset', label: 'Weeks Back (0=current)', type: 'number', required: true, defaultValue: 0 },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\WeeklySummary.csv' }
    ],
    scriptTemplate: (params) => {
      const weekOffset = params.weekOffset || 0;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Weekly Summary Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Calculate week dates
    $Today = Get-Date
    $WeekStart = $Today.AddDays(-$Today.DayOfWeek.value__ - (${weekOffset} * 7)).Date
    $WeekEnd = $WeekStart.AddDays(6).AddHours(23).AddMinutes(59)
    
    $StartStr = $WeekStart.ToString("yyyy-MM-ddT00:00:00Z")
    $EndStr = $WeekEnd.ToString("yyyy-MM-ddT23:59:59Z")
    
    # Get tickets created this week
    $TicketConditions = "dateEntered >= [$StartStr] and dateEntered <= [$EndStr]"
    $EncodedTicketConditions = [System.Web.HttpUtility]::UrlEncode($TicketConditions)
    $NewTickets = Invoke-RestMethod -Uri "$BaseUrl/service/tickets?conditions=$EncodedTicketConditions&pageSize=1000" -Method Get -Headers $Headers
    
    # Get tickets closed this week
    $ClosedConditions = "closedDate >= [$StartStr] and closedDate <= [$EndStr]"
    $EncodedClosedConditions = [System.Web.HttpUtility]::UrlEncode($ClosedConditions)
    $ClosedTickets = Invoke-RestMethod -Uri "$BaseUrl/service/tickets?conditions=$EncodedClosedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    # Get time entries this week
    $TimeConditions = "timeStart >= [$StartStr] and timeEnd <= [$EndStr]"
    $EncodedTimeConditions = [System.Web.HttpUtility]::UrlEncode($TimeConditions)
    $TimeEntries = Invoke-RestMethod -Uri "$BaseUrl/time/entries?conditions=$EncodedTimeConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $TotalHours = ($TimeEntries | Measure-Object -Property actualHours -Sum).Sum
    $BillableHours = ($TimeEntries | Where-Object { $_.billableOption -eq 'Billable' } | Measure-Object -Property actualHours -Sum).Sum
    
    $Summary = [PSCustomObject]@{
        WeekStart = $WeekStart.ToString("yyyy-MM-dd")
        WeekEnd = $WeekEnd.ToString("yyyy-MM-dd")
        NewTickets = $NewTickets.Count
        ClosedTickets = $ClosedTickets.Count
        TotalTimeEntries = $TimeEntries.Count
        TotalHours = [Math]::Round($TotalHours, 2)
        BillableHours = [Math]::Round($BillableHours, 2)
        UtilizationPct = if ($TotalHours -gt 0) { [Math]::Round(($BillableHours / $TotalHours) * 100, 1) } else { 0 }
    }
    
    $Summary | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    Write-Host "[SUCCESS] Weekly summary report generated: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Week of $($WeekStart.ToString('yyyy-MM-dd')) ===" -ForegroundColor Cyan
    Write-Host "New Tickets: $($Summary.NewTickets)" -ForegroundColor White
    Write-Host "Closed Tickets: $($Summary.ClosedTickets)" -ForegroundColor White
    Write-Host "Total Hours: $($Summary.TotalHours)" -ForegroundColor White
    Write-Host "Billable Hours: $($Summary.BillableHours)" -ForegroundColor White
    Write-Host "Utilization: $($Summary.UtilizationPct)%" -ForegroundColor White
    
} catch {
    Write-Error "Summary generation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-bulk-update-tickets',
    name: 'Bulk Update Tickets',
    category: 'Ticket Management',
    description: 'Update multiple tickets at once with the same changes',
    parameters: [
      { id: 'ticketIds', label: 'Ticket IDs (comma-separated)', type: 'textarea', required: true },
      { id: 'status', label: 'New Status', type: 'select', required: false, options: ['New', 'In Progress', 'Waiting Customer', 'Scheduled', 'Completed'] },
      { id: 'priority', label: 'New Priority', type: 'select', required: false, options: ['Priority 1 - Critical', 'Priority 2 - High', 'Priority 3 - Medium', 'Priority 4 - Low'] },
      { id: 'notes', label: 'Notes to Add', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const ticketIdsRaw = (params.ticketIds as string).split(',').map((n: string) => n.trim());
      const status = escapePowerShellString(params.status);
      const priority = escapePowerShellString(params.priority);
      const notes = escapePowerShellString(params.notes);
      
      return `# Bulk Update ConnectWise Tickets
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

$TicketIds = @(${ticketIdsRaw.map(id => id).join(', ')})
$SuccessCount = 0
$FailCount = 0

foreach ($TicketId in $TicketIds) {
    try {
        $Updates = @()
        ${status ? `$Updates += @{ op = "replace"; path = "status"; value = @{ name = "${status}" } }` : ''}
        ${priority ? `$Updates += @{ op = "replace"; path = "priority"; value = @{ name = "${priority}" } }` : ''}
        
        if ($Updates.Count -gt 0) {
            $Body = $Updates | ConvertTo-Json -Depth 5
            Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId" -Method Patch -Headers $Headers -Body $Body
        }
        
        ${notes ? `# Add note
        $NoteBody = @{
            text = "${notes}"
            internalAnalysisFlag = $true
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/service/tickets/$TicketId/notes" -Method Post -Headers $Headers -Body $NoteBody` : ''}
        
        Write-Host "[SUCCESS] Ticket #$TicketId updated" -ForegroundColor Green
        $SuccessCount++
        
    } catch {
        Write-Warning "Failed to update ticket #$TicketId: $_"
        $FailCount++
    }
}

Write-Host ""
Write-Host "=== Bulk Update Summary ===" -ForegroundColor Cyan
Write-Host "Updated: $SuccessCount" -ForegroundColor Green
Write-Host "Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Gray" })`;
    },
    isPremium: true
  },
  {
    id: 'cw-delete-agreement',
    name: 'Cancel Agreement',
    category: 'Agreement Management',
    description: 'Cancel an existing agreement',
    parameters: [
      { id: 'agreementId', label: 'Agreement ID', type: 'number', required: true },
      { id: 'reason', label: 'Cancellation Reason', type: 'textarea', required: true }
    ],
    scriptTemplate: (params) => {
      const agreementId = params.agreementId;
      const reason = escapePowerShellString(params.reason);
      
      return `# Cancel ConnectWise Agreement
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$AgreementId = ${agreementId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Get agreement details first
    $Agreement = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements/$AgreementId" -Method Get -Headers $Headers
    
    Write-Host "Cancelling agreement: $($Agreement.name)" -ForegroundColor Yellow
    Write-Host "Company: $($Agreement.company.name)" -ForegroundColor Yellow
    
    # Update agreement to cancelled
    $Update = @(
        @{ op = "replace"; path = "cancelledFlag"; value = $true }
        @{ op = "replace"; path = "endDate"; value = (Get-Date).ToString("yyyy-MM-ddT00:00:00Z") }
    ) | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements/$AgreementId" -Method Patch -Headers $Headers -Body $Update
    
    Write-Host "[SUCCESS] Agreement #$AgreementId cancelled!" -ForegroundColor Green
    Write-Host "  Reason: ${reason}" -ForegroundColor Cyan
    Write-Host "  End Date: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Agreement cancellation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-add-agreement-addition',
    name: 'Add Agreement Addition',
    category: 'Agreement Management',
    description: 'Add a billable addition (product or service) to an existing agreement',
    parameters: [
      { id: 'agreementId', label: 'Agreement ID', type: 'number', required: true },
      { id: 'productId', label: 'Product ID', type: 'number', required: true },
      { id: 'quantity', label: 'Quantity', type: 'number', required: true, defaultValue: 1 },
      { id: 'unitPrice', label: 'Unit Price', type: 'number', required: false },
      { id: 'billCustomer', label: 'Bill Customer', type: 'select', required: true, options: ['Billable', 'DoNotBill', 'NoCharge'], defaultValue: 'Billable' },
      { id: 'effectiveDate', label: 'Effective Date (YYYY-MM-DD)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const agreementId = params.agreementId;
      const productId = params.productId;
      const quantity = params.quantity || 1;
      const unitPrice = params.unitPrice;
      const billCustomer = escapePowerShellString(params.billCustomer);
      const effectiveDate = escapePowerShellString(params.effectiveDate);
      
      return `# Add ConnectWise Agreement Addition
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$AgreementId = ${agreementId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Body = @{
        product = @{ id = ${productId} }
        quantity = ${quantity}
        billCustomer = "${billCustomer}"
        effectiveDate = "${effectiveDate}T00:00:00Z"
        ${unitPrice ? `unitPrice = ${unitPrice}` : ''}
    } | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements/$AgreementId/additions" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Addition added to agreement #$AgreementId!" -ForegroundColor Green
    Write-Host "  Addition ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Product ID: ${productId}" -ForegroundColor Cyan
    Write-Host "  Quantity: ${quantity}" -ForegroundColor Cyan
    Write-Host "  Billing: ${billCustomer}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add agreement addition: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-project-ticket',
    name: 'Create Project Ticket',
    category: 'Project Management',
    description: 'Create a new ticket linked to a project phase',
    parameters: [
      { id: 'projectId', label: 'Project ID', type: 'number', required: true },
      { id: 'phaseId', label: 'Phase ID', type: 'number', required: true },
      { id: 'summary', label: 'Ticket Summary', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea', required: false },
      { id: 'budgetHours', label: 'Budget Hours', type: 'number', required: false },
      { id: 'assignedMemberId', label: 'Assigned Member ID', type: 'number', required: false }
    ],
    scriptTemplate: (params) => {
      const projectId = params.projectId;
      const phaseId = params.phaseId;
      const summary = escapePowerShellString(params.summary);
      const description = escapePowerShellString(params.description);
      const budgetHours = params.budgetHours;
      const assignedMemberId = params.assignedMemberId;
      
      return `# Create ConnectWise Project Ticket
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$ProjectId = ${projectId}
$PhaseId = ${phaseId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Body = @{
        summary = "${summary}"
        phase = @{ id = $PhaseId }
        ${description ? `notes = "${description}"` : ''}
        ${budgetHours ? `budgetHours = ${budgetHours}` : ''}
        ${assignedMemberId ? `assignedTo = @{ id = ${assignedMemberId} }` : ''}
    } | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/project/projects/$ProjectId/tickets" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Project ticket created successfully!" -ForegroundColor Green
    Write-Host "  Ticket ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Project: #$ProjectId" -ForegroundColor Cyan
    Write-Host "  Phase: #$PhaseId" -ForegroundColor Cyan
    Write-Host "  Summary: ${summary}" -ForegroundColor Cyan
    ${budgetHours ? `Write-Host "  Budget Hours: ${budgetHours}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Project ticket creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-add-project-time-entry',
    name: 'Add Project Time Entry',
    category: 'Project Management',
    description: 'Add time entry against a project ticket',
    parameters: [
      { id: 'projectTicketId', label: 'Project Ticket ID', type: 'number', required: true },
      { id: 'memberId', label: 'Member ID', type: 'number', required: true },
      { id: 'hours', label: 'Hours Worked', type: 'number', required: true },
      { id: 'workDate', label: 'Work Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'notes', label: 'Work Notes', type: 'textarea', required: true },
      { id: 'billable', label: 'Billable', type: 'boolean', required: true, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const projectTicketId = params.projectTicketId;
      const memberId = params.memberId;
      const hours = params.hours;
      const workDate = escapePowerShellString(params.workDate);
      const notes = escapePowerShellString(params.notes);
      const billable = params.billable ? 'Billable' : 'NonBillable';
      
      return `# Add ConnectWise Project Time Entry
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Body = @{
        chargeToId = ${projectTicketId}
        chargeToType = "ProjectTicket"
        member = @{ id = ${memberId} }
        timeStart = "${workDate}T08:00:00Z"
        timeEnd = "${workDate}T" + (8 + ${hours}).ToString("00") + ":00:00Z"
        actualHours = ${hours}
        notes = "${notes}"
        billableOption = "${billable}"
    } | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/time/entries" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Project time entry added!" -ForegroundColor Green
    Write-Host "  Entry ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Project Ticket: #${projectTicketId}" -ForegroundColor Cyan
    Write-Host "  Hours: ${hours}" -ForegroundColor Cyan
    Write-Host "  Date: ${workDate}" -ForegroundColor Cyan
    Write-Host "  Billable: ${billable}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Project time entry failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-create-purchase-order',
    name: 'Create Purchase Order',
    category: 'Procurement',
    description: 'Create a new purchase order for products',
    parameters: [
      { id: 'vendorId', label: 'Vendor Company ID', type: 'number', required: true },
      { id: 'poNumber', label: 'PO Number', type: 'text', required: true, placeholder: 'PO-2024-001' },
      { id: 'shipToCompanyId', label: 'Ship To Company ID', type: 'number', required: true },
      { id: 'terms', label: 'Payment Terms', type: 'text', required: false, placeholder: 'Net 30' },
      { id: 'notes', label: 'Notes', type: 'textarea', required: false }
    ],
    scriptTemplate: (params) => {
      const vendorId = params.vendorId;
      const poNumber = escapePowerShellString(params.poNumber);
      const shipToCompanyId = params.shipToCompanyId;
      const terms = escapePowerShellString(params.terms);
      const notes = escapePowerShellString(params.notes);
      
      return `# Create ConnectWise Purchase Order
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Body = @{
        vendorCompany = @{ id = ${vendorId} }
        poNumber = "${poNumber}"
        shipToCompany = @{ id = ${shipToCompanyId} }
        status = @{ name = "New" }
        poDate = (Get-Date).ToString("yyyy-MM-ddT00:00:00Z")
        ${terms ? `terms = @{ name = "${terms}" }` : ''}
        ${notes ? `internalNotes = "${notes}"` : ''}
    } | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/procurement/purchaseorders" -Method Post -Headers $Headers -Body $Body
    
    Write-Host "[SUCCESS] Purchase Order created successfully!" -ForegroundColor Green
    Write-Host "  PO ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  PO Number: ${poNumber}" -ForegroundColor Cyan
    Write-Host "  Vendor ID: ${vendorId}" -ForegroundColor Cyan
    Write-Host "  Status: New" -ForegroundColor Cyan
    
} catch {
    Write-Error "Purchase order creation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-add-po-line-item',
    name: 'Add PO Line Item',
    category: 'Procurement',
    description: 'Add a product line item to a purchase order',
    parameters: [
      { id: 'purchaseOrderId', label: 'Purchase Order ID', type: 'number', required: true },
      { id: 'productId', label: 'Product ID', type: 'number', required: true },
      { id: 'quantity', label: 'Quantity', type: 'number', required: true },
      { id: 'unitCost', label: 'Unit Cost', type: 'number', required: true },
      { id: 'description', label: 'Description', type: 'text', required: false }
    ],
    scriptTemplate: (params) => {
      const purchaseOrderId = params.purchaseOrderId;
      const productId = params.productId;
      const quantity = params.quantity;
      const unitCost = params.unitCost;
      const description = escapePowerShellString(params.description);
      
      return `# Add Line Item to ConnectWise Purchase Order
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$PurchaseOrderId = ${purchaseOrderId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Body = @{
        product = @{ id = ${productId} }
        quantity = ${quantity}
        unitCost = ${unitCost}
        ${description ? `description = "${description}"` : ''}
    } | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/procurement/purchaseorders/$PurchaseOrderId/lineitems" -Method Post -Headers $Headers -Body $Body
    
    $LineTotal = ${quantity} * ${unitCost}
    
    Write-Host "[SUCCESS] Line item added to PO #$PurchaseOrderId!" -ForegroundColor Green
    Write-Host "  Line Item ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Product ID: ${productId}" -ForegroundColor Cyan
    Write-Host "  Quantity: ${quantity}" -ForegroundColor Cyan
    Write-Host "  Unit Cost: $${unitCost}" -ForegroundColor Cyan
    Write-Host "  Line Total: $$LineTotal" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to add line item: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-export-invoices',
    name: 'Export Invoices',
    category: 'Finance Integration',
    description: 'Export invoices for accounting integration',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true },
      { id: 'status', label: 'Invoice Status', type: 'select', required: false, options: ['All', 'Open', 'Closed', 'Paid'] },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\Invoices.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const status = params.status;
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# Export ConnectWise Invoices
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    $Conditions = "date >= [${startDate}T00:00:00Z] and date <= [${endDate}T23:59:59Z]"
    ${status && status !== 'All' ? `$Conditions += " and status/name='${status}'"` : ''}
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $Invoices = Invoke-RestMethod -Uri "$BaseUrl/finance/invoices?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $ExportData = $Invoices | Select-Object \`
        id,
        invoiceNumber,
        @{N='Company';E={$_.company.name}},
        @{N='CompanyId';E={$_.company.id}},
        date,
        dueDate,
        @{N='Status';E={$_.status.name}},
        total,
        @{N='Balance';E={$_.balance}},
        @{N='PaidAmount';E={$_.total - $_.balance}},
        @{N='GLBatch';E={$_.glPosted}},
        @{N='Terms';E={$_.billingTerms.name}}
    
    $ExportData | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalAmount = ($ExportData | Measure-Object -Property total -Sum).Sum
    $TotalBalance = ($ExportData | Measure-Object -Property Balance -Sum).Sum
    
    Write-Host "[SUCCESS] Invoice export completed: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Export Summary ===" -ForegroundColor Cyan
    Write-Host "Date Range: ${startDate} to ${endDate}" -ForegroundColor White
    Write-Host "Invoices Exported: $($ExportData.Count)" -ForegroundColor White
    Write-Host "Total Amount: $([Math]::Round($TotalAmount, 2))" -ForegroundColor White
    Write-Host "Outstanding Balance: $([Math]::Round($TotalBalance, 2))" -ForegroundColor Yellow
    
} catch {
    Write-Error "Invoice export failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-apply-payment',
    name: 'Apply Payment to Invoice',
    category: 'Finance Integration',
    description: 'Apply a payment to an invoice',
    parameters: [
      { id: 'invoiceId', label: 'Invoice ID', type: 'number', required: true },
      { id: 'amount', label: 'Payment Amount', type: 'number', required: true },
      { id: 'paymentMethod', label: 'Payment Method', type: 'select', required: true, options: ['Check', 'Credit Card', 'ACH', 'Wire Transfer', 'Cash'], defaultValue: 'Check' },
      { id: 'reference', label: 'Reference Number', type: 'text', required: false, placeholder: 'Check #12345' },
      { id: 'paymentDate', label: 'Payment Date (YYYY-MM-DD)', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const invoiceId = params.invoiceId;
      const amount = params.amount;
      const paymentMethod = escapePowerShellString(params.paymentMethod);
      const reference = escapePowerShellString(params.reference);
      const paymentDate = escapePowerShellString(params.paymentDate);
      
      return `# Apply Payment to ConnectWise Invoice
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key
$InvoiceId = ${invoiceId}

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Get invoice details first
    $Invoice = Invoke-RestMethod -Uri "$BaseUrl/finance/invoices/$InvoiceId" -Method Get -Headers $Headers
    
    Write-Host "Applying payment to Invoice #$($Invoice.invoiceNumber)..." -ForegroundColor Yellow
    Write-Host "  Current Balance: $($Invoice.balance)" -ForegroundColor Cyan
    
    $Body = @{
        invoice = @{ id = $InvoiceId }
        amount = ${amount}
        paymentDate = "${paymentDate}T00:00:00Z"
        type = @{ name = "${paymentMethod}" }
        ${reference ? `note = "${reference}"` : ''}
    } | ConvertTo-Json -Depth 5
    
    $Response = Invoke-RestMethod -Uri "$BaseUrl/finance/invoices/$InvoiceId/payments" -Method Post -Headers $Headers -Body $Body
    
    $NewBalance = $Invoice.balance - ${amount}
    
    Write-Host "[SUCCESS] Payment applied successfully!" -ForegroundColor Green
    Write-Host "  Payment ID: $($Response.id)" -ForegroundColor Cyan
    Write-Host "  Amount: $${amount}" -ForegroundColor Cyan
    Write-Host "  Method: ${paymentMethod}" -ForegroundColor Cyan
    Write-Host "  New Balance: $$([Math]::Round($NewBalance, 2))" -ForegroundColor $(if ($NewBalance -eq 0) { "Green" } else { "Yellow" })
    
} catch {
    Write-Error "Payment application failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'cw-agreement-billing-report',
    name: 'Agreement Billing Report',
    category: 'Agreement Management',
    description: 'Generate billing report for service agreements',
    parameters: [
      { id: 'billingPeriod', label: 'Billing Period', type: 'select', required: true, options: ['Current Month', 'Last Month', 'Current Quarter', 'Last Quarter', 'Year to Date'], defaultValue: 'Current Month' },
      { id: 'agreementType', label: 'Agreement Type Filter', type: 'text', required: false, placeholder: 'Managed Services' },
      { id: 'exportPath', label: 'Export CSV Path', type: 'path', required: true, placeholder: 'C:\\Reports\\AgreementBilling.csv' }
    ],
    scriptTemplate: (params) => {
      const billingPeriod = params.billingPeriod;
      const agreementType = escapePowerShellString(params.agreementType);
      const exportPath = escapePowerShellString(params.exportPath);
      
      return `# ConnectWise Agreement Billing Report
# Generated: ${new Date().toISOString()}

$BaseUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
    "clientId" = "" # Set your Client ID
}

try {
    # Calculate date range based on billing period
    $Today = Get-Date
    switch ("${billingPeriod}") {
        "Current Month" {
            $StartDate = Get-Date -Day 1
            $EndDate = $StartDate.AddMonths(1).AddDays(-1)
        }
        "Last Month" {
            $StartDate = (Get-Date -Day 1).AddMonths(-1)
            $EndDate = (Get-Date -Day 1).AddDays(-1)
        }
        "Current Quarter" {
            $Quarter = [Math]::Ceiling($Today.Month / 3)
            $StartDate = Get-Date -Month (($Quarter - 1) * 3 + 1) -Day 1
            $EndDate = $StartDate.AddMonths(3).AddDays(-1)
        }
        "Last Quarter" {
            $Quarter = [Math]::Ceiling($Today.Month / 3) - 1
            if ($Quarter -eq 0) { $Quarter = 4; $Year = $Today.Year - 1 } else { $Year = $Today.Year }
            $StartDate = Get-Date -Year $Year -Month (($Quarter - 1) * 3 + 1) -Day 1
            $EndDate = $StartDate.AddMonths(3).AddDays(-1)
        }
        "Year to Date" {
            $StartDate = Get-Date -Month 1 -Day 1
            $EndDate = $Today
        }
    }
    
    $Conditions = "cancelledFlag=false"
    ${agreementType ? `$Conditions += " and type/name='${agreementType}'"` : ''}
    $EncodedConditions = [System.Web.HttpUtility]::UrlEncode($Conditions)
    
    $Agreements = Invoke-RestMethod -Uri "$BaseUrl/finance/agreements?conditions=$EncodedConditions&pageSize=1000" -Method Get -Headers $Headers
    
    $BillingReport = $Agreements | Select-Object \`
        id,
        name,
        @{N='Company';E={$_.company.name}},
        @{N='Type';E={$_.type.name}},
        @{N='BillingCycle';E={$_.billingCycle.name}},
        @{N='BillingAmount';E={$_.billingAmount}},
        @{N='StartDate';E={$_.startDate}},
        @{N='EndDate';E={$_.endDate}},
        @{N='Status';E={if ($_.cancelledFlag) { "Cancelled" } elseif ($_.endDate -lt (Get-Date)) { "Expired" } else { "Active" }}},
        @{N='AnnualValue';E={
            switch ($_.billingCycle.name) {
                "Monthly" { $_.billingAmount * 12 }
                "Quarterly" { $_.billingAmount * 4 }
                "Yearly" { $_.billingAmount }
                default { $_.billingAmount * 12 }
            }
        }}
    
    $BillingReport | Export-Csv -Path "${exportPath}" -NoTypeInformation
    
    $TotalMRR = ($BillingReport | Where-Object Status -eq "Active" | ForEach-Object { $_.AnnualValue / 12 } | Measure-Object -Sum).Sum
    $TotalARR = ($BillingReport | Where-Object Status -eq "Active" | Measure-Object -Property AnnualValue -Sum).Sum
    
    Write-Host "[SUCCESS] Agreement billing report generated: ${exportPath}" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Billing Summary ===" -ForegroundColor Cyan
    Write-Host "Period: ${billingPeriod}" -ForegroundColor White
    Write-Host "Active Agreements: $(($BillingReport | Where-Object Status -eq 'Active').Count)" -ForegroundColor White
    Write-Host "Monthly Recurring Revenue (MRR): $([Math]::Round($TotalMRR, 2))" -ForegroundColor Green
    Write-Host "Annual Recurring Revenue (ARR): $([Math]::Round($TotalARR, 2))" -ForegroundColor Green
    
} catch {
    Write-Error "Billing report generation failed: $_"
}`;
    },
    isPremium: true
  }
];
