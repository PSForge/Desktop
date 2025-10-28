import { escapePowerShellString, buildPowerShellArray, toPowerShellBoolean } from './powershell-utils';

export interface NetworkingTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
}

export interface NetworkingTask {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions?: string;
  parameters: NetworkingTaskParameter[];
  validate?: (params: Record<string, any>) => string | null;
  scriptTemplate: (params: Record<string, any>) => string;
}

export const networkingTasks: NetworkingTask[] = [
  {
    id: 'get-network-config',
    name: 'Get Network Configuration Report',
    category: 'IP Configuration',
    description: 'Detailed report of all network adapters with IP, DNS, gateway information',
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\NetworkConfig.csv' },
      { id: 'includeDisabled', label: 'Include Disabled Adapters', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      const includeDisabled = toPowerShellBoolean(params.includeDisabled ?? false);
      
      return `# Network Configuration Report
# Generated: ${new Date().toISOString()}

$Adapters = Get-NetAdapter${includeDisabled ? '' : ' | Where-Object { $_.Status -eq "Up" }'}

$Report = foreach ($Adapter in $Adapters) {
    $IPConfig = Get-NetIPAddress -InterfaceIndex $Adapter.ifIndex -ErrorAction SilentlyContinue | Where-Object { $_.AddressFamily -eq 'IPv4' }
    $DNS = Get-DnsClientServerAddress -InterfaceIndex $Adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $Gateway = Get-NetRoute -InterfaceIndex $Adapter.ifIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue
    
    [PSCustomObject]@{
        Name = $Adapter.Name
        Status = $Adapter.Status
        MacAddress = $Adapter.MacAddress
        IPAddress = $IPConfig.IPAddress
        SubnetMask = $IPConfig.PrefixLength
        Gateway = $Gateway.NextHop
        DNSServers = ($DNS.ServerAddresses -join ', ')
        LinkSpeed = $Adapter.LinkSpeed
    }
}

$Report | Format-Table -AutoSize
${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'set-static-ip',
    name: 'Configure Static IP Address',
    category: 'IP Configuration',
    description: 'Set static IP, subnet, gateway, and DNS on a network adapter',
    parameters: [
      { id: 'adapterName', label: 'Adapter Name', type: 'text', required: true, placeholder: 'Ethernet' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'prefixLength', label: 'Prefix Length (CIDR)', type: 'number', required: true, defaultValue: 24 },
      { id: 'gateway', label: 'Default Gateway', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'dnsServers', label: 'DNS Servers (comma-separated)', type: 'text', required: true, placeholder: '8.8.8.8,8.8.4.4' }
    ],
    scriptTemplate: (params) => {
      const adapterName = escapePowerShellString(params.adapterName);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const prefixLength = Number(params.prefixLength);
      const gateway = escapePowerShellString(params.gateway);
      const dnsServers = params.dnsServers.split(',').map((d: string) => d.trim());
      
      return `# Configure Static IP Address
# Generated: ${new Date().toISOString()}

$AdapterName = "${adapterName}"
$IPAddress = "${ipAddress}"
$PrefixLength = ${prefixLength}
$Gateway = "${gateway}"
$DNSServers = ${buildPowerShellArray(dnsServers)}

# Get adapter
$Adapter = Get-NetAdapter -Name $AdapterName -ErrorAction Stop

# Remove existing IP configuration
Remove-NetIPAddress -InterfaceIndex $Adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute -InterfaceIndex $Adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue

# Set static IP
New-NetIPAddress -InterfaceIndex $Adapter.ifIndex -IPAddress $IPAddress -PrefixLength $PrefixLength -DefaultGateway $Gateway
Write-Host "✓ IP address set: $IPAddress/$PrefixLength" -ForegroundColor Green

# Set DNS servers
Set-DnsClientServerAddress -InterfaceIndex $Adapter.ifIndex -ServerAddresses $DNSServers
Write-Host "✓ DNS servers set: $($DNSServers -join ', ')" -ForegroundColor Green`;
    }
  },

  {
    id: 'set-dhcp',
    name: 'Enable DHCP on Adapter',
    category: 'IP Configuration',
    description: 'Configure network adapter to obtain IP address via DHCP',
    parameters: [
      { id: 'adapterName', label: 'Adapter Name', type: 'text', required: true, placeholder: 'Ethernet' }
    ],
    scriptTemplate: (params) => {
      const adapterName = escapePowerShellString(params.adapterName);
      
      return `# Enable DHCP on Adapter
# Generated: ${new Date().toISOString()}

$AdapterName = "${adapterName}"
$Adapter = Get-NetAdapter -Name $AdapterName -ErrorAction Stop

# Enable DHCP for IP
Set-NetIPInterface -InterfaceIndex $Adapter.ifIndex -Dhcp Enabled
Write-Host "✓ DHCP enabled for IP address" -ForegroundColor Green

# Enable DHCP for DNS
Set-DnsClientServerAddress -InterfaceIndex $Adapter.ifIndex -ResetServerAddresses
Write-Host "✓ DHCP enabled for DNS" -ForegroundColor Green

# Release and renew
ipconfig /release $AdapterName
ipconfig /renew $AdapterName`;
    }
  },

  {
    id: 'test-network-connectivity',
    name: 'Test Network Connectivity (Ping/Traceroute)',
    category: 'Diagnostics & Testing',
    description: 'Test connectivity to multiple hosts with ping and optional traceroute',
    parameters: [
      { id: 'targets', label: 'Target Hosts (comma-separated)', type: 'textarea', required: true, placeholder: 'google.com,8.8.8.8,dc01.contoso.com' },
      { id: 'count', label: 'Ping Count', type: 'number', required: false, defaultValue: 4 },
      { id: 'traceroute', label: 'Include Traceroute', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const targets = params.targets.split(',').map((t: string) => t.trim());
      const count = Number(params.count || 4);
      const traceroute = toPowerShellBoolean(params.traceroute ?? false);
      
      return `# Test Network Connectivity
# Generated: ${new Date().toISOString()}

$Targets = ${buildPowerShellArray(targets)}
$Count = ${count}

foreach ($Target in $Targets) {
    Write-Host ""
    Write-Host "Testing: $Target" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    $Ping = Test-Connection -ComputerName $Target -Count $Count -ErrorAction SilentlyContinue
    
    if ($Ping) {
        $AvgLatency = ($Ping | Measure-Object -Property ResponseTime -Average).Average
        Write-Host "✓ $Target is reachable" -ForegroundColor Green
        Write-Host "  Sent: $Count, Received: $($Ping.Count), Lost: $($Count - $Ping.Count)" -ForegroundColor Gray
        Write-Host "  Average latency: $([math]::Round($AvgLatency, 2)) ms" -ForegroundColor Gray
    } else {
        Write-Host "✗ $Target is unreachable" -ForegroundColor Red
    }
    
    ${traceroute ? `if ($Ping) {
        Write-Host ""
        Write-Host "Traceroute to $Target:" -ForegroundColor Yellow
        Test-NetConnection -ComputerName $Target -TraceRoute | Select-Object -ExpandProperty TraceRoute
    }` : ''}
}`;
    }
  },

  {
    id: 'dns-flush-cache',
    name: 'Flush DNS Cache',
    category: 'DNS Configuration',
    description: 'Clear DNS resolver cache and optionally register DNS',
    parameters: [
      { id: 'registerDns', label: 'Register DNS', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const registerDns = toPowerShellBoolean(params.registerDns ?? false);
      
      return `# Flush DNS Cache
# Generated: ${new Date().toISOString()}

# Display cache before flush
Write-Host "DNS cache entries before flush:" -ForegroundColor Gray
$Before = Get-DnsClientCache | Measure-Object
Write-Host "  Count: $($Before.Count)" -ForegroundColor Gray

# Flush DNS cache
Clear-DnsClientCache
Write-Host ""
Write-Host "✓ DNS cache flushed" -ForegroundColor Green

${registerDns ? `# Register DNS
ipconfig /registerdns
Write-Host "✓ DNS registration initiated" -ForegroundColor Green` : ''}

# Display cache after
$After = Get-DnsClientCache | Measure-Object
Write-Host ""
Write-Host "DNS cache entries after flush:" -ForegroundColor Gray
Write-Host "  Count: $($After.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'set-dns-servers',
    name: 'Set DNS Servers (Bulk)',
    category: 'DNS Configuration',
    description: 'Configure DNS servers on one or all network adapters',
    parameters: [
      { id: 'adapterName', label: 'Adapter Name (blank for all)', type: 'text', required: false, placeholder: 'Ethernet' },
      { id: 'dnsServers', label: 'DNS Servers (comma-separated)', type: 'text', required: true, placeholder: '8.8.8.8,8.8.4.4' }
    ],
    scriptTemplate: (params) => {
      const adapterName = params.adapterName ? escapePowerShellString(params.adapterName) : '';
      const dnsServers = params.dnsServers.split(',').map((d: string) => d.trim());
      
      return `# Set DNS Servers
# Generated: ${new Date().toISOString()}

$DNSServers = ${buildPowerShellArray(dnsServers)}

${adapterName ? `$Adapters = Get-NetAdapter -Name "${adapterName}"` : `$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }`}

foreach ($Adapter in $Adapters) {
    Set-DnsClientServerAddress -InterfaceIndex $Adapter.ifIndex -ServerAddresses $DNSServers
    Write-Host "✓ DNS set on $($Adapter.Name): $($DNSServers -join ', ')" -ForegroundColor Green
}`;
    }
  },

  {
    id: 'test-dns-resolution',
    name: 'Test DNS Resolution',
    category: 'DNS Configuration',
    description: 'Resolve hostnames using specified DNS servers',
    parameters: [
      { id: 'hostnames', label: 'Hostnames (comma-separated)', type: 'textarea', required: true, placeholder: 'google.com,microsoft.com' },
      { id: 'dnsServer', label: 'DNS Server (blank for default)', type: 'text', required: false, placeholder: '8.8.8.8' }
    ],
    scriptTemplate: (params) => {
      const hostnames = params.hostnames.split(',').map((h: string) => h.trim());
      const dnsServer = params.dnsServer ? escapePowerShellString(params.dnsServer) : '';
      
      return `# Test DNS Resolution
# Generated: ${new Date().toISOString()}

$Hostnames = ${buildPowerShellArray(hostnames)}
${dnsServer ? `$DNSServer = "${dnsServer}"` : ''}

foreach ($Hostname in $Hostnames) {
    Write-Host ""
    Write-Host "Resolving: $Hostname" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    ${dnsServer ? `$Result = Resolve-DnsName -Name $Hostname -Server $DNSServer -ErrorAction SilentlyContinue` : `$Result = Resolve-DnsName -Name $Hostname -ErrorAction SilentlyContinue`}
    
    if ($Result) {
        $Result | Where-Object { $_.Type -eq 'A' } | ForEach-Object {
            Write-Host "  $($_.Name) -> $($_.IPAddress)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ Resolution failed" -ForegroundColor Red
    }
}`;
    }
  },

  {
    id: 'firewall-rule-create',
    name: 'Create Windows Firewall Rule',
    category: 'Firewall Management',
    description: 'Create inbound or outbound firewall rule',
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Allow RDP' },
      { id: 'direction', label: 'Direction', type: 'select', required: true, options: ['Inbound', 'Outbound'] },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Allow' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['TCP', 'UDP', 'Any'], defaultValue: 'TCP' },
      { id: 'port', label: 'Port (blank for any)', type: 'text', required: false, placeholder: '3389' },
      { id: 'remoteAddress', label: 'Remote Address (blank for any)', type: 'text', required: false, placeholder: '192.168.1.0/24' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const direction = params.direction;
      const action = params.action;
      const protocol = params.protocol;
      const port = params.port ? escapePowerShellString(params.port) : '';
      const remoteAddress = params.remoteAddress ? escapePowerShellString(params.remoteAddress) : '';
      
      return `# Create Windows Firewall Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"
$Direction = "${direction}"
$Action = "${action}"
$Protocol = "${protocol}"
${port ? `$Port = "${port}"` : ''}
${remoteAddress ? `$RemoteAddress = "${remoteAddress}"` : ''}

$Params = @{
    DisplayName = $RuleName
    Direction = $Direction
    Action = $Action
    Protocol = $Protocol
    Enabled = 'True'
}

${port ? `$Params.LocalPort = $Port` : ''}
${remoteAddress ? `$Params.RemoteAddress = $RemoteAddress` : ''}

New-NetFirewallRule @Params
Write-Host "✓ Firewall rule created: $RuleName" -ForegroundColor Green
Get-NetFirewallRule -DisplayName $RuleName | Format-List`;
    }
  },

  {
    id: 'firewall-rule-list',
    name: 'List Firewall Rules (Filtered)',
    category: 'Firewall Management',
    description: 'List firewall rules with optional filtering',
    parameters: [
      { id: 'direction', label: 'Direction', type: 'select', required: false, options: ['All', 'Inbound', 'Outbound'], defaultValue: 'All' },
      { id: 'enabled', label: 'Enabled Only', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const direction = params.direction || 'All';
      const enabledOnly = toPowerShellBoolean(params.enabled ?? true);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List Firewall Rules
# Generated: ${new Date().toISOString()}

$Rules = Get-NetFirewallRule${direction !== 'All' ? ` -Direction ${direction}` : ''}${enabledOnly ? ' | Where-Object { $_.Enabled -eq "True" }' : ''}

$Report = $Rules | Select-Object DisplayName, Direction, Action, Enabled, Profile

$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total rules: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'firewall-enable-disable',
    name: 'Enable/Disable Windows Firewall',
    category: 'Firewall Management',
    description: 'Enable or disable Windows Firewall for all profiles',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'] },
      { id: 'profile', label: 'Profile', type: 'select', required: true, options: ['All', 'Domain', 'Public', 'Private'], defaultValue: 'All' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const profile = params.profile;
      
      return `# ${action} Windows Firewall
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$Profile = "${profile}"

if ($Profile -eq "All") {
    Set-NetFirewallProfile -All -Enabled ${action === 'Enable' ? '$true' : '$false'}
} else {
    Set-NetFirewallProfile -Profile $Profile -Enabled ${action === 'Enable' ? '$true' : '$false'}
}

Write-Host "✓ Firewall ${action.toLowerCase()}d for $Profile profile(s)" -ForegroundColor Green

# Display status
Get-NetFirewallProfile | Select-Object Name, Enabled | Format-Table -AutoSize`;
    }
  },

  {
    id: 'reset-network-stack',
    name: 'Reset Network Stack (Winsock/TCP/IP)',
    category: 'Diagnostics & Testing',
    description: 'Reset TCP/IP stack and Winsock catalog (requires reboot)',
    parameters: [
      { id: 'includeFirewall', label: 'Reset Firewall', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const includeFirewall = toPowerShellBoolean(params.includeFirewall ?? false);
      
      return `# Reset Network Stack
# Generated: ${new Date().toISOString()}

Write-Host "⚠ WARNING: This will reset network configuration" -ForegroundColor Yellow
Write-Host "  A system reboot will be required" -ForegroundColor Yellow
Write-Host ""

# Reset Winsock catalog
netsh winsock reset
Write-Host "✓ Winsock catalog reset" -ForegroundColor Green

# Reset TCP/IP stack
netsh int ip reset
Write-Host "✓ TCP/IP stack reset" -ForegroundColor Green

${includeFirewall ? `# Reset Firewall
netsh advfirewall reset
Write-Host "✓ Firewall reset to defaults" -ForegroundColor Green` : ''}

Write-Host ""
Write-Host "⚠ REBOOT REQUIRED for changes to take effect" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'port-scan-test',
    name: 'Test Open Ports (Port Scan)',
    category: 'Diagnostics & Testing',
    description: 'Test connectivity to specific ports on a target host',
    parameters: [
      { id: 'target', label: 'Target Host', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'ports', label: 'Ports (comma-separated)', type: 'text', required: true, placeholder: '80,443,3389,445' }
    ],
    scriptTemplate: (params) => {
      const target = escapePowerShellString(params.target);
      const ports = params.ports.split(',').map((p: string) => p.trim());
      
      return `# Test Open Ports
# Generated: ${new Date().toISOString()}

$Target = "${target}"
$Ports = ${buildPowerShellArray(ports)}

Write-Host "Scanning $Target..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

$Results = @()

foreach ($Port in $Ports) {
    try {
        $Connection = Test-NetConnection -ComputerName $Target -Port $Port -WarningAction SilentlyContinue
        $Results += [PSCustomObject]@{
            Port = $Port
            Status = if ($Connection.TcpTestSucceeded) { "Open" } else { "Closed" }
        }
    } catch {
        $Results += [PSCustomObject]@{
            Port = $Port
            Status = "Error"
        }
    }
}

$Results | ForEach-Object {
    $Color = if ($_.Status -eq "Open") { "Green" } else { "Red" }
    Write-Host "  Port $($_.Port): $($_.Status)" -ForegroundColor $Color
}

Write-Host ""
Write-Host "Scan complete" -ForegroundColor Gray`;
    }
  },

  {
    id: 'disable-ipv6',
    name: 'Disable IPv6 on Adapters',
    category: 'IP Configuration',
    description: 'Disable IPv6 protocol on network adapters',
    parameters: [
      { id: 'adapterName', label: 'Adapter Name (blank for all)', type: 'text', required: false, placeholder: 'Ethernet' }
    ],
    scriptTemplate: (params) => {
      const adapterName = params.adapterName ? escapePowerShellString(params.adapterName) : '';
      
      return `# Disable IPv6
# Generated: ${new Date().toISOString()}

${adapterName ? `$Adapters = Get-NetAdapter -Name "${adapterName}"` : `$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }`}

foreach ($Adapter in $Adapters) {
    Disable-NetAdapterBinding -Name $Adapter.Name -ComponentID ms_tcpip6
    Write-Host "✓ IPv6 disabled on $($Adapter.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Note: Some Microsoft services require IPv6 (e.g., DirectAccess)" -ForegroundColor Yellow`;
    }
  },

  {
    id: 'network-adapter-reset',
    name: 'Reset Network Adapter',
    category: 'Diagnostics & Testing',
    description: 'Disable and re-enable network adapter (equivalent to hardware reset)',
    parameters: [
      { id: 'adapterName', label: 'Adapter Name', type: 'text', required: true, placeholder: 'Ethernet' }
    ],
    scriptTemplate: (params) => {
      const adapterName = escapePowerShellString(params.adapterName);
      
      return `# Reset Network Adapter
# Generated: ${new Date().toISOString()}

$AdapterName = "${adapterName}"

Write-Host "Resetting adapter: $AdapterName" -ForegroundColor Cyan

# Disable adapter
Disable-NetAdapter -Name $AdapterName -Confirm:$false
Write-Host "✓ Adapter disabled" -ForegroundColor Yellow

# Wait 3 seconds
Start-Sleep -Seconds 3

# Enable adapter
Enable-NetAdapter -Name $AdapterName -Confirm:$false
Write-Host "✓ Adapter enabled" -ForegroundColor Green

# Wait for adapter to initialize
Start-Sleep -Seconds 5

# Display status
$Adapter = Get-NetAdapter -Name $AdapterName
Write-Host ""
Write-Host "Adapter Status:" -ForegroundColor Gray
Write-Host "  Name: $($Adapter.Name)" -ForegroundColor Gray
Write-Host "  Status: $($Adapter.Status)" -ForegroundColor Gray
Write-Host "  Speed: $($Adapter.LinkSpeed)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'set-nic-speed-duplex',
    name: 'Set NIC Speed & Duplex',
    category: 'Advanced NIC Config',
    description: 'Configure network adapter speed and duplex mode',
    parameters: [
      { id: 'adapterName', label: 'Adapter Name', type: 'text', required: true, placeholder: 'Ethernet' },
      { id: 'speed', label: 'Speed', type: 'select', required: true, options: ['Auto', '10Mbps', '100Mbps', '1Gbps'], defaultValue: 'Auto' },
      { id: 'duplex', label: 'Duplex', type: 'select', required: true, options: ['Auto', 'Half', 'Full'], defaultValue: 'Auto' }
    ],
    scriptTemplate: (params) => {
      const adapterName = escapePowerShellString(params.adapterName);
      const speed = params.speed;
      const duplex = params.duplex;
      
      return `# Set NIC Speed & Duplex
# Generated: ${new Date().toISOString()}

$AdapterName = "${adapterName}"
$Speed = "${speed}"
$Duplex = "${duplex}"

Write-Host "⚠ Note: This requires specific driver support" -ForegroundColor Yellow
Write-Host "Manual method (use Device Manager for guaranteed compatibility):" -ForegroundColor Gray
Write-Host '  1. Open Device Manager' -ForegroundColor Gray
Write-Host '  2. Network Adapters -> $AdapterName -> Properties' -ForegroundColor Gray
Write-Host '  3. Advanced tab -> Speed & Duplex' -ForegroundColor Gray
Write-Host ""

# PowerShell method (may not work on all adapters)
Write-Host "Attempting PowerShell configuration..." -ForegroundColor Cyan

if ($Speed -eq "Auto" -and $Duplex -eq "Auto") {
    # Enable auto-negotiation
    Set-NetAdapterAdvancedProperty -Name $AdapterName -DisplayName "Speed & Duplex" -DisplayValue "Auto Negotiation" -ErrorAction SilentlyContinue
    Write-Host "✓ Auto-negotiation enabled" -ForegroundColor Green
} else {
    Write-Host "Manual speed/duplex settings may require adapter-specific commands" -ForegroundColor Yellow
}`;
    }
  },
];
