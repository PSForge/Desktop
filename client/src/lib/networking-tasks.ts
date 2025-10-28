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
    instructions: `**How This Task Works:**
- Generates comprehensive network adapter report
- Shows IP addresses, DNS servers, gateways, MAC addresses
- Optionally includes disabled adapters
- Optional CSV export for documentation

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Optional: Export CSV file path
- Include disabled adapters: true or false (default: false)

**What the Script Does:**
1. Retrieves all network adapters (or only enabled if specified)
2. For each adapter: gets IPv4 configuration, DNS servers, default gateway
3. Compiles name, status, MAC address, IP, subnet, gateway, DNS, link speed
4. Displays formatted table
5. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Reports only IPv4 configuration (not IPv6)
- Disabled adapters excluded by default
- Typical use: network documentation, troubleshooting, inventory
- MAC address useful for network access control
- Link speed shows negotiated adapter speed
- CSV export useful for network documentation`,
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
    instructions: `**How This Task Works:**
- Configures static IP address on network adapter
- Sets IP, subnet mask, default gateway, and DNS servers
- Removes existing DHCP configuration
- Essential for servers and network infrastructure

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network adapter must exist
- Valid IP configuration for your network

**What You Need to Provide:**
- Adapter name (e.g., Ethernet, Ethernet0)
- Static IP address
- Prefix length/CIDR (typically 24 for 255.255.255.0)
- Default gateway IP
- DNS servers (comma-separated)

**What the Script Does:**
1. Retrieves specified network adapter
2. Removes existing IP address and route configuration
3. Configures new static IP with prefix length and gateway
4. Sets DNS server addresses
5. Reports configuration success

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Removes existing DHCP configuration
- Network connectivity briefly interrupted during change
- Typical use: servers, domain controllers, network infrastructure
- Verify IP not in use before assignment
- Prefix length 24 = 255.255.255.0, 16 = 255.255.0.0
- DNS servers: use internal DNS for domain environments
- Test connectivity after configuration change`,
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
    instructions: `**How This Task Works:**
- Enables DHCP for automatic IP configuration
- Removes static IP configuration
- Obtains IP, subnet, gateway, DNS from DHCP server
- Essential for workstations and mobile devices

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- DHCP server must be available on network
- Network adapter must exist

**What You Need to Provide:**
- Adapter name (e.g., Ethernet, Wi-Fi)

**What the Script Does:**
1. Retrieves specified network adapter
2. Enables DHCP for IP address assignment
3. Resets DNS to obtain from DHCP
4. Releases current IP address
5. Renews IP address from DHCP server

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Removes existing static IP configuration
- Network connectivity briefly interrupted during change
- Typical use: workstations, laptops, temporary devices
- DHCP server must be reachable
- IP address assigned by DHCP server
- DNS servers assigned by DHCP server
- Verify DHCP server configured correctly before enabling`,
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
    instructions: `**How This Task Works:**
- Tests connectivity to multiple hosts
- Sends ICMP echo requests (ping)
- Reports latency and packet loss
- Optionally includes traceroute for path analysis

**Prerequisites:**
- PowerShell 5.1 or later
- ICMP allowed through firewalls
- Network connectivity
- Standard user permissions (no admin required)

**What You Need to Provide:**
- Target hosts (comma-separated: hostnames or IP addresses)
- Ping count (default: 4 packets)
- Include traceroute: true or false (default: false)

**What the Script Does:**
1. For each target: sends specified number of ping packets
2. Reports reachability status (reachable or unreachable)
3. Shows packets sent, received, lost
4. Calculates average response time (latency)
5. If traceroute enabled: shows network path hop-by-hop

**Important Notes:**
- No administrator privileges required
- ICMP traffic must be allowed (some networks block ping)
- Typical use: troubleshooting connectivity, network diagnostics
- Packet loss indicates network issues
- High latency indicates congestion or distance
- Traceroute shows routers between source and destination
- Traceroute useful for identifying where connection fails
- Test both hostnames and IP addresses to isolate DNS issues`,
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
    instructions: `**How This Task Works:**
- Clears local DNS resolver cache
- Forces fresh DNS lookups
- Optionally registers DNS records
- Essential for troubleshooting DNS issues

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- DNS client service must be running

**What You Need to Provide:**
- Register DNS: true to register, false to only flush (default: false)

**What the Script Does:**
1. Displays DNS cache entry count before flush
2. Clears entire DNS resolver cache
3. Optionally initiates DNS registration (updates DNS server with computer name/IP)
4. Displays DNS cache entry count after flush (should be 0 or very low)

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Typical use: resolve DNS issues, force fresh lookups, troubleshoot name resolution
- Cache flush immediate and complete
- Next DNS lookup will query DNS server (slower first time)
- Register DNS updates Active Directory DNS with computer's IP
- Register DNS useful after IP address change
- Flush DNS resolves stale DNS entries
- Common fix for "can't reach website" after DNS changes`,
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
    instructions: `**How This Task Works:**
- Configures DNS servers on network adapters
- Supports single adapter or all enabled adapters
- Replaces existing DNS configuration
- Essential for network troubleshooting and configuration

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network adapter(s) must exist
- Valid DNS server addresses

**What You Need to Provide:**
- Adapter name (leave blank to configure all enabled adapters)
- DNS servers (comma-separated IP addresses)

**What the Script Does:**
1. Retrieves specified adapter or all enabled adapters
2. For each adapter: sets DNS server addresses
3. Reports success for each adapter configured

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Replaces existing DNS servers (not additive)
- Blank adapter name applies to all enabled adapters
- Typical use: standardize DNS across adapters, switch DNS providers
- Common DNS servers: 8.8.8.8/8.8.4.4 (Google), 1.1.1.1/1.0.0.1 (Cloudflare)
- Use internal DNS servers for domain environments
- Changes take effect immediately`,
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
    instructions: `**How This Task Works:**
- Tests DNS name resolution for multiple hostnames
- Uses configured DNS or specified DNS server
- Reports resolved IP addresses
- Essential for troubleshooting DNS issues

**Prerequisites:**
- PowerShell 5.1 or later
- Network connectivity to DNS server
- Standard user permissions (no admin required)
- DNS service reachable

**What You Need to Provide:**
- Hostnames to resolve (comma-separated)
- Optional: DNS server IP (blank uses configured DNS)

**What the Script Does:**
1. For each hostname: queries DNS for A records (IPv4)
2. Uses specified DNS server or configured default
3. Reports hostname to IP address mapping
4. Indicates resolution failures

**Important Notes:**
- No administrator privileges required
- Tests DNS resolution only (not connectivity to resolved IP)
- Typical use: troubleshoot DNS, verify DNS configuration, test specific DNS servers
- Blank DNS server uses adapter's configured DNS
- Specify DNS server to test alternative DNS providers
- Resolution failure indicates DNS issue or non-existent hostname
- Use with test-network-connectivity to verify full reachability`,
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
    instructions: `**How This Task Works:**
- Creates custom Windows Firewall rule
- Supports inbound and outbound rules
- Configures protocol, port, and remote address filtering
- Essential for securing network services

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Rule name (descriptive identifier)
- Direction: Inbound or Outbound
- Action: Allow or Block
- Protocol: TCP, UDP, or Any
- Optional: Specific port number
- Optional: Remote address/subnet (CIDR notation)

**What the Script Does:**
1. Builds firewall rule parameters
2. Creates new firewall rule with New-NetFirewallRule
3. Configures port and remote address if specified
4. Enables rule automatically
5. Displays rule configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Rule enabled automatically upon creation
- Blank port allows all ports
- Blank remote address allows any source
- Typical use: open ports for services, block unwanted traffic
- CIDR notation for subnets: 192.168.1.0/24
- Inbound rules control incoming connections
- Outbound rules control outgoing connections`,
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
    instructions: `**How This Task Works:**
- Lists Windows Firewall rules with filtering
- Optionally filters by direction and enabled status
- Optional CSV export for documentation
- Essential for firewall auditing and management

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Direction filter: All, Inbound, or Outbound (default: All)
- Enabled only: true to show only enabled rules, false for all (default: true)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves firewall rules based on filters
2. Filters by direction if specified
3. Filters by enabled status if specified
4. Selects rule name, direction, action, enabled status, profile
5. Displays formatted table
6. Reports total rule count
7. Optionally exports to CSV file

**Important Notes:**
- No administrator privileges required
- Enabled only filter excludes disabled rules (reduces clutter)
- Typical use: firewall audits, documentation, troubleshooting
- Profile: Domain, Public, Private
- CSV export useful for compliance documentation
- Review for unnecessary or conflicting rules`,
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
    instructions: `**How This Task Works:**
- Enables or disables Windows Firewall
- Supports all profiles or specific profile
- Applies immediately
- Essential for troubleshooting and security

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Action: Enable or Disable
- Profile: All, Domain, Public, or Private (default: All)

**What the Script Does:**
1. Applies enable/disable action to specified profile(s)
2. Updates firewall state
3. Displays current status for all profiles

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Disabling firewall creates security risk
- Typical use: troubleshooting connectivity, temporary testing
- Domain profile: applies when connected to domain network
- Public profile: applies to public networks (airports, cafes)
- Private profile: applies to home/work networks
- Re-enable firewall after troubleshooting
- Firewall should always be enabled in production`,
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
    instructions: `**How This Task Works:**
- Resets TCP/IP stack to factory defaults
- Resets Winsock catalog
- Optionally resets firewall to defaults
- Requires system reboot to take effect

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Plan for system reboot

**What You Need to Provide:**
- Reset firewall: true to also reset firewall, false for network only (default: false)

**What the Script Does:**
1. Resets Winsock catalog (network communication layer)
2. Resets TCP/IP stack to default configuration
3. Optionally resets Windows Firewall to defaults
4. Warns about required reboot

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- SYSTEM REBOOT REQUIRED after running
- All network configuration reset to defaults
- Typical use: resolve severe network issues, corrupted network stack
- Static IP configuration will be lost
- Firewall rules will be lost if reset firewall enabled
- DNS settings reset to defaults
- Last resort troubleshooting tool
- Save current network configuration before reset`,
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
    instructions: `**How This Task Works:**
- Tests TCP connectivity to specific ports
- Reports open/closed status for each port
- Essential for troubleshooting service availability
- Tests one host with multiple ports

**Prerequisites:**
- PowerShell 5.1 or later
- Network connectivity to target
- Standard user permissions (no admin required)
- Target firewall may block tests

**What You Need to Provide:**
- Target host (hostname or IP address)
- Ports to test (comma-separated port numbers)

**What the Script Does:**
1. For each port: attempts TCP connection to target
2. Reports port status: Open or Closed
3. Displays connection test results
4. Shows overall connectivity summary

**Important Notes:**
- No administrator privileges required
- Tests TCP connectivity only (not UDP)
- Typical use: verify service availability, troubleshoot firewall rules
- Common ports: 80 (HTTP), 443 (HTTPS), 3389 (RDP), 445 (SMB)
- Open port indicates service listening
- Closed port indicates firewall block or no service
- Timeout indicates network unreachable or filtered
- Use responsibly (unauthorized port scanning may violate policies)`,
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
    instructions: `**How This Task Works:**
- Disables IPv6 protocol on specified adapters
- Can target single adapter or all active adapters
- Unbinds IPv6 from network interface
- Essential for environments that don't use IPv6

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network adapter(s) must exist
- Be aware of Microsoft service dependencies

**What You Need to Provide:**
- Adapter name (optional - leave blank to disable on all active adapters)

**What the Script Does:**
1. Identifies target adapter(s) (specific or all active)
2. Disables IPv6 binding on each adapter
3. Displays confirmation for each adapter
4. Shows warning about Microsoft service dependencies

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Some Microsoft services require IPv6 (DirectAccess, Windows Defender ATP)
- Typical use: compliance requirements, troubleshooting, security hardening
- Does not remove IPv6, only disables binding
- Changes take effect immediately (no reboot required)
- To re-enable: Enable-NetAdapterBinding -ComponentID ms_tcpip6
- May affect Microsoft 365/Azure connectivity
- Consider firewall rules instead of full disable`,
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
    instructions: `**How This Task Works:**
- Resets network adapter by disable/enable cycle
- Equivalent to physical disconnect/reconnect
- Clears adapter state and re-initializes
- Essential for resolving adapter issues

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network adapter must exist
- Brief network connectivity loss expected

**What You Need to Provide:**
- Adapter name to reset

**What the Script Does:**
1. Disables specified network adapter
2. Waits 3 seconds for complete shutdown
3. Re-enables network adapter
4. Waits 5 seconds for initialization
5. Displays adapter status (name, status, link speed)

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Network connectivity lost during reset (6-8 seconds)
- Typical use: resolve adapter issues, clear stuck state, force re-negotiation
- Equivalent to "Disable" then "Enable" in Device Manager
- DHCP clients will renew IP address
- May resolve link speed negotiation issues
- Remote connections may be lost during reset
- Wait for full initialization before testing connectivity`,
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
    instructions: `**How This Task Works:**
- Configures network adapter speed and duplex settings
- Disables auto-negotiation for manual settings
- Requires driver support (not all adapters supported)
- Device Manager method more reliable

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network adapter with driver support for speed/duplex control
- Understanding of network requirements

**What You Need to Provide:**
- Adapter name
- Speed: Auto, 10Mbps, 100Mbps, or 1Gbps
- Duplex: Auto, Half, or Full

**What the Script Does:**
1. Warns about driver support requirements
2. Provides Device Manager manual method instructions
3. Attempts PowerShell configuration if Auto/Auto selected
4. Recommends Device Manager for guaranteed compatibility

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- PowerShell method limited by driver support
- Device Manager method more reliable for manual settings
- Typical use: resolve speed mismatch, force specific speed, troubleshoot negotiation
- Auto/Auto recommended (allows negotiation)
- Manual settings must match switch port configuration
- Speed/duplex mismatch causes connectivity issues
- Full duplex preferred for modern networks
- Consult network team before manual configuration`,
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
