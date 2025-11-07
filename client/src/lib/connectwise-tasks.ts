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
  },
  {
    id: 'cw-create-maintenance-window',
    name: 'Create Scheduled Maintenance Windows',
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Maintenance window '${windowName}' created!" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Patch approval list '${approvalListName}' configured!" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Inventory exported: ${exportPath}" -ForegroundColor Green
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
    name: 'Automate Ticket Creation in Manage',
    category: 'Common Admin Tasks',
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
      
      return `# Automate ConnectWise Ticket Creation
# Generated: ${new Date().toISOString()}

$ApiUrl = "https://api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets"
$CompanyId = "" # Set your Company ID
$PublicKey = "" # Set your API Public Key
$PrivateKey = "" # Set your API Private Key

$Headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$CompanyId+$PublicKey:$PrivateKey"))
    "Content-Type" = "application/json"
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
            priority = "${priority}"
            board = @{ name = "Service Board" }
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers -Body $Body
        
        Write-Host "✓ Automated ticket created: #$($Response.id)" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Email alert integration configured!" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Teams alert integration configured!" -ForegroundColor Green
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
    category: 'Common Admin Tasks',
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
    
    Write-Host "✓ Agent health report generated: ${exportPath}" -ForegroundColor Green
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
  }
];
