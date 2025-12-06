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
  isPremium?: boolean;
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

  {
    id: 'test-port',
    name: 'Test Port Connectivity',
    category: 'Troubleshooting',
    description: 'Test if specific TCP port is open and accessible',
    instructions: `**How This Task Works:**
- Tests TCP port connectivity to remote host
- Verifies if port is open and accepting connections
- Useful for firewall and service troubleshooting
- Shows response time for successful connections

**Prerequisites:**
- PowerShell 5.1 or later
- Network connectivity to target host
- No administrator rights required

**What You Need to Provide:**
- Target hostname or IP address
- Port number (e.g., 80, 443, 3389, 445)
- Timeout in seconds (default: 5)

**What the Script Does:**
1. Attempts TCP connection to specified port
2. Reports success or failure
3. Shows connection time if successful
4. Provides troubleshooting guidance

**Important Notes:**
- Does not test UDP ports (TCP only)
- Common ports: 80 (HTTP), 443 (HTTPS), 3389 (RDP), 445 (SMB), 22 (SSH)
- Firewall rules may block connection attempts
- Timeout recommended: 5-10 seconds
- Successful test means port is reachable and listening`,
    parameters: [
      { id: 'targetHost', label: 'Target Host/IP', type: 'text', required: true, placeholder: 'server.domain.com' },
      { id: 'port', label: 'Port Number', type: 'number', required: true, placeholder: '443' },
      { id: 'timeout', label: 'Timeout (seconds)', type: 'number', required: false, defaultValue: 5 }
    ],
    scriptTemplate: (params) => {
      const targetHost = escapePowerShellString(params.targetHost);
      const port = Number(params.port);
      const timeout = Number(params.timeout || 5);
      
      return `# Test Port Connectivity
# Generated: ${new Date().toISOString()}

$Target = "${targetHost}"
$Port = ${port}
$Timeout = ${timeout}

Write-Host "Testing TCP port $Port on $Target..." -ForegroundColor Gray

try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connectTask = $tcpClient.ConnectAsync($Target, $Port)
    $timeoutTask = [System.Threading.Tasks.Task]::Delay($Timeout * 1000)
    
    $completedTask = [System.Threading.Tasks.Task]::WhenAny($connectTask, $timeoutTask).Result
    
    if ($completedTask -eq $connectTask) {
        if ($tcpClient.Connected) {
            Write-Host "✓ Port $Port is OPEN on $Target" -ForegroundColor Green
            Write-Host "  Connection successful" -ForegroundColor Gray
        } else {
            Write-Host "✗ Port $Port is CLOSED on $Target" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Connection timed out after $Timeout seconds" -ForegroundColor Red
        Write-Host "  Port may be filtered or host unreachable" -ForegroundColor Yellow
    }
    
    $tcpClient.Close()
} catch {
    Write-Host "✗ Connection failed: $_" -ForegroundColor Red
    Write-Host "  Check firewall rules and network connectivity" -ForegroundColor Yellow
}`;
    }
  },

  {
    id: 'get-firewall-rules',
    name: 'Get Firewall Rules Report',
    category: 'Firewall',
    description: 'List Windows Firewall rules with details',
    instructions: `**How This Task Works:**
- Lists all Windows Firewall rules
- Filters by enabled/disabled status
- Shows rule name, direction, action, protocol, ports
- Exports to CSV for analysis

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended (for full details)
- Windows Firewall service must be running

**What You Need to Provide:**
- Rule status filter: All, Enabled, or Disabled
- Optional: CSV export path

**What the Script Does:**
1. Retrieves Windows Firewall rules
2. Filters by enabled/disabled status
3. Shows name, direction, action, protocol, port
4. Formats results in table
5. Optionally exports to CSV

**Important Notes:**
- Administrator rights show all details
- Direction: Inbound or Outbound
- Action: Allow or Block
- Typical use: security audit, troubleshooting
- CSV export for documentation`,
    parameters: [
      { id: 'status', label: 'Filter by Status', type: 'select', required: false, options: ['All', 'Enabled', 'Disabled'], defaultValue: 'Enabled' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const status = params.status || 'Enabled';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Firewall Rules Report
# Generated: ${new Date().toISOString()}

$Status = "${status}"

Write-Host "Retrieving firewall rules..." -ForegroundColor Gray

if ($Status -eq "All") {
    $Rules = Get-NetFirewallRule
} elseif ($Status -eq "Enabled") {
    $Rules = Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'True' }
} else {
    $Rules = Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'False' }
}

$Report = $Rules | ForEach-Object {
    $PortFilter = $_ | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Name = $_.DisplayName
        Enabled = $_.Enabled
        Direction = $_.Direction
        Action = $_.Action
        Protocol = $PortFilter.Protocol
        LocalPort = $PortFilter.LocalPort
        RemotePort = $PortFilter.RemotePort
    }
} | Sort-Object Name

Write-Host ""
Write-Host "✓ Found $($Report.Count) firewall rules ($Status):" -ForegroundColor Green
$Report | Format-Table -AutoSize

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'add-firewall-rule',
    name: 'Add Windows Firewall Rule',
    category: 'Firewall',
    description: 'Create new inbound or outbound firewall rule',
    instructions: `**How This Task Works:**
- Creates new Windows Firewall rule
- Supports TCP/UDP protocols and specific ports
- Configures inbound or outbound direction
- Allows or blocks traffic as specified

**Prerequisites:**
- Administrator privileges REQUIRED
- PowerShell 5.1 or later
- Windows Firewall service must be running

**What You Need to Provide:**
- Rule name (unique identifier)
- Direction: Inbound or Outbound
- Action: Allow or Block
- Protocol: TCP or UDP
- Port number(s) - comma-separated for multiple
- Optional: Description

**What the Script Does:**
1. Validates administrator privileges
2. Checks if rule name already exists
3. Creates firewall rule with specified settings
4. Enables the rule automatically
5. Confirms successful creation

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Rule names must be unique
- Multiple ports: comma-separated (e.g., 80,443,8080)
- Inbound: controls incoming connections
- Outbound: controls outgoing connections
- Test rule after creation`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Allow Web Traffic' },
      { id: 'direction', label: 'Direction', type: 'select', required: true, options: ['Inbound', 'Outbound'], defaultValue: 'Inbound' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Allow', 'Block'], defaultValue: 'Allow' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['TCP', 'UDP'], defaultValue: 'TCP' },
      { id: 'ports', label: 'Port(s)', type: 'text', required: true, placeholder: '80,443' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Allow HTTP and HTTPS traffic' }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const direction = params.direction;
      const action = params.action;
      const protocol = params.protocol;
      const ports = escapePowerShellString(params.ports);
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# Add Windows Firewall Rule
# Generated: ${new Date().toISOString()}

# Check for admin privileges
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $IsAdmin) {
    Write-Host "✗ Administrator privileges required" -ForegroundColor Red
    exit 1
}

$RuleName = "${ruleName}"
$Direction = "${direction}"
$Action = "${action}"
$Protocol = "${protocol}"
$Ports = "${ports}"
${description ? `$Description = "${description}"` : ''}

# Check if rule already exists
$Existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "✗ Firewall rule already exists: $RuleName" -ForegroundColor Red
    exit 1
}

Write-Host "Creating firewall rule..." -ForegroundColor Gray

try {
    New-NetFirewallRule \`
        -DisplayName $RuleName \`
        -Direction $Direction \`
        -Action $Action \`
        -Protocol $Protocol \`
        -LocalPort $Ports \`
        ${description ? '-Description $Description \\`' : ''}
        -Enabled True \`
        -ErrorAction Stop | Out-Null
    
    Write-Host ""
    Write-Host "✓ Firewall rule created successfully" -ForegroundColor Green
    Write-Host "  Name: $RuleName" -ForegroundColor Gray
    Write-Host "  Direction: $Direction" -ForegroundColor Gray
    Write-Host "  Action: $Action" -ForegroundColor Gray
    Write-Host "  Protocol: $Protocol" -ForegroundColor Gray
    Write-Host "  Port(s): $Ports" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create firewall rule: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'traceroute',
    name: 'Trace Network Route',
    category: 'Troubleshooting',
    description: 'Trace network path to destination with hop-by-hop details',
    instructions: `**How This Task Works:**
- Traces network route to destination
- Shows each router/hop along the path
- Displays response time for each hop
- Identifies network bottlenecks

**Prerequisites:**
- PowerShell 5.1 or later
- Network connectivity
- No administrator rights required
- ICMP traffic allowed (not blocked by firewalls)

**What You Need to Provide:**
- Target hostname or IP address
- Maximum hops (default: 30)

**What the Script Does:**
1. Sends ICMP packets with incrementing TTL
2. Records each router hop response
3. Shows hostname/IP and response time
4. Identifies where failures occur
5. Maps complete network path

**Important Notes:**
- May take 30-60 seconds to complete
- Some hops may not respond (show as *)
- Firewalls may block ICMP causing gaps
- Useful for diagnosing routing issues
- High latency hops indicate problems
- Typical use: diagnose slow connections`,
    parameters: [
      { id: 'targetHost', label: 'Target Host/IP', type: 'text', required: true, placeholder: 'google.com' },
      { id: 'maxHops', label: 'Maximum Hops', type: 'number', required: false, defaultValue: 30 }
    ],
    scriptTemplate: (params) => {
      const targetHost = escapePowerShellString(params.targetHost);
      const maxHops = Number(params.maxHops || 30);
      
      return `# Trace Network Route
# Generated: ${new Date().toISOString()}

$Target = "${targetHost}"
$MaxHops = ${maxHops}

Write-Host "Tracing route to $Target over maximum of $MaxHops hops..." -ForegroundColor Gray
Write-Host ""

tracert -h $MaxHops $Target

Write-Host ""
Write-Host "✓ Trace complete" -ForegroundColor Green
Write-Host ""
Write-Host "Interpreting results:" -ForegroundColor Cyan
Write-Host "  * = Hop did not respond (may be firewalled)" -ForegroundColor Gray
Write-Host "  High ms values (>100) indicate network congestion" -ForegroundColor Gray
Write-Host "  Request timed out = connectivity issue at that hop" -ForegroundColor Gray`;
    }
  },

  {
    id: 'ping-multiple',
    name: 'Ping Multiple Hosts',
    category: 'Troubleshooting',
    description: 'Test connectivity to multiple hosts and generate report',
    instructions: `**How This Task Works:**
- Pings multiple hosts from a list
- Tests network connectivity and response time
- Generates summary report
- Identifies reachable vs unreachable hosts

**Prerequisites:**
- PowerShell 5.1 or later
- Network connectivity
- No administrator rights required
- ICMP traffic allowed

**What You Need to Provide:**
- Comma-separated list of hostnames/IPs
- Ping count per host (default: 4)
- Optional: CSV export path

**What the Script Does:**
1. Parses host list
2. Pings each host specified number of times
3. Calculates average response time
4. Identifies successful vs failed pings
5. Generates summary report
6. Optionally exports to CSV

**Important Notes:**
- Firewalls may block ICMP
- Average response time shows network performance
- Failed pings may indicate: host down, firewall block, routing issue
- Typical use: verify multiple server connectivity
- CSV export for documentation`,
    parameters: [
      { id: 'hostList', label: 'Host List (comma-separated)', type: 'textarea', required: true, placeholder: 'server1.domain.com, 192.168.1.10, google.com' },
      { id: 'pingCount', label: 'Ping Count per Host', type: 'number', required: false, defaultValue: 4 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const hostList = escapePowerShellString(params.hostList);
      const pingCount = Number(params.pingCount || 4);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Ping Multiple Hosts
# Generated: ${new Date().toISOString()}

$HostList = "${hostList}" -split ',' | ForEach-Object { $_.Trim() }
$PingCount = ${pingCount}

Write-Host "Pinging $($HostList.Count) hosts ($PingCount pings each)..." -ForegroundColor Gray
Write-Host ""

$Results = foreach ($Host in $HostList) {
    Write-Host "Testing: $Host..." -ForegroundColor Gray
    
    $PingResult = Test-Connection -ComputerName $Host -Count $PingCount -ErrorAction SilentlyContinue
    
    if ($PingResult) {
        $AvgTime = ($PingResult | Measure-Object -Property ResponseTime -Average).Average
        [PSCustomObject]@{
            Host = $Host
            Status = "Reachable"
            AvgResponseTime = [math]::Round($AvgTime, 2)
            PacketsReceived = $PingResult.Count
            PacketsSent = $PingCount
        }
    } else {
        [PSCustomObject]@{
            Host = $Host
            Status = "Unreachable"
            AvgResponseTime = "N/A"
            PacketsReceived = 0
            PacketsSent = $PingCount
        }
    }
}

Write-Host ""
Write-Host "✓ Ping test complete:" -ForegroundColor Green
$Results | Format-Table -AutoSize

$Reachable = ($Results | Where-Object { $_.Status -eq "Reachable" }).Count
$Total = $Results.Count
Write-Host ""
Write-Host "Summary: $Reachable of $Total hosts reachable" -ForegroundColor Cyan

${exportPath ? `$Results | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  // === NEW TASKS START HERE ===

  {
    id: 'get-active-connections',
    name: 'Get Active Network Connections',
    category: 'Network Monitoring',
    description: 'List all active TCP/UDP connections with process information',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all active TCP and UDP connections
- Shows local and remote endpoints
- Includes process name and PID for each connection
- Essential for security auditing and troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended for full process details
- Network connectivity

**What You Need to Provide:**
- State filter: All, Established, Listen, or TimeWait (default: All)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all TCP connections with Get-NetTCPConnection
2. Filters by connection state if specified
3. Maps each connection to its owning process
4. Displays local address, remote address, state, process name, PID
5. Optionally exports to CSV for analysis

**Important Notes:**
- Administrator privileges show all process details
- Established connections are active communications
- Listen state indicates services waiting for connections
- TimeWait shows recently closed connections
- Typical use: security audits, identify network-heavy processes, troubleshoot
- Watch for unexpected outbound connections
- Remote address shows destination server`,
    parameters: [
      { id: 'state', label: 'Connection State', type: 'select', required: false, options: ['All', 'Established', 'Listen', 'TimeWait'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const state = params.state || 'All';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Active Network Connections
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving active network connections..." -ForegroundColor Gray

$Connections = Get-NetTCPConnection${state !== 'All' ? ` -State ${state}` : ''} -ErrorAction SilentlyContinue

$Report = $Connections | ForEach-Object {
    $Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        LocalAddress = "$($_.LocalAddress):$($_.LocalPort)"
        RemoteAddress = "$($_.RemoteAddress):$($_.RemotePort)"
        State = $_.State
        ProcessName = $Process.ProcessName
        PID = $_.OwningProcess
    }
} | Sort-Object State, ProcessName

Write-Host ""
Write-Host "Active Connections:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total connections: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-bandwidth-stats',
    name: 'Get Network Bandwidth Statistics',
    category: 'Network Monitoring',
    description: 'Monitor network adapter bandwidth usage and traffic statistics',
    isPremium: true,
    instructions: `**How This Task Works:**
- Retrieves network adapter traffic statistics
- Shows bytes sent/received over time
- Calculates throughput in Mbps
- Essential for performance monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Network adapter(s) must exist

**What You Need to Provide:**
- Adapter name (optional - blank for all active adapters)
- Monitoring duration in seconds (default: 10)
- Sample interval in seconds (default: 2)

**What the Script Does:**
1. Captures initial adapter statistics
2. Waits for specified interval
3. Captures final statistics
4. Calculates bytes transferred during interval
5. Converts to Mbps throughput
6. Displays results per adapter

**Important Notes:**
- No administrator privileges required
- Statistics include all traffic types
- Mbps calculated from actual bytes transferred
- Typical use: identify bandwidth hogs, verify throughput, capacity planning
- Results show point-in-time snapshot
- Run during representative workload for accurate results
- Compare to adapter link speed for utilization percentage`,
    parameters: [
      { id: 'adapterName', label: 'Adapter Name (blank for all)', type: 'text', required: false, placeholder: 'Ethernet' },
      { id: 'duration', label: 'Duration (seconds)', type: 'number', required: false, defaultValue: 10 },
      { id: 'interval', label: 'Sample Interval (seconds)', type: 'number', required: false, defaultValue: 2 }
    ],
    scriptTemplate: (params) => {
      const adapterName = params.adapterName ? escapePowerShellString(params.adapterName) : '';
      const duration = Number(params.duration || 10);
      const interval = Number(params.interval || 2);
      
      return `# Get Network Bandwidth Statistics
# Generated: ${new Date().toISOString()}

$Duration = ${duration}
$Interval = ${interval}

${adapterName ? `$Adapters = Get-NetAdapter -Name "${adapterName}" | Where-Object { $_.Status -eq 'Up' }` : `$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }`}

Write-Host "Monitoring network bandwidth for $Duration seconds..." -ForegroundColor Cyan
Write-Host ""

$StartTime = Get-Date
$EndTime = $StartTime.AddSeconds($Duration)

$Results = @()

foreach ($Adapter in $Adapters) {
    $Initial = Get-NetAdapterStatistics -Name $Adapter.Name
    $InitialReceived = $Initial.ReceivedBytes
    $InitialSent = $Initial.SentBytes
    
    Start-Sleep -Seconds $Duration
    
    $Final = Get-NetAdapterStatistics -Name $Adapter.Name
    $FinalReceived = $Final.ReceivedBytes
    $FinalSent = $Final.SentBytes
    
    $ReceivedBytes = $FinalReceived - $InitialReceived
    $SentBytes = $FinalSent - $InitialSent
    
    $ReceivedMbps = [math]::Round(($ReceivedBytes * 8 / $Duration) / 1000000, 2)
    $SentMbps = [math]::Round(($SentBytes * 8 / $Duration) / 1000000, 2)
    
    $Results += [PSCustomObject]@{
        Adapter = $Adapter.Name
        LinkSpeed = $Adapter.LinkSpeed
        ReceivedMB = [math]::Round($ReceivedBytes / 1MB, 2)
        SentMB = [math]::Round($SentBytes / 1MB, 2)
        ReceiveMbps = $ReceivedMbps
        SendMbps = $SentMbps
    }
}

Write-Host "Bandwidth Statistics (over $Duration seconds):" -ForegroundColor Green
$Results | Format-Table -AutoSize`;
    }
  },

  {
    id: 'create-smb-share',
    name: 'Create SMB Network Share',
    category: 'Network Shares',
    description: 'Create a new SMB file share with permissions',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a new SMB (Server Message Block) network share
- Configures share name and folder path
- Sets access permissions for users/groups
- Essential for file sharing in Windows environments

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Folder path must exist
- File sharing feature must be enabled

**What You Need to Provide:**
- Share name (UNC path name, e.g., "SharedDocs")
- Folder path to share (must exist)
- Access level: Read, Change, or Full
- User/group for permissions (default: Everyone)

**What the Script Does:**
1. Validates folder path exists
2. Checks if share name already exists
3. Creates new SMB share
4. Applies specified access permissions
5. Displays share configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Share name must be unique on the server
- Folder must exist before creating share
- Access levels: Read (view), Change (modify), Full (all including permissions)
- UNC path will be \\\\servername\\sharename
- Both share and NTFS permissions apply (most restrictive wins)
- Consider using AD groups instead of Everyone for security
- Typical use: file server shares, departmental folders, application data`,
    parameters: [
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'SharedDocs' },
      { id: 'folderPath', label: 'Folder Path', type: 'path', required: true, placeholder: 'C:\\Shares\\Documents' },
      { id: 'accessLevel', label: 'Access Level', type: 'select', required: true, options: ['Read', 'Change', 'Full'], defaultValue: 'Read' },
      { id: 'accessAccount', label: 'User/Group', type: 'text', required: false, defaultValue: 'Everyone', placeholder: 'Domain\\Group or Everyone' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Shared documents folder' }
    ],
    scriptTemplate: (params) => {
      const shareName = escapePowerShellString(params.shareName);
      const folderPath = escapePowerShellString(params.folderPath);
      const accessLevel = params.accessLevel;
      const accessAccount = escapePowerShellString(params.accessAccount || 'Everyone');
      const description = params.description ? escapePowerShellString(params.description) : '';
      
      return `# Create SMB Network Share
# Generated: ${new Date().toISOString()}

$ShareName = "${shareName}"
$FolderPath = "${folderPath}"
$AccessLevel = "${accessLevel}"
$AccessAccount = "${accessAccount}"
${description ? `$Description = "${description}"` : ''}

# Validate folder exists
if (-not (Test-Path $FolderPath)) {
    Write-Host "✗ Folder does not exist: $FolderPath" -ForegroundColor Red
    Write-Host "  Create the folder first, then run this script again." -ForegroundColor Yellow
    exit 1
}

# Check if share already exists
$ExistingShare = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
if ($ExistingShare) {
    Write-Host "✗ Share already exists: $ShareName" -ForegroundColor Red
    exit 1
}

Write-Host "Creating SMB share..." -ForegroundColor Gray

try {
    New-SmbShare -Name $ShareName -Path $FolderPath ${description ? '-Description $Description' : ''} -ErrorAction Stop | Out-Null
    
    # Grant access
    Grant-SmbShareAccess -Name $ShareName -AccountName $AccessAccount -AccessRight $AccessLevel -Force | Out-Null
    
    Write-Host ""
    Write-Host "✓ SMB share created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Share Details:" -ForegroundColor Cyan
    Write-Host "  Name: $ShareName" -ForegroundColor Gray
    Write-Host "  Path: $FolderPath" -ForegroundColor Gray
    Write-Host "  UNC Path: \\\\$env:COMPUTERNAME\\$ShareName" -ForegroundColor Gray
    Write-Host "  Access: $AccessAccount ($AccessLevel)" -ForegroundColor Gray
    
    Get-SmbShareAccess -Name $ShareName | Format-Table
} catch {
    Write-Host "✗ Failed to create share: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'list-smb-shares',
    name: 'List SMB Shares',
    category: 'Network Shares',
    description: 'List all SMB shares with permissions and access details',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all SMB shares on the local computer
- Shows share name, path, and description
- Displays access permissions for each share
- Optional CSV export for documentation

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions for basic info
- Administrator for full permission details

**What You Need to Provide:**
- Include hidden shares: true to include administrative shares (C$, ADMIN$), false to exclude (default: false)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all SMB shares
2. Optionally filters out hidden/administrative shares
3. Displays share name, path, description
4. Shows current sessions and access permissions
5. Optionally exports to CSV

**Important Notes:**
- No administrator privileges required for basic listing
- Hidden shares have $ suffix (e.g., C$, ADMIN$)
- Administrative shares are created by default on Windows
- Typical use: share inventory, security audit, documentation
- Shows who has what level of access
- UNC paths available for each share
- Current connections shown if any`,
    parameters: [
      { id: 'includeHidden', label: 'Include Hidden Shares ($)', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const includeHidden = toPowerShellBoolean(params.includeHidden ?? false);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# List SMB Shares
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving SMB shares..." -ForegroundColor Gray

$Shares = Get-SmbShare${includeHidden ? '' : ' | Where-Object { $_.Name -notlike "*$" }'}

$Report = foreach ($Share in $Shares) {
    $Access = Get-SmbShareAccess -Name $Share.Name -ErrorAction SilentlyContinue | 
              ForEach-Object { "$($_.AccountName): $($_.AccessRight)" }
    
    [PSCustomObject]@{
        Name = $Share.Name
        Path = $Share.Path
        Description = $Share.Description
        UNCPath = "\\\\$env:COMPUTERNAME\\$($Share.Name)"
        Access = ($Access -join '; ')
    }
}

Write-Host ""
Write-Host "SMB Shares on $env:COMPUTERNAME:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "Total shares: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'remove-smb-share',
    name: 'Remove SMB Share',
    category: 'Network Shares',
    description: 'Remove an existing SMB network share',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes an existing SMB share
- Does NOT delete the underlying folder
- Disconnects active sessions to the share
- Essential for share management

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Share must exist

**What You Need to Provide:**
- Share name to remove
- Force disconnect: true to disconnect active sessions, false to warn (default: false)

**What the Script Does:**
1. Verifies share exists
2. Checks for active sessions
3. Optionally disconnects active sessions
4. Removes the SMB share
5. Confirms removal

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Only removes share, NOT the folder or files
- Active sessions will be disconnected if forced
- Users may lose unsaved work if force disconnected
- Typical use: cleanup, security, share reorganization
- Administrative shares (C$, ADMIN$) recreate on reboot
- Consider warning users before removing active shares`,
    parameters: [
      { id: 'shareName', label: 'Share Name', type: 'text', required: true, placeholder: 'SharedDocs' },
      { id: 'forceDisconnect', label: 'Force Disconnect Sessions', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const shareName = escapePowerShellString(params.shareName);
      const forceDisconnect = toPowerShellBoolean(params.forceDisconnect ?? false);
      
      return `# Remove SMB Share
# Generated: ${new Date().toISOString()}

$ShareName = "${shareName}"

# Verify share exists
$Share = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
if (-not $Share) {
    Write-Host "✗ Share not found: $ShareName" -ForegroundColor Red
    exit 1
}

Write-Host "Share found: $ShareName" -ForegroundColor Gray
Write-Host "  Path: $($Share.Path)" -ForegroundColor Gray

# Check for active sessions
$Sessions = Get-SmbSession -ErrorAction SilentlyContinue | Where-Object { $_.NumOpens -gt 0 }
if ($Sessions -and -not ${forceDisconnect}) {
    Write-Host ""
    Write-Host "⚠ Active sessions detected. Use Force Disconnect to proceed." -ForegroundColor Yellow
    $Sessions | Format-Table ClientUserName, ClientComputerName, NumOpens
    exit 1
}

Write-Host ""
Write-Host "Removing share..." -ForegroundColor Gray

try {
    Remove-SmbShare -Name $ShareName -Force -ErrorAction Stop
    Write-Host ""
    Write-Host "✓ Share removed successfully: $ShareName" -ForegroundColor Green
    Write-Host "  Note: Folder and files NOT deleted" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to remove share: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-smb-sessions',
    name: 'Get SMB Sessions and Open Files',
    category: 'Network Shares',
    description: 'View active SMB sessions and open files on shares',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all active SMB sessions to the server
- Shows which users are connected from where
- Displays open files on each share
- Essential for server management and troubleshooting

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- SMB Server service running

**What You Need to Provide:**
- Show open files: true to include open file details, false for sessions only (default: true)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all active SMB sessions
2. Shows client username and computer
3. Optionally lists all open files per session
4. Displays share name and file path for each open file

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Sessions show who is connected
- Open files show what they're accessing
- Typical use: identify who has files locked, troubleshoot "file in use" errors
- Can close sessions to release locked files
- High session counts may indicate issues
- Remote computer names show connection source`,
    parameters: [
      { id: 'showOpenFiles', label: 'Show Open Files', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const showOpenFiles = toPowerShellBoolean(params.showOpenFiles ?? true);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get SMB Sessions and Open Files
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving SMB sessions..." -ForegroundColor Gray

$Sessions = Get-SmbSession -ErrorAction SilentlyContinue

if (-not $Sessions) {
    Write-Host ""
    Write-Host "No active SMB sessions found." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Active SMB Sessions:" -ForegroundColor Cyan
    $Sessions | Select-Object SessionId, ClientUserName, ClientComputerName, NumOpens, SecondsExists | Format-Table -AutoSize
    
    Write-Host "Total sessions: $($Sessions.Count)" -ForegroundColor Gray
}

${showOpenFiles ? `
Write-Host ""
Write-Host "Open Files:" -ForegroundColor Cyan

$OpenFiles = Get-SmbOpenFile -ErrorAction SilentlyContinue

if (-not $OpenFiles) {
    Write-Host "No open files found." -ForegroundColor Yellow
} else {
    $OpenFiles | Select-Object FileId, SessionId, ClientUserName, Path, ShareRelativePath | Format-Table -AutoSize
    Write-Host "Total open files: $($OpenFiles.Count)" -ForegroundColor Gray
}` : ''}

${exportPath ? `
$Report = $Sessions | Select-Object SessionId, ClientUserName, ClientComputerName, NumOpens, SecondsExists
$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'configure-dns-forwarders',
    name: 'Configure DNS Forwarders',
    category: 'DNS Management',
    description: 'Configure DNS forwarders on a Windows DNS Server',
    isPremium: true,
    instructions: `**How This Task Works:**
- Configures DNS forwarding on Windows DNS Server
- Sets external DNS servers for non-authoritative queries
- Essential for DNS resolution of internet names
- Replaces existing forwarders with new configuration

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with DnsServer module
- Windows DNS Server role installed
- DNS Server service running

**What You Need to Provide:**
- Forwarder IP addresses (comma-separated)
- Use root hints if forwarders unavailable: true or false (default: true)

**What the Script Does:**
1. Clears existing DNS forwarders
2. Adds new forwarder IP addresses
3. Configures root hints fallback setting
4. Displays new forwarder configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REQUIRES DNS Server role (not for DNS client)
- Forwarders used for queries DNS server can't resolve locally
- Common forwarders: 8.8.8.8, 1.1.1.1, your ISP's DNS
- Root hints used as backup if forwarders fail
- Order matters: first forwarder tried first
- Typical use: configure internal DNS to forward internet queries
- Test resolution after configuration change`,
    parameters: [
      { id: 'forwarders', label: 'Forwarder IPs (comma-separated)', type: 'text', required: true, placeholder: '8.8.8.8,8.8.4.4' },
      { id: 'useRootHints', label: 'Use Root Hints if Unavailable', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const forwarders = params.forwarders.split(',').map((f: string) => f.trim());
      const useRootHints = toPowerShellBoolean(params.useRootHints ?? true);
      
      return `# Configure DNS Forwarders
# Generated: ${new Date().toISOString()}

# Check for DNS Server role
$DnsServer = Get-Service -Name DNS -ErrorAction SilentlyContinue
if (-not $DnsServer) {
    Write-Host "✗ DNS Server role not installed" -ForegroundColor Red
    exit 1
}

$Forwarders = ${buildPowerShellArray(forwarders)}
$UseRootHints = ${useRootHints}

Write-Host "Configuring DNS forwarders..." -ForegroundColor Gray

try {
    # Clear existing forwarders
    Set-DnsServerForwarder -IPAddress @() -ErrorAction Stop
    
    # Add new forwarders
    foreach ($Forwarder in $Forwarders) {
        Add-DnsServerForwarder -IPAddress $Forwarder -ErrorAction Stop
        Write-Host "  Added forwarder: $Forwarder" -ForegroundColor Gray
    }
    
    # Configure root hints fallback
    Set-DnsServerForwarder -UseRootHint $UseRootHints -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ DNS forwarders configured successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current Configuration:" -ForegroundColor Cyan
    Get-DnsServerForwarder | Format-List
} catch {
    Write-Host "✗ Failed to configure forwarders: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-dns-zones',
    name: 'Get DNS Zones',
    category: 'DNS Management',
    description: 'List all DNS zones on a Windows DNS Server',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all DNS zones hosted on DNS server
- Shows zone name, type, and status
- Displays zone replication scope
- Essential for DNS server management

**Prerequisites:**
- PowerShell 5.1 or later with DnsServer module
- Windows DNS Server role installed
- Standard user permissions (admin for full details)

**What You Need to Provide:**
- Zone type filter: All, Primary, Secondary, or Stub (default: All)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all DNS zones
2. Filters by zone type if specified
3. Shows zone name, type, status, dynamic update setting
4. Displays AD-integrated replication scope
5. Optionally exports to CSV

**Important Notes:**
- REQUIRES DNS Server role installed
- Primary zones: authoritative, locally managed
- Secondary zones: read-only copies from primary
- Stub zones: contain only NS records
- AD-integrated zones stored in Active Directory
- Typical use: DNS inventory, troubleshooting, documentation
- Zone status shows if zone is loading or active`,
    parameters: [
      { id: 'zoneType', label: 'Zone Type', type: 'select', required: false, options: ['All', 'Primary', 'Secondary', 'Stub'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const zoneType = params.zoneType || 'All';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get DNS Zones
# Generated: ${new Date().toISOString()}

# Check for DNS Server role
$DnsServer = Get-Service -Name DNS -ErrorAction SilentlyContinue
if (-not $DnsServer) {
    Write-Host "✗ DNS Server role not installed" -ForegroundColor Red
    exit 1
}

Write-Host "Retrieving DNS zones..." -ForegroundColor Gray

$Zones = Get-DnsServerZone -ErrorAction SilentlyContinue${zoneType !== 'All' ? ` | Where-Object { $_.ZoneType -eq '${zoneType}' }` : ''}

if (-not $Zones) {
    Write-Host ""
    Write-Host "No DNS zones found." -ForegroundColor Yellow
    exit 0
}

$Report = $Zones | Select-Object ZoneName, ZoneType, IsAutoCreated, IsDsIntegrated, IsReverseLookupZone, DynamicUpdate

Write-Host ""
Write-Host "DNS Zones:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total zones: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'add-dns-arecord',
    name: 'Add DNS A Record',
    category: 'DNS Management',
    description: 'Create a new DNS A (host) record in a zone',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a new DNS A record (hostname to IP mapping)
- Adds record to specified DNS zone
- Sets TTL (time to live) for caching
- Essential for DNS record management

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with DnsServer module
- Windows DNS Server role installed
- Target zone must exist

**What You Need to Provide:**
- Zone name (e.g., contoso.com)
- Host name (e.g., webserver01)
- IP address to map to
- TTL in seconds (default: 3600 = 1 hour)

**What the Script Does:**
1. Validates zone exists
2. Checks if record already exists
3. Creates new A record with specified TTL
4. Confirms record creation
5. Displays new record details

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REQUIRES DNS Server role
- A records map hostnames to IPv4 addresses
- FQDN will be hostname.zonename (e.g., webserver01.contoso.com)
- TTL controls how long clients cache the record
- Short TTL: more DNS queries, faster changes
- Long TTL: fewer queries, slower propagation
- Typical use: add new servers, create DNS aliases
- For IPv6, use AAAA records instead`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'hostName', label: 'Host Name', type: 'text', required: true, placeholder: 'webserver01' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '192.168.1.50' },
      { id: 'ttl', label: 'TTL (seconds)', type: 'number', required: false, defaultValue: 3600 }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const hostName = escapePowerShellString(params.hostName);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const ttl = Number(params.ttl || 3600);
      
      return `# Add DNS A Record
# Generated: ${new Date().toISOString()}

$ZoneName = "${zoneName}"
$HostName = "${hostName}"
$IPAddress = "${ipAddress}"
$TTL = [System.TimeSpan]::FromSeconds(${ttl})

# Check for DNS Server role
$DnsServer = Get-Service -Name DNS -ErrorAction SilentlyContinue
if (-not $DnsServer) {
    Write-Host "✗ DNS Server role not installed" -ForegroundColor Red
    exit 1
}

# Validate zone exists
$Zone = Get-DnsServerZone -Name $ZoneName -ErrorAction SilentlyContinue
if (-not $Zone) {
    Write-Host "✗ Zone not found: $ZoneName" -ForegroundColor Red
    exit 1
}

# Check if record already exists
$Existing = Get-DnsServerResourceRecord -ZoneName $ZoneName -Name $HostName -RRType A -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "⚠ Record already exists: $HostName.$ZoneName" -ForegroundColor Yellow
    Write-Host "  IP: $($Existing.RecordData.IPv4Address)" -ForegroundColor Gray
    exit 1
}

Write-Host "Creating DNS A record..." -ForegroundColor Gray

try {
    Add-DnsServerResourceRecordA -ZoneName $ZoneName -Name $HostName -IPv4Address $IPAddress -TimeToLive $TTL -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ DNS A record created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Record Details:" -ForegroundColor Cyan
    Write-Host "  FQDN: $HostName.$ZoneName" -ForegroundColor Gray
    Write-Host "  IP Address: $IPAddress" -ForegroundColor Gray
    Write-Host "  TTL: ${ttl} seconds" -ForegroundColor Gray
    
    Get-DnsServerResourceRecord -ZoneName $ZoneName -Name $HostName -RRType A | Format-List
} catch {
    Write-Host "✗ Failed to create record: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'add-dns-cname',
    name: 'Add DNS CNAME Record',
    category: 'DNS Management',
    description: 'Create a new DNS CNAME (alias) record in a zone',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a new DNS CNAME (alias) record
- Points one hostname to another hostname
- Enables multiple names for the same server
- Essential for application aliases and load balancing

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with DnsServer module
- Windows DNS Server role installed
- Target zone must exist
- Target hostname should exist

**What You Need to Provide:**
- Zone name (e.g., contoso.com)
- Alias name (e.g., www)
- Target hostname FQDN (e.g., webserver01.contoso.com)
- TTL in seconds (default: 3600 = 1 hour)

**What the Script Does:**
1. Validates zone exists
2. Checks if alias record already exists
3. Creates CNAME record pointing to target
4. Confirms record creation
5. Displays new record details

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- REQUIRES DNS Server role
- CNAME creates an alias (pointer to another name)
- Target must be a FQDN (fully qualified domain name)
- CNAME cannot coexist with other record types at same name
- Typical use: www alias, application names, environment aliases
- Chain CNAMEs sparingly (impacts resolution time)
- For IP mapping, use A records instead`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'aliasName', label: 'Alias Name', type: 'text', required: true, placeholder: 'www' },
      { id: 'targetHost', label: 'Target Hostname (FQDN)', type: 'text', required: true, placeholder: 'webserver01.contoso.com' },
      { id: 'ttl', label: 'TTL (seconds)', type: 'number', required: false, defaultValue: 3600 }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const aliasName = escapePowerShellString(params.aliasName);
      const targetHost = escapePowerShellString(params.targetHost);
      const ttl = Number(params.ttl || 3600);
      
      return `# Add DNS CNAME Record
# Generated: ${new Date().toISOString()}

$ZoneName = "${zoneName}"
$AliasName = "${aliasName}"
$TargetHost = "${targetHost}"
$TTL = [System.TimeSpan]::FromSeconds(${ttl})

# Check for DNS Server role
$DnsServer = Get-Service -Name DNS -ErrorAction SilentlyContinue
if (-not $DnsServer) {
    Write-Host "✗ DNS Server role not installed" -ForegroundColor Red
    exit 1
}

# Validate zone exists
$Zone = Get-DnsServerZone -Name $ZoneName -ErrorAction SilentlyContinue
if (-not $Zone) {
    Write-Host "✗ Zone not found: $ZoneName" -ForegroundColor Red
    exit 1
}

# Check if record already exists
$Existing = Get-DnsServerResourceRecord -ZoneName $ZoneName -Name $AliasName -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "⚠ Record already exists at: $AliasName.$ZoneName" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating DNS CNAME record..." -ForegroundColor Gray

try {
    Add-DnsServerResourceRecordCName -ZoneName $ZoneName -Name $AliasName -HostNameAlias $TargetHost -TimeToLive $TTL -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ DNS CNAME record created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Record Details:" -ForegroundColor Cyan
    Write-Host "  Alias: $AliasName.$ZoneName" -ForegroundColor Gray
    Write-Host "  Points to: $TargetHost" -ForegroundColor Gray
    Write-Host "  TTL: ${ttl} seconds" -ForegroundColor Gray
    
    Get-DnsServerResourceRecord -ZoneName $ZoneName -Name $AliasName | Format-List
} catch {
    Write-Host "✗ Failed to create record: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-dns-records',
    name: 'Get DNS Records from Zone',
    category: 'DNS Management',
    description: 'List all DNS records in a specific zone',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all DNS records in a specified zone
- Shows record name, type, and data
- Filters by record type optionally
- Essential for DNS zone auditing

**Prerequisites:**
- PowerShell 5.1 or later with DnsServer module
- Windows DNS Server role installed
- Zone must exist

**What You Need to Provide:**
- Zone name (e.g., contoso.com)
- Record type filter: All, A, AAAA, CNAME, MX, TXT, NS, SOA (default: All)
- Optional: Export CSV file path

**What the Script Does:**
1. Validates zone exists
2. Retrieves all records (or filtered by type)
3. Displays record name, type, TTL, and data
4. Optionally exports to CSV

**Important Notes:**
- No administrator privileges required for viewing
- A = IPv4 address, AAAA = IPv6 address
- CNAME = alias, MX = mail server
- TXT = text data, NS = name server
- SOA = start of authority (zone settings)
- Typical use: DNS audit, troubleshooting, documentation
- Large zones may have many records
- TTL shows caching duration`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'recordType', label: 'Record Type', type: 'select', required: false, options: ['All', 'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'], defaultValue: 'All' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const recordType = params.recordType || 'All';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get DNS Records from Zone
# Generated: ${new Date().toISOString()}

$ZoneName = "${zoneName}"

# Check for DNS Server role
$DnsServer = Get-Service -Name DNS -ErrorAction SilentlyContinue
if (-not $DnsServer) {
    Write-Host "✗ DNS Server role not installed" -ForegroundColor Red
    exit 1
}

# Validate zone exists
$Zone = Get-DnsServerZone -Name $ZoneName -ErrorAction SilentlyContinue
if (-not $Zone) {
    Write-Host "✗ Zone not found: $ZoneName" -ForegroundColor Red
    exit 1
}

Write-Host "Retrieving DNS records from $ZoneName..." -ForegroundColor Gray

$Records = Get-DnsServerResourceRecord -ZoneName $ZoneName -ErrorAction SilentlyContinue${recordType !== 'All' ? ` -RRType ${recordType}` : ''}

if (-not $Records) {
    Write-Host ""
    Write-Host "No records found." -ForegroundColor Yellow
    exit 0
}

$Report = $Records | Select-Object HostName, RecordType, @{N='TTL';E={$_.TimeToLive}}, @{N='Data';E={
    switch ($_.RecordType) {
        'A' { $_.RecordData.IPv4Address }
        'AAAA' { $_.RecordData.IPv6Address }
        'CNAME' { $_.RecordData.HostNameAlias }
        'MX' { "$($_.RecordData.Preference) $($_.RecordData.MailExchange)" }
        'TXT' { $_.RecordData.DescriptiveText }
        'NS' { $_.RecordData.NameServer }
        default { $_.RecordData }
    }
}}

Write-Host ""
Write-Host "DNS Records in $ZoneName:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total records: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'remove-dns-record',
    name: 'Remove DNS Record',
    category: 'DNS Management',
    description: 'Delete a DNS record from a zone',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes a specific DNS record from a zone
- Supports removal by name and type
- Prevents accidental deletion with confirmation
- Essential for DNS cleanup and maintenance

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with DnsServer module
- Windows DNS Server role installed
- Record must exist

**What You Need to Provide:**
- Zone name (e.g., contoso.com)
- Record name (e.g., oldserver)
- Record type: A, AAAA, CNAME, MX, TXT, PTR

**What the Script Does:**
1. Validates zone exists
2. Finds the specified record
3. Displays record details before deletion
4. Removes the record
5. Confirms deletion

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Deletion is immediate and permanent
- Consider TTL propagation (clients may cache old record)
- Typical use: remove old servers, cleanup, DNS migration
- Critical records (SOA, NS) require special handling
- For PTR records, use reverse lookup zone name`,
    parameters: [
      { id: 'zoneName', label: 'Zone Name', type: 'text', required: true, placeholder: 'contoso.com' },
      { id: 'recordName', label: 'Record Name', type: 'text', required: true, placeholder: 'oldserver' },
      { id: 'recordType', label: 'Record Type', type: 'select', required: true, options: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'PTR'] }
    ],
    scriptTemplate: (params) => {
      const zoneName = escapePowerShellString(params.zoneName);
      const recordName = escapePowerShellString(params.recordName);
      const recordType = params.recordType;
      
      return `# Remove DNS Record
# Generated: ${new Date().toISOString()}

$ZoneName = "${zoneName}"
$RecordName = "${recordName}"
$RecordType = "${recordType}"

# Check for DNS Server role
$DnsServer = Get-Service -Name DNS -ErrorAction SilentlyContinue
if (-not $DnsServer) {
    Write-Host "✗ DNS Server role not installed" -ForegroundColor Red
    exit 1
}

# Find the record
$Record = Get-DnsServerResourceRecord -ZoneName $ZoneName -Name $RecordName -RRType $RecordType -ErrorAction SilentlyContinue
if (-not $Record) {
    Write-Host "✗ Record not found: $RecordName ($RecordType) in $ZoneName" -ForegroundColor Red
    exit 1
}

Write-Host "Record found:" -ForegroundColor Gray
$Record | Format-List

Write-Host "Removing record..." -ForegroundColor Yellow

try {
    Remove-DnsServerResourceRecord -ZoneName $ZoneName -Name $RecordName -RRType $RecordType -Force -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ DNS record removed successfully" -ForegroundColor Green
    Write-Host "  Zone: $ZoneName" -ForegroundColor Gray
    Write-Host "  Record: $RecordName" -ForegroundColor Gray
    Write-Host "  Type: $RecordType" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to remove record: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-dhcp-scope',
    name: 'Get DHCP Scopes',
    category: 'DHCP Management',
    description: 'List all DHCP scopes with configuration details',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all DHCP scopes on the server
- Shows scope range, subnet mask, and state
- Displays lease duration and available addresses
- Essential for DHCP server management

**Prerequisites:**
- PowerShell 5.1 or later with DhcpServer module
- Windows DHCP Server role installed
- Standard user can view, admin for full details

**What You Need to Provide:**
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all DHCP scopes
2. Shows scope ID, name, and state
3. Displays start/end IP range
4. Shows lease duration and free addresses
5. Optionally exports to CSV

**Important Notes:**
- REQUIRES DHCP Server role installed
- Scope state: Active, Inactive
- Typical use: DHCP inventory, capacity planning, troubleshooting
- Free addresses show available IPs in scope
- Low free addresses indicates capacity issues
- Consider scope expansion or cleanup if running low`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get DHCP Scopes
# Generated: ${new Date().toISOString()}

# Check for DHCP Server role
$DhcpServer = Get-Service -Name DHCPServer -ErrorAction SilentlyContinue
if (-not $DhcpServer) {
    Write-Host "✗ DHCP Server role not installed" -ForegroundColor Red
    exit 1
}

Write-Host "Retrieving DHCP scopes..." -ForegroundColor Gray

$Scopes = Get-DhcpServerv4Scope -ErrorAction SilentlyContinue

if (-not $Scopes) {
    Write-Host ""
    Write-Host "No DHCP scopes found." -ForegroundColor Yellow
    exit 0
}

$Report = foreach ($Scope in $Scopes) {
    $Stats = Get-DhcpServerv4ScopeStatistics -ScopeId $Scope.ScopeId -ErrorAction SilentlyContinue
    
    [PSCustomObject]@{
        ScopeId = $Scope.ScopeId
        Name = $Scope.Name
        State = $Scope.State
        StartRange = $Scope.StartRange
        EndRange = $Scope.EndRange
        SubnetMask = $Scope.SubnetMask
        LeaseDuration = $Scope.LeaseDuration
        Free = $Stats.Free
        InUse = $Stats.InUse
        PercentInUse = "$([math]::Round($Stats.PercentageInUse, 1))%"
    }
}

Write-Host ""
Write-Host "DHCP Scopes:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total scopes: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'get-dhcp-leases',
    name: 'Get DHCP Leases',
    category: 'DHCP Management',
    description: 'List all active DHCP leases in a scope',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all active DHCP leases in a scope
- Shows IP address, MAC address, and hostname
- Displays lease expiration time
- Essential for DHCP troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later with DhcpServer module
- Windows DHCP Server role installed
- Scope must exist

**What You Need to Provide:**
- Scope ID (subnet, e.g., 192.168.1.0)
- Optional: Export CSV file path

**What the Script Does:**
1. Validates scope exists
2. Retrieves all active leases
3. Shows IP, MAC, hostname, lease expiry
4. Identifies client type (DHCP or Reservation)
5. Optionally exports to CSV

**Important Notes:**
- No administrator privileges required for viewing
- Active leases show currently assigned IPs
- MAC address identifies the client device
- Lease expiry shows when client must renew
- Reservations show as different type
- Typical use: find IP assignments, troubleshoot, identify devices`,
    parameters: [
      { id: 'scopeId', label: 'Scope ID', type: 'text', required: true, placeholder: '192.168.1.0' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const scopeId = escapePowerShellString(params.scopeId);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get DHCP Leases
# Generated: ${new Date().toISOString()}

$ScopeId = "${scopeId}"

# Check for DHCP Server role
$DhcpServer = Get-Service -Name DHCPServer -ErrorAction SilentlyContinue
if (-not $DhcpServer) {
    Write-Host "✗ DHCP Server role not installed" -ForegroundColor Red
    exit 1
}

# Validate scope exists
$Scope = Get-DhcpServerv4Scope -ScopeId $ScopeId -ErrorAction SilentlyContinue
if (-not $Scope) {
    Write-Host "✗ Scope not found: $ScopeId" -ForegroundColor Red
    exit 1
}

Write-Host "Retrieving DHCP leases for scope $ScopeId..." -ForegroundColor Gray

$Leases = Get-DhcpServerv4Lease -ScopeId $ScopeId -ErrorAction SilentlyContinue

if (-not $Leases) {
    Write-Host ""
    Write-Host "No active leases found." -ForegroundColor Yellow
    exit 0
}

$Report = $Leases | Select-Object IPAddress, ClientId, HostName, AddressState, LeaseExpiryTime, @{N='Type';E={
    if ($_.AddressState -like '*Reservation*') { 'Reservation' } else { 'DHCP' }
}}

Write-Host ""
Write-Host "DHCP Leases in scope $ScopeId ($($Scope.Name)):" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total leases: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'add-dhcp-reservation',
    name: 'Add DHCP Reservation',
    category: 'DHCP Management',
    description: 'Create a DHCP reservation for a specific MAC address',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a DHCP reservation in a scope
- Reserves specific IP for a MAC address
- Device always gets same IP from DHCP
- Essential for servers, printers, network devices

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with DhcpServer module
- Windows DHCP Server role installed
- Scope must exist
- IP must be within scope range

**What You Need to Provide:**
- Scope ID (subnet, e.g., 192.168.1.0)
- IP address to reserve
- Client MAC address (format: 00-11-22-33-44-55)
- Description/hostname

**What the Script Does:**
1. Validates scope exists
2. Checks IP is within scope range
3. Verifies IP not already reserved
4. Creates reservation for MAC address
5. Confirms reservation creation

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- MAC format: 00-11-22-33-44-55 (hyphens)
- IP must be within scope range but outside exclusions
- Client still uses DHCP but always gets reserved IP
- Typical use: servers, printers, network devices, IoT
- Preferred over static IP: centralized management
- Client must release/renew to get reserved IP`,
    parameters: [
      { id: 'scopeId', label: 'Scope ID', type: 'text', required: true, placeholder: '192.168.1.0' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '192.168.1.100' },
      { id: 'clientId', label: 'MAC Address', type: 'text', required: true, placeholder: '00-11-22-33-44-55' },
      { id: 'description', label: 'Description/Hostname', type: 'text', required: true, placeholder: 'Printer-Floor2' }
    ],
    scriptTemplate: (params) => {
      const scopeId = escapePowerShellString(params.scopeId);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const clientId = escapePowerShellString(params.clientId);
      const description = escapePowerShellString(params.description);
      
      return `# Add DHCP Reservation
# Generated: ${new Date().toISOString()}

$ScopeId = "${scopeId}"
$IPAddress = "${ipAddress}"
$ClientId = "${clientId}"
$Description = "${description}"

# Check for DHCP Server role
$DhcpServer = Get-Service -Name DHCPServer -ErrorAction SilentlyContinue
if (-not $DhcpServer) {
    Write-Host "✗ DHCP Server role not installed" -ForegroundColor Red
    exit 1
}

# Validate scope exists
$Scope = Get-DhcpServerv4Scope -ScopeId $ScopeId -ErrorAction SilentlyContinue
if (-not $Scope) {
    Write-Host "✗ Scope not found: $ScopeId" -ForegroundColor Red
    exit 1
}

# Check if reservation already exists
$Existing = Get-DhcpServerv4Reservation -ScopeId $ScopeId -IPAddress $IPAddress -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "✗ Reservation already exists for IP: $IPAddress" -ForegroundColor Red
    exit 1
}

Write-Host "Creating DHCP reservation..." -ForegroundColor Gray

try {
    Add-DhcpServerv4Reservation -ScopeId $ScopeId -IPAddress $IPAddress -ClientId $ClientId -Description $Description -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ DHCP reservation created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Reservation Details:" -ForegroundColor Cyan
    Write-Host "  Scope: $ScopeId" -ForegroundColor Gray
    Write-Host "  IP Address: $IPAddress" -ForegroundColor Gray
    Write-Host "  MAC Address: $ClientId" -ForegroundColor Gray
    Write-Host "  Description: $Description" -ForegroundColor Gray
    
    Get-DhcpServerv4Reservation -ScopeId $ScopeId -IPAddress $IPAddress | Format-List
} catch {
    Write-Host "✗ Failed to create reservation: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'remove-dhcp-reservation',
    name: 'Remove DHCP Reservation',
    category: 'DHCP Management',
    description: 'Delete a DHCP reservation by IP address',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes an existing DHCP reservation
- Device will get dynamic IP on next lease
- Does not affect current lease until expiry
- Essential for DHCP cleanup

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later with DhcpServer module
- Windows DHCP Server role installed
- Reservation must exist

**What You Need to Provide:**
- Scope ID (subnet, e.g., 192.168.1.0)
- IP address of reservation to remove

**What the Script Does:**
1. Validates scope exists
2. Finds the reservation
3. Displays reservation details
4. Removes the reservation
5. Confirms removal

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Device keeps current IP until lease expires
- On renewal, device gets dynamic IP from pool
- Typical use: device decommissioned, IP conflict resolution
- Consider releasing lease on device after removal`,
    parameters: [
      { id: 'scopeId', label: 'Scope ID', type: 'text', required: true, placeholder: '192.168.1.0' },
      { id: 'ipAddress', label: 'Reserved IP Address', type: 'text', required: true, placeholder: '192.168.1.100' }
    ],
    scriptTemplate: (params) => {
      const scopeId = escapePowerShellString(params.scopeId);
      const ipAddress = escapePowerShellString(params.ipAddress);
      
      return `# Remove DHCP Reservation
# Generated: ${new Date().toISOString()}

$ScopeId = "${scopeId}"
$IPAddress = "${ipAddress}"

# Check for DHCP Server role
$DhcpServer = Get-Service -Name DHCPServer -ErrorAction SilentlyContinue
if (-not $DhcpServer) {
    Write-Host "✗ DHCP Server role not installed" -ForegroundColor Red
    exit 1
}

# Find the reservation
$Reservation = Get-DhcpServerv4Reservation -ScopeId $ScopeId -IPAddress $IPAddress -ErrorAction SilentlyContinue
if (-not $Reservation) {
    Write-Host "✗ Reservation not found: $IPAddress in scope $ScopeId" -ForegroundColor Red
    exit 1
}

Write-Host "Reservation found:" -ForegroundColor Gray
$Reservation | Format-List

Write-Host "Removing reservation..." -ForegroundColor Yellow

try {
    Remove-DhcpServerv4Reservation -ScopeId $ScopeId -IPAddress $IPAddress -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ DHCP reservation removed successfully" -ForegroundColor Green
    Write-Host "  Scope: $ScopeId" -ForegroundColor Gray
    Write-Host "  IP Address: $IPAddress" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Note: Device will receive dynamic IP on next lease renewal" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to remove reservation: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-vpn-connections',
    name: 'Get VPN Connections',
    category: 'Remote Access',
    description: 'List configured VPN connections on the computer',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all configured VPN connections
- Shows connection name, server, and tunnel type
- Displays authentication methods
- Essential for VPN troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- VPN connections configured on the system
- Standard user permissions (no admin required)

**What You Need to Provide:**
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all VPN connections
2. Shows connection name and server address
3. Displays tunnel type (PPTP, L2TP, SSTP, IKEv2)
4. Shows authentication method
5. Indicates split tunneling status

**Important Notes:**
- No administrator privileges required
- Lists both connected and disconnected VPNs
- Tunnel types have different security levels
- Split tunneling: Only VPN traffic goes through tunnel
- Typical use: inventory, troubleshooting, documentation
- Server address may be hostname or IP
- All-user connections may require admin to view`,
    parameters: [
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get VPN Connections
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving VPN connections..." -ForegroundColor Gray

$VpnConnections = Get-VpnConnection -ErrorAction SilentlyContinue

if (-not $VpnConnections) {
    Write-Host ""
    Write-Host "No VPN connections configured." -ForegroundColor Yellow
    exit 0
}

$Report = $VpnConnections | Select-Object Name, ServerAddress, TunnelType, AuthenticationMethod, 
    @{N='SplitTunneling';E={if($_.SplitTunneling){'Enabled'}else{'Disabled'}}},
    ConnectionStatus, RememberCredential

Write-Host ""
Write-Host "VPN Connections:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total connections: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'add-vpn-connection',
    name: 'Add VPN Connection',
    category: 'Remote Access',
    description: 'Create a new VPN connection profile',
    isPremium: true,
    instructions: `**How This Task Works:**
- Creates a new VPN connection profile
- Configures server address and tunnel type
- Sets authentication method
- Essential for deploying VPN access

**Prerequisites:**
- Administrator privileges for all-user connections
- PowerShell 5.1 or later
- VPN server must be accessible

**What You Need to Provide:**
- Connection name (friendly name)
- VPN server address (hostname or IP)
- Tunnel type: Automatic, IKEv2, SSTP, L2TP, PPTP
- Enable split tunneling: true or false
- All users: true for machine profile, false for current user

**What the Script Does:**
1. Validates connection name not already in use
2. Creates VPN connection with specified settings
3. Configures split tunneling if enabled
4. Sets connection scope (all users or current user)
5. Displays new connection configuration

**Important Notes:**
- All-users connection requires administrator privileges
- IKEv2 recommended for security and performance
- Split tunnel: only VPN traffic through tunnel (more efficient)
- Force tunnel: all traffic through VPN (more secure)
- Typical use: deploy VPN to workstations, configure remote access
- Credentials configured separately on first connect
- Test connection after creation`,
    parameters: [
      { id: 'connectionName', label: 'Connection Name', type: 'text', required: true, placeholder: 'Corporate VPN' },
      { id: 'serverAddress', label: 'Server Address', type: 'text', required: true, placeholder: 'vpn.company.com' },
      { id: 'tunnelType', label: 'Tunnel Type', type: 'select', required: true, options: ['Automatic', 'IKEv2', 'Sstp', 'L2tp', 'Pptp'], defaultValue: 'Automatic' },
      { id: 'splitTunneling', label: 'Enable Split Tunneling', type: 'boolean', required: false, defaultValue: false },
      { id: 'allUsers', label: 'All Users (requires admin)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const connectionName = escapePowerShellString(params.connectionName);
      const serverAddress = escapePowerShellString(params.serverAddress);
      const tunnelType = params.tunnelType;
      const splitTunneling = toPowerShellBoolean(params.splitTunneling ?? false);
      const allUsers = toPowerShellBoolean(params.allUsers ?? false);
      
      return `# Add VPN Connection
# Generated: ${new Date().toISOString()}

$ConnectionName = "${connectionName}"
$ServerAddress = "${serverAddress}"
$TunnelType = "${tunnelType}"
$SplitTunneling = ${splitTunneling}
$AllUsers = ${allUsers}

# Check if connection already exists
$Existing = Get-VpnConnection -Name $ConnectionName -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "✗ VPN connection already exists: $ConnectionName" -ForegroundColor Red
    exit 1
}

Write-Host "Creating VPN connection..." -ForegroundColor Gray

try {
    $Params = @{
        Name = $ConnectionName
        ServerAddress = $ServerAddress
        TunnelType = $TunnelType
        SplitTunneling = $SplitTunneling
        RememberCredential = $true
    }
    
    if ($AllUsers) {
        $Params.AllUserConnection = $true
    }
    
    Add-VpnConnection @Params -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ VPN connection created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Connection Details:" -ForegroundColor Cyan
    Write-Host "  Name: $ConnectionName" -ForegroundColor Gray
    Write-Host "  Server: $ServerAddress" -ForegroundColor Gray
    Write-Host "  Tunnel Type: $TunnelType" -ForegroundColor Gray
    Write-Host "  Split Tunneling: $SplitTunneling" -ForegroundColor Gray
    Write-Host "  All Users: $AllUsers" -ForegroundColor Gray
    
    Get-VpnConnection -Name $ConnectionName | Format-List
} catch {
    Write-Host "✗ Failed to create VPN connection: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-routing-table',
    name: 'Get Routing Table',
    category: 'Remote Access',
    description: 'Display the IP routing table with route metrics',
    isPremium: true,
    instructions: `**How This Task Works:**
- Displays the IP routing table
- Shows destination networks and next hops
- Displays route metrics (priority)
- Essential for network troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)

**What You Need to Provide:**
- Address family: IPv4, IPv6, or All (default: IPv4)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves routing table entries
2. Filters by address family if specified
3. Shows destination prefix, next hop, interface
4. Displays route metric (lower = preferred)
5. Optionally exports to CSV

**Important Notes:**
- No administrator privileges required
- 0.0.0.0/0 is the default route (gateway)
- Lower metric = higher priority
- Multiple routes to same destination: lowest metric wins
- Typical use: troubleshoot routing, verify VPN routes, diagnose connectivity
- Persistent routes survive reboot
- Interface column shows which adapter used`,
    parameters: [
      { id: 'addressFamily', label: 'Address Family', type: 'select', required: false, options: ['IPv4', 'IPv6', 'All'], defaultValue: 'IPv4' },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const addressFamily = params.addressFamily || 'IPv4';
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Routing Table
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving routing table..." -ForegroundColor Gray

$Routes = Get-NetRoute${addressFamily !== 'All' ? ` -AddressFamily ${addressFamily}` : ''} -ErrorAction SilentlyContinue | 
    Where-Object { $_.DestinationPrefix -ne 'ff00::/8' -and $_.DestinationPrefix -ne 'fe80::/64' }

$Report = $Routes | Select-Object DestinationPrefix, NextHop, RouteMetric, 
    @{N='Interface';E={(Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue).Name}},
    @{N='Type';E={if($_.NextHop -eq '0.0.0.0' -or $_.NextHop -eq '::'){'Local'}else{'Gateway'}}}

Write-Host ""
Write-Host "IP Routing Table (${addressFamily}):" -ForegroundColor Cyan
$Report | Sort-Object DestinationPrefix | Format-Table -AutoSize

Write-Host ""
Write-Host "Total routes: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'add-static-route',
    name: 'Add Static Route',
    category: 'Remote Access',
    description: 'Add a persistent static route to the routing table',
    isPremium: true,
    instructions: `**How This Task Works:**
- Adds a static route to the routing table
- Routes traffic for specific network through gateway
- Optionally makes route persistent (survives reboot)
- Essential for multi-subnet environments

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Gateway must be reachable

**What You Need to Provide:**
- Destination network (CIDR format, e.g., 10.0.0.0/8)
- Next hop/gateway IP address
- Interface index or name
- Route metric (default: 1)
- Persistent route: true to survive reboot

**What the Script Does:**
1. Resolves interface by name or index
2. Validates gateway is on same subnet
3. Creates new static route
4. Optionally makes route persistent
5. Displays new route

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- CIDR format: network/prefix (e.g., 10.0.0.0/8)
- Gateway must be directly reachable
- Lower metric = higher priority
- Persistent routes stored in registry
- Typical use: route to remote subnets, VPN split tunnel
- Verify route with Get-NetRoute after adding`,
    parameters: [
      { id: 'destination', label: 'Destination (CIDR)', type: 'text', required: true, placeholder: '10.0.0.0/8' },
      { id: 'gateway', label: 'Gateway/Next Hop', type: 'text', required: true, placeholder: '192.168.1.1' },
      { id: 'interfaceName', label: 'Interface Name', type: 'text', required: true, placeholder: 'Ethernet' },
      { id: 'metric', label: 'Route Metric', type: 'number', required: false, defaultValue: 1 },
      { id: 'persistent', label: 'Persistent (survives reboot)', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const destination = escapePowerShellString(params.destination);
      const gateway = escapePowerShellString(params.gateway);
      const interfaceName = escapePowerShellString(params.interfaceName);
      const metric = Number(params.metric || 1);
      const persistent = params.persistent ?? true;
      
      return `# Add Static Route
# Generated: ${new Date().toISOString()}

$Destination = "${destination}"
$Gateway = "${gateway}"
$InterfaceName = "${interfaceName}"
$Metric = ${metric}

# Get interface index
$Interface = Get-NetAdapter -Name $InterfaceName -ErrorAction SilentlyContinue
if (-not $Interface) {
    Write-Host "✗ Interface not found: $InterfaceName" -ForegroundColor Red
    exit 1
}

Write-Host "Adding static route..." -ForegroundColor Gray

try {
    New-NetRoute -DestinationPrefix $Destination -NextHop $Gateway -InterfaceIndex $Interface.ifIndex -RouteMetric $Metric ${persistent ? '-PolicyStore PersistentStore' : ''} -ErrorAction Stop | Out-Null
    
    Write-Host ""
    Write-Host "✓ Static route added successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Route Details:" -ForegroundColor Cyan
    Write-Host "  Destination: $Destination" -ForegroundColor Gray
    Write-Host "  Gateway: $Gateway" -ForegroundColor Gray
    Write-Host "  Interface: $InterfaceName" -ForegroundColor Gray
    Write-Host "  Metric: $Metric" -ForegroundColor Gray
    Write-Host "  Persistent: ${persistent}" -ForegroundColor Gray
    
    Get-NetRoute -DestinationPrefix $Destination -InterfaceIndex $Interface.ifIndex | Format-List
} catch {
    Write-Host "✗ Failed to add route: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'test-network-latency',
    name: 'Test Network Latency (Continuous)',
    category: 'Network Monitoring',
    description: 'Continuously monitor network latency to a target host',
    isPremium: true,
    instructions: `**How This Task Works:**
- Continuously pings a target host
- Calculates min, max, and average latency
- Tracks packet loss percentage
- Essential for network quality monitoring

**Prerequisites:**
- PowerShell 5.1 or later
- Network connectivity to target
- Standard user permissions (no admin required)

**What You Need to Provide:**
- Target hostname or IP address
- Duration in seconds (default: 60)
- Interval between pings in milliseconds (default: 1000)

**What the Script Does:**
1. Pings target at specified interval
2. Records response time for each ping
3. Calculates statistics (min, max, avg, std dev)
4. Tracks packet loss
5. Displays summary report

**Important Notes:**
- No administrator privileges required
- ICMP traffic must be allowed
- Typical use: measure link quality, baseline performance
- Jitter = variation in latency (std deviation)
- High jitter indicates unstable connection
- Packet loss indicates network issues
- Run during normal operations for accurate baseline`,
    parameters: [
      { id: 'target', label: 'Target Host/IP', type: 'text', required: true, placeholder: 'google.com' },
      { id: 'duration', label: 'Duration (seconds)', type: 'number', required: false, defaultValue: 60 },
      { id: 'interval', label: 'Interval (milliseconds)', type: 'number', required: false, defaultValue: 1000 }
    ],
    scriptTemplate: (params) => {
      const target = escapePowerShellString(params.target);
      const duration = Number(params.duration || 60);
      const interval = Number(params.interval || 1000);
      
      return `# Test Network Latency (Continuous)
# Generated: ${new Date().toISOString()}

$Target = "${target}"
$Duration = ${duration}
$Interval = ${interval}

Write-Host "Testing latency to $Target for $Duration seconds..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop early" -ForegroundColor Gray
Write-Host ""

$Results = @()
$StartTime = Get-Date
$EndTime = $StartTime.AddSeconds($Duration)
$Sent = 0
$Received = 0

while ((Get-Date) -lt $EndTime) {
    $Sent++
    $Ping = Test-Connection -ComputerName $Target -Count 1 -ErrorAction SilentlyContinue
    
    if ($Ping) {
        $Received++
        $Latency = $Ping.ResponseTime
        $Results += $Latency
        
        $Color = if ($Latency -lt 50) { "Green" } elseif ($Latency -lt 100) { "Yellow" } else { "Red" }
        Write-Host "Reply from $Target: time=$($Latency)ms" -ForegroundColor $Color
    } else {
        Write-Host "Request timed out" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds $Interval
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Latency Statistics for $Target" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Results.Count -gt 0) {
    $Stats = $Results | Measure-Object -Minimum -Maximum -Average -StandardDeviation
    
    Write-Host "  Packets: Sent = $Sent, Received = $Received, Lost = $($Sent - $Received) ($([math]::Round((($Sent - $Received) / $Sent) * 100, 1))% loss)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Minimum: $([math]::Round($Stats.Minimum, 2)) ms" -ForegroundColor Gray
    Write-Host "  Maximum: $([math]::Round($Stats.Maximum, 2)) ms" -ForegroundColor Gray
    Write-Host "  Average: $([math]::Round($Stats.Average, 2)) ms" -ForegroundColor Gray
    Write-Host "  Jitter:  $([math]::Round($Stats.StandardDeviation, 2)) ms" -ForegroundColor Gray
} else {
    Write-Host "  No responses received (100% packet loss)" -ForegroundColor Red
}`;
    }
  },

  {
    id: 'get-network-performance-counters',
    name: 'Get Network Performance Counters',
    category: 'Network Monitoring',
    description: 'Monitor real-time network performance metrics',
    isPremium: true,
    instructions: `**How This Task Works:**
- Collects network interface performance counters
- Shows bytes/packets sent and received per second
- Monitors for errors and discards
- Essential for performance troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Network adapter(s) must exist

**What You Need to Provide:**
- Adapter name (optional - blank for all active adapters)
- Sample duration in seconds (default: 10)

**What the Script Does:**
1. Captures initial counter values
2. Waits for sample duration
3. Captures final counter values
4. Calculates per-second rates
5. Displays throughput, packet rates, errors

**Important Notes:**
- No administrator privileges required
- Errors indicate hardware/driver issues
- Discards indicate buffer overflows
- High discard rate = congestion
- Typical use: diagnose slow network, identify bottlenecks
- Run during representative workload
- Compare to baseline for anomaly detection`,
    parameters: [
      { id: 'adapterName', label: 'Adapter Name (blank for all)', type: 'text', required: false, placeholder: 'Ethernet' },
      { id: 'duration', label: 'Sample Duration (seconds)', type: 'number', required: false, defaultValue: 10 }
    ],
    scriptTemplate: (params) => {
      const adapterName = params.adapterName ? escapePowerShellString(params.adapterName) : '';
      const duration = Number(params.duration || 10);
      
      return `# Get Network Performance Counters
# Generated: ${new Date().toISOString()}

$Duration = ${duration}

${adapterName ? `$Adapters = Get-NetAdapter -Name "${adapterName}" | Where-Object { $_.Status -eq 'Up' }` : `$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }`}

Write-Host "Collecting network performance counters ($Duration seconds)..." -ForegroundColor Cyan
Write-Host ""

$Results = foreach ($Adapter in $Adapters) {
    $Initial = Get-NetAdapterStatistics -Name $Adapter.Name
    
    Start-Sleep -Seconds $Duration
    
    $Final = Get-NetAdapterStatistics -Name $Adapter.Name
    
    $BytesReceivedPerSec = ($Final.ReceivedBytes - $Initial.ReceivedBytes) / $Duration
    $BytesSentPerSec = ($Final.SentBytes - $Initial.SentBytes) / $Duration
    $PacketsReceivedPerSec = ($Final.ReceivedUnicastPackets - $Initial.ReceivedUnicastPackets) / $Duration
    $PacketsSentPerSec = ($Final.SentUnicastPackets - $Initial.SentUnicastPackets) / $Duration
    
    [PSCustomObject]@{
        Adapter = $Adapter.Name
        LinkSpeed = $Adapter.LinkSpeed
        'Recv MB/s' = [math]::Round($BytesReceivedPerSec / 1MB, 3)
        'Send MB/s' = [math]::Round($BytesSentPerSec / 1MB, 3)
        'Recv Pkts/s' = [math]::Round($PacketsReceivedPerSec, 0)
        'Send Pkts/s' = [math]::Round($PacketsSentPerSec, 0)
        'Recv Errors' = $Final.ReceivedPacketErrors - $Initial.ReceivedPacketErrors
        'Recv Discards' = $Final.ReceivedDiscards - $Initial.ReceivedDiscards
        'Send Errors' = $Final.OutboundPacketErrors - $Initial.OutboundPacketErrors
        'Send Discards' = $Final.OutboundDiscards - $Initial.OutboundDiscards
    }
}

Write-Host "Network Performance (over $Duration seconds):" -ForegroundColor Green
$Results | Format-Table -AutoSize`;
    }
  },

  {
    id: 'firewall-log-enable',
    name: 'Enable Firewall Logging',
    category: 'Firewall Management',
    description: 'Enable Windows Firewall logging for a profile',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables Windows Firewall logging
- Logs allowed and/or dropped connections
- Configures log file path and size
- Essential for security auditing

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Profile: Domain, Private, Public, or All
- Log allowed connections: true or false
- Log dropped connections: true or false (default: true)
- Log file path (default: system default)
- Max log size in KB (default: 4096)

**What the Script Does:**
1. Configures logging for specified profile
2. Enables allowed/dropped logging as specified
3. Sets log file path and maximum size
4. Displays current logging configuration

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Default log path: %systemroot%\\system32\\LogFiles\\Firewall\\pfirewall.log
- Log size in KB (4096 KB = 4 MB)
- Old entries overwritten when max size reached
- Typical use: troubleshooting, security audit, compliance
- Log analysis tools: Event Viewer, Log Parser, SIEM
- Consider disk space for high-traffic environments`,
    parameters: [
      { id: 'profile', label: 'Profile', type: 'select', required: true, options: ['Domain', 'Private', 'Public', 'All'], defaultValue: 'All' },
      { id: 'logAllowed', label: 'Log Allowed Connections', type: 'boolean', required: false, defaultValue: false },
      { id: 'logDropped', label: 'Log Dropped Connections', type: 'boolean', required: false, defaultValue: true },
      { id: 'logPath', label: 'Log File Path', type: 'path', required: false, placeholder: 'C:\\Windows\\System32\\LogFiles\\Firewall\\pfirewall.log' },
      { id: 'maxSizeKB', label: 'Max Size (KB)', type: 'number', required: false, defaultValue: 4096 }
    ],
    scriptTemplate: (params) => {
      const profile = params.profile;
      const logAllowed = toPowerShellBoolean(params.logAllowed ?? false);
      const logDropped = toPowerShellBoolean(params.logDropped ?? true);
      const logPath = params.logPath ? escapePowerShellString(params.logPath) : '';
      const maxSizeKB = Number(params.maxSizeKB || 4096);
      
      return `# Enable Firewall Logging
# Generated: ${new Date().toISOString()}

$Profile = "${profile}"
$LogAllowed = ${logAllowed}
$LogDropped = ${logDropped}
${logPath ? `$LogPath = "${logPath}"` : ''}
$MaxSizeKB = ${maxSizeKB}

Write-Host "Configuring firewall logging..." -ForegroundColor Gray

try {
    $Params = @{
        LogAllowed = $LogAllowed
        LogBlocked = $LogDropped
        LogMaxSizeKilobytes = $MaxSizeKB
    }
    
    ${logPath ? '$Params.LogFileName = $LogPath' : ''}
    
    if ($Profile -eq "All") {
        Set-NetFirewallProfile -All @Params -ErrorAction Stop
    } else {
        Set-NetFirewallProfile -Profile $Profile @Params -ErrorAction Stop
    }
    
    Write-Host ""
    Write-Host "✓ Firewall logging configured successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration Details:" -ForegroundColor Cyan
    Write-Host "  Profile: $Profile" -ForegroundColor Gray
    Write-Host "  Log Allowed: $LogAllowed" -ForegroundColor Gray
    Write-Host "  Log Dropped: $LogDropped" -ForegroundColor Gray
    Write-Host "  Max Size: $MaxSizeKB KB" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Current Logging Settings:" -ForegroundColor Cyan
    Get-NetFirewallProfile | Select-Object Name, LogAllowed, LogBlocked, LogFileName, LogMaxSizeKilobytes | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed to configure logging: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'remove-firewall-rule',
    name: 'Remove Firewall Rule',
    category: 'Firewall Management',
    description: 'Delete a Windows Firewall rule by name',
    isPremium: true,
    instructions: `**How This Task Works:**
- Removes a Windows Firewall rule by name
- Supports exact name or pattern matching
- Can remove multiple matching rules
- Essential for firewall cleanup

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Windows Firewall service running

**What You Need to Provide:**
- Rule name (exact name or pattern with wildcards)
- Remove all matches: true to remove all matching, false for exact match only

**What the Script Does:**
1. Finds firewall rules matching the name
2. Displays matching rules before deletion
3. Removes matching rule(s)
4. Confirms removal

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Use wildcards (*) for pattern matching
- Deletion is immediate and permanent
- Built-in rules may be recreated on updates
- Typical use: cleanup, security hardening, troubleshooting
- Test with exact name first before using wildcards`,
    parameters: [
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: true, placeholder: 'Allow RDP' },
      { id: 'removeAll', label: 'Remove All Matches', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const ruleName = escapePowerShellString(params.ruleName);
      const removeAll = toPowerShellBoolean(params.removeAll ?? false);
      
      return `# Remove Firewall Rule
# Generated: ${new Date().toISOString()}

$RuleName = "${ruleName}"

# Find matching rules
$Rules = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if (-not $Rules) {
    Write-Host "✗ No firewall rules found matching: $RuleName" -ForegroundColor Red
    exit 1
}

$RuleCount = @($Rules).Count
Write-Host "Found $RuleCount matching rule(s):" -ForegroundColor Gray
$Rules | Select-Object DisplayName, Direction, Action, Enabled | Format-Table -AutoSize

${removeAll ? '' : `if ($RuleCount -gt 1) {
    Write-Host "⚠ Multiple rules match. Enable 'Remove All Matches' to delete all, or use exact name." -ForegroundColor Yellow
    exit 1
}`}

Write-Host "Removing firewall rule(s)..." -ForegroundColor Yellow

try {
    Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✓ Removed $RuleCount firewall rule(s)" -ForegroundColor Green
    Write-Host "  Pattern: $RuleName" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to remove rule(s): $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-listening-ports',
    name: 'Get Listening Ports',
    category: 'Network Monitoring',
    description: 'List all TCP/UDP ports in listening state with process info',
    isPremium: true,
    instructions: `**How This Task Works:**
- Lists all TCP ports in LISTEN state
- Shows which process is listening on each port
- Identifies potential security risks
- Essential for security auditing

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges recommended for full process details

**What You Need to Provide:**
- Include UDP: true to also show UDP listeners
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all TCP connections in Listen state
2. Optionally retrieves UDP endpoints
3. Maps each port to its owning process
4. Displays port, protocol, process name, PID
5. Optionally exports to CSV

**Important Notes:**
- Administrator shows all process details
- 0.0.0.0 = listening on all interfaces
- 127.0.0.1 = localhost only
- Typical use: security audit, identify services, troubleshoot port conflicts
- Unexpected listeners may indicate malware
- Compare against known services baseline`,
    parameters: [
      { id: 'includeUdp', label: 'Include UDP Endpoints', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const includeUdp = toPowerShellBoolean(params.includeUdp ?? true);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Listening Ports
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving listening ports..." -ForegroundColor Gray

# Get TCP listeners
$TcpListeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Protocol = 'TCP'
        LocalAddress = $_.LocalAddress
        LocalPort = $_.LocalPort
        ProcessName = $Process.ProcessName
        PID = $_.OwningProcess
    }
}

$AllListeners = @($TcpListeners)

${includeUdp ? `
# Get UDP listeners
$UdpListeners = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | ForEach-Object {
    $Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Protocol = 'UDP'
        LocalAddress = $_.LocalAddress
        LocalPort = $_.LocalPort
        ProcessName = $Process.ProcessName
        PID = $_.OwningProcess
    }
}

$AllListeners += @($UdpListeners)` : ''}

$Report = $AllListeners | Sort-Object Protocol, LocalPort

Write-Host ""
Write-Host "Listening Ports:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total listeners: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'test-network-path',
    name: 'Test Network Path MTU',
    category: 'Diagnostics & Testing',
    description: 'Discover the Maximum Transmission Unit (MTU) along a network path',
    isPremium: true,
    instructions: `**How This Task Works:**
- Tests various packet sizes along network path
- Discovers maximum packet size without fragmentation
- Identifies MTU issues causing connectivity problems
- Essential for VPN and WAN troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- ICMP allowed through firewalls
- Standard user permissions (no admin required)

**What You Need to Provide:**
- Target host (hostname or IP)
- Starting packet size (default: 1500)

**What the Script Does:**
1. Sends packets with Don't Fragment flag
2. Uses binary search to find maximum MTU
3. Reports packet sizes that succeed/fail
4. Displays discovered path MTU

**Important Notes:**
- No administrator privileges required
- Standard Ethernet MTU: 1500 bytes
- VPN tunnels reduce effective MTU (overhead)
- MTU issues cause intermittent connectivity
- Symptoms: small packets work, large fail
- Typical use: VPN troubleshooting, WAN optimization
- Path MTU may differ from interface MTU`,
    parameters: [
      { id: 'target', label: 'Target Host/IP', type: 'text', required: true, placeholder: 'server.domain.com' },
      { id: 'startSize', label: 'Starting Packet Size', type: 'number', required: false, defaultValue: 1500 }
    ],
    scriptTemplate: (params) => {
      const target = escapePowerShellString(params.target);
      const startSize = Number(params.startSize || 1500);
      
      return `# Test Network Path MTU
# Generated: ${new Date().toISOString()}

$Target = "${target}"
$StartSize = ${startSize}

Write-Host "Discovering path MTU to $Target..." -ForegroundColor Cyan
Write-Host "Starting with packet size: $StartSize bytes" -ForegroundColor Gray
Write-Host ""

# Binary search for MTU
$Low = 68  # Minimum MTU
$High = $StartSize
$LastSuccess = $Low

while ($Low -le $High) {
    $Mid = [math]::Floor(($Low + $High) / 2)
    
    # Ping with Don't Fragment flag
    $Result = ping -n 1 -f -l $Mid $Target 2>&1
    
    if ($Result -match "Reply from" -and $Result -notmatch "fragmented") {
        Write-Host "  Size $Mid bytes: Success" -ForegroundColor Green
        $LastSuccess = $Mid
        $Low = $Mid + 1
    } else {
        Write-Host "  Size $Mid bytes: Failed (needs fragmentation)" -ForegroundColor Yellow
        $High = $Mid - 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Path MTU Discovery Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Target: $Target" -ForegroundColor Gray
Write-Host "  Maximum MTU: $LastSuccess bytes" -ForegroundColor Green
Write-Host ""
Write-Host "Recommendations:" -ForegroundColor Yellow
Write-Host "  - Standard Ethernet MTU: 1500 bytes" -ForegroundColor Gray
Write-Host "  - If MTU < 1500, check for VPN/tunnel overhead" -ForegroundColor Gray
Write-Host "  - Consider setting interface MTU to discovered value" -ForegroundColor Gray`;
    }
  },

  {
    id: 'arp-cache-report',
    name: 'Get ARP Cache',
    category: 'Diagnostics & Testing',
    description: 'Display and export the ARP cache (IP to MAC mappings)',
    isPremium: true,
    instructions: `**How This Task Works:**
- Displays the ARP (Address Resolution Protocol) cache
- Shows IP address to MAC address mappings
- Identifies device types and manufacturers
- Essential for network troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)

**What You Need to Provide:**
- Include incomplete entries: true or false (default: false)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves ARP cache entries
2. Shows IP address, MAC address, type
3. Identifies interface for each entry
4. Optionally exports to CSV

**Important Notes:**
- No administrator privileges required
- Dynamic entries learned from network
- Static entries manually configured
- Cache clears on reboot or timeout
- Typical use: troubleshoot connectivity, identify devices
- Duplicate MAC addresses indicate problems
- MAC address first 3 bytes identify manufacturer`,
    parameters: [
      { id: 'includeIncomplete', label: 'Include Incomplete Entries', type: 'boolean', required: false, defaultValue: false },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const includeIncomplete = toPowerShellBoolean(params.includeIncomplete ?? false);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get ARP Cache
# Generated: ${new Date().toISOString()}

Write-Host "Retrieving ARP cache..." -ForegroundColor Gray

$ArpEntries = Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue

${includeIncomplete ? '' : `$ArpEntries = $ArpEntries | Where-Object { $_.State -ne 'Incomplete' }`}

$Report = $ArpEntries | ForEach-Object {
    $Interface = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        IPAddress = $_.IPAddress
        MACAddress = $_.LinkLayerAddress
        State = $_.State
        Interface = $Interface.Name
        InterfaceIndex = $_.InterfaceIndex
    }
} | Sort-Object IPAddress

Write-Host ""
Write-Host "ARP Cache:" -ForegroundColor Cyan
$Report | Format-Table -AutoSize

Write-Host ""
Write-Host "Total entries: $($Report.Count)" -ForegroundColor Gray

${exportPath ? `$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'clear-arp-cache',
    name: 'Clear ARP Cache',
    category: 'Diagnostics & Testing',
    description: 'Clear the ARP cache to force fresh MAC address resolution',
    isPremium: true,
    instructions: `**How This Task Works:**
- Clears the ARP cache entries
- Forces devices to re-resolve MAC addresses
- Useful for troubleshooting connectivity issues
- Clears specific interface or all interfaces

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later

**What You Need to Provide:**
- Interface name (optional - blank for all interfaces)

**What the Script Does:**
1. Shows current ARP cache count
2. Clears ARP cache entries
3. Shows cache count after clearing

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Cache rebuilds automatically as needed
- May cause brief network delays as entries rebuild
- Typical use: resolve IP conflicts, clear stale entries
- ARP poisoning attacks can be mitigated by clearing
- Combine with IP conflict resolution`,
    parameters: [
      { id: 'interfaceName', label: 'Interface Name (blank for all)', type: 'text', required: false, placeholder: 'Ethernet' }
    ],
    scriptTemplate: (params) => {
      const interfaceName = params.interfaceName ? escapePowerShellString(params.interfaceName) : '';
      
      return `# Clear ARP Cache
# Generated: ${new Date().toISOString()}

Write-Host "ARP cache before clearing:" -ForegroundColor Gray
$Before = Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue${interfaceName ? ` | Where-Object { (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex).Name -eq "${interfaceName}" }` : ''}
Write-Host "  Entries: $($Before.Count)" -ForegroundColor Gray

Write-Host ""
Write-Host "Clearing ARP cache..." -ForegroundColor Yellow

${interfaceName ? `
$Interface = Get-NetAdapter -Name "${interfaceName}" -ErrorAction SilentlyContinue
if (-not $Interface) {
    Write-Host "✗ Interface not found: ${interfaceName}" -ForegroundColor Red
    exit 1
}
Get-NetNeighbor -InterfaceIndex $Interface.ifIndex -ErrorAction SilentlyContinue | Remove-NetNeighbor -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "✓ ARP cache cleared for ${interfaceName}" -ForegroundColor Green
` : `
Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Remove-NetNeighbor -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "✓ ARP cache cleared for all interfaces" -ForegroundColor Green
`}

Write-Host ""
Write-Host "ARP cache after clearing:" -ForegroundColor Gray
$After = Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue${interfaceName ? ` | Where-Object { (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex).Name -eq "${interfaceName}" }` : ''}
Write-Host "  Entries: $($After.Count)" -ForegroundColor Gray`;
    }
  },

  {
    id: 'netstat-report',
    name: 'Generate Netstat Report',
    category: 'Network Monitoring',
    description: 'Comprehensive network statistics report similar to netstat -an',
    isPremium: true,
    instructions: `**How This Task Works:**
- Generates comprehensive network statistics
- Shows all TCP/UDP connections and listeners
- Groups by state for easy analysis
- Essential for network troubleshooting

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator for full process details

**What You Need to Provide:**
- Show process names: true to include process info (default: true)
- Optional: Export CSV file path

**What the Script Does:**
1. Retrieves all TCP connections
2. Retrieves all UDP endpoints
3. Maps connections to processes
4. Groups and counts by state
5. Optionally exports full report

**Important Notes:**
- Similar to traditional netstat -an command
- Shows connection states and statistics
- Typical use: overview of all network activity
- High TIME_WAIT may indicate connection issues
- Many ESTABLISHED connections may indicate high load
- CLOSE_WAIT indicates application not closing sockets`,
    parameters: [
      { id: 'showProcess', label: 'Show Process Names', type: 'boolean', required: false, defaultValue: true },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false }
    ],
    scriptTemplate: (params) => {
      const showProcess = toPowerShellBoolean(params.showProcess ?? true);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Generate Netstat Report
# Generated: ${new Date().toISOString()}

Write-Host "Generating network statistics report..." -ForegroundColor Gray

# Get all TCP connections
$TcpConnections = Get-NetTCPConnection -ErrorAction SilentlyContinue | ForEach-Object {
    $Props = @{
        Protocol = 'TCP'
        LocalAddress = "$($_.LocalAddress):$($_.LocalPort)"
        RemoteAddress = "$($_.RemoteAddress):$($_.RemotePort)"
        State = $_.State
    }
    
    ${showProcess ? `$Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    $Props.ProcessName = $Process.ProcessName
    $Props.PID = $_.OwningProcess` : ''}
    
    [PSCustomObject]$Props
}

# Get all UDP endpoints
$UdpEndpoints = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | ForEach-Object {
    $Props = @{
        Protocol = 'UDP'
        LocalAddress = "$($_.LocalAddress):$($_.LocalPort)"
        RemoteAddress = '*:*'
        State = 'N/A'
    }
    
    ${showProcess ? `$Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    $Props.ProcessName = $Process.ProcessName
    $Props.PID = $_.OwningProcess` : ''}
    
    [PSCustomObject]$Props
}

$AllConnections = @($TcpConnections) + @($UdpEndpoints)

Write-Host ""
Write-Host "Connection Summary by State:" -ForegroundColor Cyan
$AllConnections | Where-Object { $_.State -ne 'N/A' } | Group-Object State | 
    Select-Object @{N='State';E={$_.Name}}, Count | 
    Sort-Object Count -Descending | Format-Table -AutoSize

Write-Host ""
Write-Host "All Connections:" -ForegroundColor Cyan
$AllConnections | Format-Table -AutoSize

Write-Host ""
Write-Host "Total: $($AllConnections.Count) connections/endpoints" -ForegroundColor Gray

${exportPath ? `$AllConnections | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}`;
    }
  },

  {
    id: 'enable-network-discovery',
    name: 'Enable/Disable Network Discovery',
    category: 'Network Shares',
    description: 'Enable or disable network discovery and file sharing',
    isPremium: true,
    instructions: `**How This Task Works:**
- Enables or disables network discovery
- Controls visibility of computer on network
- Affects file and printer sharing
- Essential for network security

**Prerequisites:**
- Administrator privileges required
- PowerShell 5.1 or later
- Network Discovery feature installed

**What You Need to Provide:**
- Action: Enable or Disable
- Profile: Domain, Private, Public, or All

**What the Script Does:**
1. Configures network discovery firewall rules
2. Enables/disables file and printer sharing
3. Applies to specified network profile
4. Displays current status

**Important Notes:**
- REQUIRES ADMINISTRATOR PRIVILEGES
- Public profile should stay disabled for security
- Enables/disables related firewall rules
- Typical use: workgroup file sharing, security hardening
- Domain profile usually managed by Group Policy
- Private profile for home/work networks`,
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable', 'Disable'] },
      { id: 'profile', label: 'Network Profile', type: 'select', required: true, options: ['Domain', 'Private', 'Public', 'All'], defaultValue: 'Private' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const profile = params.profile;
      const enabled = action === 'Enable' ? 'True' : 'False';
      
      return `# ${action} Network Discovery
# Generated: ${new Date().toISOString()}

$Action = "${action}"
$Profile = "${profile}"

Write-Host "${action === 'Enable' ? 'Enabling' : 'Disabling'} network discovery for $Profile profile..." -ForegroundColor Gray

try {
    # Network Discovery
    if ($Profile -eq "All") {
        Get-NetFirewallRule -DisplayGroup "Network Discovery" | Set-NetFirewallRule -Enabled ${enabled} -ErrorAction Stop
        Get-NetFirewallRule -DisplayGroup "File and Printer Sharing" | Set-NetFirewallRule -Enabled ${enabled} -ErrorAction Stop
    } else {
        Get-NetFirewallRule -DisplayGroup "Network Discovery" | 
            Where-Object { $_.Profile -match $Profile } | 
            Set-NetFirewallRule -Enabled ${enabled} -ErrorAction Stop
        Get-NetFirewallRule -DisplayGroup "File and Printer Sharing" | 
            Where-Object { $_.Profile -match $Profile } | 
            Set-NetFirewallRule -Enabled ${enabled} -ErrorAction Stop
    }
    
    Write-Host ""
    Write-Host "✓ Network discovery ${action.toLowerCase()}d for $Profile profile" -ForegroundColor Green
    Write-Host "✓ File and printer sharing ${action.toLowerCase()}d for $Profile profile" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Current Status:" -ForegroundColor Cyan
    Get-NetFirewallRule -DisplayGroup "Network Discovery" | 
        Select-Object DisplayName, Profile, Enabled | 
        Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed to configure network discovery: $_" -ForegroundColor Red
    exit 1
}`;
    }
  },

  {
    id: 'get-network-bandwidth-stats',
    name: 'Get Network Bandwidth Statistics',
    category: 'Network Monitoring',
    description: 'Monitor real-time network bandwidth usage and interface statistics across all adapters',
    isPremium: true,
    instructions: `**How This Task Works:**
- Collects network interface statistics
- Shows bytes sent/received per adapter
- Calculates bandwidth utilization over monitoring period
- Identifies top bandwidth consumers
- Optional continuous monitoring mode

**Prerequisites:**
- PowerShell 5.1 or later
- Standard user permissions (no admin required)
- Write permissions on export location (if exporting)

**What You Need to Provide:**
- Monitoring duration (seconds, default: 10)
- Sample interval (seconds, default: 1)
- Optional: Export CSV file path

**What the Script Does:**
1. Captures baseline network statistics for all adapters
2. Waits for specified monitoring duration
3. Captures final statistics
4. Calculates bytes/packets sent and received during period
5. Converts to human-readable units (KB/s, MB/s)
6. Reports per-adapter bandwidth utilization
7. Identifies adapter with highest throughput

**Important Notes:**
- No administrator privileges required
- Statistics are cumulative since adapter start
- Script calculates delta during monitoring period
- Typical use: identify bandwidth hogs, capacity planning
- Zero values indicate no traffic during monitoring period
- High utilization may indicate network congestion
- Combine with netstat-report for connection details
- Export useful for historical trending`,
    parameters: [
      { id: 'durationSeconds', label: 'Monitoring Duration (seconds)', type: 'number', required: false, defaultValue: 10 },
      { id: 'sampleInterval', label: 'Sample Interval (seconds)', type: 'number', required: false, defaultValue: 1 },
      { id: 'exportPath', label: 'Export Path (CSV)', type: 'path', required: false, placeholder: 'C:\\Reports\\BandwidthStats.csv' }
    ],
    scriptTemplate: (params) => {
      const durationSeconds = Number(params.durationSeconds || 10);
      const sampleInterval = Number(params.sampleInterval || 1);
      const exportPath = params.exportPath ? escapePowerShellString(params.exportPath) : '';
      
      return `# Get Network Bandwidth Statistics
# Generated: ${new Date().toISOString()}

$DurationSeconds = ${durationSeconds}
$SampleInterval = ${sampleInterval}

Write-Host "Network Bandwidth Statistics Monitor" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Monitoring duration: $DurationSeconds seconds" -ForegroundColor Gray
Write-Host "Sample interval: $SampleInterval second(s)" -ForegroundColor Gray
Write-Host ""

# Get active adapters
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }

if (-not $Adapters) {
    Write-Host "✗ No active network adapters found" -ForegroundColor Red
    exit 1
}

Write-Host "Monitoring $($Adapters.Count) active adapter(s)..." -ForegroundColor Yellow
Write-Host ""

# Capture baseline statistics
$BaselineStats = @{}
foreach ($Adapter in $Adapters) {
    $Stats = Get-NetAdapterStatistics -Name $Adapter.Name -ErrorAction SilentlyContinue
    if ($Stats) {
        $BaselineStats[$Adapter.Name] = @{
            BytesSent = $Stats.SentBytes
            BytesReceived = $Stats.ReceivedBytes
            PacketsSent = $Stats.SentUnicastPackets
            PacketsReceived = $Stats.ReceivedUnicastPackets
            Errors = $Stats.ReceivedDiscards + $Stats.OutboundDiscards
        }
    }
}

# Wait for monitoring duration
$StartTime = Get-Date
Write-Host "Collecting data..." -ForegroundColor Gray
Start-Sleep -Seconds $DurationSeconds
$EndTime = Get-Date
$ActualDuration = ($EndTime - $StartTime).TotalSeconds

# Capture final statistics and calculate deltas
$Report = foreach ($Adapter in $Adapters) {
    $Stats = Get-NetAdapterStatistics -Name $Adapter.Name -ErrorAction SilentlyContinue
    $Baseline = $BaselineStats[$Adapter.Name]
    
    if ($Stats -and $Baseline) {
        $BytesSentDelta = $Stats.SentBytes - $Baseline.BytesSent
        $BytesReceivedDelta = $Stats.ReceivedBytes - $Baseline.BytesReceived
        $TotalBytes = $BytesSentDelta + $BytesReceivedDelta
        
        # Calculate rates per second
        $SendRateBps = [math]::Round($BytesSentDelta / $ActualDuration, 2)
        $ReceiveRateBps = [math]::Round($BytesReceivedDelta / $ActualDuration, 2)
        
        # Convert to human-readable format
        $SendRateFormatted = if ($SendRateBps -ge 1MB) { "$([math]::Round($SendRateBps / 1MB, 2)) MB/s" }
                             elseif ($SendRateBps -ge 1KB) { "$([math]::Round($SendRateBps / 1KB, 2)) KB/s" }
                             else { "$SendRateBps B/s" }
        
        $ReceiveRateFormatted = if ($ReceiveRateBps -ge 1MB) { "$([math]::Round($ReceiveRateBps / 1MB, 2)) MB/s" }
                                 elseif ($ReceiveRateBps -ge 1KB) { "$([math]::Round($ReceiveRateBps / 1KB, 2)) KB/s" }
                                 else { "$ReceiveRateBps B/s" }
        
        [PSCustomObject]@{
            AdapterName = $Adapter.Name
            LinkSpeed = $Adapter.LinkSpeed
            BytesSent = $BytesSentDelta
            BytesReceived = $BytesReceivedDelta
            TotalBytes = $TotalBytes
            SendRate = $SendRateFormatted
            ReceiveRate = $ReceiveRateFormatted
            PacketsSent = $Stats.SentUnicastPackets - $Baseline.PacketsSent
            PacketsReceived = $Stats.ReceivedUnicastPackets - $Baseline.PacketsReceived
            Errors = ($Stats.ReceivedDiscards + $Stats.OutboundDiscards) - $Baseline.Errors
        }
    }
}

# Display results
Write-Host ""
Write-Host "Bandwidth Statistics (over $([math]::Round($ActualDuration, 1)) seconds):" -ForegroundColor Cyan
Write-Host "----------------------------------------------------" -ForegroundColor Gray

$Report | ForEach-Object {
    Write-Host ""
    Write-Host "Adapter: $($_.AdapterName)" -ForegroundColor Yellow
    Write-Host "  Link Speed:     $($_.LinkSpeed)" -ForegroundColor Gray
    Write-Host "  Send Rate:      $($_.SendRate)" -ForegroundColor Green
    Write-Host "  Receive Rate:   $($_.ReceiveRate)" -ForegroundColor Green
    Write-Host "  Packets Sent:   $($_.PacketsSent)" -ForegroundColor Gray
    Write-Host "  Packets Recv:   $($_.PacketsReceived)" -ForegroundColor Gray
    if ($_.Errors -gt 0) {
        Write-Host "  Errors:         $($_.Errors)" -ForegroundColor Red
    }
}

# Summary
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
$TotalSent = ($Report | Measure-Object -Property BytesSent -Sum).Sum
$TotalReceived = ($Report | Measure-Object -Property BytesReceived -Sum).Sum
$TopAdapter = $Report | Sort-Object TotalBytes -Descending | Select-Object -First 1

$TotalSentFormatted = if ($TotalSent -ge 1MB) { "$([math]::Round($TotalSent / 1MB, 2)) MB" }
                      elseif ($TotalSent -ge 1KB) { "$([math]::Round($TotalSent / 1KB, 2)) KB" }
                      else { "$TotalSent B" }

$TotalReceivedFormatted = if ($TotalReceived -ge 1MB) { "$([math]::Round($TotalReceived / 1MB, 2)) MB" }
                          elseif ($TotalReceived -ge 1KB) { "$([math]::Round($TotalReceived / 1KB, 2)) KB" }
                          else { "$TotalReceived B" }

Write-Host "  Total Sent:     $TotalSentFormatted" -ForegroundColor Gray
Write-Host "  Total Received: $TotalReceivedFormatted" -ForegroundColor Gray
if ($TopAdapter) {
    Write-Host "  Top Adapter:    $($TopAdapter.AdapterName)" -ForegroundColor Yellow
}

${exportPath ? `
# Export to CSV
$Report | Export-Csv "${exportPath}" -NoTypeInformation
Write-Host ""
Write-Host "✓ Exported to ${exportPath}" -ForegroundColor Green` : ''}

Write-Host ""
Write-Host "✓ Bandwidth statistics collection complete" -ForegroundColor Green`;
    }
  },
];
