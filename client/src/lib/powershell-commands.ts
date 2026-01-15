import { Command, CommandCategory } from "@shared/schema";

export const powershellCommands: Command[] = [
  {
    id: "get-childitem",
    name: "Get-ChildItem",
    category: "File System",
    description: "Gets the items and child items in one or more specified locations",
    syntax: "Get-ChildItem [-Path] <string[]> [-Filter <string>] [-Recurse] [-File] [-Directory]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies a path to one or more locations",
        required: true,
        defaultValue: "."
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies a filter to qualify the Path parameter",
        required: false
      },
      {
        id: "recurse",
        name: "Recurse",
        type: "switch",
        description: "Gets items in specified locations and all child items",
        required: false,
        defaultValue: false
      },
      {
        id: "file",
        name: "File",
        type: "switch",
        description: "Gets files only",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-ChildItem -Path "C:\\Temp" -Recurse -File'
  },
  {
    id: "copy-item",
    name: "Copy-Item",
    category: "File System",
    description: "Copies an item from one location to another",
    syntax: "Copy-Item [-Path] <string[]> [-Destination] <string> [-Force] [-Recurse]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the items to copy",
        required: true
      },
      {
        id: "destination",
        name: "Destination",
        type: "path",
        description: "Specifies the path to the new location",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for user confirmation",
        required: false,
        defaultValue: false
      },
      {
        id: "recurse",
        name: "Recurse",
        type: "switch",
        description: "Copies all items in a directory recursively",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Copy-Item -Path "C:\\Source\\*" -Destination "C:\\Destination" -Recurse'
  },
  {
    id: "remove-item",
    name: "Remove-Item",
    category: "File System",
    description: "Deletes the specified items",
    syntax: "Remove-Item [-Path] <string[]> [-Force] [-Recurse]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the items being removed",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for user confirmation",
        required: false,
        defaultValue: false
      },
      {
        id: "recurse",
        name: "Recurse",
        type: "switch",
        description: "Deletes items in specified locations and all child items",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Remove-Item -Path "C:\\Temp\\*" -Recurse -Force'
  },
  {
    id: "test-connection",
    name: "Test-Connection",
    category: "Network",
    description: "Sends ICMP echo request packets to one or more computers",
    syntax: "Test-Connection [-ComputerName] <string[]> [-Count <int>] [-Delay <int>]",
    parameters: [
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the computer to ping",
        required: true
      },
      {
        id: "count",
        name: "Count",
        type: "int",
        description: "Specifies the number of echo requests to send",
        required: false,
        defaultValue: 4
      },
      {
        id: "delay",
        name: "Delay",
        type: "int",
        description: "Specifies the interval between pings in seconds",
        required: false,
        defaultValue: 1
      }
    ],
    example: 'Test-Connection -ComputerName "server01" -Count 2'
  },
  {
    id: "get-service",
    name: "Get-Service",
    category: "Services",
    description: "Gets the services on the computer",
    syntax: "Get-Service [[-Name] <string[]>] [-DisplayName <string[]>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the service names of services to retrieve",
        required: false,
        defaultValue: "*"
      },
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Specifies the display names of services to retrieve",
        required: false
      }
    ],
    example: 'Get-Service -Name "win*"'
  },
  {
    id: "start-service",
    name: "Start-Service",
    category: "Services",
    description: "Starts one or more stopped services",
    syntax: "Start-Service [-Name] <string[]> [-PassThru]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the service names of services to start",
        required: true
      },
      {
        id: "passthru",
        name: "PassThru",
        type: "switch",
        description: "Returns objects that represent the services",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Start-Service -Name "Spooler"'
  },
  {
    id: "get-process",
    name: "Get-Process",
    category: "Process Management",
    description: "Gets the processes that are running on the local computer",
    syntax: "Get-Process [[-Name] <string[]>] [-Id <int[]>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies one or more processes by process name",
        required: false
      },
      {
        id: "id",
        name: "Id",
        type: "int",
        description: "Specifies one or more processes by process ID",
        required: false
      }
    ],
    example: 'Get-Process -Name "chrome"'
  },
  {
    id: "stop-process",
    name: "Stop-Process",
    category: "Process Management",
    description: "Stops one or more running processes",
    syntax: "Stop-Process [-Name] <string[]> [-Force]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the process names of processes to stop",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Stops the specified processes without prompting for confirmation",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Stop-Process -Name "notepad" -Force'
  },
  {
    id: "get-eventlog",
    name: "Get-EventLog",
    category: "Event Logs",
    description: "Gets the events in an event log on the local computer",
    syntax: "Get-EventLog [-LogName] <string> [-Newest <int>] [-After <DateTime>]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "string",
        description: "Specifies the event log",
        required: true
      },
      {
        id: "newest",
        name: "Newest",
        type: "int",
        description: "Specifies the maximum number of events to retrieve",
        required: false,
        defaultValue: 100
      }
    ],
    example: 'Get-EventLog -LogName "Application" -Newest 50'
  },
  {
    id: "get-aduser",
    name: "Get-ADUser",
    category: "Active Directory",
    description: "Gets one or more Active Directory users",
    syntax: "Get-ADUser [-Identity] <string> [-Properties <string[]>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies an AD user object by providing one of the property values",
        required: true
      },
      {
        id: "properties",
        name: "Properties",
        type: "array",
        description: "Specifies the properties of the user object to retrieve",
        required: false,
        defaultValue: []
      }
    ],
    example: 'Get-ADUser -Identity "jdoe" -Properties DisplayName,EmailAddress'
  },
  {
    id: "new-aduser",
    name: "New-ADUser",
    category: "Active Directory",
    description: "Creates a new Active Directory user",
    syntax: "New-ADUser [-Name] <string> [-SamAccountName <string>] [-UserPrincipalName <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the new user",
        required: true
      },
      {
        id: "samaccountname",
        name: "SamAccountName",
        type: "string",
        description: "Specifies the Security Account Manager account name",
        required: true
      },
      {
        id: "userprincipalname",
        name: "UserPrincipalName",
        type: "string",
        description: "Specifies the user principal name",
        required: false
      }
    ],
    example: 'New-ADUser -Name "John Doe" -SamAccountName "jdoe"'
  },
  {
    id: "get-registrykey",
    name: "Get-ItemProperty",
    category: "Registry",
    description: "Gets the properties of a specified item (registry key)",
    syntax: "Get-ItemProperty [-Path] <string[]> [-Name <string>]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the item or items",
        required: true
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the property or properties to retrieve",
        required: false
      }
    ],
    example: 'Get-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion"'
  },
  {
    id: "set-registrykey",
    name: "Set-ItemProperty",
    category: "Registry",
    description: "Changes the value of the property of the specified item",
    syntax: "Set-ItemProperty [-Path] <string[]> [-Name] <string> [-Value] <Object>",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the item",
        required: true
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the property",
        required: true
      },
      {
        id: "value",
        name: "Value",
        type: "string",
        description: "Specifies the value of the property",
        required: true
      }
    ],
    example: 'Set-ItemProperty -Path "HKLM:\\Software\\MyApp" -Name "Version" -Value "1.0"'
  },
  {
    id: "remove-itemproperty-registry",
    name: "Remove-ItemProperty",
    category: "Registry",
    description: "Removes a property and its value from a registry key",
    syntax: "Remove-ItemProperty [-Path] <string> [-Name] <string> [-Force]",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the path to the registry key", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the property to remove", required: true },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-ItemProperty -Path "HKLM:\\Software\\MyApp" -Name "OldSetting" -Force'
  },
  {
    id: "new-item-registry",
    name: "New-Item",
    category: "Registry",
    description: "Creates a new registry key",
    syntax: "New-Item [-Path] <string> [-Name <string>] [-Force]",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the path where to create the new registry key", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the new registry key", required: false },
      { id: "force", name: "Force", type: "switch", description: "Creates parent keys if they don't exist", required: false, defaultValue: false }
    ],
    example: 'New-Item -Path "HKLM:\\Software\\MyApp\\Settings" -Force'
  },
  {
    id: "remove-item-registry",
    name: "Remove-Item",
    category: "Registry",
    description: "Removes a registry key and all its subkeys",
    syntax: "Remove-Item [-Path] <string> [-Recurse] [-Force]",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the path to the registry key to remove", required: true },
      { id: "recurse", name: "Recurse", type: "switch", description: "Removes all child keys recursively", required: false, defaultValue: false },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-Item -Path "HKLM:\\Software\\OldApp" -Recurse -Force'
  },
  {
    id: "test-path-registry",
    name: "Test-Path",
    category: "Registry",
    description: "Tests whether a registry path exists",
    syntax: "Test-Path [-Path] <string>",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the registry path to test", required: true }
    ],
    example: 'Test-Path -Path "HKLM:\\Software\\MyApp"'
  },
  {
    id: "get-childitem-registry",
    name: "Get-ChildItem",
    category: "Registry",
    description: "Gets child keys of a registry key",
    syntax: "Get-ChildItem [-Path] <string> [-Recurse]",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the registry path to enumerate", required: true },
      { id: "recurse", name: "Recurse", type: "switch", description: "Gets all child keys recursively", required: false, defaultValue: false }
    ],
    example: 'Get-ChildItem -Path "HKLM:\\Software\\Microsoft" -Recurse'
  },
  {
    id: "copy-itemproperty-registry",
    name: "Copy-ItemProperty",
    category: "Registry",
    description: "Copies a property and value from one registry key to another",
    syntax: "Copy-ItemProperty [-Path] <string> [-Destination] <string> [-Name] <string>",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the source registry path", required: true },
      { id: "destination", name: "Destination", type: "path", description: "Specifies the destination registry path", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the property to copy", required: true }
    ],
    example: 'Copy-ItemProperty -Path "HKLM:\\Software\\App1" -Destination "HKLM:\\Software\\App2" -Name "Setting1"'
  },
  {
    id: "set-executionpolicy",
    name: "Set-ExecutionPolicy",
    category: "Security",
    description: "Changes the user preference for the PowerShell script execution policy",
    syntax: "Set-ExecutionPolicy [-ExecutionPolicy] <ExecutionPolicy> [-Scope <ExecutionPolicyScope>]",
    parameters: [
      {
        id: "executionpolicy",
        name: "ExecutionPolicy",
        type: "string",
        description: "Specifies the new execution policy",
        required: true
      },
      {
        id: "scope",
        name: "Scope",
        type: "string",
        description: "Specifies the scope that is affected by the execution policy",
        required: false,
        defaultValue: "LocalMachine"
      }
    ],
    example: 'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser'
  },
  
  // Azure (Az Module) Commands
  {
    id: "get-azvm",
    name: "Get-AzVM",
    category: "Azure",
    description: "Gets the properties of a virtual machine in Azure",
    syntax: "Get-AzVM [[-ResourceGroupName] <string>] [[-Name] <string>]",
    parameters: [
      {
        id: "resourcegroupname",
        name: "ResourceGroupName",
        type: "string",
        description: "Specifies the name of the resource group",
        required: false
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the virtual machine",
        required: false
      }
    ],
    example: 'Get-AzVM -ResourceGroupName "MyResourceGroup" -Name "MyVM"'
  },
  {
    id: "start-azvm",
    name: "Start-AzVM",
    category: "Azure",
    description: "Starts an Azure virtual machine",
    syntax: "Start-AzVM [-ResourceGroupName] <string> [-Name] <string>",
    parameters: [
      {
        id: "resourcegroupname",
        name: "ResourceGroupName",
        type: "string",
        description: "Specifies the name of the resource group",
        required: true
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the virtual machine to start",
        required: true
      }
    ],
    example: 'Start-AzVM -ResourceGroupName "Production" -Name "WebServer01"'
  },
  {
    id: "stop-azvm",
    name: "Stop-AzVM",
    category: "Azure",
    description: "Stops an Azure virtual machine",
    syntax: "Stop-AzVM [-ResourceGroupName] <string> [-Name] <string> [-Force]",
    parameters: [
      {
        id: "resourcegroupname",
        name: "ResourceGroupName",
        type: "string",
        description: "Specifies the name of the resource group",
        required: true
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the virtual machine to stop",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the operation without prompting for confirmation",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Stop-AzVM -ResourceGroupName "Production" -Name "WebServer01" -Force'
  },
  {
    id: "new-azresourcegroup",
    name: "New-AzResourceGroup",
    category: "Azure",
    description: "Creates a new Azure resource group",
    syntax: "New-AzResourceGroup [-Name] <string> [-Location] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the resource group",
        required: true
      },
      {
        id: "location",
        name: "Location",
        type: "string",
        description: "Specifies the location for the resource group",
        required: true
      }
    ],
    example: 'New-AzResourceGroup -Name "MyResourceGroup" -Location "East US"'
  },
  {
    id: "get-azstorageaccount",
    name: "Get-AzStorageAccount",
    category: "Azure",
    description: "Gets Azure Storage accounts",
    syntax: "Get-AzStorageAccount [[-ResourceGroupName] <string>] [[-Name] <string>]",
    parameters: [
      {
        id: "resourcegroupname",
        name: "ResourceGroupName",
        type: "string",
        description: "Specifies the name of the resource group",
        required: false
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the storage account",
        required: false
      }
    ],
    example: 'Get-AzStorageAccount -ResourceGroupName "MyRG" -Name "mystorageacct"'
  },
  {
    id: "new-azstorageaccount",
    name: "New-AzStorageAccount",
    category: "Azure",
    description: "Creates an Azure Storage account",
    syntax: "New-AzStorageAccount [-ResourceGroupName] <string> [-Name] <string> [-Location] <string> [-SkuName] <string>",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the storage account", required: true },
      { id: "location", name: "Location", type: "string", description: "Specifies the Azure region for the storage account", required: true },
      { id: "skuname", name: "SkuName", type: "select", description: "Specifies the SKU of the storage account", required: true, options: ["Standard_LRS", "Standard_GRS", "Standard_RAGRS", "Standard_ZRS", "Premium_LRS"] }
    ],
    example: 'New-AzStorageAccount -ResourceGroupName "MyRG" -Name "mystorageacct" -Location "East US" -SkuName "Standard_LRS"'
  },
  {
    id: "get-azwebapp",
    name: "Get-AzWebApp",
    category: "Azure",
    description: "Gets Azure Web Apps in a subscription or resource group",
    syntax: "Get-AzWebApp [[-ResourceGroupName] <string>] [[-Name] <string>]",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: false },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the web app", required: false }
    ],
    example: 'Get-AzWebApp -ResourceGroupName "Production-RG" -Name "MyWebApp"'
  },
  {
    id: "new-azwebapp",
    name: "New-AzWebApp",
    category: "Azure",
    description: "Creates an Azure Web App",
    syntax: "New-AzWebApp [-ResourceGroupName] <string> [-Name] <string> [-Location] <string> [-AppServicePlan] <string>",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the web app", required: true },
      { id: "location", name: "Location", type: "string", description: "Specifies the Azure region", required: true },
      { id: "appserviceplan", name: "AppServicePlan", type: "string", description: "Specifies the App Service Plan name", required: true }
    ],
    example: 'New-AzWebApp -ResourceGroupName "Production-RG" -Name "MyWebApp" -Location "East US" -AppServicePlan "MyPlan"'
  },
  {
    id: "get-azsqlserver",
    name: "Get-AzSqlServer",
    category: "Azure",
    description: "Gets Azure SQL servers",
    syntax: "Get-AzSqlServer [[-ResourceGroupName] <string>] [[-ServerName] <string>]",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: false },
      { id: "servername", name: "ServerName", type: "string", description: "Specifies the name of the SQL server", required: false }
    ],
    example: 'Get-AzSqlServer -ResourceGroupName "Database-RG" -ServerName "MySqlServer"'
  },
  {
    id: "new-azsqlserver",
    name: "New-AzSqlServer",
    category: "Azure",
    description: "Creates an Azure SQL server",
    syntax: "New-AzSqlServer [-ResourceGroupName] <string> [-ServerName] <string> [-Location] <string> [-SqlAdministratorCredentials] <PSCredential>",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: true },
      { id: "servername", name: "ServerName", type: "string", description: "Specifies the name of the SQL server", required: true },
      { id: "location", name: "Location", type: "string", description: "Specifies the Azure region", required: true },
      { id: "sqladministratorlogin", name: "SqlAdministratorLogin", type: "string", description: "Specifies the SQL admin username", required: true }
    ],
    example: 'New-AzSqlServer -ResourceGroupName "Database-RG" -ServerName "MySqlServer" -Location "East US" -SqlAdministratorCredentials $cred'
  },
  {
    id: "get-azkeyvault",
    name: "Get-AzKeyVault",
    category: "Azure",
    description: "Gets Azure Key Vaults",
    syntax: "Get-AzKeyVault [[-ResourceGroupName] <string>] [[-VaultName] <string>]",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: false },
      { id: "vaultname", name: "VaultName", type: "string", description: "Specifies the name of the key vault", required: false }
    ],
    example: 'Get-AzKeyVault -ResourceGroupName "Security-RG" -VaultName "MyKeyVault"'
  },
  {
    id: "set-azkeyvaultsecret",
    name: "Set-AzKeyVaultSecret",
    category: "Azure",
    description: "Creates or updates a secret in Azure Key Vault",
    syntax: "Set-AzKeyVaultSecret [-VaultName] <string> [-Name] <string> [-SecretValue] <SecureString>",
    parameters: [
      { id: "vaultname", name: "VaultName", type: "string", description: "Specifies the name of the key vault", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the secret", required: true },
      { id: "secretvalue", name: "SecretValue", type: "string", description: "Specifies the secret value (as SecureString)", required: true }
    ],
    example: 'Set-AzKeyVaultSecret -VaultName "MyKeyVault" -Name "DatabasePassword" -SecretValue $secretValue'
  },
  {
    id: "get-aznetworksecuritygroup",
    name: "Get-AzNetworkSecurityGroup",
    category: "Azure",
    description: "Gets Azure Network Security Groups",
    syntax: "Get-AzNetworkSecurityGroup [[-ResourceGroupName] <string>] [[-Name] <string>]",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the name of the resource group", required: false },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the network security group", required: false }
    ],
    example: 'Get-AzNetworkSecurityGroup -ResourceGroupName "Network-RG" -Name "MyNSG"'
  },

  // Exchange Online Commands
  {
    id: "get-exomailbox",
    name: "Get-EXOMailbox",
    category: "Exchange Online",
    description: "Gets mailbox objects and their attributes in Exchange Online",
    syntax: "Get-EXOMailbox [[-Identity] <string>] [-ResultSize <int>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the mailbox identity",
        required: false
      },
      {
        id: "resultsize",
        name: "ResultSize",
        type: "int",
        description: "Maximum number of results to return",
        required: false,
        defaultValue: 100
      }
    ],
    example: 'Get-EXOMailbox -Identity "john.doe@contoso.com"'
  },
  {
    id: "new-mailbox",
    name: "New-Mailbox",
    category: "Exchange Online",
    description: "Creates a new shared mailbox in Exchange Online",
    syntax: "New-Mailbox [-Name] <string> [-Alias] <string> [-Shared]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the shared mailbox",
        required: true
      },
      {
        id: "alias",
        name: "Alias",
        type: "string",
        description: "Specifies the email alias for the mailbox",
        required: true
      },
      {
        id: "shared",
        name: "Shared",
        type: "switch",
        description: "Creates a shared mailbox",
        required: false,
        defaultValue: true
      }
    ],
    example: 'New-Mailbox -Name "Sales Team" -Alias "sales" -Shared'
  },
  {
    id: "set-mailbox",
    name: "Set-Mailbox",
    category: "Exchange Online",
    description: "Modifies the settings of an existing mailbox",
    syntax: "Set-Mailbox [-Identity] <string> [-ProhibitSendQuota <Unlimited>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the mailbox to modify",
        required: true
      },
      {
        id: "prohibitsendquota",
        name: "ProhibitSendQuota",
        type: "string",
        description: "Specifies the mailbox size at which sending is prohibited",
        required: false
      }
    ],
    example: 'Set-Mailbox -Identity "john.doe" -ProhibitSendQuota "10GB"'
  },
  {
    id: "get-distributiongroupmember",
    name: "Get-DistributionGroupMember",
    category: "Exchange Online",
    description: "Gets members of a distribution group",
    syntax: "Get-DistributionGroupMember [-Identity] <string>",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the distribution group",
        required: true
      }
    ],
    example: 'Get-DistributionGroupMember -Identity "IT Team"'
  },

  // Azure AD / Microsoft Entra ID Commands
  {
    id: "get-azureaduser",
    name: "Get-AzureADUser",
    category: "Azure AD",
    description: "Gets a user from Azure Active Directory",
    syntax: "Get-AzureADUser [[-ObjectId] <string>] [-Filter <string>]",
    parameters: [
      {
        id: "objectid",
        name: "ObjectId",
        type: "string",
        description: "Specifies the object ID of the user",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies an OData filter statement",
        required: false
      }
    ],
    example: 'Get-AzureADUser -Filter "DisplayName eq \'John Doe\'"'
  },
  {
    id: "new-azureaduser",
    name: "New-AzureADUser",
    category: "Azure AD",
    description: "Creates a new user in Azure Active Directory",
    syntax: "New-AzureADUser [-DisplayName] <string> [-UserPrincipalName] <string> [-MailNickName] <string>",
    parameters: [
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Specifies the display name of the user",
        required: true
      },
      {
        id: "userprincipalname",
        name: "UserPrincipalName",
        type: "string",
        description: "Specifies the user principal name",
        required: true
      },
      {
        id: "mailnickname",
        name: "MailNickName",
        type: "string",
        description: "Specifies the mail alias for the user",
        required: true
      }
    ],
    example: 'New-AzureADUser -DisplayName "Jane Doe" -UserPrincipalName "jane@contoso.com" -MailNickName "jane"'
  },
  {
    id: "get-azureadgroup",
    name: "Get-AzureADGroup",
    category: "Azure AD",
    description: "Gets a group from Azure Active Directory",
    syntax: "Get-AzureADGroup [[-ObjectId] <string>] [-Filter <string>]",
    parameters: [
      {
        id: "objectid",
        name: "ObjectId",
        type: "string",
        description: "Specifies the object ID of the group",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies an OData filter statement",
        required: false
      }
    ],
    example: 'Get-AzureADGroup -Filter "DisplayName eq \'IT Admins\'"'
  },
  {
    id: "add-azureadgroupmember",
    name: "Add-AzureADGroupMember",
    category: "Azure AD",
    description: "Adds a member to an Azure AD group",
    syntax: "Add-AzureADGroupMember [-ObjectId] <string> [-RefObjectId] <string>",
    parameters: [
      {
        id: "objectid",
        name: "ObjectId",
        type: "string",
        description: "Specifies the object ID of the group",
        required: true
      },
      {
        id: "refobjectid",
        name: "RefObjectId",
        type: "string",
        description: "Specifies the object ID of the member to add",
        required: true
      }
    ],
    example: 'Add-AzureADGroupMember -ObjectId "group-id" -RefObjectId "user-id"'
  },

  // SharePoint Online Commands
  {
    id: "connect-sposervice",
    name: "Connect-SPOService",
    category: "SharePoint",
    description: "Connects to SharePoint Online",
    syntax: "Connect-SPOService [-Url] <string>",
    parameters: [
      {
        id: "url",
        name: "Url",
        type: "string",
        description: "Specifies the SharePoint Online admin center URL",
        required: true
      }
    ],
    example: 'Connect-SPOService -Url "https://contoso-admin.sharepoint.com"'
  },
  {
    id: "get-sposite",
    name: "Get-SPOSite",
    category: "SharePoint",
    description: "Gets SharePoint Online site collections",
    syntax: "Get-SPOSite [[-Identity] <string>] [-Limit <int>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the URL of the site collection",
        required: false
      },
      {
        id: "limit",
        name: "Limit",
        type: "int",
        description: "Specifies the maximum number of site collections to return",
        required: false,
        defaultValue: 200
      }
    ],
    example: 'Get-SPOSite -Identity "https://contoso.sharepoint.com/sites/marketing"'
  },
  {
    id: "new-sposite",
    name: "New-SPOSite",
    category: "SharePoint",
    description: "Creates a new SharePoint Online site collection",
    syntax: "New-SPOSite [-Url] <string> [-Owner] <string> [-Title] <string>",
    parameters: [
      {
        id: "url",
        name: "Url",
        type: "string",
        description: "Specifies the URL of the new site collection",
        required: true
      },
      {
        id: "owner",
        name: "Owner",
        type: "string",
        description: "Specifies the owner of the site collection",
        required: true
      },
      {
        id: "title",
        name: "Title",
        type: "string",
        description: "Specifies the title of the site collection",
        required: true
      }
    ],
    example: 'New-SPOSite -Url "https://contoso.sharepoint.com/sites/project" -Owner "admin@contoso.com" -Title "Project Site"'
  },

  // MECM/SCCM (Configuration Manager) Commands
  {
    id: "get-cmdevice",
    name: "Get-CMDevice",
    category: "MECM",
    description: "Gets a Configuration Manager device",
    syntax: "Get-CMDevice [[-Name] <string>] [-CollectionId <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the device",
        required: false
      },
      {
        id: "collectionid",
        name: "CollectionId",
        type: "string",
        description: "Specifies the collection ID",
        required: false
      }
    ],
    example: 'Get-CMDevice -Name "DESKTOP-*"'
  },
  {
    id: "new-cmdevicecollection",
    name: "New-CMDeviceCollection",
    category: "MECM",
    description: "Creates a Configuration Manager device collection",
    syntax: "New-CMDeviceCollection [-Name] <string> [-LimitingCollectionName] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the device collection",
        required: true
      },
      {
        id: "limitingcollectionname",
        name: "LimitingCollectionName",
        type: "string",
        description: "Specifies the name of the limiting collection",
        required: true
      }
    ],
    example: 'New-CMDeviceCollection -Name "Windows 11 Devices" -LimitingCollectionName "All Systems"'
  },
  {
    id: "start-cmclientaction",
    name: "Invoke-CMClientAction",
    category: "MECM",
    description: "Triggers a Configuration Manager client action",
    syntax: "Invoke-CMClientAction [-DeviceName] <string> [-ActionType] <string>",
    parameters: [
      {
        id: "devicename",
        name: "DeviceName",
        type: "string",
        description: "Specifies the name of the device",
        required: true
      },
      {
        id: "actiontype",
        name: "ActionType",
        type: "string",
        description: "Specifies the type of action (MachinePolicyRetrieval, HardwareInventory, etc.)",
        required: true
      }
    ],
    example: 'Invoke-CMClientAction -DeviceName "PC01" -ActionType "MachinePolicyRetrieval"'
  },
  {
    id: "get-cmapplication",
    name: "Get-CMApplication",
    category: "MECM",
    description: "Gets Configuration Manager applications",
    syntax: "Get-CMApplication [[-Name] <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the application",
        required: false
      }
    ],
    example: 'Get-CMApplication -Name "Microsoft Office*"'
  },
  {
    id: "get-cmdevicecollection",
    name: "Get-CMDeviceCollection",
    category: "MECM",
    description: "Gets Configuration Manager device collections",
    syntax: "Get-CMDeviceCollection [[-Name] <string>] [-Id <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the device collection", required: false },
      { id: "id", name: "Id", type: "string", description: "Specifies the collection ID", required: false }
    ],
    example: 'Get-CMDeviceCollection -Name "All Windows 11*"'
  },
  {
    id: "remove-cmdevicecollection",
    name: "Remove-CMDeviceCollection",
    category: "MECM",
    description: "Removes a Configuration Manager device collection",
    syntax: "Remove-CMDeviceCollection [-Name] <string> [-Force]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the device collection to remove", required: true },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-CMDeviceCollection -Name "Old Test Collection" -Force'
  },
  {
    id: "remove-cmapplication",
    name: "Remove-CMApplication",
    category: "MECM",
    description: "Removes a Configuration Manager application",
    syntax: "Remove-CMApplication [-Name] <string> [-Force]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the application to remove", required: true },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-CMApplication -Name "Legacy App" -Force'
  },
  {
    id: "get-cmdeployment",
    name: "Get-CMDeployment",
    category: "MECM",
    description: "Gets Configuration Manager deployments",
    syntax: "Get-CMDeployment [[-CollectionName] <string>] [-SoftwareName <string>]",
    parameters: [
      { id: "collectionname", name: "CollectionName", type: "string", description: "Specifies the target collection name", required: false },
      { id: "softwarename", name: "SoftwareName", type: "string", description: "Specifies the software name", required: false }
    ],
    example: 'Get-CMDeployment -CollectionName "All Workstations"'
  },
  {
    id: "new-cmdeployment",
    name: "New-CMApplicationDeployment",
    category: "MECM",
    description: "Creates a new Configuration Manager application deployment",
    syntax: "New-CMApplicationDeployment -ApplicationName <string> -CollectionName <string> [-DeployAction <string>] [-DeployPurpose <string>]",
    parameters: [
      { id: "applicationname", name: "ApplicationName", type: "string", description: "Specifies the application to deploy", required: true },
      { id: "collectionname", name: "CollectionName", type: "string", description: "Specifies the target collection", required: true },
      { id: "deployaction", name: "DeployAction", type: "select", description: "Specifies the deployment action", required: false, options: ["Install", "Uninstall"] },
      { id: "deploypurpose", name: "DeployPurpose", type: "select", description: "Specifies whether required or available", required: false, options: ["Required", "Available"] }
    ],
    example: 'New-CMApplicationDeployment -ApplicationName "Chrome Browser" -CollectionName "All Workstations" -DeployPurpose Required'
  },
  {
    id: "get-cmpackage",
    name: "Get-CMPackage",
    category: "MECM",
    description: "Gets Configuration Manager packages",
    syntax: "Get-CMPackage [[-Name] <string>] [-Id <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the package name", required: false },
      { id: "id", name: "Id", type: "string", description: "Specifies the package ID", required: false }
    ],
    example: 'Get-CMPackage -Name "Windows Updates*"'
  },
  {
    id: "get-cmtasksequence",
    name: "Get-CMTaskSequence",
    category: "MECM",
    description: "Gets Configuration Manager task sequences",
    syntax: "Get-CMTaskSequence [[-Name] <string>] [-TaskSequencePackageId <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the task sequence name", required: false },
      { id: "tasksequencepackageid", name: "TaskSequencePackageId", type: "string", description: "Specifies the task sequence package ID", required: false }
    ],
    example: 'Get-CMTaskSequence -Name "Windows 11 Deployment*"'
  },
  {
    id: "get-cmsoftwareupdate",
    name: "Get-CMSoftwareUpdate",
    category: "MECM",
    description: "Gets software updates in Configuration Manager",
    syntax: "Get-CMSoftwareUpdate [-Name <string>] [-IsDeployed <bool>] [-IsSuperseded <bool>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the update name pattern", required: false },
      { id: "isdeployed", name: "IsDeployed", type: "boolean", description: "Filter by deployed status", required: false },
      { id: "issuperseded", name: "IsSuperseded", type: "boolean", description: "Filter by superseded status", required: false }
    ],
    example: 'Get-CMSoftwareUpdate -IsDeployed $true -IsSuperseded $false'
  },

  // Exchange Server (On-Premises) Commands
  {
    id: "get-mailbox-onprem",
    name: "Get-Mailbox",
    category: "Exchange Server",
    description: "Gets mailbox objects in Exchange Server",
    syntax: "Get-Mailbox [[-Identity] <string>] [-Server <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the mailbox identity",
        required: false
      },
      {
        id: "server",
        name: "Server",
        type: "string",
        description: "Specifies the Exchange server",
        required: false
      }
    ],
    example: 'Get-Mailbox -Identity "john.doe" -Server "EX01"'
  },
  {
    id: "get-mailboxdatabase",
    name: "Get-MailboxDatabase",
    category: "Exchange Server",
    description: "Gets mailbox database configuration information",
    syntax: "Get-MailboxDatabase [[-Identity] <string>] [-Server <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the mailbox database",
        required: false
      },
      {
        id: "server",
        name: "Server",
        type: "string",
        description: "Specifies the Exchange server",
        required: false
      }
    ],
    example: 'Get-MailboxDatabase -Server "EX01"'
  },
  {
    id: "test-mapit",
    name: "Test-MAPIConnectivity",
    category: "Exchange Server",
    description: "Tests MAPI connectivity to mailboxes",
    syntax: "Test-MAPIConnectivity [[-Identity] <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the mailbox to test",
        required: false
      }
    ],
    example: 'Test-MAPIConnectivity -Identity "john.doe"'
  },
  {
    id: "get-transportrule-exserver",
    name: "Get-TransportRule",
    category: "Exchange Server",
    description: "Gets transport rules configured on Exchange Server",
    syntax: "Get-TransportRule [[-Identity] <string>] [-State <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the transport rule identity",
        required: false
      },
      {
        id: "state",
        name: "State",
        type: "select",
        description: "Filter by rule state",
        required: false,
        options: ["Enabled", "Disabled"]
      }
    ],
    example: 'Get-TransportRule -State Enabled'
  },
  {
    id: "new-transportrule-exserver",
    name: "New-TransportRule",
    category: "Exchange Server",
    description: "Creates a new transport rule in Exchange Server",
    syntax: "New-TransportRule [-Name] <string> [-Priority <int>] [-Enabled <bool>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Name of the transport rule",
        required: true
      },
      {
        id: "priority",
        name: "Priority",
        type: "int",
        description: "Rule priority (lower numbers execute first)",
        required: false
      },
      {
        id: "enabled",
        name: "Enabled",
        type: "boolean",
        description: "Whether the rule is enabled",
        required: false,
        defaultValue: true
      }
    ],
    example: 'New-TransportRule -Name "Block External Forward" -Priority 1 -Enabled $true'
  },
  {
    id: "get-mailboxstatistics-exserver",
    name: "Get-MailboxStatistics",
    category: "Exchange Server",
    description: "Gets mailbox statistics including size and item count",
    syntax: "Get-MailboxStatistics [-Identity] <string> [-Server <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the mailbox identity",
        required: true
      },
      {
        id: "server",
        name: "Server",
        type: "string",
        description: "Exchange server name",
        required: false
      }
    ],
    example: 'Get-MailboxStatistics -Identity "john.doe" | Select DisplayName,TotalItemSize,ItemCount'
  },
  {
    id: "get-publicfolder",
    name: "Get-PublicFolder",
    category: "Exchange Server",
    description: "Gets public folder information from Exchange Server",
    syntax: "Get-PublicFolder [[-Identity] <string>] [-Recurse]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Public folder path",
        required: false,
        defaultValue: "\\"
      },
      {
        id: "recurse",
        name: "Recurse",
        type: "switch",
        description: "Include child public folders",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-PublicFolder -Identity "\\Sales" -Recurse'
  },
  {
    id: "new-publicfolder",
    name: "New-PublicFolder",
    category: "Exchange Server",
    description: "Creates a new public folder in Exchange Server",
    syntax: "New-PublicFolder [-Name] <string> [-Path] <string> [-Mailbox <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Name of the public folder",
        required: true
      },
      {
        id: "path",
        name: "Path",
        type: "string",
        description: "Parent path for the folder",
        required: true
      },
      {
        id: "mailbox",
        name: "Mailbox",
        type: "string",
        description: "Content mailbox for the public folder",
        required: false
      }
    ],
    example: 'New-PublicFolder -Name "Projects" -Path "\\"'
  },
  {
    id: "get-mailboxpermission-exserver",
    name: "Get-MailboxPermission",
    category: "Exchange Server",
    description: "Gets permissions assigned to a mailbox",
    syntax: "Get-MailboxPermission [-Identity] <string> [-User <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Mailbox identity",
        required: true
      },
      {
        id: "user",
        name: "User",
        type: "string",
        description: "Filter by specific user",
        required: false
      }
    ],
    example: 'Get-MailboxPermission -Identity "shared@contoso.com"'
  },
  {
    id: "set-mailbox-exserver",
    name: "Set-Mailbox",
    category: "Exchange Server",
    description: "Modifies mailbox properties in Exchange Server",
    syntax: "Set-Mailbox [-Identity] <string> [-ProhibitSendQuota <string>] [-IssueWarningQuota <string>] [-MaxSendSize <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Mailbox identity",
        required: true
      },
      {
        id: "prohibitsendquota",
        name: "ProhibitSendQuota",
        type: "string",
        description: "Mailbox size at which sending is blocked",
        required: false
      },
      {
        id: "issuewarningquota",
        name: "IssueWarningQuota",
        type: "string",
        description: "Mailbox size at which warning is issued",
        required: false
      },
      {
        id: "maxsendsize",
        name: "MaxSendSize",
        type: "string",
        description: "Maximum message size the user can send",
        required: false
      }
    ],
    example: 'Set-Mailbox -Identity "john.doe" -ProhibitSendQuota "5GB" -IssueWarningQuota "4.5GB"'
  },
  {
    id: "get-distributiongroup-exserver",
    name: "Get-DistributionGroup",
    category: "Exchange Server",
    description: "Gets distribution group information from Exchange Server",
    syntax: "Get-DistributionGroup [[-Identity] <string>] [-Filter <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Distribution group identity",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "OPATH filter for groups",
        required: false
      }
    ],
    example: 'Get-DistributionGroup -Identity "IT Team"'
  },
  {
    id: "new-distributiongroup-exserver",
    name: "New-DistributionGroup",
    category: "Exchange Server",
    description: "Creates a new distribution group in Exchange Server",
    syntax: "New-DistributionGroup [-Name] <string> [-Alias] <string> [-OrganizationalUnit <string>] [-ManagedBy <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Display name of the group",
        required: true
      },
      {
        id: "alias",
        name: "Alias",
        type: "string",
        description: "Email alias for the group",
        required: true
      },
      {
        id: "organizationalunit",
        name: "OrganizationalUnit",
        type: "string",
        description: "OU where group will be created",
        required: false
      },
      {
        id: "managedby",
        name: "ManagedBy",
        type: "string",
        description: "Group manager identity",
        required: false
      }
    ],
    example: 'New-DistributionGroup -Name "Marketing Team" -Alias "marketing" -ManagedBy "admin@contoso.com"'
  },

  // Hyper-V Commands
  {
    id: "get-vm",
    name: "Get-VM",
    category: "Hyper-V",
    description: "Gets the virtual machines on a Hyper-V host",
    syntax: "Get-VM [[-Name] <string[]>] [-ComputerName <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the virtual machine",
        required: false
      },
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the Hyper-V host",
        required: false
      }
    ],
    example: 'Get-VM -Name "WebServer*"'
  },
  {
    id: "start-vm",
    name: "Start-VM",
    category: "Hyper-V",
    description: "Starts a virtual machine",
    syntax: "Start-VM [-Name] <string[]> [-ComputerName <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the virtual machine to start",
        required: true
      },
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the Hyper-V host",
        required: false
      }
    ],
    example: 'Start-VM -Name "WebServer01"'
  },
  {
    id: "stop-vm",
    name: "Stop-VM",
    category: "Hyper-V",
    description: "Stops a virtual machine",
    syntax: "Stop-VM [-Name] <string[]> [-Force] [-TurnOff]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the virtual machine to stop",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the operation without confirmation",
        required: false,
        defaultValue: false
      },
      {
        id: "turnoff",
        name: "TurnOff",
        type: "switch",
        description: "Turns off the VM (hard shutdown)",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Stop-VM -Name "WebServer01" -Force'
  },
  {
    id: "new-vm",
    name: "New-VM",
    category: "Hyper-V",
    description: "Creates a new virtual machine",
    syntax: "New-VM [-Name] <string> [-MemoryStartupBytes] <long> [-Path <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the new virtual machine",
        required: true
      },
      {
        id: "memorystartupbytes",
        name: "MemoryStartupBytes",
        type: "string",
        description: "Specifies the startup memory (e.g., 2GB)",
        required: true
      },
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to store VM files",
        required: false
      }
    ],
    example: 'New-VM -Name "TestServer" -MemoryStartupBytes 4GB -Path "D:\\VMs"'
  },
  {
    id: "remove-vm",
    name: "Remove-VM",
    category: "Hyper-V",
    description: "Deletes a virtual machine from the Hyper-V host",
    syntax: "Remove-VM [-Name] <string[]> [-Force] [-ComputerName <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the virtual machine to remove", required: true },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false },
      { id: "computername", name: "ComputerName", type: "string", description: "Specifies the Hyper-V host", required: false }
    ],
    example: 'Remove-VM -Name "OldTestVM" -Force'
  },
  {
    id: "new-vhd",
    name: "New-VHD",
    category: "Hyper-V",
    description: "Creates a new virtual hard disk",
    syntax: "New-VHD [-Path] <string> [-SizeBytes] <uint64> [-Dynamic] [-Fixed]",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the path for the new VHD file", required: true },
      { id: "sizebytes", name: "SizeBytes", type: "string", description: "Specifies the size of the VHD (e.g., 100GB)", required: true },
      { id: "dynamic", name: "Dynamic", type: "switch", description: "Creates a dynamically expanding disk", required: false, defaultValue: false },
      { id: "fixed", name: "Fixed", type: "switch", description: "Creates a fixed size disk", required: false, defaultValue: false }
    ],
    example: 'New-VHD -Path "D:\\VMs\\Disks\\DataDisk.vhdx" -SizeBytes 100GB -Dynamic'
  },
  {
    id: "get-vhd",
    name: "Get-VHD",
    category: "Hyper-V",
    description: "Gets the properties of a virtual hard disk",
    syntax: "Get-VHD [-Path] <string[]>",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Specifies the path to the VHD file", required: true }
    ],
    example: 'Get-VHD -Path "D:\\VMs\\Disks\\DataDisk.vhdx"'
  },
  {
    id: "get-vmswitch",
    name: "Get-VMSwitch",
    category: "Hyper-V",
    description: "Gets virtual switches on a Hyper-V host",
    syntax: "Get-VMSwitch [[-Name] <string>] [-SwitchType <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the virtual switch", required: false },
      { id: "switchtype", name: "SwitchType", type: "select", description: "Specifies the type of switch", required: false, options: ["External", "Internal", "Private"] }
    ],
    example: 'Get-VMSwitch -SwitchType External'
  },
  {
    id: "new-vmswitch",
    name: "New-VMSwitch",
    category: "Hyper-V",
    description: "Creates a new virtual switch",
    syntax: "New-VMSwitch [-Name] <string> [-SwitchType] <string> [-NetAdapterName <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name for the new virtual switch", required: true },
      { id: "switchtype", name: "SwitchType", type: "select", description: "Specifies the type of switch", required: true, options: ["External", "Internal", "Private"] },
      { id: "netadaptername", name: "NetAdapterName", type: "string", description: "Specifies the network adapter for external switch", required: false }
    ],
    example: 'New-VMSwitch -Name "ExternalSwitch" -SwitchType External -NetAdapterName "Ethernet"'
  },
  {
    id: "get-vmnetworkadapter",
    name: "Get-VMNetworkAdapter",
    category: "Hyper-V",
    description: "Gets virtual network adapters from a virtual machine",
    syntax: "Get-VMNetworkAdapter [-VMName] <string[]> [-Name <string>]",
    parameters: [
      { id: "vmname", name: "VMName", type: "string", description: "Specifies the name of the virtual machine", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the network adapter", required: false }
    ],
    example: 'Get-VMNetworkAdapter -VMName "WebServer01"'
  },
  {
    id: "set-vmnetworkadapter",
    name: "Set-VMNetworkAdapter",
    category: "Hyper-V",
    description: "Configures a virtual network adapter",
    syntax: "Set-VMNetworkAdapter [-VMName] <string> [-Name <string>] [-MacAddressSpoofing <string>] [-DhcpGuard <string>]",
    parameters: [
      { id: "vmname", name: "VMName", type: "string", description: "Specifies the name of the virtual machine", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the network adapter", required: false },
      { id: "macaddressspoofing", name: "MacAddressSpoofing", type: "select", description: "Enable or disable MAC spoofing", required: false, options: ["On", "Off"] },
      { id: "dhcpguard", name: "DhcpGuard", type: "select", description: "Enable or disable DHCP guard", required: false, options: ["On", "Off"] }
    ],
    example: 'Set-VMNetworkAdapter -VMName "WebServer01" -MacAddressSpoofing On'
  },
  {
    id: "get-vmsnapshot",
    name: "Get-VMSnapshot",
    category: "Hyper-V",
    description: "Gets snapshots (checkpoints) of a virtual machine",
    syntax: "Get-VMSnapshot [-VMName] <string[]> [-Name <string>]",
    parameters: [
      { id: "vmname", name: "VMName", type: "string", description: "Specifies the name of the virtual machine", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the snapshot", required: false }
    ],
    example: 'Get-VMSnapshot -VMName "WebServer01"'
  },
  {
    id: "checkpoint-vm",
    name: "Checkpoint-VM",
    category: "Hyper-V",
    description: "Creates a checkpoint (snapshot) of a virtual machine",
    syntax: "Checkpoint-VM [-Name] <string[]> [-SnapshotName <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the virtual machine", required: true },
      { id: "snapshotname", name: "SnapshotName", type: "string", description: "Specifies the name for the checkpoint", required: false }
    ],
    example: 'Checkpoint-VM -Name "WebServer01" -SnapshotName "Before-Update"'
  },
  {
    id: "restore-vmsnapshot",
    name: "Restore-VMSnapshot",
    category: "Hyper-V",
    description: "Restores a virtual machine to a previous checkpoint",
    syntax: "Restore-VMSnapshot [-VMName] <string> [-Name] <string> [-Confirm]",
    parameters: [
      { id: "vmname", name: "VMName", type: "string", description: "Specifies the name of the virtual machine", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the snapshot to restore", required: true },
      { id: "confirm", name: "Confirm", type: "switch", description: "Prompts for confirmation before restoring", required: false, defaultValue: true }
    ],
    example: 'Restore-VMSnapshot -VMName "WebServer01" -Name "Before-Update" -Confirm:$false'
  },
  {
    id: "set-vm",
    name: "Set-VM",
    category: "Hyper-V",
    description: "Configures settings for a virtual machine",
    syntax: "Set-VM [-Name] <string[]> [-ProcessorCount <int>] [-MemoryStartupBytes <long>] [-AutomaticStartAction <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the virtual machine", required: true },
      { id: "processorcount", name: "ProcessorCount", type: "int", description: "Specifies the number of virtual processors", required: false },
      { id: "memorystartupbytes", name: "MemoryStartupBytes", type: "string", description: "Specifies the startup memory (e.g., 4GB)", required: false },
      { id: "automaticstartaction", name: "AutomaticStartAction", type: "select", description: "Specifies the automatic start action", required: false, options: ["Nothing", "Start", "StartIfRunning"] }
    ],
    example: 'Set-VM -Name "WebServer01" -ProcessorCount 4 -MemoryStartupBytes 8GB'
  },

  // Extended Active Directory Commands
  {
    id: "set-aduser",
    name: "Set-ADUser",
    category: "Active Directory",
    description: "Modifies an Active Directory user",
    syntax: "Set-ADUser [-Identity] <string> [-EmailAddress <string>] [-Title <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the AD user to modify",
        required: true
      },
      {
        id: "emailaddress",
        name: "EmailAddress",
        type: "string",
        description: "Specifies the email address",
        required: false
      },
      {
        id: "title",
        name: "Title",
        type: "string",
        description: "Specifies the job title",
        required: false
      }
    ],
    example: 'Set-ADUser -Identity "jdoe" -EmailAddress "jdoe@contoso.com" -Title "IT Manager"'
  },
  {
    id: "remove-aduser",
    name: "Remove-ADUser",
    category: "Active Directory",
    description: "Removes an Active Directory user",
    syntax: "Remove-ADUser [-Identity] <string> [-Confirm <bool>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the AD user to remove",
        required: true
      },
      {
        id: "confirm",
        name: "Confirm",
        type: "boolean",
        description: "Prompts for confirmation before removing",
        required: false,
        defaultValue: true
      }
    ],
    example: 'Remove-ADUser -Identity "olduser" -Confirm:$false'
  },
  {
    id: "get-adgroup",
    name: "Get-ADGroup",
    category: "Active Directory",
    description: "Gets Active Directory groups",
    syntax: "Get-ADGroup [[-Identity] <string>] [-Filter <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the AD group",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies a filter to find groups",
        required: false
      }
    ],
    example: 'Get-ADGroup -Filter "Name -like \'IT*\'"'
  },
  {
    id: "add-adgroupmember",
    name: "Add-ADGroupMember",
    category: "Active Directory",
    description: "Adds members to an Active Directory group",
    syntax: "Add-ADGroupMember [-Identity] <string> [-Members] <string[]>",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the AD group",
        required: true
      },
      {
        id: "members",
        name: "Members",
        type: "array",
        description: "Specifies the users to add to the group",
        required: true,
        defaultValue: []
      }
    ],
    example: 'Add-ADGroupMember -Identity "IT Team" -Members "jdoe","jsmith"'
  },
  {
    id: "get-adcomputer",
    name: "Get-ADComputer",
    category: "Active Directory",
    description: "Gets Active Directory computer objects",
    syntax: "Get-ADComputer [[-Identity] <string>] [-Filter <string>] [-Properties <string[]>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Specifies the computer object",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies a filter to find computers",
        required: false
      },
      {
        id: "properties",
        name: "Properties",
        type: "array",
        description: "Specifies properties to retrieve",
        required: false,
        defaultValue: []
      }
    ],
    example: 'Get-ADComputer -Filter "OperatingSystem -like \'*Windows 11*\'" -Properties OperatingSystem'
  },

  // Windows Server Management Commands
  {
    id: "get-windowsfeature",
    name: "Get-WindowsFeature",
    category: "Windows Server",
    description: "Gets information about Windows Server roles and features",
    syntax: "Get-WindowsFeature [[-Name] <string[]>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the feature name",
        required: false
      }
    ],
    example: 'Get-WindowsFeature -Name "Web-Server"'
  },
  {
    id: "install-windowsfeature",
    name: "Install-WindowsFeature",
    category: "Windows Server",
    description: "Installs one or more Windows Server roles or features",
    syntax: "Install-WindowsFeature [-Name] <string[]> [-IncludeManagementTools]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the feature to install",
        required: true
      },
      {
        id: "includemanagementtools",
        name: "IncludeManagementTools",
        type: "switch",
        description: "Includes management tools for the feature",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Install-WindowsFeature -Name "Web-Server" -IncludeManagementTools'
  },
  {
    id: "restart-computer",
    name: "Restart-Computer",
    category: "Windows Server",
    description: "Restarts the operating system on local and remote computers",
    syntax: "Restart-Computer [[-ComputerName] <string[]>] [-Force]",
    parameters: [
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the computer to restart",
        required: false
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces an immediate restart",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Restart-Computer -ComputerName "SERVER01" -Force'
  },
  {
    id: "get-computerinfo",
    name: "Get-ComputerInfo",
    category: "Windows Server",
    description: "Gets a consolidated object of system and operating system properties",
    syntax: "Get-ComputerInfo [[-Property] <string[]>]",
    parameters: [
      {
        id: "property",
        name: "Property",
        type: "array",
        description: "Specifies properties to retrieve",
        required: false,
        defaultValue: []
      }
    ],
    example: 'Get-ComputerInfo -Property "OsName","OsVersion"'
  },
  {
    id: "set-dnsclientserveraddress",
    name: "Set-DnsClientServerAddress",
    category: "Windows Server",
    description: "Sets DNS server addresses on a network interface",
    syntax: "Set-DnsClientServerAddress [-InterfaceAlias] <string> [-ServerAddresses] <string[]>",
    parameters: [
      {
        id: "interfacealias",
        name: "InterfaceAlias",
        type: "string",
        description: "Specifies the network interface",
        required: true
      },
      {
        id: "serveraddresses",
        name: "ServerAddresses",
        type: "array",
        description: "Specifies DNS server IP addresses",
        required: true,
        defaultValue: []
      }
    ],
    example: 'Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses "8.8.8.8","8.8.4.4"'
  },
  {
    id: "get-hotfix",
    name: "Get-Hotfix",
    category: "Windows Server",
    description: "Gets installed hotfixes and updates on the computer",
    syntax: "Get-Hotfix [[-Id] <string[]>] [-ComputerName <string>]",
    parameters: [
      {
        id: "id",
        name: "Id",
        type: "string",
        description: "Specifies the hotfix ID (e.g., KB number)",
        required: false
      },
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies a remote computer",
        required: false
      }
    ],
    example: 'Get-Hotfix -Id "KB5001234"'
  },
  {
    id: "test-netconnection",
    name: "Test-NetConnection",
    category: "Windows Server",
    description: "Displays diagnostic information for a connection",
    syntax: "Test-NetConnection [[-ComputerName] <string>] [-Port <int>]",
    parameters: [
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the target computer",
        required: false
      },
      {
        id: "port",
        name: "Port",
        type: "int",
        description: "Specifies the TCP port number",
        required: false
      }
    ],
    example: 'Test-NetConnection -ComputerName "server01.contoso.com" -Port 443'
  },
  {
    id: "get-disk",
    name: "Get-Disk",
    category: "Windows Server",
    description: "Gets disks visible to the operating system",
    syntax: "Get-Disk [[-Number] <int>]",
    parameters: [
      {
        id: "number",
        name: "Number",
        type: "int",
        description: "Specifies the disk number",
        required: false
      }
    ],
    example: 'Get-Disk -Number 0'
  },
  {
    id: "new-item",
    name: "New-Item",
    category: "File System",
    description: "Creates a new item (file, directory, symbolic link, etc.)",
    syntax: "New-Item [-Path] <string[]> [-ItemType <string>] [-Value <Object>] [-Force]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path where the item will be created",
        required: true
      },
      {
        id: "itemtype",
        name: "ItemType",
        type: "select",
        description: "Specifies the type of item to create",
        required: false,
        options: ["File", "Directory", "SymbolicLink", "Junction", "HardLink"],
        defaultValue: "File"
      },
      {
        id: "value",
        name: "Value",
        type: "string",
        description: "Initial value or content for the item",
        required: false
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces creation, overwriting existing read-only items",
        required: false,
        defaultValue: false
      }
    ],
    example: 'New-Item -Path "C:\\Logs" -ItemType Directory'
  },
  {
    id: "move-item",
    name: "Move-Item",
    category: "File System",
    description: "Moves an item from one location to another",
    syntax: "Move-Item [-Path] <string[]> [-Destination] <string> [-Force]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the items to move",
        required: true
      },
      {
        id: "destination",
        name: "Destination",
        type: "path",
        description: "Specifies the path to the new location",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for confirmation",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Move-Item -Path "C:\\file.txt" -Destination "D:\\file.txt"'
  },
  {
    id: "rename-item",
    name: "Rename-Item",
    category: "File System",
    description: "Renames an item in a provider namespace",
    syntax: "Rename-Item [-Path] <string> [-NewName] <string> [-Force]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the item to rename",
        required: true
      },
      {
        id: "newname",
        name: "NewName",
        type: "string",
        description: "Specifies the new name of the item",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for confirmation",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Rename-Item -Path "C:\\old.txt" -NewName "new.txt"'
  },
  {
    id: "test-path",
    name: "Test-Path",
    category: "File System",
    description: "Determines whether all elements of a path exist",
    syntax: "Test-Path [-Path] <string[]> [-PathType <string>] [-IsValid]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to test",
        required: true
      },
      {
        id: "pathtype",
        name: "PathType",
        type: "select",
        description: "Tests for specific type of path",
        required: false,
        options: ["Leaf", "Container", "Any"],
        defaultValue: "Any"
      },
      {
        id: "isvalid",
        name: "IsValid",
        type: "switch",
        description: "Tests whether the syntax of the path is correct",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Test-Path -Path "C:\\file.txt" -PathType Leaf'
  },
  {
    id: "get-content",
    name: "Get-Content",
    category: "File System",
    description: "Gets the content of the item at the specified location",
    syntax: "Get-Content [-Path] <string[]> [-TotalCount <int>] [-Tail <int>] [-Raw] [-Encoding <string>]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to an item",
        required: true
      },
      {
        id: "totalcount",
        name: "TotalCount",
        type: "int",
        description: "Gets the specified number of lines from the beginning",
        required: false
      },
      {
        id: "tail",
        name: "Tail",
        type: "int",
        description: "Gets the specified number of lines from the end",
        required: false
      },
      {
        id: "raw",
        name: "Raw",
        type: "switch",
        description: "Reads content as a single string instead of array of lines",
        required: false,
        defaultValue: false
      },
      {
        id: "encoding",
        name: "Encoding",
        type: "select",
        description: "Specifies the file encoding",
        required: false,
        options: ["ASCII", "UTF8", "UTF7", "UTF32", "Unicode", "BigEndianUnicode", "Default"]
      }
    ],
    example: 'Get-Content -Path "C:\\log.txt" -Tail 10'
  },
  {
    id: "set-content",
    name: "Set-Content",
    category: "File System",
    description: "Writes or replaces the content in an item with new content",
    syntax: "Set-Content [-Path] <string[]> [-Value] <Object[]> [-Encoding <string>] [-Force]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the item",
        required: true
      },
      {
        id: "value",
        name: "Value",
        type: "string",
        description: "Specifies the new content for the item",
        required: true
      },
      {
        id: "encoding",
        name: "Encoding",
        type: "select",
        description: "Specifies the file encoding",
        required: false,
        options: ["ASCII", "UTF8", "UTF7", "UTF32", "Unicode", "BigEndianUnicode", "Default"]
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for confirmation",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Set-Content -Path "C:\\file.txt" -Value "New content"'
  },
  {
    id: "add-content",
    name: "Add-Content",
    category: "File System",
    description: "Appends content to the specified items",
    syntax: "Add-Content [-Path] <string[]> [-Value] <Object[]> [-Encoding <string>]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to the item",
        required: true
      },
      {
        id: "value",
        name: "Value",
        type: "string",
        description: "Specifies the content to be added",
        required: true
      },
      {
        id: "encoding",
        name: "Encoding",
        type: "select",
        description: "Specifies the file encoding",
        required: false,
        options: ["ASCII", "UTF8", "UTF7", "UTF32", "Unicode", "BigEndianUnicode", "Default"]
      }
    ],
    example: 'Add-Content -Path "C:\\log.txt" -Value "Log entry"'
  },
  {
    id: "invoke-webrequest",
    name: "Invoke-WebRequest",
    category: "Network",
    description: "Gets content from a web page on the Internet",
    syntax: "Invoke-WebRequest [-Uri] <Uri> [-Method <string>] [-Headers <hashtable>] [-Body <Object>]",
    parameters: [
      {
        id: "uri",
        name: "Uri",
        type: "string",
        description: "Specifies the Uniform Resource Identifier (URI)",
        required: true
      },
      {
        id: "method",
        name: "Method",
        type: "select",
        description: "Specifies the method used for the web request",
        required: false,
        options: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
        defaultValue: "GET"
      },
      {
        id: "body",
        name: "Body",
        type: "string",
        description: "Specifies the body of the request",
        required: false
      }
    ],
    example: 'Invoke-WebRequest -Uri "https://api.example.com/data" -Method GET'
  },
  {
    id: "get-netipaddress",
    name: "Get-NetIPAddress",
    category: "Network",
    description: "Gets IP address configuration",
    syntax: "Get-NetIPAddress [-InterfaceAlias <string>] [-AddressFamily <string>]",
    parameters: [
      {
        id: "interfacealias",
        name: "InterfaceAlias",
        type: "string",
        description: "Specifies the network interface alias",
        required: false
      },
      {
        id: "addressfamily",
        name: "AddressFamily",
        type: "select",
        description: "Specifies the IP address family",
        required: false,
        options: ["IPv4", "IPv6"]
      }
    ],
    example: 'Get-NetIPAddress -AddressFamily IPv4'
  },
  {
    id: "get-netadapter",
    name: "Get-NetAdapter",
    category: "Network",
    description: "Gets basic network adapter properties",
    syntax: "Get-NetAdapter [[-Name] <string[]>] [-Physical] [-IncludeHidden]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name of the network adapter",
        required: false,
        defaultValue: "*"
      },
      {
        id: "physical",
        name: "Physical",
        type: "switch",
        description: "Returns only physical network adapters",
        required: false,
        defaultValue: false
      },
      {
        id: "includehidden",
        name: "IncludeHidden",
        type: "switch",
        description: "Includes hidden network adapters in the output",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-NetAdapter -Physical'
  },
  {
    id: "test-netconnection-network",
    name: "Test-NetConnection",
    category: "Network",
    description: "Displays diagnostic information for a connection",
    syntax: "Test-NetConnection [[-ComputerName] <string>] [-Port <int>] [-TraceRoute]",
    parameters: [
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the target computer to test",
        required: false,
        defaultValue: "localhost"
      },
      {
        id: "port",
        name: "Port",
        type: "int",
        description: "Specifies the TCP port number on the target",
        required: false
      },
      {
        id: "traceroute",
        name: "TraceRoute",
        type: "switch",
        description: "Runs a traceroute diagnostic test",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Test-NetConnection -ComputerName "google.com" -Port 443'
  },
  {
    id: "resolve-dnsname",
    name: "Resolve-DnsName",
    category: "Network",
    description: "Performs a DNS query for the specified name",
    syntax: "Resolve-DnsName [-Name] <string> [-Type <string>] [-Server <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the name to resolve",
        required: true
      },
      {
        id: "type",
        name: "Type",
        type: "select",
        description: "Specifies the DNS record type",
        required: false,
        options: ["A", "AAAA", "CNAME", "MX", "NS", "PTR", "SOA", "SRV", "TXT", "ALL"]
      },
      {
        id: "server",
        name: "Server",
        type: "string",
        description: "Specifies the DNS server to query",
        required: false
      }
    ],
    example: 'Resolve-DnsName -Name "www.example.com" -Type A'
  },
  {
    id: "stop-service",
    name: "Stop-Service",
    category: "Services",
    description: "Stops one or more running services",
    syntax: "Stop-Service [-Name] <string[]> [-Force] [-PassThru]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the service names of services to stop",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for confirmation",
        required: false,
        defaultValue: false
      },
      {
        id: "passthru",
        name: "PassThru",
        type: "switch",
        description: "Returns an object representing the service",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Stop-Service -Name "Spooler" -Force'
  },
  {
    id: "restart-service",
    name: "Restart-Service",
    category: "Services",
    description: "Stops and then starts one or more services",
    syntax: "Restart-Service [-Name] <string[]> [-Force] [-PassThru]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the service names of services to restart",
        required: true
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Forces the command to run without asking for confirmation",
        required: false,
        defaultValue: false
      },
      {
        id: "passthru",
        name: "PassThru",
        type: "switch",
        description: "Returns an object representing the service",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Restart-Service -Name "wuauserv"'
  },
  {
    id: "set-service",
    name: "Set-Service",
    category: "Services",
    description: "Changes the properties of a service",
    syntax: "Set-Service [-Name] <string> [-DisplayName <string>] [-Description <string>] [-StartupType <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the service name",
        required: true
      },
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Specifies a new display name for the service",
        required: false
      },
      {
        id: "description",
        name: "Description",
        type: "string",
        description: "Specifies a new description for the service",
        required: false
      },
      {
        id: "startuptype",
        name: "StartupType",
        type: "select",
        description: "Sets the startup mode of the service",
        required: false,
        options: ["Automatic", "Manual", "Disabled", "AutomaticDelayedStart"]
      }
    ],
    example: 'Set-Service -Name "BITS" -StartupType Automatic'
  },
  {
    id: "new-service",
    name: "New-Service",
    category: "Services",
    description: "Creates a new Windows service",
    syntax: "New-Service [-Name] <string> [-BinaryPathName] <string> [-DisplayName <string>] [-StartupType <string>] [-Credential <PSCredential>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Service name for the registry",
        required: true
      },
      {
        id: "binarypathname",
        name: "BinaryPathName",
        type: "path",
        description: "Path to the service executable",
        required: true
      },
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Display name for the service",
        required: false
      },
      {
        id: "startuptype",
        name: "StartupType",
        type: "select",
        description: "Startup type for the service",
        required: false,
        options: ["Automatic", "Manual", "Disabled", "AutomaticDelayedStart"]
      },
      {
        id: "description",
        name: "Description",
        type: "string",
        description: "Description of the service",
        required: false
      }
    ],
    example: 'New-Service -Name "MyService" -BinaryPathName "C:\\Services\\MyService.exe" -DisplayName "My Service" -StartupType Automatic'
  },
  {
    id: "remove-service",
    name: "Remove-Service",
    category: "Services",
    description: "Removes a Windows service",
    syntax: "Remove-Service [-Name] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Name of the service to remove",
        required: true
      }
    ],
    example: 'Remove-Service -Name "MyService"'
  },
  {
    id: "suspend-service",
    name: "Suspend-Service",
    category: "Services",
    description: "Suspends (pauses) one or more running services",
    syntax: "Suspend-Service [-Name] <string[]> [-PassThru]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Service name to suspend",
        required: true
      },
      {
        id: "passthru",
        name: "PassThru",
        type: "switch",
        description: "Returns an object representing the service",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Suspend-Service -Name "LanmanWorkstation"'
  },
  {
    id: "resume-service",
    name: "Resume-Service",
    category: "Services",
    description: "Resumes one or more suspended (paused) services",
    syntax: "Resume-Service [-Name] <string[]> [-PassThru]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Service name to resume",
        required: true
      },
      {
        id: "passthru",
        name: "PassThru",
        type: "switch",
        description: "Returns an object representing the service",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Resume-Service -Name "LanmanWorkstation"'
  },
  {
    id: "get-service-dependency",
    name: "Get-Service",
    category: "Services",
    description: "Gets services with their dependencies",
    syntax: "Get-Service [-Name] <string[]> -DependentServices | -RequiredServices",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Service name to check",
        required: true
      },
      {
        id: "dependentservices",
        name: "DependentServices",
        type: "switch",
        description: "Get services that depend on this service",
        required: false,
        defaultValue: false
      },
      {
        id: "requiredservices",
        name: "RequiredServices",
        type: "switch",
        description: "Get services this service requires",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-Service -Name "LanmanServer" | Select -ExpandProperty DependentServices'
  },
  {
    id: "start-process",
    name: "Start-Process",
    category: "Process Management",
    description: "Starts one or more processes on the local computer",
    syntax: "Start-Process [-FilePath] <string> [-ArgumentList <string[]>] [-Wait] [-WorkingDirectory <string>]",
    parameters: [
      {
        id: "filepath",
        name: "FilePath",
        type: "path",
        description: "Specifies the path to the program file",
        required: true
      },
      {
        id: "argumentlist",
        name: "ArgumentList",
        type: "array",
        description: "Specifies parameters or argument values",
        required: false
      },
      {
        id: "wait",
        name: "Wait",
        type: "switch",
        description: "Waits for the process to complete before accepting more input",
        required: false,
        defaultValue: false
      },
      {
        id: "workingdirectory",
        name: "WorkingDirectory",
        type: "path",
        description: "Specifies the working directory for the process",
        required: false
      }
    ],
    example: 'Start-Process -FilePath "notepad.exe" -ArgumentList "C:\\file.txt"'
  },
  {
    id: "wait-process",
    name: "Wait-Process",
    category: "Process Management",
    description: "Waits for processes to stop before accepting more input",
    syntax: "Wait-Process [[-Name] <string[]>] [-Timeout <int>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Specifies the process names",
        required: false
      },
      {
        id: "id",
        name: "Id",
        type: "int",
        description: "Specifies the process IDs",
        required: false
      },
      {
        id: "timeout",
        name: "Timeout",
        type: "int",
        description: "Maximum time to wait in seconds",
        required: false
      }
    ],
    example: 'Wait-Process -Name "notepad" -Timeout 30'
  },
  {
    id: "start-job",
    name: "Start-Job",
    category: "Process Management",
    description: "Starts a PowerShell background job",
    syntax: "Start-Job [-ScriptBlock] <scriptblock> [-Name <string>] [-ArgumentList <Object[]>]",
    parameters: [
      { id: "scriptblock", name: "ScriptBlock", type: "string", description: "Specifies the commands to run in the background job", required: true },
      { id: "name", name: "Name", type: "string", description: "Specifies a friendly name for the job", required: false },
      { id: "argumentlist", name: "ArgumentList", type: "array", description: "Specifies arguments to pass to the script block", required: false }
    ],
    example: 'Start-Job -Name "BackupJob" -ScriptBlock { Copy-Item "C:\\Data" "D:\\Backup" -Recurse }'
  },
  {
    id: "stop-job",
    name: "Stop-Job",
    category: "Process Management",
    description: "Stops a PowerShell background job",
    syntax: "Stop-Job [-Job] <Job[]> [-PassThru]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the job to stop", required: false },
      { id: "id", name: "Id", type: "int", description: "Specifies the ID of the job to stop", required: false },
      { id: "passthru", name: "PassThru", type: "switch", description: "Returns the job object", required: false, defaultValue: false }
    ],
    example: 'Stop-Job -Name "BackupJob"'
  },
  {
    id: "get-job",
    name: "Get-Job",
    category: "Process Management",
    description: "Gets PowerShell background jobs running in the current session",
    syntax: "Get-Job [[-Name] <string[]>] [-State <JobState>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the names of jobs to get", required: false },
      { id: "id", name: "Id", type: "int", description: "Specifies the IDs of jobs to get", required: false },
      { id: "state", name: "State", type: "select", description: "Gets only jobs in the specified state", required: false, options: ["Running", "Completed", "Failed", "Stopped", "Blocked", "Suspended"] }
    ],
    example: 'Get-Job -State Running'
  },
  {
    id: "wait-job",
    name: "Wait-Job",
    category: "Process Management",
    description: "Waits for PowerShell background jobs to complete",
    syntax: "Wait-Job [-Job] <Job[]> [-Timeout <int>] [-Any]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the names of jobs to wait for", required: false },
      { id: "id", name: "Id", type: "int", description: "Specifies the IDs of jobs to wait for", required: false },
      { id: "timeout", name: "Timeout", type: "int", description: "Maximum wait time in seconds", required: false },
      { id: "any", name: "Any", type: "switch", description: "Returns when any job completes", required: false, defaultValue: false }
    ],
    example: 'Wait-Job -Name "BackupJob" -Timeout 300'
  },
  {
    id: "receive-job",
    name: "Receive-Job",
    category: "Process Management",
    description: "Gets the results of PowerShell background jobs",
    syntax: "Receive-Job [-Job] <Job[]> [-Keep] [-NoRecurse]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the names of jobs to receive", required: false },
      { id: "id", name: "Id", type: "int", description: "Specifies the IDs of jobs to receive", required: false },
      { id: "keep", name: "Keep", type: "switch", description: "Saves aggregated job results", required: false, defaultValue: false },
      { id: "norecurse", name: "NoRecurse", type: "switch", description: "Gets results only from the specified job", required: false, defaultValue: false }
    ],
    example: 'Receive-Job -Name "BackupJob" -Keep'
  },
  {
    id: "remove-job",
    name: "Remove-Job",
    category: "Process Management",
    description: "Removes a PowerShell background job",
    syntax: "Remove-Job [-Job] <Job[]> [-Force]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the names of jobs to remove", required: false },
      { id: "id", name: "Id", type: "int", description: "Specifies the IDs of jobs to remove", required: false },
      { id: "force", name: "Force", type: "switch", description: "Removes running jobs without stopping them first", required: false, defaultValue: false }
    ],
    example: 'Remove-Job -Name "BackupJob" -Force'
  },
  {
    id: "invoke-command-process",
    name: "Invoke-Command",
    category: "Process Management",
    description: "Runs commands on local and remote computers",
    syntax: "Invoke-Command [-ScriptBlock] <scriptblock> [-ComputerName <string[]>] [-Credential <PSCredential>]",
    parameters: [
      { id: "scriptblock", name: "ScriptBlock", type: "string", description: "Specifies the commands to run", required: true },
      { id: "computername", name: "ComputerName", type: "array", description: "Specifies the computers on which to run the command", required: false },
      { id: "credential", name: "Credential", type: "string", description: "Specifies credentials for the remote connection", required: false },
      { id: "asjob", name: "AsJob", type: "switch", description: "Runs the command as a background job", required: false, defaultValue: false }
    ],
    example: 'Invoke-Command -ComputerName "Server01", "Server02" -ScriptBlock { Get-Service } -Credential $cred'
  },
  {
    id: "enter-pssession",
    name: "Enter-PSSession",
    category: "Process Management",
    description: "Starts an interactive session with a remote computer",
    syntax: "Enter-PSSession [-ComputerName] <string> [-Credential <PSCredential>]",
    parameters: [
      { id: "computername", name: "ComputerName", type: "string", description: "Specifies the remote computer to connect to", required: true },
      { id: "credential", name: "Credential", type: "string", description: "Specifies credentials for the remote connection", required: false },
      { id: "port", name: "Port", type: "int", description: "Specifies the network port on the remote computer", required: false }
    ],
    example: 'Enter-PSSession -ComputerName "Server01" -Credential $cred'
  },
  {
    id: "exit-pssession",
    name: "Exit-PSSession",
    category: "Process Management",
    description: "Ends an interactive session with a remote computer",
    syntax: "Exit-PSSession",
    parameters: [],
    example: 'Exit-PSSession'
  },
  {
    id: "get-winevent",
    name: "Get-WinEvent",
    category: "Event Logs",
    description: "Gets events from event logs and event tracing log files",
    syntax: "Get-WinEvent [-LogName] <string[]> [-MaxEvents <int>] [-Oldest]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "select",
        description: "Specifies the event log name",
        required: false,
        options: ["Application", "System", "Security", "Setup", "ForwardedEvents"],
        defaultValue: "Application"
      },
      {
        id: "maxevents",
        name: "MaxEvents",
        type: "int",
        description: "Maximum number of events to return",
        required: false
      },
      {
        id: "oldest",
        name: "Oldest",
        type: "switch",
        description: "Returns events in oldest-first order",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-WinEvent -LogName System -MaxEvents 10'
  },
  {
    id: "clear-eventlog",
    name: "Clear-EventLog",
    category: "Event Logs",
    description: "Deletes all entries from specified event logs",
    syntax: "Clear-EventLog [-LogName] <string[]> [[-ComputerName] <string[]>]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "select",
        description: "Specifies the event log name",
        required: true,
        options: ["Application", "System", "Security"]
      },
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Specifies the remote computer",
        required: false
      }
    ],
    example: 'Clear-EventLog -LogName Application'
  },
  {
    id: "write-eventlog",
    name: "Write-EventLog",
    category: "Event Logs",
    description: "Writes an event to an event log",
    syntax: "Write-EventLog [-LogName] <string> [-Source] <string> [-EventId] <int> [-EntryType <string>] [-Message <string>]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "select",
        description: "Specifies the event log name",
        required: true,
        options: ["Application", "System"]
      },
      {
        id: "source",
        name: "Source",
        type: "string",
        description: "Specifies the event source",
        required: true
      },
      {
        id: "eventid",
        name: "EventId",
        type: "int",
        description: "Specifies the event identifier (1-65535)",
        required: true
      },
      {
        id: "entrytype",
        name: "EntryType",
        type: "select",
        description: "Specifies the entry type",
        required: false,
        options: ["Error", "Warning", "Information", "SuccessAudit", "FailureAudit"],
        defaultValue: "Information"
      },
      {
        id: "message",
        name: "Message",
        type: "string",
        description: "Specifies the event message",
        required: false
      }
    ],
    example: 'Write-EventLog -LogName Application -Source "MyApp" -EventId 1000 -EntryType Information -Message "Application started"'
  },
  {
    id: "new-eventlog",
    name: "New-EventLog",
    category: "Event Logs",
    description: "Creates a new event log and event source on the local or remote computer",
    syntax: "New-EventLog [-LogName] <string> [-Source] <string[]> [[-ComputerName] <string[]>]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "string",
        description: "Name of the event log to create",
        required: true
      },
      {
        id: "source",
        name: "Source",
        type: "string",
        description: "Event source names to register",
        required: true
      },
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Remote computer name",
        required: false
      }
    ],
    example: 'New-EventLog -LogName "MyApplication" -Source "MyApp","MyAppService"'
  },
  {
    id: "remove-eventlog",
    name: "Remove-EventLog",
    category: "Event Logs",
    description: "Deletes an event log or unregisters an event source",
    syntax: "Remove-EventLog [-LogName] <string[]> [[-ComputerName] <string[]>]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "string",
        description: "Event log to remove",
        required: true
      },
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Remote computer name",
        required: false
      },
      {
        id: "source",
        name: "Source",
        type: "string",
        description: "Unregister specific source instead of entire log",
        required: false
      }
    ],
    example: 'Remove-EventLog -LogName "MyApplication"'
  },
  {
    id: "limit-eventlog",
    name: "Limit-EventLog",
    category: "Event Logs",
    description: "Sets the size and retention properties of an event log",
    syntax: "Limit-EventLog [-LogName] <string[]> [-MaximumSize <long>] [-OverflowAction <string>] [-RetentionDays <int>]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "select",
        description: "Event log name",
        required: true,
        options: ["Application", "System", "Security"]
      },
      {
        id: "maximumsize",
        name: "MaximumSize",
        type: "int",
        description: "Maximum log size in bytes",
        required: false
      },
      {
        id: "overflowaction",
        name: "OverflowAction",
        type: "select",
        description: "Action when log is full",
        required: false,
        options: ["DoNotOverwrite", "OverwriteAsNeeded", "OverwriteOlder"]
      },
      {
        id: "retentiondays",
        name: "RetentionDays",
        type: "int",
        description: "Minimum days to retain entries",
        required: false
      }
    ],
    example: 'Limit-EventLog -LogName Application -MaximumSize 20971520 -OverflowAction OverwriteAsNeeded'
  },
  {
    id: "show-eventlog",
    name: "Show-EventLog",
    category: "Event Logs",
    description: "Opens Event Viewer displaying the specified event log",
    syntax: "Show-EventLog [[-ComputerName] <string>]",
    parameters: [
      {
        id: "computername",
        name: "ComputerName",
        type: "string",
        description: "Remote computer to connect to",
        required: false
      }
    ],
    example: 'Show-EventLog -ComputerName "Server01"'
  },
  {
    id: "get-winevent-filtered",
    name: "Get-WinEvent",
    category: "Event Logs",
    description: "Gets events with advanced filtering using FilterHashtable",
    syntax: "Get-WinEvent [-FilterHashtable] <hashtable> [-MaxEvents <int>] [-Oldest]",
    parameters: [
      {
        id: "logname",
        name: "LogName",
        type: "select",
        description: "Event log to search",
        required: true,
        options: ["Application", "System", "Security", "Setup", "Microsoft-Windows-PowerShell/Operational"]
      },
      {
        id: "providername",
        name: "ProviderName",
        type: "string",
        description: "Event provider name",
        required: false
      },
      {
        id: "id",
        name: "Id",
        type: "int",
        description: "Event ID to filter",
        required: false
      },
      {
        id: "level",
        name: "Level",
        type: "select",
        description: "Event level",
        required: false,
        options: ["1 (Critical)", "2 (Error)", "3 (Warning)", "4 (Information)", "5 (Verbose)"]
      },
      {
        id: "starttime",
        name: "StartTime",
        type: "string",
        description: "Filter events after this time",
        required: false
      },
      {
        id: "endtime",
        name: "EndTime",
        type: "string",
        description: "Filter events before this time",
        required: false
      },
      {
        id: "maxevents",
        name: "MaxEvents",
        type: "int",
        description: "Maximum events to return",
        required: false
      }
    ],
    example: 'Get-WinEvent -FilterHashtable @{LogName="System";Level=2;StartTime=(Get-Date).AddDays(-1)} -MaxEvents 50'
  },
  {
    id: "register-wmievent",
    name: "Register-WmiEvent",
    category: "Event Logs",
    description: "Subscribes to WMI events for monitoring system changes",
    syntax: "Register-WmiEvent [-Query] <string> [-SourceIdentifier] <string> [-Action <scriptblock>]",
    parameters: [
      {
        id: "query",
        name: "Query",
        type: "string",
        description: "WQL query for the events to monitor",
        required: true
      },
      {
        id: "sourceidentifier",
        name: "SourceIdentifier",
        type: "string",
        description: "Name to identify this subscription",
        required: true
      },
      {
        id: "action",
        name: "Action",
        type: "string",
        description: "Script block to run when event occurs",
        required: false
      },
      {
        id: "timeout",
        name: "Timeout",
        type: "int",
        description: "Timeout in seconds",
        required: false
      }
    ],
    example: 'Register-WmiEvent -Query "SELECT * FROM __InstanceCreationEvent WITHIN 5 WHERE TargetInstance ISA \'Win32_Process\'" -SourceIdentifier "ProcessCreated"'
  },
  {
    id: "get-eventsubscriber",
    name: "Get-EventSubscriber",
    category: "Event Logs",
    description: "Gets event subscribers in the current session",
    syntax: "Get-EventSubscriber [[-SourceIdentifier] <string>] [-Force]",
    parameters: [
      {
        id: "sourceidentifier",
        name: "SourceIdentifier",
        type: "string",
        description: "Filter by subscription name",
        required: false
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Include hidden event subscribers",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-EventSubscriber | Select SourceIdentifier,EventName'
  },
  {
    id: "get-credential",
    name: "Get-Credential",
    category: "Security",
    description: "Gets a credential object based on a user name and password",
    syntax: "Get-Credential [[-UserName] <string>] [-Message <string>]",
    parameters: [
      {
        id: "username",
        name: "UserName",
        type: "string",
        description: "Specifies a user name",
        required: false
      },
      {
        id: "message",
        name: "Message",
        type: "string",
        description: "Specifies a message for the credential prompt",
        required: false
      }
    ],
    example: 'Get-Credential -UserName "Administrator" -Message "Enter credentials"'
  },
  {
    id: "get-acl",
    name: "Get-Acl",
    category: "Security",
    description: "Gets the security descriptor for a resource",
    syntax: "Get-Acl [[-Path] <string[]>]",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to a resource",
        required: true
      }
    ],
    example: 'Get-Acl -Path "C:\\Important"'
  },
  {
    id: "set-acl",
    name: "Set-Acl",
    category: "Security",
    description: "Changes the security descriptor of a specified item",
    syntax: "Set-Acl [-Path] <string[]> [-AclObject] <Object>",
    parameters: [
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Specifies the path to a resource",
        required: true
      }
    ],
    example: 'Get-Acl "C:\\Source" | Set-Acl "C:\\Destination"'
  },

  // ===================================
  // MICROSOFT GRAPH POWERSHELL CMDLETS
  // ===================================
  {
    id: "connect-mggraph",
    name: "Connect-MgGraph",
    category: "Azure AD",
    description: "Connects to Microsoft Graph API with specified scopes",
    syntax: "Connect-MgGraph [-Scopes] <string[]> [-TenantId <string>]",
    parameters: [
      {
        id: "scopes",
        name: "Scopes",
        type: "array",
        description: "Specifies the permissions required for the connection",
        required: true,
        defaultValue: []
      },
      {
        id: "tenantid",
        name: "TenantId",
        type: "string",
        description: "Specifies the tenant ID",
        required: false
      }
    ],
    example: 'Connect-MgGraph -Scopes "User.Read.All","Group.ReadWrite.All"'
  },
  {
    id: "get-mguser",
    name: "Get-MgUser",
    category: "Azure AD",
    description: "Gets users from Azure Active Directory via Microsoft Graph",
    syntax: "Get-MgUser [[-UserId] <string>] [-Filter <string>] [-All]",
    parameters: [
      {
        id: "userid",
        name: "UserId",
        type: "string",
        description: "Specifies the user ID or UPN",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies an OData filter",
        required: false
      },
      {
        id: "all",
        name: "All",
        type: "switch",
        description: "Retrieves all users",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Get-MgUser -Filter "startsWith(displayName,\'John\')"'
  },
  {
    id: "new-mguser",
    name: "New-MgUser",
    category: "Azure AD",
    description: "Creates a new user in Azure AD via Microsoft Graph",
    syntax: "New-MgUser [-DisplayName] <string> [-UserPrincipalName] <string> [-MailNickname] <string> [-PasswordProfile] <hashtable> [-AccountEnabled] [-UsageLocation <string>]",
    parameters: [
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Specifies the display name",
        required: true
      },
      {
        id: "userprincipalname",
        name: "UserPrincipalName",
        type: "string",
        description: "Specifies the UPN (e.g., user@domain.com)",
        required: true
      },
      {
        id: "mailnickname",
        name: "MailNickname",
        type: "string",
        description: "Specifies the mail nickname (email alias)",
        required: true
      },
      {
        id: "passwordprofile",
        name: "PasswordProfile",
        type: "string",
        description: "Variable containing hashtable @{Password='value'; ForceChangePasswordNextSignIn=$true} - Create this variable before calling New-MgUser",
        required: true,
        defaultValue: "$PasswordProfile"
      },
      {
        id: "accountenabled",
        name: "AccountEnabled",
        type: "boolean",
        description: "Enables the user account (required when creating users)",
        required: true,
        defaultValue: true
      },
      {
        id: "usagelocation",
        name: "UsageLocation",
        type: "string",
        description: "Two-letter country code (ISO 3166-1 alpha-2, e.g., US, GB)",
        required: false
      }
    ],
    example: '$PasswordProfile = @{Password = "TempPass123!"; ForceChangePasswordNextSignIn = $true}\nNew-MgUser -DisplayName "John Doe" -UserPrincipalName "john@contoso.com" -MailNickname "john" -PasswordProfile $PasswordProfile -AccountEnabled -UsageLocation "US"'
  },
  {
    id: "update-mguser",
    name: "Update-MgUser",
    category: "Azure AD",
    description: "Updates properties of an existing Azure AD user",
    syntax: "Update-MgUser [-UserId] <string> [-DisplayName <string>] [-JobTitle <string>]",
    parameters: [
      {
        id: "userid",
        name: "UserId",
        type: "string",
        description: "Specifies the user ID",
        required: true
      },
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Specifies the new display name",
        required: false
      },
      {
        id: "jobtitle",
        name: "JobTitle",
        type: "string",
        description: "Specifies the job title",
        required: false
      }
    ],
    example: 'Update-MgUser -UserId "user@contoso.com" -JobTitle "Senior Developer"'
  },
  {
    id: "remove-mguser",
    name: "Remove-MgUser",
    category: "Azure AD",
    description: "Removes a user from Azure Active Directory via Microsoft Graph",
    syntax: "Remove-MgUser [-UserId] <string>",
    parameters: [
      {
        id: "userid",
        name: "UserId",
        type: "string",
        description: "Specifies the user ID or UPN to remove",
        required: true
      }
    ],
    example: 'Remove-MgUser -UserId "olduser@contoso.com"'
  },
  {
    id: "get-mggroup",
    name: "Get-MgGroup",
    category: "Azure AD",
    description: "Gets groups from Azure Active Directory",
    syntax: "Get-MgGroup [[-GroupId] <string>] [-Filter <string>]",
    parameters: [
      {
        id: "groupid",
        name: "GroupId",
        type: "string",
        description: "Specifies the group ID",
        required: false
      },
      {
        id: "filter",
        name: "Filter",
        type: "string",
        description: "Specifies an OData filter",
        required: false
      }
    ],
    example: 'Get-MgGroup -Filter "displayName eq \'Developers\'"'
  },
  {
    id: "new-mggroup",
    name: "New-MgGroup",
    category: "Azure AD",
    description: "Creates a new group in Azure AD (Security Group or Microsoft 365 Group) via Microsoft Graph",
    syntax: "New-MgGroup [-DisplayName] <string> [-MailNickname] <string> [-MailEnabled] <bool> [-SecurityEnabled] <bool> [-GroupTypes <string[]>]",
    parameters: [
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Specifies the group display name",
        required: true
      },
      {
        id: "mailnickname",
        name: "MailNickname",
        type: "string",
        description: "Specifies the mail nickname (no spaces)",
        required: true
      },
      {
        id: "mailenabled",
        name: "MailEnabled",
        type: "select",
        description: "Set $true for Microsoft 365 Groups, $false for Security Groups (required)",
        required: true,
        options: ["$true", "$false"],
        defaultValue: "$false"
      },
      {
        id: "securityenabled",
        name: "SecurityEnabled",
        type: "select",
        description: "Set $true for Security Groups, $false for Microsoft 365 Groups (required)",
        required: true,
        options: ["$true", "$false"],
        defaultValue: "$true"
      },
      {
        id: "grouptypes",
        name: "GroupTypes",
        type: "array",
        description: "Use @('Unified') for Microsoft 365 Groups, @() for Security Groups",
        required: false,
        defaultValue: []
      }
    ],
    example: '# Security Group:\nNew-MgGroup -DisplayName "IT Team" -MailNickname "it-team" -MailEnabled:$false -SecurityEnabled:$true\n\n# Microsoft 365 Group:\nNew-MgGroup -DisplayName "Sales" -MailNickname "sales" -MailEnabled:$true -SecurityEnabled:$false -GroupTypes "Unified"'
  },
  {
    id: "set-mguserlicense",
    name: "Set-MgUserLicense",
    category: "Azure AD",
    description: "Assigns or removes Microsoft 365 licenses for a user via Microsoft Graph",
    syntax: "Set-MgUserLicense [-UserId] <string> [-AddLicenses] <hashtable[]> [-RemoveLicenses] <string[]>",
    parameters: [
      {
        id: "userid",
        name: "UserId",
        type: "string",
        description: "Specifies the user ID or UPN",
        required: true
      },
      {
        id: "addlicenses",
        name: "AddLicenses",
        type: "array",
        description: "Array of hashtables with SkuId property (e.g., @(@{SkuId='guid'})). Use @() if not adding licenses.",
        required: true,
        defaultValue: []
      },
      {
        id: "removelicenses",
        name: "RemoveLicenses",
        type: "array",
        description: "Array of SkuId strings to remove (e.g., @('guid1','guid2')). Use @() if not removing licenses.",
        required: true,
        defaultValue: []
      }
    ],
    example: '# Add a license:\n$Sku = Get-MgSubscribedSku -All | Where SkuPartNumber -eq "SPE_E5"\nSet-MgUserLicense -UserId "user@contoso.com" -AddLicenses @(@{SkuId = $Sku.SkuId}) -RemoveLicenses @()\n\n# Remove a license:\nSet-MgUserLicense -UserId "user@contoso.com" -AddLicenses @() -RemoveLicenses @($Sku.SkuId)'
  },
  {
    id: "get-mgsubscribedsku",
    name: "Get-MgSubscribedSku",
    category: "Azure AD",
    description: "Gets subscribed SKUs (licenses) for the organization via Microsoft Graph",
    syntax: "Get-MgSubscribedSku",
    parameters: [],
    example: 'Get-MgSubscribedSku | Select SkuPartNumber,ConsumedUnits'
  },
  {
    id: "new-mginvitation",
    name: "New-MgInvitation",
    category: "Azure AD",
    description: "Creates an invitation for a guest user via Microsoft Graph",
    syntax: "New-MgInvitation [-InvitedUserEmailAddress] <string> [-InviteRedirectUrl] <string>",
    parameters: [
      {
        id: "inviteduseremailaddress",
        name: "InvitedUserEmailAddress",
        type: "string",
        description: "Email address of the user to invite",
        required: true
      },
      {
        id: "inviteredirecturl",
        name: "InviteRedirectUrl",
        type: "string",
        description: "URL to redirect after accepting invitation",
        required: true
      }
    ],
    example: 'New-MgInvitation -InvitedUserEmailAddress "guest@external.com" -InviteRedirectUrl "https://myapp.com"'
  },
  {
    id: "new-mgapplication",
    name: "New-MgApplication",
    category: "Azure AD",
    description: "Creates a new application registration in Azure AD via Microsoft Graph",
    syntax: "New-MgApplication [-DisplayName] <string>",
    parameters: [
      {
        id: "displayname",
        name: "DisplayName",
        type: "string",
        description: "Display name for the application",
        required: true
      }
    ],
    example: 'New-MgApplication -DisplayName "My API Application"'
  },
  {
    id: "new-mgserviceprincipal",
    name: "New-MgServicePrincipal",
    category: "Azure AD",
    description: "Creates a service principal for an application",
    syntax: "New-MgServicePrincipal [-AppId] <string>",
    parameters: [
      {
        id: "appid",
        name: "AppId",
        type: "string",
        description: "Application (client) ID",
        required: true
      }
    ],
    example: 'New-MgServicePrincipal -AppId "app-id-guid"'
  },

  // ===================================
  // EXPANDED EXCHANGE ONLINE/SERVER CMDLETS
  // ===================================
  {
    id: "connect-exchangeonline",
    name: "Connect-ExchangeOnline",
    category: "Exchange Online",
    description: "Connects to Exchange Online PowerShell",
    syntax: "Connect-ExchangeOnline [-UserPrincipalName] <string> [-ShowBanner <bool>]",
    parameters: [
      {
        id: "userprincipalname",
        name: "UserPrincipalName",
        type: "string",
        description: "Admin account UPN",
        required: true
      },
      {
        id: "showbanner",
        name: "ShowBanner",
        type: "boolean",
        description: "Show connection banner",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Connect-ExchangeOnline -UserPrincipalName "admin@contoso.com"'
  },
  {
    id: "enable-mailbox",
    name: "Enable-Mailbox",
    category: "Exchange Online",
    description: "Enables a mailbox for an existing Active Directory user in Exchange Online",
    syntax: "Enable-Mailbox [-Identity] <string> [-Alias <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "User identity",
        required: true
      },
      {
        id: "alias",
        name: "Alias",
        type: "string",
        description: "Email alias",
        required: false
      }
    ],
    example: 'Enable-Mailbox -Identity "jdoe" -Alias "john.doe"'
  },
  {
    id: "add-mailboxpermission",
    name: "Add-MailboxPermission",
    category: "Exchange Online",
    description: "Adds permissions to a mailbox in Exchange Online",
    syntax: "Add-MailboxPermission [-Identity] <string> [-User] <string> [-AccessRights] <string[]>",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Mailbox identity",
        required: true
      },
      {
        id: "user",
        name: "User",
        type: "string",
        description: "User to grant permission to",
        required: true
      },
      {
        id: "accessrights",
        name: "AccessRights",
        type: "array",
        description: "Permissions to grant",
        required: true,
        defaultValue: []
      }
    ],
    example: 'Add-MailboxPermission -Identity "shared@contoso.com" -User "jdoe" -AccessRights "FullAccess"'
  },
  {
    id: "get-mailboxdatabase-2",
    name: "Get-MailboxDatabase",
    category: "Exchange Server",
    description: "Gets mailbox databases",
    syntax: "Get-MailboxDatabase [[-Identity] <string>] [-Server <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Database identity",
        required: false
      },
      {
        id: "server",
        name: "Server",
        type: "string",
        description: "Exchange server name",
        required: false
      }
    ],
    example: 'Get-MailboxDatabase -Server "EXCH01"'
  },
  {
    id: "new-transportrule",
    name: "New-TransportRule",
    category: "Exchange Online",
    description: "Creates a new transport rule in Exchange Online",
    syntax: "New-TransportRule [-Name] <string> [-Priority <int>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Rule name",
        required: true
      },
      {
        id: "priority",
        name: "Priority",
        type: "int",
        description: "Rule priority",
        required: false
      }
    ],
    example: 'New-TransportRule -Name "Block External Auto-Forward" -Priority 0'
  },
  {
    id: "get-retentionpolicy",
    name: "Get-RetentionPolicy",
    category: "Exchange Online",
    description: "Gets retention policies in Exchange Online",
    syntax: "Get-RetentionPolicy [[-Identity] <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Policy identity",
        required: false
      }
    ],
    example: 'Get-RetentionPolicy -Identity "Default MRM Policy"'
  },
  {
    id: "new-retentionpolicy",
    name: "New-RetentionPolicy",
    category: "Exchange Online",
    description: "Creates a new retention policy in Exchange Online",
    syntax: "New-RetentionPolicy [-Name] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Policy name",
        required: true
      }
    ],
    example: 'New-RetentionPolicy -Name "Legal Hold Policy"'
  },

  // ===================================
  // EXPANDED SHAREPOINT ONLINE CMDLETS
  // ===================================
  {
    id: "new-sposite-online",
    name: "New-SPOSite",
    category: "SharePoint",
    description: "Creates a new SharePoint Online site collection",
    syntax: "New-SPOSite [-Url] <string> [-Owner] <string> [-StorageQuota] <int> [-Template <string>]",
    parameters: [
      {
        id: "url",
        name: "Url",
        type: "string",
        description: "Site URL",
        required: true
      },
      {
        id: "owner",
        name: "Owner",
        type: "string",
        description: "Site owner UPN",
        required: true
      },
      {
        id: "storagequota",
        name: "StorageQuota",
        type: "int",
        description: "Storage quota in MB",
        required: true
      },
      {
        id: "template",
        name: "Template",
        type: "string",
        description: "Site template",
        required: false
      }
    ],
    example: 'New-SPOSite -Url "https://contoso.sharepoint.com/sites/team" -Owner "admin@contoso.com" -StorageQuota 1024'
  },
  {
    id: "remove-sposite",
    name: "Remove-SPOSite",
    category: "SharePoint",
    description: "Removes a SharePoint Online site collection",
    syntax: "Remove-SPOSite [-Identity] <string> [-Confirm <bool>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Site URL",
        required: true
      },
      {
        id: "confirm",
        name: "Confirm",
        type: "boolean",
        description: "Prompt for confirmation",
        required: false,
        defaultValue: true
      }
    ],
    example: 'Remove-SPOSite -Identity "https://contoso.sharepoint.com/sites/oldsite"'
  },
  {
    id: "set-sposite",
    name: "Set-SPOSite",
    category: "SharePoint",
    description: "Modifies properties of a SharePoint Online site collection",
    syntax: "Set-SPOSite [-Identity] <string> [-StorageQuota <int>] [-SharingCapability <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Site URL",
        required: true
      },
      {
        id: "storagequota",
        name: "StorageQuota",
        type: "int",
        description: "Storage quota in MB",
        required: false
      },
      {
        id: "sharingcapability",
        name: "SharingCapability",
        type: "select",
        description: "Sharing settings",
        required: false,
        options: ["Disabled", "ExternalUserSharingOnly", "ExternalUserAndGuestSharing", "ExistingExternalUserSharingOnly"]
      }
    ],
    example: 'Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/team" -StorageQuota 2048'
  },
  {
    id: "get-spotenant",
    name: "Get-SPOTenant",
    category: "SharePoint",
    description: "Gets SharePoint Online tenant settings",
    syntax: "Get-SPOTenant",
    parameters: [],
    example: 'Get-SPOTenant | Select SharingCapability,OneDriveStorageQuota'
  },

  // ===================================
  // SQL SERVER POWERSHELL CMDLETS
  // ===================================
  {
    id: "invoke-sqlcmd",
    name: "Invoke-Sqlcmd",
    category: "SQL Server",
    description: "Runs T-SQL and XQuery statements",
    syntax: "Invoke-Sqlcmd [-Query] <string> [-ServerInstance] <string> [-Database <string>]",
    parameters: [
      {
        id: "query",
        name: "Query",
        type: "string",
        description: "SQL query to execute",
        required: true
      },
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "database",
        name: "Database",
        type: "string",
        description: "Database name",
        required: false
      }
    ],
    example: 'Invoke-Sqlcmd -Query "SELECT * FROM Users" -ServerInstance "SQL01" -Database "AppDB"'
  },
  {
    id: "backup-sqldatabase",
    name: "Backup-SqlDatabase",
    category: "SQL Server",
    description: "Backs up a SQL Server database",
    syntax: "Backup-SqlDatabase [-ServerInstance] <string> [-Database] <string> [-BackupFile] <string>",
    parameters: [
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "database",
        name: "Database",
        type: "string",
        description: "Database to backup",
        required: true
      },
      {
        id: "backupfile",
        name: "BackupFile",
        type: "path",
        description: "Backup file path",
        required: true
      }
    ],
    example: 'Backup-SqlDatabase -ServerInstance "SQL01" -Database "AppDB" -BackupFile "C:\\Backups\\AppDB.bak"'
  },
  {
    id: "restore-sqldatabase",
    name: "Restore-SqlDatabase",
    category: "SQL Server",
    description: "Restores a SQL Server database",
    syntax: "Restore-SqlDatabase [-ServerInstance] <string> [-Database] <string> [-BackupFile] <string>",
    parameters: [
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "database",
        name: "Database",
        type: "string",
        description: "Database to restore",
        required: true
      },
      {
        id: "backupfile",
        name: "BackupFile",
        type: "path",
        description: "Backup file to restore from",
        required: true
      }
    ],
    example: 'Restore-SqlDatabase -ServerInstance "SQL01" -Database "AppDB" -BackupFile "C:\\Backups\\AppDB.bak"'
  },
  {
    id: "get-sqlinstance",
    name: "Get-SqlInstance",
    category: "SQL Server",
    description: "Gets SQL Server instance information",
    syntax: "Get-SqlInstance [[-ServerInstance] <string>] [-Credential <PSCredential>]",
    parameters: [
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance name",
        required: false
      },
      {
        id: "credential",
        name: "Credential",
        type: "string",
        description: "Credential to use for authentication",
        required: false
      }
    ],
    example: 'Get-SqlInstance -ServerInstance "SQL01\\MSSQLSERVER"'
  },
  {
    id: "get-sqldatabase",
    name: "Get-SqlDatabase",
    category: "SQL Server",
    description: "Gets SQL Server database objects",
    syntax: "Get-SqlDatabase [[-Name] <string>] [-ServerInstance] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Database name pattern",
        required: false
      },
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      }
    ],
    example: 'Get-SqlDatabase -ServerInstance "SQL01" -Name "App*"'
  },
  {
    id: "get-sqllogin",
    name: "Get-SqlLogin",
    category: "SQL Server",
    description: "Gets SQL Server login objects",
    syntax: "Get-SqlLogin [[-Name] <string>] [-ServerInstance] <string> [-LoginType <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Login name pattern",
        required: false
      },
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "logintype",
        name: "LoginType",
        type: "select",
        description: "Type of login to retrieve",
        required: false,
        options: ["WindowsUser", "WindowsGroup", "SqlLogin", "Certificate", "AsymmetricKey"]
      }
    ],
    example: 'Get-SqlLogin -ServerInstance "SQL01" -LoginType SqlLogin'
  },
  {
    id: "add-sqllogin",
    name: "Add-SqlLogin",
    category: "SQL Server",
    description: "Creates a new SQL Server login",
    syntax: "Add-SqlLogin [-ServerInstance] <string> [-LoginName] <string> [-LoginType] <string> [-DefaultDatabase <string>]",
    parameters: [
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "loginname",
        name: "LoginName",
        type: "string",
        description: "Name for the new login",
        required: true
      },
      {
        id: "logintype",
        name: "LoginType",
        type: "select",
        description: "Type of login to create",
        required: true,
        options: ["WindowsUser", "WindowsGroup", "SqlLogin"]
      },
      {
        id: "defaultdatabase",
        name: "DefaultDatabase",
        type: "string",
        description: "Default database for the login",
        required: false,
        defaultValue: "master"
      }
    ],
    example: 'Add-SqlLogin -ServerInstance "SQL01" -LoginName "AppUser" -LoginType SqlLogin -DefaultDatabase "AppDB"'
  },
  {
    id: "get-sqlagentjob",
    name: "Get-SqlAgentJob",
    category: "SQL Server",
    description: "Gets SQL Server Agent jobs",
    syntax: "Get-SqlAgentJob [[-Name] <string>] [-ServerInstance] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Job name pattern",
        required: false
      },
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      }
    ],
    example: 'Get-SqlAgentJob -ServerInstance "SQL01" -Name "Backup*"'
  },
  {
    id: "start-sqlagentjob",
    name: "Start-SqlAgentJob",
    category: "SQL Server",
    description: "Starts a SQL Server Agent job",
    syntax: "Start-SqlAgentJob [-Name] <string> [-ServerInstance] <string> [-StepName <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Name of the job to start",
        required: true
      },
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "stepname",
        name: "StepName",
        type: "string",
        description: "Start at a specific step",
        required: false
      }
    ],
    example: 'Start-SqlAgentJob -ServerInstance "SQL01" -Name "Daily Backup Job"'
  },
  {
    id: "stop-sqlagentjob",
    name: "Stop-SqlAgentJob",
    category: "SQL Server",
    description: "Stops a running SQL Server Agent job",
    syntax: "Stop-SqlAgentJob [-Name] <string> [-ServerInstance] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Name of the job to stop",
        required: true
      },
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      }
    ],
    example: 'Stop-SqlAgentJob -ServerInstance "SQL01" -Name "Long Running Job"'
  },
  {
    id: "get-sqlagentjobhistory",
    name: "Get-SqlAgentJobHistory",
    category: "SQL Server",
    description: "Gets the execution history of SQL Server Agent jobs",
    syntax: "Get-SqlAgentJobHistory [-ServerInstance] <string> [-JobName <string>] [-Since <string>]",
    parameters: [
      {
        id: "serverinstance",
        name: "ServerInstance",
        type: "string",
        description: "SQL Server instance",
        required: true
      },
      {
        id: "jobname",
        name: "JobName",
        type: "string",
        description: "Filter by job name",
        required: false
      },
      {
        id: "since",
        name: "Since",
        type: "select",
        description: "Time period for history",
        required: false,
        options: ["Midnight", "Yesterday", "LastWeek", "LastMonth"]
      }
    ],
    example: 'Get-SqlAgentJobHistory -ServerInstance "SQL01" -JobName "Backup" -Since LastWeek'
  },

  // ===================================
  // GROUP POLICY CMDLETS
  // ===================================
  {
    id: "new-gpo",
    name: "New-GPO",
    category: "Active Directory",
    description: "Creates a new Group Policy Object",
    syntax: "New-GPO [-Name] <string> [-Comment <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "GPO name",
        required: true
      },
      {
        id: "comment",
        name: "Comment",
        type: "string",
        description: "GPO description",
        required: false
      }
    ],
    example: 'New-GPO -Name "Desktop Lockdown Policy" -Comment "Restricts desktop settings"'
  },
  {
    id: "new-gplink",
    name: "New-GPLink",
    category: "Active Directory",
    description: "Links a GPO to an Active Directory container",
    syntax: "New-GPLink [-Name] <string> [-Target] <string> [-LinkEnabled <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "GPO name",
        required: true
      },
      {
        id: "target",
        name: "Target",
        type: "string",
        description: "OU distinguished name",
        required: true
      },
      {
        id: "linkenabled",
        name: "LinkEnabled",
        type: "select",
        description: "Link status",
        required: false,
        options: ["Yes", "No"],
        defaultValue: "Yes"
      }
    ],
    example: 'New-GPLink -Name "Desktop Policy" -Target "OU=Workstations,DC=contoso,DC=com"'
  },
  {
    id: "backup-gpo",
    name: "Backup-GPO",
    category: "Active Directory",
    description: "Backs up a Group Policy Object",
    syntax: "Backup-GPO [-Name] <string> [-Path] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "GPO name",
        required: true
      },
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Backup folder path",
        required: true
      }
    ],
    example: 'Backup-GPO -Name "Desktop Policy" -Path "C:\\GPO Backups"'
  },
  {
    id: "restore-gpo",
    name: "Restore-GPO",
    category: "Active Directory",
    description: "Restores a Group Policy Object from backup",
    syntax: "Restore-GPO [-Name] <string> [-Path] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "GPO name",
        required: true
      },
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Backup folder path",
        required: true
      }
    ],
    example: 'Restore-GPO -Name "Desktop Policy" -Path "C:\\GPO Backups"'
  },
  {
    id: "get-gporeport",
    name: "Get-GPOReport",
    category: "Active Directory",
    description: "Generates a report for a GPO",
    syntax: "Get-GPOReport [-Name] <string> [-ReportType] <string> [-Path <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "GPO name",
        required: true
      },
      {
        id: "reporttype",
        name: "ReportType",
        type: "select",
        description: "Report format",
        required: true,
        options: ["Html", "Xml"]
      },
      {
        id: "path",
        name: "Path",
        type: "path",
        description: "Output file path",
        required: false
      }
    ],
    example: 'Get-GPOReport -Name "Desktop Policy" -ReportType Html -Path "C:\\Reports\\GPO.html"'
  },

  // ===================================
  // AD REPLICATION & SITE CMDLETS
  // ===================================
  {
    id: "new-adreplicationsite",
    name: "New-ADReplicationSite",
    category: "Active Directory",
    description: "Creates a new Active Directory site",
    syntax: "New-ADReplicationSite [-Name] <string> [-Description <string>]",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Site name",
        required: true
      },
      {
        id: "description",
        name: "Description",
        type: "string",
        description: "Site description",
        required: false
      }
    ],
    example: 'New-ADReplicationSite -Name "Chicago-Office" -Description "Chicago headquarters"'
  },
  {
    id: "new-adreplicationsubnet",
    name: "New-ADReplicationSubnet",
    category: "Active Directory",
    description: "Creates a new AD replication subnet",
    syntax: "New-ADReplicationSubnet [-Name] <string> [-Site] <string>",
    parameters: [
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Subnet in CIDR notation",
        required: true
      },
      {
        id: "site",
        name: "Site",
        type: "string",
        description: "Associated site",
        required: true
      }
    ],
    example: 'New-ADReplicationSubnet -Name "192.168.1.0/24" -Site "Chicago-Office"'
  },
  {
    id: "get-adreplicationsite",
    name: "Get-ADReplicationSite",
    category: "Active Directory",
    description: "Gets Active Directory replication sites",
    syntax: "Get-ADReplicationSite [[-Identity] <string>]",
    parameters: [
      {
        id: "identity",
        name: "Identity",
        type: "string",
        description: "Site identity",
        required: false
      }
    ],
    example: 'Get-ADReplicationSite -Identity "Chicago-Office"'
  },

  // ===================================
  // ADDITIONAL SECURITY CMDLETS
  // ===================================
  {
    id: "convertto-securestring",
    name: "ConvertTo-SecureString",
    category: "Security",
    description: "Converts plain text to a secure string",
    syntax: "ConvertTo-SecureString [-String] <string> [-AsPlainText] [-Force]",
    parameters: [
      {
        id: "string",
        name: "String",
        type: "string",
        description: "String to convert",
        required: true
      },
      {
        id: "asplaintext",
        name: "AsPlainText",
        type: "switch",
        description: "Convert from plain text",
        required: false,
        defaultValue: false
      },
      {
        id: "force",
        name: "Force",
        type: "switch",
        description: "Suppress security warning",
        required: false,
        defaultValue: false
      }
    ],
    example: 'ConvertTo-SecureString -String "P@ssw0rd" -AsPlainText -Force'
  },
  {
    id: "new-selfsignedcertificate",
    name: "New-SelfSignedCertificate",
    category: "Security",
    description: "Creates a new self-signed certificate",
    syntax: "New-SelfSignedCertificate [-DnsName] <string[]> [-CertStoreLocation <string>]",
    parameters: [
      {
        id: "dnsname",
        name: "DnsName",
        type: "array",
        description: "DNS names for the certificate",
        required: true,
        defaultValue: []
      },
      {
        id: "certstorelocation",
        name: "CertStoreLocation",
        type: "string",
        description: "Certificate store location",
        required: false,
        defaultValue: "Cert:\\LocalMachine\\My"
      }
    ],
    example: 'New-SelfSignedCertificate -DnsName "myapp.contoso.com" -CertStoreLocation "Cert:\\LocalMachine\\My"'
  },
  {
    id: "get-credential-security",
    name: "Get-Credential",
    category: "Security",
    description: "Gets a credential object based on a user name and password",
    syntax: "Get-Credential [[-Credential] <PSCredential>] [-UserName <string>] [-Message <string>]",
    parameters: [
      { id: "username", name: "UserName", type: "string", description: "Specifies a default user name for the credential prompt", required: false },
      { id: "message", name: "Message", type: "string", description: "Specifies a message for the credential prompt", required: false }
    ],
    example: 'Get-Credential -UserName "admin@contoso.com" -Message "Enter your credentials"'
  },
  {
    id: "convertfrom-securestring",
    name: "ConvertFrom-SecureString",
    category: "Security",
    description: "Converts a secure string to an encrypted standard string",
    syntax: "ConvertFrom-SecureString [-SecureString] <SecureString> [-Key <byte[]>]",
    parameters: [
      { id: "securestring", name: "SecureString", type: "string", description: "Specifies the secure string to convert", required: true },
      { id: "key", name: "Key", type: "string", description: "Specifies the encryption key as a byte array", required: false }
    ],
    example: 'ConvertFrom-SecureString -SecureString $securePassword | Out-File "C:\\creds\\password.txt"'
  },
  {
    id: "get-authenticodesignature",
    name: "Get-AuthenticodeSignature",
    category: "Security",
    description: "Gets the Authenticode signature from a file",
    syntax: "Get-AuthenticodeSignature [-FilePath] <string[]>",
    parameters: [
      { id: "filepath", name: "FilePath", type: "path", description: "Specifies the path to the file to examine", required: true }
    ],
    example: 'Get-AuthenticodeSignature -FilePath "C:\\Scripts\\MyScript.ps1"'
  },
  {
    id: "set-authenticodesignature",
    name: "Set-AuthenticodeSignature",
    category: "Security",
    description: "Adds an Authenticode signature to a PowerShell script or other file",
    syntax: "Set-AuthenticodeSignature [-FilePath] <string[]> [-Certificate] <X509Certificate2>",
    parameters: [
      { id: "filepath", name: "FilePath", type: "path", description: "Specifies the path to the file to sign", required: true },
      { id: "certificate", name: "Certificate", type: "string", description: "Specifies the certificate used for signing", required: true }
    ],
    example: 'Set-AuthenticodeSignature -FilePath "C:\\Scripts\\MyScript.ps1" -Certificate $cert'
  },
  {
    id: "protect-cmsmessage",
    name: "Protect-CmsMessage",
    category: "Security",
    description: "Encrypts content using the Cryptographic Message Syntax format",
    syntax: "Protect-CmsMessage [-To] <CmsMessageRecipient[]> [-Content] <string>",
    parameters: [
      { id: "to", name: "To", type: "string", description: "Specifies one or more CMS message recipients (certificate subject or path)", required: true },
      { id: "content", name: "Content", type: "string", description: "Specifies the content to encrypt", required: true }
    ],
    example: 'Protect-CmsMessage -To "CN=Admin" -Content "Secret message"'
  },
  {
    id: "unprotect-cmsmessage",
    name: "Unprotect-CmsMessage",
    category: "Security",
    description: "Decrypts content that was encrypted using the Cryptographic Message Syntax format",
    syntax: "Unprotect-CmsMessage [-Content] <string> [-To <CmsMessageRecipient[]>]",
    parameters: [
      { id: "content", name: "Content", type: "string", description: "Specifies the encrypted content to decrypt", required: true },
      { id: "to", name: "To", type: "string", description: "Specifies the recipient certificate for decryption", required: false }
    ],
    example: 'Unprotect-CmsMessage -Content $encryptedContent'
  },
  {
    id: "get-executionpolicy-security",
    name: "Get-ExecutionPolicy",
    category: "Security",
    description: "Gets the execution policies for the current session",
    syntax: "Get-ExecutionPolicy [[-Scope] <ExecutionPolicyScope>] [-List]",
    parameters: [
      { id: "scope", name: "Scope", type: "select", description: "Specifies the scope of the execution policy", required: false, options: ["Process", "CurrentUser", "LocalMachine", "UserPolicy", "MachinePolicy"] },
      { id: "list", name: "List", type: "switch", description: "Gets all execution policy values for the session", required: false, defaultValue: false }
    ],
    example: 'Get-ExecutionPolicy -List'
  },
  {
    id: "test-filecatalog",
    name: "Test-FileCatalog",
    category: "Security",
    description: "Validates files against a catalog file to verify integrity",
    syntax: "Test-FileCatalog [-CatalogFilePath] <string> [[-Path] <string[]>]",
    parameters: [
      { id: "catalogfilepath", name: "CatalogFilePath", type: "path", description: "Specifies the path to the catalog file", required: true },
      { id: "path", name: "Path", type: "path", description: "Specifies the folder or files to validate", required: false }
    ],
    example: 'Test-FileCatalog -CatalogFilePath "C:\\Catalogs\\MyCatalog.cat" -Path "C:\\Scripts"'
  },

  // ===================================
  // MICROSOFT TEAMS CMDLETS
  // ===================================
  {
    id: "get-team",
    name: "Get-Team",
    category: "Microsoft Teams",
    description: "Gets team information from Microsoft Teams",
    syntax: "Get-Team [-GroupId <string>] [-DisplayName <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: false },
      { id: "displayname", name: "DisplayName", type: "string", description: "Display name filter", required: false }
    ],
    example: 'Get-Team -DisplayName "IT Department"'
  },
  {
    id: "new-team",
    name: "New-Team",
    category: "Microsoft Teams",
    description: "Creates a new Microsoft Teams team",
    syntax: "New-Team -DisplayName <string> [-Description <string>] [-Visibility <string>]",
    parameters: [
      { id: "displayname", name: "DisplayName", type: "string", description: "Team display name", required: true },
      { id: "description", name: "Description", type: "string", description: "Team description", required: false },
      { id: "visibility", name: "Visibility", type: "select", description: "Team visibility", required: false, options: ["Public", "Private"] }
    ],
    example: 'New-Team -DisplayName "Project Alpha" -Visibility "Private"'
  },
  {
    id: "add-teamuser",
    name: "Add-TeamUser",
    category: "Microsoft Teams",
    description: "Adds a user to a Microsoft Teams team",
    syntax: "Add-TeamUser -GroupId <string> -User <string> [-Role <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Team Group ID", required: true },
      { id: "user", name: "User", type: "string", description: "User UPN or ID", required: true },
      { id: "role", name: "Role", type: "select", description: "User role", required: false, options: ["Member", "Owner"] }
    ],
    example: 'Add-TeamUser -GroupId "abc123" -User "user@contoso.com" -Role "Member"'
  },
  {
    id: "remove-team",
    name: "Remove-Team",
    category: "Microsoft Teams",
    description: "Removes a Microsoft Teams team",
    syntax: "Remove-Team -GroupId <string>",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team to remove", required: true }
    ],
    example: 'Remove-Team -GroupId "abc123-def456-ghi789"'
  },
  {
    id: "get-teamchannel",
    name: "Get-TeamChannel",
    category: "Microsoft Teams",
    description: "Gets channels for a Microsoft Teams team",
    syntax: "Get-TeamChannel -GroupId <string> [-DisplayName <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Channel display name filter", required: false }
    ],
    example: 'Get-TeamChannel -GroupId "abc123" -DisplayName "General"'
  },
  {
    id: "new-teamchannel",
    name: "New-TeamChannel",
    category: "Microsoft Teams",
    description: "Creates a new channel in a Microsoft Teams team",
    syntax: "New-TeamChannel -GroupId <string> -DisplayName <string> [-Description <string>] [-MembershipType <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Channel display name", required: true },
      { id: "description", name: "Description", type: "string", description: "Channel description", required: false },
      { id: "membershiptype", name: "MembershipType", type: "select", description: "Channel membership type", required: false, options: ["Standard", "Private", "Shared"] }
    ],
    example: 'New-TeamChannel -GroupId "abc123" -DisplayName "Project Updates" -MembershipType "Standard"'
  },
  {
    id: "remove-teamchannel",
    name: "Remove-TeamChannel",
    category: "Microsoft Teams",
    description: "Removes a channel from a Microsoft Teams team",
    syntax: "Remove-TeamChannel -GroupId <string> -DisplayName <string>",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Channel display name to remove", required: true }
    ],
    example: 'Remove-TeamChannel -GroupId "abc123" -DisplayName "Old Project"'
  },
  {
    id: "get-teamchanneluser",
    name: "Get-TeamChannelUser",
    category: "Microsoft Teams",
    description: "Gets users of a private or shared channel",
    syntax: "Get-TeamChannelUser -GroupId <string> -DisplayName <string> [-Role <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Channel display name", required: true },
      { id: "role", name: "Role", type: "select", description: "Filter by user role", required: false, options: ["Owner", "Member", "Guest"] }
    ],
    example: 'Get-TeamChannelUser -GroupId "abc123" -DisplayName "Private Channel" -Role "Owner"'
  },
  {
    id: "add-teamchanneluser",
    name: "Add-TeamChannelUser",
    category: "Microsoft Teams",
    description: "Adds a user to a private or shared channel",
    syntax: "Add-TeamChannelUser -GroupId <string> -DisplayName <string> -User <string> [-Role <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Channel display name", required: true },
      { id: "user", name: "User", type: "string", description: "User UPN to add", required: true },
      { id: "role", name: "Role", type: "select", description: "User role in channel", required: false, options: ["Owner", "Member"] }
    ],
    example: 'Add-TeamChannelUser -GroupId "abc123" -DisplayName "Private Channel" -User "user@contoso.com" -Role "Member"'
  },
  {
    id: "set-team",
    name: "Set-Team",
    category: "Microsoft Teams",
    description: "Updates properties of a Microsoft Teams team",
    syntax: "Set-Team -GroupId <string> [-DisplayName <string>] [-Description <string>] [-Visibility <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "New display name", required: false },
      { id: "description", name: "Description", type: "string", description: "New description", required: false },
      { id: "visibility", name: "Visibility", type: "select", description: "Team visibility", required: false, options: ["Public", "Private"] }
    ],
    example: 'Set-Team -GroupId "abc123" -DisplayName "IT Department Team" -Visibility "Private"'
  },
  {
    id: "get-teammember",
    name: "Get-TeamUser",
    category: "Microsoft Teams",
    description: "Gets members of a Microsoft Teams team",
    syntax: "Get-TeamUser -GroupId <string> [-Role <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "role", name: "Role", type: "select", description: "Filter by role", required: false, options: ["Owner", "Member", "Guest"] }
    ],
    example: 'Get-TeamUser -GroupId "abc123" -Role "Owner"'
  },
  {
    id: "remove-teamuser",
    name: "Remove-TeamUser",
    category: "Microsoft Teams",
    description: "Removes a user from a Microsoft Teams team",
    syntax: "Remove-TeamUser -GroupId <string> -User <string>",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID of the team", required: true },
      { id: "user", name: "User", type: "string", description: "User UPN to remove", required: true }
    ],
    example: 'Remove-TeamUser -GroupId "abc123" -User "user@contoso.com"'
  },

  // ===================================
  // ONEDRIVE CMDLETS
  // ===================================
  {
    id: "get-sposite-onedrive",
    name: "Get-SPOSite",
    category: "OneDrive",
    description: "Gets OneDrive for Business site collections",
    syntax: "Get-SPOSite [-Identity <string>] [-IncludePersonalSite <boolean>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Site URL", required: false },
      { id: "includepersonalsite", name: "IncludePersonalSite", type: "boolean", description: "Include OneDrive sites", required: false, defaultValue: true }
    ],
    example: 'Get-SPOSite -IncludePersonalSite $true -Filter "Url -like \'-my.sharepoint.com/personal/\'"'
  },
  {
    id: "set-spositestoragelimit",
    name: "Set-SPOSite",
    category: "OneDrive",
    description: "Sets OneDrive storage quota and limits",
    syntax: "Set-SPOSite -Identity <string> -StorageQuota <int>",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "OneDrive site URL", required: true },
      { id: "storagequota", name: "StorageQuota", type: "int", description: "Storage quota in MB", required: true, defaultValue: 5120 }
    ],
    example: 'Set-SPOSite -Identity "https://tenant-my.sharepoint.com/personal/user_contoso_com" -StorageQuota 10240'
  },
  {
    id: "get-spodeletedsite",
    name: "Get-SPODeletedSite",
    category: "OneDrive",
    description: "Gets deleted OneDrive for Business sites from the recycle bin",
    syntax: "Get-SPODeletedSite [-Identity <string>] [-IncludePersonalSite] [-Limit <int>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Deleted site URL", required: false },
      { id: "includepersonalsite", name: "IncludePersonalSite", type: "switch", description: "Include OneDrive sites", required: false, defaultValue: true },
      { id: "limit", name: "Limit", type: "int", description: "Maximum number of sites to return", required: false, defaultValue: 200 }
    ],
    example: 'Get-SPODeletedSite -IncludePersonalSite -Limit 100'
  },
  {
    id: "restore-spodeletedsite",
    name: "Restore-SPODeletedSite",
    category: "OneDrive",
    description: "Restores a deleted OneDrive for Business site from the recycle bin",
    syntax: "Restore-SPODeletedSite -Identity <string> [-NoWait]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "URL of the deleted site to restore", required: true },
      { id: "nowait", name: "NoWait", type: "switch", description: "Do not wait for restore completion", required: false, defaultValue: false }
    ],
    example: 'Restore-SPODeletedSite -Identity "https://tenant-my.sharepoint.com/personal/user_contoso_com"'
  },
  {
    id: "set-spouser",
    name: "Set-SPOUser",
    category: "OneDrive",
    description: "Sets properties for a OneDrive for Business site collection user",
    syntax: "Set-SPOUser -Site <string> -LoginName <string> [-IsSiteCollectionAdmin <boolean>]",
    parameters: [
      { id: "site", name: "Site", type: "string", description: "OneDrive site URL", required: true },
      { id: "loginname", name: "LoginName", type: "string", description: "User login name", required: true },
      { id: "issitecollectionadmin", name: "IsSiteCollectionAdmin", type: "boolean", description: "Make user a site collection admin", required: false, defaultValue: false }
    ],
    example: 'Set-SPOUser -Site "https://tenant-my.sharepoint.com/personal/user_contoso_com" -LoginName "admin@contoso.com" -IsSiteCollectionAdmin $true'
  },
  {
    id: "get-spoexternaluser",
    name: "Get-SPOExternalUser",
    category: "OneDrive",
    description: "Gets external users who have access to OneDrive for Business sites",
    syntax: "Get-SPOExternalUser [-Position <int>] [-PageSize <int>] [-Filter <string>] [-SiteUrl <string>]",
    parameters: [
      { id: "position", name: "Position", type: "int", description: "Starting position in results", required: false, defaultValue: 0 },
      { id: "pagesize", name: "PageSize", type: "int", description: "Number of results per page", required: false, defaultValue: 50 },
      { id: "filter", name: "Filter", type: "string", description: "Filter expression", required: false },
      { id: "siteurl", name: "SiteUrl", type: "string", description: "OneDrive site URL to filter", required: false }
    ],
    example: 'Get-SPOExternalUser -SiteUrl "https://tenant-my.sharepoint.com/personal/user_contoso_com" -PageSize 100'
  },
  {
    id: "remove-spoexternaluser",
    name: "Remove-SPOExternalUser",
    category: "OneDrive",
    description: "Removes external user access from OneDrive for Business",
    syntax: "Remove-SPOExternalUser -UniqueIDs <string[]> [-Confirm]",
    parameters: [
      { id: "uniqueids", name: "UniqueIDs", type: "array", description: "Unique IDs of external users to remove", required: true },
      { id: "confirm", name: "Confirm", type: "switch", description: "Prompt for confirmation", required: false, defaultValue: true }
    ],
    example: 'Remove-SPOExternalUser -UniqueIDs "external-user-guid1","external-user-guid2"'
  },
  {
    id: "get-spotenantsynclientrestriction",
    name: "Get-SPOTenantSyncClientRestriction",
    category: "OneDrive",
    description: "Gets tenant-level OneDrive sync client restrictions",
    syntax: "Get-SPOTenantSyncClientRestriction",
    parameters: [],
    example: 'Get-SPOTenantSyncClientRestriction'
  },
  {
    id: "set-spotenantsynclientrestriction",
    name: "Set-SPOTenantSyncClientRestriction",
    category: "OneDrive",
    description: "Sets tenant-level OneDrive sync client restrictions",
    syntax: "Set-SPOTenantSyncClientRestriction [-Enable] [-DomainGuids <string[]>] [-BlockMacSync] [-ExcludedFileExtensions <string[]>]",
    parameters: [
      { id: "enable", name: "Enable", type: "switch", description: "Enable sync client restriction", required: false, defaultValue: false },
      { id: "domainguids", name: "DomainGuids", type: "array", description: "Allowed domain GUIDs for syncing", required: false },
      { id: "blockmacsync", name: "BlockMacSync", type: "switch", description: "Block syncing on Mac devices", required: false, defaultValue: false },
      { id: "excludedfileextensions", name: "ExcludedFileExtensions", type: "array", description: "File extensions to exclude from sync", required: false }
    ],
    example: 'Set-SPOTenantSyncClientRestriction -Enable -DomainGuids "domain-guid-1"'
  },

  // ===================================
  // OFFICE 365 CMDLETS
  // ===================================
  {
    id: "get-msoluser",
    name: "Get-MsolUser",
    category: "Office 365",
    description: "Gets users from Microsoft 365",
    syntax: "Get-MsolUser [-UserPrincipalName <string>] [-All]",
    parameters: [
      { id: "userprincipalname", name: "UserPrincipalName", type: "string", description: "User UPN", required: false },
      { id: "all", name: "All", type: "switch", description: "Get all users", required: false, defaultValue: false }
    ],
    example: 'Get-MsolUser -UserPrincipalName "user@contoso.com"'
  },
  {
    id: "set-msoluserpassword",
    name: "Set-MsolUserPassword",
    category: "Office 365",
    description: "Sets user password in Microsoft 365",
    syntax: "Set-MsolUserPassword -UserPrincipalName <string> -NewPassword <string> [-ForceChangePassword <boolean>]",
    parameters: [
      { id: "userprincipalname", name: "UserPrincipalName", type: "string", description: "User UPN", required: true },
      { id: "newpassword", name: "NewPassword", type: "string", description: "New password", required: true },
      { id: "forcechangepassword", name: "ForceChangePassword", type: "boolean", description: "Force password change", required: false, defaultValue: true }
    ],
    example: 'Set-MsolUserPassword -UserPrincipalName "user@contoso.com" -NewPassword "TempP@ss123" -ForceChangePassword $true'
  },
  {
    id: "set-msoluserllicense",
    name: "Set-MsolUserLicense",
    category: "Office 365",
    description: "Assigns or removes Office 365 licenses",
    syntax: "Set-MsolUserLicense -UserPrincipalName <string> [-AddLicenses <string[]>] [-RemoveLicenses <string[]>]",
    parameters: [
      { id: "userprincipalname", name: "UserPrincipalName", type: "string", description: "User UPN", required: true },
      { id: "addlicenses", name: "AddLicenses", type: "array", description: "License SKUs to add", required: false },
      { id: "removelicenses", name: "RemoveLicenses", type: "array", description: "License SKUs to remove", required: false }
    ],
    example: 'Set-MsolUserLicense -UserPrincipalName "user@contoso.com" -AddLicenses "contoso:ENTERPRISEPACK"'
  },
  {
    id: "get-msolaccountsku",
    name: "Get-MsolAccountSku",
    category: "Office 365",
    description: "Gets all license SKUs available in the tenant",
    syntax: "Get-MsolAccountSku",
    parameters: [],
    example: 'Get-MsolAccountSku | Select-Object AccountSkuId, ActiveUnits, ConsumedUnits'
  },
  {
    id: "get-msoldomain",
    name: "Get-MsolDomain",
    category: "Office 365",
    description: "Gets domains registered in Microsoft 365 tenant",
    syntax: "Get-MsolDomain [-DomainName <string>] [-Status <string>]",
    parameters: [
      { id: "domainname", name: "DomainName", type: "string", description: "Specific domain name", required: false },
      { id: "status", name: "Status", type: "select", description: "Filter by domain status", required: false, options: ["Verified", "Unverified", "PendingDeletion"] }
    ],
    example: 'Get-MsolDomain -Status "Verified"'
  },
  {
    id: "set-msoluser",
    name: "Set-MsolUser",
    category: "Office 365",
    description: "Modifies user properties in Microsoft 365",
    syntax: "Set-MsolUser -UserPrincipalName <string> [-DisplayName <string>] [-BlockCredential <boolean>] [-UsageLocation <string>]",
    parameters: [
      { id: "userprincipalname", name: "UserPrincipalName", type: "string", description: "User UPN", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "User display name", required: false },
      { id: "blockcredential", name: "BlockCredential", type: "boolean", description: "Block sign-in", required: false, defaultValue: false },
      { id: "usagelocation", name: "UsageLocation", type: "string", description: "Two-letter country code", required: false }
    ],
    example: 'Set-MsolUser -UserPrincipalName "user@contoso.com" -UsageLocation "US" -BlockCredential $false'
  },
  {
    id: "remove-msoluser",
    name: "Remove-MsolUser",
    category: "Office 365",
    description: "Removes a user from Microsoft 365",
    syntax: "Remove-MsolUser -UserPrincipalName <string> [-RemoveFromRecycleBin] [-Force]",
    parameters: [
      { id: "userprincipalname", name: "UserPrincipalName", type: "string", description: "User UPN to remove", required: true },
      { id: "removefromrecyclebin", name: "RemoveFromRecycleBin", type: "switch", description: "Permanently delete from recycle bin", required: false, defaultValue: false },
      { id: "force", name: "Force", type: "switch", description: "Skip confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-MsolUser -UserPrincipalName "user@contoso.com" -Force'
  },
  {
    id: "new-msoluser",
    name: "New-MsolUser",
    category: "Office 365",
    description: "Creates a new user in Microsoft 365",
    syntax: "New-MsolUser -UserPrincipalName <string> -DisplayName <string> [-FirstName <string>] [-LastName <string>] [-Password <string>] [-UsageLocation <string>]",
    parameters: [
      { id: "userprincipalname", name: "UserPrincipalName", type: "string", description: "User UPN", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Display name", required: true },
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: false },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: false },
      { id: "password", name: "Password", type: "string", description: "Initial password", required: false },
      { id: "usagelocation", name: "UsageLocation", type: "string", description: "Two-letter country code", required: false }
    ],
    example: 'New-MsolUser -UserPrincipalName "newuser@contoso.com" -DisplayName "New User" -FirstName "New" -LastName "User" -UsageLocation "US"'
  },
  {
    id: "get-msolrole",
    name: "Get-MsolRole",
    category: "Office 365",
    description: "Gets administrator roles in Microsoft 365",
    syntax: "Get-MsolRole [-RoleName <string>]",
    parameters: [
      { id: "rolename", name: "RoleName", type: "string", description: "Specific role name", required: false }
    ],
    example: 'Get-MsolRole | Select-Object Name, Description'
  },
  {
    id: "get-msolgroup",
    name: "Get-MsolGroup",
    category: "Office 365",
    description: "Gets groups from Microsoft 365",
    syntax: "Get-MsolGroup [-ObjectId <string>] [-SearchString <string>] [-All]",
    parameters: [
      { id: "objectid", name: "ObjectId", type: "string", description: "Group object ID", required: false },
      { id: "searchstring", name: "SearchString", type: "string", description: "Search string for group name", required: false },
      { id: "all", name: "All", type: "switch", description: "Get all groups", required: false, defaultValue: false }
    ],
    example: 'Get-MsolGroup -SearchString "IT" -All'
  },
  {
    id: "add-msolgroupmember",
    name: "Add-MsolGroupMember",
    category: "Office 365",
    description: "Adds a member to a Microsoft 365 group",
    syntax: "Add-MsolGroupMember -GroupObjectId <string> -GroupMemberObjectId <string> [-GroupMemberType <string>]",
    parameters: [
      { id: "groupobjectid", name: "GroupObjectId", type: "string", description: "Group object ID", required: true },
      { id: "groupmemberobjectid", name: "GroupMemberObjectId", type: "string", description: "Member object ID to add", required: true },
      { id: "groupmembertype", name: "GroupMemberType", type: "select", description: "Type of member", required: false, options: ["User", "Group", "Contact", "ServicePrincipal"] }
    ],
    example: 'Add-MsolGroupMember -GroupObjectId "group-guid" -GroupMemberObjectId "user-guid" -GroupMemberType "User"'
  },

  // ===================================
  // INTUNE CMDLETS
  // ===================================
  {
    id: "get-intunemanageddevice",
    name: "Get-IntuneManagedDevice",
    category: "Intune",
    description: "Gets Intune managed devices",
    syntax: "Get-IntuneManagedDevice [-DeviceId <string>]",
    parameters: [
      { id: "deviceid", name: "DeviceId", type: "string", description: "Device ID", required: false }
    ],
    example: 'Get-IntuneManagedDevice | Where-Object {$_.OperatingSystem -eq "Windows"}'
  },
  {
    id: "invoke-intunemanageddevicesyncdevice",
    name: "Invoke-IntuneManagedDeviceSyncDevice",
    category: "Intune",
    description: "Syncs an Intune managed device",
    syntax: "Invoke-IntuneManagedDeviceSyncDevice -ManagedDeviceId <string>",
    parameters: [
      { id: "manageddeviceid", name: "ManagedDeviceId", type: "string", description: "Managed device ID", required: true }
    ],
    example: 'Invoke-IntuneManagedDeviceSyncDevice -ManagedDeviceId "device-guid"'
  },
  {
    id: "new-intunedeviceconfigurationpolicy",
    name: "New-IntuneDeviceConfigurationPolicy",
    category: "Intune",
    description: "Creates a new Intune device configuration policy",
    syntax: "New-IntuneDeviceConfigurationPolicy -DisplayName <string> -Platform <string>",
    parameters: [
      { id: "displayname", name: "DisplayName", type: "string", description: "Policy display name", required: true },
      { id: "platform", name: "Platform", type: "select", description: "Target platform", required: true, options: ["Windows10", "iOS", "Android", "macOS"] }
    ],
    example: 'New-IntuneDeviceConfigurationPolicy -DisplayName "Windows Security Policy" -Platform "Windows10"'
  },
  {
    id: "get-intunedevicecompliancepolicy",
    name: "Get-IntuneDeviceCompliancePolicy",
    category: "Intune",
    description: "Gets device compliance policies from Intune",
    syntax: "Get-IntuneDeviceCompliancePolicy [-DeviceCompliancePolicyId <string>]",
    parameters: [
      { id: "devicecompliancepolicyid", name: "DeviceCompliancePolicyId", type: "string", description: "Compliance policy ID", required: false }
    ],
    example: 'Get-IntuneDeviceCompliancePolicy | Select-Object DisplayName, Platform, LastModifiedDateTime'
  },
  {
    id: "get-intunedeviceconfigurationpolicy",
    name: "Get-IntuneDeviceConfigurationPolicy",
    category: "Intune",
    description: "Gets device configuration policies from Intune",
    syntax: "Get-IntuneDeviceConfigurationPolicy [-DeviceConfigurationId <string>]",
    parameters: [
      { id: "deviceconfigurationid", name: "DeviceConfigurationId", type: "string", description: "Configuration policy ID", required: false }
    ],
    example: 'Get-IntuneDeviceConfigurationPolicy | Where-Object {$_.Platform -eq "Windows10"}'
  },
  {
    id: "remove-intunemanageddevice",
    name: "Remove-IntuneManagedDevice",
    category: "Intune",
    description: "Removes a managed device from Intune (wipe or retire)",
    syntax: "Remove-IntuneManagedDevice -ManagedDeviceId <string> [-RetireInsteadOfWipe]",
    parameters: [
      { id: "manageddeviceid", name: "ManagedDeviceId", type: "string", description: "Managed device ID", required: true },
      { id: "retireinsteadofwipe", name: "RetireInsteadOfWipe", type: "switch", description: "Retire device instead of full wipe", required: false, defaultValue: false }
    ],
    example: 'Remove-IntuneManagedDevice -ManagedDeviceId "device-guid" -RetireInsteadOfWipe'
  },
  {
    id: "get-intunedevicecategory",
    name: "Get-IntuneDeviceCategory",
    category: "Intune",
    description: "Gets device categories defined in Intune",
    syntax: "Get-IntuneDeviceCategory [-DeviceCategoryId <string>]",
    parameters: [
      { id: "devicecategoryid", name: "DeviceCategoryId", type: "string", description: "Device category ID", required: false }
    ],
    example: 'Get-IntuneDeviceCategory | Select-Object DisplayName, Description'
  },
  {
    id: "get-intuneappprotectionpolicy",
    name: "Get-IntuneAppProtectionPolicy",
    category: "Intune",
    description: "Gets app protection policies from Intune",
    syntax: "Get-IntuneAppProtectionPolicy [-PolicyId <string>] [-Platform <string>]",
    parameters: [
      { id: "policyid", name: "PolicyId", type: "string", description: "App protection policy ID", required: false },
      { id: "platform", name: "Platform", type: "select", description: "Target platform", required: false, options: ["iOS", "Android", "Windows"] }
    ],
    example: 'Get-IntuneAppProtectionPolicy -Platform "iOS"'
  },
  {
    id: "set-intunemanageddevice",
    name: "Set-IntuneManagedDevice",
    category: "Intune",
    description: "Updates properties of an Intune managed device",
    syntax: "Set-IntuneManagedDevice -ManagedDeviceId <string> [-DeviceName <string>] [-DeviceCategoryId <string>] [-Notes <string>]",
    parameters: [
      { id: "manageddeviceid", name: "ManagedDeviceId", type: "string", description: "Managed device ID", required: true },
      { id: "devicename", name: "DeviceName", type: "string", description: "New device name", required: false },
      { id: "devicecategoryid", name: "DeviceCategoryId", type: "string", description: "Device category ID", required: false },
      { id: "notes", name: "Notes", type: "string", description: "Device notes", required: false }
    ],
    example: 'Set-IntuneManagedDevice -ManagedDeviceId "device-guid" -DeviceName "LAPTOP-IT001" -Notes "Assigned to IT department"'
  },
  {
    id: "get-intunedeviceenrollmentconfiguration",
    name: "Get-IntuneDeviceEnrollmentConfiguration",
    category: "Intune",
    description: "Gets device enrollment configurations from Intune",
    syntax: "Get-IntuneDeviceEnrollmentConfiguration [-DeviceEnrollmentConfigurationId <string>]",
    parameters: [
      { id: "deviceenrollmentconfigurationid", name: "DeviceEnrollmentConfigurationId", type: "string", description: "Enrollment configuration ID", required: false }
    ],
    example: 'Get-IntuneDeviceEnrollmentConfiguration | Select-Object DisplayName, Priority, DeviceEnrollmentConfigurationType'
  },

  // ===================================
  // POWER PLATFORM CMDLETS
  // ===================================
  {
    id: "get-adminpowerapp",
    name: "Get-AdminPowerApp",
    category: "Power Platform",
    description: "Gets Power Apps in the tenant",
    syntax: "Get-AdminPowerApp [-EnvironmentName <string>]",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: false }
    ],
    example: 'Get-AdminPowerApp -EnvironmentName "Default-tenant-guid"'
  },
  {
    id: "get-adminpowerappsenvironment",
    name: "Get-AdminPowerAppsEnvironment",
    category: "Power Platform",
    description: "Gets Power Platform environments",
    syntax: "Get-AdminPowerAppsEnvironment [-EnvironmentName <string>]",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: false }
    ],
    example: 'Get-AdminPowerAppsEnvironment'
  },
  {
    id: "get-adminflow",
    name: "Get-AdminFlow",
    category: "Power Platform",
    description: "Gets Power Automate flows",
    syntax: "Get-AdminFlow [-EnvironmentName <string>]",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: false }
    ],
    example: 'Get-AdminFlow -EnvironmentName "Default-tenant-guid"'
  },
  {
    id: "remove-adminpowerapp",
    name: "Remove-AdminPowerApp",
    category: "Power Platform",
    description: "Removes a Power App from the tenant",
    syntax: "Remove-AdminPowerApp -EnvironmentName <string> -AppName <string>",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: true },
      { id: "appname", name: "AppName", type: "string", description: "Power App name/ID", required: true }
    ],
    example: 'Remove-AdminPowerApp -EnvironmentName "Default-tenant-guid" -AppName "app-guid"'
  },
  {
    id: "set-adminpowerappapistbypassconsent",
    name: "Set-AdminPowerAppApisToBypassConsent",
    category: "Power Platform",
    description: "Sets Power App APIs to bypass user consent",
    syntax: "Set-AdminPowerAppApisToBypassConsent -EnvironmentName <string> -AppName <string>",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: true },
      { id: "appname", name: "AppName", type: "string", description: "Power App name/ID", required: true }
    ],
    example: 'Set-AdminPowerAppApisToBypassConsent -EnvironmentName "Default-tenant-guid" -AppName "app-guid"'
  },
  {
    id: "get-adminpowerappconnection",
    name: "Get-AdminPowerAppConnection",
    category: "Power Platform",
    description: "Gets Power App connections in the tenant",
    syntax: "Get-AdminPowerAppConnection [-EnvironmentName <string>] [-ConnectorName <string>]",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: false },
      { id: "connectorname", name: "ConnectorName", type: "string", description: "Connector name filter", required: false }
    ],
    example: 'Get-AdminPowerAppConnection -EnvironmentName "Default-tenant-guid"'
  },
  {
    id: "get-admindlppolicy",
    name: "Get-AdminDlpPolicy",
    category: "Power Platform",
    description: "Gets Data Loss Prevention policies for Power Platform",
    syntax: "Get-AdminDlpPolicy [-PolicyName <string>]",
    parameters: [
      { id: "policyname", name: "PolicyName", type: "string", description: "DLP policy name or ID", required: false }
    ],
    example: 'Get-AdminDlpPolicy | Select-Object DisplayName, CreatedTime, Environments'
  },
  {
    id: "new-admindlppolicy",
    name: "New-AdminDlpPolicy",
    category: "Power Platform",
    description: "Creates a new Data Loss Prevention policy for Power Platform",
    syntax: "New-AdminDlpPolicy -DisplayName <string> [-EnvironmentName <string>] [-DefaultConnectorClassification <string>]",
    parameters: [
      { id: "displayname", name: "DisplayName", type: "string", description: "Policy display name", required: true },
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment to apply policy", required: false },
      { id: "defaultconnectorclassification", name: "DefaultConnectorClassification", type: "select", description: "Default connector classification", required: false, options: ["General", "Confidential", "Blocked"] }
    ],
    example: 'New-AdminDlpPolicy -DisplayName "Block External Connectors" -DefaultConnectorClassification "Blocked"'
  },
  {
    id: "remove-adminflow",
    name: "Remove-AdminFlow",
    category: "Power Platform",
    description: "Removes a Power Automate flow from the tenant",
    syntax: "Remove-AdminFlow -EnvironmentName <string> -FlowName <string>",
    parameters: [
      { id: "environmentname", name: "EnvironmentName", type: "string", description: "Environment name", required: true },
      { id: "flowname", name: "FlowName", type: "string", description: "Flow name/ID", required: true }
    ],
    example: 'Remove-AdminFlow -EnvironmentName "Default-tenant-guid" -FlowName "flow-guid"'
  },

  // ===================================
  // WINDOWS 365 CMDLETS
  // ===================================
  {
    id: "get-mgdevicemanagementvirtualendpointcloudpc",
    name: "Get-MgDeviceManagementVirtualEndpointCloudPC",
    category: "Windows 365",
    description: "Gets Cloud PCs from Windows 365",
    syntax: "Get-MgDeviceManagementVirtualEndpointCloudPC [-CloudPCId <string>]",
    parameters: [
      { id: "cloudpcid", name: "CloudPCId", type: "string", description: "Cloud PC ID", required: false }
    ],
    example: 'Get-MgDeviceManagementVirtualEndpointCloudPC'
  },
  {
    id: "restart-mgdevicemanagementvirtualendpointcloudpc",
    name: "Restart-MgDeviceManagementVirtualEndpointCloudPC",
    category: "Windows 365",
    description: "Restarts a Windows 365 Cloud PC",
    syntax: "Restart-MgDeviceManagementVirtualEndpointCloudPC -CloudPCId <string>",
    parameters: [
      { id: "cloudpcid", name: "CloudPCId", type: "string", description: "Cloud PC ID", required: true }
    ],
    example: 'Restart-MgDeviceManagementVirtualEndpointCloudPC -CloudPCId "cloudpc-guid"'
  },
  {
    id: "get-mgdevicemanagementvirtualendpointprovisioningpolicy",
    name: "Get-MgDeviceManagementVirtualEndpointProvisioningPolicy",
    category: "Windows 365",
    description: "Gets Windows 365 Cloud PC provisioning policies",
    syntax: "Get-MgDeviceManagementVirtualEndpointProvisioningPolicy [-CloudPcProvisioningPolicyId <string>]",
    parameters: [
      { id: "cloudpcprovisioningpolicyid", name: "CloudPcProvisioningPolicyId", type: "string", description: "Provisioning policy ID", required: false }
    ],
    example: 'Get-MgDeviceManagementVirtualEndpointProvisioningPolicy'
  },
  {
    id: "new-mgdevicemanagementvirtualendpointprovisioningpolicy",
    name: "New-MgDeviceManagementVirtualEndpointProvisioningPolicy",
    category: "Windows 365",
    description: "Creates a new Windows 365 Cloud PC provisioning policy",
    syntax: "New-MgDeviceManagementVirtualEndpointProvisioningPolicy -DisplayName <string> -ImageId <string> [-Description <string>]",
    parameters: [
      { id: "displayname", name: "DisplayName", type: "string", description: "Policy display name", required: true },
      { id: "imageid", name: "ImageId", type: "string", description: "Device image ID", required: true },
      { id: "description", name: "Description", type: "string", description: "Policy description", required: false }
    ],
    example: 'New-MgDeviceManagementVirtualEndpointProvisioningPolicy -DisplayName "Standard Dev Policy" -ImageId "image-guid"'
  },
  {
    id: "get-mgdevicemanagementvirtualendpointusersetting",
    name: "Get-MgDeviceManagementVirtualEndpointUserSetting",
    category: "Windows 365",
    description: "Gets Windows 365 Cloud PC user settings",
    syntax: "Get-MgDeviceManagementVirtualEndpointUserSetting [-CloudPcUserSettingId <string>]",
    parameters: [
      { id: "cloudpcusersettingid", name: "CloudPcUserSettingId", type: "string", description: "User setting ID", required: false }
    ],
    example: 'Get-MgDeviceManagementVirtualEndpointUserSetting'
  },
  {
    id: "get-mgdevicemanagementvirtualendpointauditevent",
    name: "Get-MgDeviceManagementVirtualEndpointAuditEvent",
    category: "Windows 365",
    description: "Gets Windows 365 Cloud PC audit events",
    syntax: "Get-MgDeviceManagementVirtualEndpointAuditEvent [-CloudPcAuditEventId <string>] [-Filter <string>]",
    parameters: [
      { id: "cloudpcauditeventid", name: "CloudPcAuditEventId", type: "string", description: "Audit event ID", required: false },
      { id: "filter", name: "Filter", type: "string", description: "OData filter expression", required: false }
    ],
    example: 'Get-MgDeviceManagementVirtualEndpointAuditEvent -Filter "activityDateTime ge 2024-01-01"'
  },
  {
    id: "get-mgdevicemanagementvirtualendpointsupportedregion",
    name: "Get-MgDeviceManagementVirtualEndpointSupportedRegion",
    category: "Windows 365",
    description: "Gets Windows 365 supported Azure regions",
    syntax: "Get-MgDeviceManagementVirtualEndpointSupportedRegion [-CloudPcSupportedRegionId <string>]",
    parameters: [
      { id: "cloudpcsupportedregionid", name: "CloudPcSupportedRegionId", type: "string", description: "Supported region ID", required: false }
    ],
    example: 'Get-MgDeviceManagementVirtualEndpointSupportedRegion'
  },
  {
    id: "get-mgdevicemanagementvirtualendpointdeviceimage",
    name: "Get-MgDeviceManagementVirtualEndpointDeviceImage",
    category: "Windows 365",
    description: "Gets Windows 365 Cloud PC device images",
    syntax: "Get-MgDeviceManagementVirtualEndpointDeviceImage [-CloudPcDeviceImageId <string>]",
    parameters: [
      { id: "cloudpcdeviceimageid", name: "CloudPcDeviceImageId", type: "string", description: "Device image ID", required: false }
    ],
    example: 'Get-MgDeviceManagementVirtualEndpointDeviceImage'
  },

  // ===================================
  // AZURE RESOURCES CMDLETS
  // ===================================
  {
    id: "get-azvm-resources",
    name: "Get-AzVM",
    category: "Azure Resources",
    description: "Gets Azure virtual machines",
    syntax: "Get-AzVM [-ResourceGroupName <string>] [-Name <string>]",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Resource group name", required: false },
      { id: "name", name: "Name", type: "string", description: "VM name", required: false }
    ],
    example: 'Get-AzVM -ResourceGroupName "Production-RG"'
  },
  {
    id: "start-azvm-resources",
    name: "Start-AzVM",
    category: "Azure Resources",
    description: "Starts an Azure virtual machine",
    syntax: "Start-AzVM -ResourceGroupName <string> -Name <string>",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Resource group name", required: true },
      { id: "name", name: "Name", type: "string", description: "VM name", required: true }
    ],
    example: 'Start-AzVM -ResourceGroupName "Production-RG" -Name "WebServer01"'
  },
  {
    id: "stop-azvm-resources",
    name: "Stop-AzVM",
    category: "Azure Resources",
    description: "Stops an Azure virtual machine",
    syntax: "Stop-AzVM -ResourceGroupName <string> -Name <string> [-Force]",
    parameters: [
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Resource group name", required: true },
      { id: "name", name: "Name", type: "string", description: "VM name", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force stop without confirmation", required: false, defaultValue: false }
    ],
    example: 'Stop-AzVM -ResourceGroupName "Production-RG" -Name "WebServer01" -Force'
  },
  {
    id: "new-azresourcegroup-resources",
    name: "New-AzResourceGroup",
    category: "Azure Resources",
    description: "Creates a new Azure resource group",
    syntax: "New-AzResourceGroup -Name <string> -Location <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Resource group name", required: true },
      { id: "location", name: "Location", type: "string", description: "Azure location", required: true }
    ],
    example: 'New-AzResourceGroup -Name "MyApp-RG" -Location "eastus"'
  },
  {
    id: "remove-azresourcegroup",
    name: "Remove-AzResourceGroup",
    category: "Azure Resources",
    description: "Removes an Azure resource group and all its resources",
    syntax: "Remove-AzResourceGroup [-Name] <string> [-Force] [-AsJob]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the name of the resource group to remove", required: true },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false },
      { id: "asjob", name: "AsJob", type: "switch", description: "Runs the command as a background job", required: false, defaultValue: false }
    ],
    example: 'Remove-AzResourceGroup -Name "OldApp-RG" -Force'
  },
  {
    id: "get-azresource",
    name: "Get-AzResource",
    category: "Azure Resources",
    description: "Gets Azure resources",
    syntax: "Get-AzResource [[-Name] <string>] [-ResourceGroupName <string>] [-ResourceType <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the resource name", required: false },
      { id: "resourcegroupname", name: "ResourceGroupName", type: "string", description: "Specifies the resource group name", required: false },
      { id: "resourcetype", name: "ResourceType", type: "string", description: "Specifies the resource type", required: false }
    ],
    example: 'Get-AzResource -ResourceGroupName "Production-RG" -ResourceType "Microsoft.Compute/virtualMachines"'
  },
  {
    id: "remove-azresource",
    name: "Remove-AzResource",
    category: "Azure Resources",
    description: "Removes an Azure resource",
    syntax: "Remove-AzResource [-ResourceId] <string> [-Force] [-AsJob]",
    parameters: [
      { id: "resourceid", name: "ResourceId", type: "string", description: "Specifies the fully qualified resource ID", required: true },
      { id: "force", name: "Force", type: "switch", description: "Forces removal without confirmation", required: false, defaultValue: false },
      { id: "asjob", name: "AsJob", type: "switch", description: "Runs the command as a background job", required: false, defaultValue: false }
    ],
    example: 'Remove-AzResource -ResourceId "/subscriptions/{sub-id}/resourceGroups/MyRG/providers/Microsoft.Storage/storageAccounts/mystorageacct" -Force'
  },
  {
    id: "move-azresource",
    name: "Move-AzResource",
    category: "Azure Resources",
    description: "Moves resources to a different resource group or subscription",
    syntax: "Move-AzResource -ResourceId <string[]> -DestinationResourceGroupName <string>",
    parameters: [
      { id: "resourceid", name: "ResourceId", type: "array", description: "Specifies the resource IDs to move", required: true },
      { id: "destinationresourcegroupname", name: "DestinationResourceGroupName", type: "string", description: "Specifies the destination resource group", required: true }
    ],
    example: 'Move-AzResource -ResourceId @($resource.ResourceId) -DestinationResourceGroupName "NewRG"'
  },
  {
    id: "get-aztag",
    name: "Get-AzTag",
    category: "Azure Resources",
    description: "Gets predefined Azure tags or tags on a resource",
    syntax: "Get-AzTag [[-Name] <string>] [-ResourceId <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the tag name", required: false },
      { id: "resourceid", name: "ResourceId", type: "string", description: "Specifies the resource ID to get tags from", required: false }
    ],
    example: 'Get-AzTag -Name "Environment"'
  },
  {
    id: "new-aztag",
    name: "New-AzTag",
    category: "Azure Resources",
    description: "Creates a predefined Azure tag or adds values to an existing tag",
    syntax: "New-AzTag [-Name] <string> [-Value <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Specifies the tag name", required: true },
      { id: "value", name: "Value", type: "string", description: "Specifies a tag value", required: false }
    ],
    example: 'New-AzTag -Name "CostCenter" -Value "IT-001"'
  },
  {
    id: "set-azresource",
    name: "Set-AzResource",
    category: "Azure Resources",
    description: "Modifies an Azure resource",
    syntax: "Set-AzResource [-ResourceId] <string> [-Tag <hashtable>] [-Force]",
    parameters: [
      { id: "resourceid", name: "ResourceId", type: "string", description: "Specifies the fully qualified resource ID", required: true },
      { id: "tag", name: "Tag", type: "string", description: "Specifies tags as a hashtable", required: false },
      { id: "force", name: "Force", type: "switch", description: "Forces the command without confirmation", required: false, defaultValue: false }
    ],
    example: 'Set-AzResource -ResourceId $resourceId -Tag @{Environment="Production"; Owner="IT"} -Force'
  },

  // ===================================
  // SHAREPOINT ON-PREM CMDLETS
  // ===================================
  {
    id: "get-spsite",
    name: "Get-SPSite",
    category: "SharePoint On-Prem",
    description: "Gets SharePoint on-premises site collections",
    syntax: "Get-SPSite [-Identity <string>] [-Limit <string>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Site collection URL", required: false },
      { id: "limit", name: "Limit", type: "string", description: "Limit results", required: false, defaultValue: "All" }
    ],
    example: 'Get-SPSite -Limit All'
  },
  {
    id: "new-spsite-onprem",
    name: "New-SPSite",
    category: "SharePoint On-Prem",
    description: "Creates a new SharePoint site collection",
    syntax: "New-SPSite -Url <string> -OwnerAlias <string> [-Template <string>]",
    parameters: [
      { id: "url", name: "Url", type: "string", description: "Site collection URL", required: true },
      { id: "owneralias", name: "OwnerAlias", type: "string", description: "Site owner", required: true },
      { id: "template", name: "Template", type: "string", description: "Site template", required: false }
    ],
    example: 'New-SPSite -Url "http://sharepoint/sites/hr" -OwnerAlias "DOMAIN\\admin"'
  },
  {
    id: "get-spweb",
    name: "Get-SPWeb",
    category: "SharePoint On-Prem",
    description: "Gets SharePoint on-premises web sites",
    syntax: "Get-SPWeb [-Identity] <string>",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the web URL", required: true }
    ],
    example: 'Get-SPWeb -Identity "http://sharepoint/sites/hr/subsite"'
  },
  {
    id: "set-spsite",
    name: "Set-SPSite",
    category: "SharePoint On-Prem",
    description: "Configures SharePoint site collection properties",
    syntax: "Set-SPSite [-Identity] <string> [-OwnerAlias <string>] [-SecondaryOwnerAlias <string>] [-LockState <string>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the site collection URL", required: true },
      { id: "owneralias", name: "OwnerAlias", type: "string", description: "Specifies the primary site owner", required: false },
      { id: "secondaryowneralias", name: "SecondaryOwnerAlias", type: "string", description: "Specifies the secondary site owner", required: false },
      { id: "lockstate", name: "LockState", type: "select", description: "Specifies the lock state", required: false, options: ["Unlock", "NoAdditions", "ReadOnly", "NoAccess"] }
    ],
    example: 'Set-SPSite -Identity "http://sharepoint/sites/hr" -LockState ReadOnly'
  },
  {
    id: "remove-spsite",
    name: "Remove-SPSite",
    category: "SharePoint On-Prem",
    description: "Removes a SharePoint site collection",
    syntax: "Remove-SPSite [-Identity] <string> [-Confirm] [-GradualDelete]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the site collection URL", required: true },
      { id: "confirm", name: "Confirm", type: "switch", description: "Prompts for confirmation", required: false, defaultValue: true },
      { id: "gradualdelete", name: "GradualDelete", type: "switch", description: "Uses gradual delete for large sites", required: false, defaultValue: false }
    ],
    example: 'Remove-SPSite -Identity "http://sharepoint/sites/oldsite" -Confirm:$false'
  },
  {
    id: "get-spcontentdatabase",
    name: "Get-SPContentDatabase",
    category: "SharePoint On-Prem",
    description: "Gets SharePoint content databases",
    syntax: "Get-SPContentDatabase [[-Identity] <string>] [-WebApplication <string>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the database name", required: false },
      { id: "webapplication", name: "WebApplication", type: "string", description: "Specifies the web application URL", required: false }
    ],
    example: 'Get-SPContentDatabase -WebApplication "http://sharepoint"'
  },
  {
    id: "get-spfarm",
    name: "Get-SPFarm",
    category: "SharePoint On-Prem",
    description: "Gets the SharePoint farm object",
    syntax: "Get-SPFarm",
    parameters: [],
    example: 'Get-SPFarm'
  },
  {
    id: "get-spmanagedaccount",
    name: "Get-SPManagedAccount",
    category: "SharePoint On-Prem",
    description: "Gets SharePoint managed accounts",
    syntax: "Get-SPManagedAccount [[-Identity] <string>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the account name", required: false }
    ],
    example: 'Get-SPManagedAccount'
  },
  {
    id: "get-spwebapplication",
    name: "Get-SPWebApplication",
    category: "SharePoint On-Prem",
    description: "Gets SharePoint web applications",
    syntax: "Get-SPWebApplication [[-Identity] <string>] [-IncludeCentralAdministration]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the web application URL", required: false },
      { id: "includecentraladministration", name: "IncludeCentralAdministration", type: "switch", description: "Includes Central Administration", required: false, defaultValue: false }
    ],
    example: 'Get-SPWebApplication -IncludeCentralAdministration'
  },
  {
    id: "set-spuser",
    name: "Set-SPUser",
    category: "SharePoint On-Prem",
    description: "Configures a SharePoint user",
    syntax: "Set-SPUser [-Identity] <string> [-Web] <string> [-DisplayName <string>] [-Email <string>] [-IsSiteCollectionAdmin <bool>]",
    parameters: [
      { id: "identity", name: "Identity", type: "string", description: "Specifies the user login name", required: true },
      { id: "web", name: "Web", type: "string", description: "Specifies the web URL", required: true },
      { id: "displayname", name: "DisplayName", type: "string", description: "Specifies the display name", required: false },
      { id: "email", name: "Email", type: "string", description: "Specifies the email address", required: false },
      { id: "issitecollectionadmin", name: "IsSiteCollectionAdmin", type: "boolean", description: "Sets site collection admin status", required: false }
    ],
    example: 'Set-SPUser -Identity "DOMAIN\\user" -Web "http://sharepoint/sites/hr" -IsSiteCollectionAdmin $true'
  },

  // ===================================
  // VMWARE CMDLETS
  // ===================================
  {
    id: "get-vm-vmware",
    name: "Get-VM",
    category: "VMware",
    description: "Gets virtual machines from vCenter",
    syntax: "Get-VM [-Name <string>] [-Location <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VM name pattern", required: false },
      { id: "location", name: "Location", type: "string", description: "Datacenter or folder", required: false }
    ],
    example: 'Get-VM -Name "WebServer*"'
  },
  {
    id: "start-vm-vmware",
    name: "Start-VM",
    category: "VMware",
    description: "Powers on a VMware virtual machine",
    syntax: "Start-VM -VM <string> [-Confirm <boolean>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name", required: true },
      { id: "confirm", name: "Confirm", type: "boolean", description: "Confirm action", required: false, defaultValue: false }
    ],
    example: 'Start-VM -VM "WebServer01" -Confirm:$false'
  },
  {
    id: "stop-vm-vmware",
    name: "Stop-VM",
    category: "VMware",
    description: "Powers off a VMware virtual machine",
    syntax: "Stop-VM -VM <string> [-Kill] [-Confirm <boolean>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name", required: true },
      { id: "kill", name: "Kill", type: "switch", description: "Force power off", required: false, defaultValue: false },
      { id: "confirm", name: "Confirm", type: "boolean", description: "Confirm action", required: false, defaultValue: false }
    ],
    example: 'Stop-VM -VM "WebServer01" -Confirm:$false'
  },
  {
    id: "new-vm-vmware",
    name: "New-VM",
    category: "VMware",
    description: "Creates a new VMware virtual machine",
    syntax: "New-VM -Name <string> -ResourcePool <string> [-Template <string>] [-Datastore <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VM name", required: true },
      { id: "resourcepool", name: "ResourcePool", type: "string", description: "Resource pool", required: true },
      { id: "template", name: "Template", type: "string", description: "VM template", required: false },
      { id: "datastore", name: "Datastore", type: "string", description: "Datastore name", required: false }
    ],
    example: 'New-VM -Name "NewServer" -ResourcePool "Production" -Template "Windows2022-Template"'
  },
  {
    id: "get-snapshot-vmware",
    name: "Get-Snapshot",
    category: "VMware",
    description: "Gets snapshots of a VMware virtual machine",
    syntax: "Get-Snapshot -VM <string> [-Name <string>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "name", name: "Name", type: "string", description: "Snapshot name pattern", required: false }
    ],
    example: 'Get-Snapshot -VM "WebServer01"'
  },
  {
    id: "new-snapshot-vmware",
    name: "New-Snapshot",
    category: "VMware",
    description: "Creates a new snapshot of a VMware virtual machine",
    syntax: "New-Snapshot -VM <string> -Name <string> [-Description <string>] [-Memory] [-Quiesce]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "name", name: "Name", type: "string", description: "Snapshot name", required: true },
      { id: "description", name: "Description", type: "string", description: "Snapshot description", required: false },
      { id: "memory", name: "Memory", type: "switch", description: "Include VM memory state", required: false, defaultValue: false },
      { id: "quiesce", name: "Quiesce", type: "switch", description: "Quiesce guest file system", required: false, defaultValue: false }
    ],
    example: 'New-Snapshot -VM "WebServer01" -Name "PreUpdate" -Description "Before patch installation"'
  },
  {
    id: "remove-snapshot-vmware",
    name: "Remove-Snapshot",
    category: "VMware",
    description: "Removes snapshots from a VMware virtual machine",
    syntax: "Remove-Snapshot -Snapshot <string> [-RemoveChildren] [-Confirm <boolean>]",
    parameters: [
      { id: "snapshot", name: "Snapshot", type: "string", description: "Snapshot name or object", required: true },
      { id: "removechildren", name: "RemoveChildren", type: "switch", description: "Remove child snapshots", required: false, defaultValue: false },
      { id: "confirm", name: "Confirm", type: "boolean", description: "Confirm action", required: false, defaultValue: false }
    ],
    example: 'Remove-Snapshot -Snapshot "PreUpdate" -Confirm:$false'
  },
  {
    id: "get-vmhost",
    name: "Get-VMHost",
    category: "VMware",
    description: "Gets ESXi hosts from vCenter",
    syntax: "Get-VMHost [-Name <string>] [-Location <string>] [-State <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Host name pattern", required: false },
      { id: "location", name: "Location", type: "string", description: "Datacenter or cluster", required: false },
      { id: "state", name: "State", type: "select", description: "Host connection state", required: false, options: ["Connected", "Disconnected", "Maintenance", "NotResponding"] }
    ],
    example: 'Get-VMHost -State "Connected"'
  },
  {
    id: "get-datastore",
    name: "Get-Datastore",
    category: "VMware",
    description: "Gets datastores from vCenter",
    syntax: "Get-Datastore [-Name <string>] [-Location <string>] [-VMHost <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Datastore name pattern", required: false },
      { id: "location", name: "Location", type: "string", description: "Datacenter or folder", required: false },
      { id: "vmhost", name: "VMHost", type: "string", description: "ESXi host", required: false }
    ],
    example: 'Get-Datastore -Name "Production*"'
  },
  {
    id: "get-cluster-vmware",
    name: "Get-Cluster",
    category: "VMware",
    description: "Gets VMware clusters from vCenter",
    syntax: "Get-Cluster [-Name <string>] [-Location <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Cluster name pattern", required: false },
      { id: "location", name: "Location", type: "string", description: "Datacenter location", required: false }
    ],
    example: 'Get-Cluster -Name "Production-Cluster"'
  },
  {
    id: "move-vm-vmware",
    name: "Move-VM",
    category: "VMware",
    description: "Moves a VM to another host, datastore, or resource pool",
    syntax: "Move-VM -VM <string> [-Destination <string>] [-Datastore <string>] [-DiskStorageFormat <string>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "destination", name: "Destination", type: "string", description: "Destination host, cluster, or resource pool", required: false },
      { id: "datastore", name: "Datastore", type: "string", description: "Destination datastore", required: false },
      { id: "diskstorageformat", name: "DiskStorageFormat", type: "select", description: "Disk format", required: false, options: ["Thin", "Thick", "EagerZeroedThick"] }
    ],
    example: 'Move-VM -VM "WebServer01" -Destination "ESXi-Host02" -Datastore "SAN-Datastore"'
  },
  {
    id: "set-vm-vmware",
    name: "Set-VM",
    category: "VMware",
    description: "Modifies the configuration of a VMware virtual machine",
    syntax: "Set-VM -VM <string> [-Name <string>] [-MemoryGB <int>] [-NumCpu <int>] [-Notes <string>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "name", name: "Name", type: "string", description: "New VM name", required: false },
      { id: "memorygb", name: "MemoryGB", type: "int", description: "Memory in GB", required: false },
      { id: "numcpu", name: "NumCpu", type: "int", description: "Number of CPUs", required: false },
      { id: "notes", name: "Notes", type: "string", description: "VM notes", required: false }
    ],
    example: 'Set-VM -VM "WebServer01" -MemoryGB 16 -NumCpu 4'
  },
  {
    id: "get-networkadapter-vmware",
    name: "Get-NetworkAdapter",
    category: "VMware",
    description: "Gets network adapters of a VMware virtual machine",
    syntax: "Get-NetworkAdapter -VM <string> [-Name <string>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "name", name: "Name", type: "string", description: "Adapter name", required: false }
    ],
    example: 'Get-NetworkAdapter -VM "WebServer01"'
  },
  {
    id: "set-networkadapter-vmware",
    name: "Set-NetworkAdapter",
    category: "VMware",
    description: "Modifies the configuration of a VM network adapter",
    syntax: "Set-NetworkAdapter -NetworkAdapter <string> [-NetworkName <string>] [-Connected <boolean>] [-StartConnected <boolean>]",
    parameters: [
      { id: "networkadapter", name: "NetworkAdapter", type: "string", description: "Network adapter object", required: true },
      { id: "networkname", name: "NetworkName", type: "string", description: "Port group or network name", required: false },
      { id: "connected", name: "Connected", type: "boolean", description: "Connection state", required: false },
      { id: "startconnected", name: "StartConnected", type: "boolean", description: "Connect at power on", required: false }
    ],
    example: 'Set-NetworkAdapter -NetworkAdapter $nic -NetworkName "Production-VLAN"'
  },
  {
    id: "get-harddisk-vmware",
    name: "Get-HardDisk",
    category: "VMware",
    description: "Gets hard disks attached to a VMware virtual machine",
    syntax: "Get-HardDisk -VM <string> [-Name <string>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "name", name: "Name", type: "string", description: "Hard disk name", required: false }
    ],
    example: 'Get-HardDisk -VM "WebServer01"'
  },
  {
    id: "new-harddisk-vmware",
    name: "New-HardDisk",
    category: "VMware",
    description: "Creates a new hard disk on a VMware virtual machine",
    syntax: "New-HardDisk -VM <string> -CapacityGB <int> [-Datastore <string>] [-StorageFormat <string>]",
    parameters: [
      { id: "vm", name: "VM", type: "string", description: "VM name or object", required: true },
      { id: "capacitygb", name: "CapacityGB", type: "int", description: "Disk capacity in GB", required: true },
      { id: "datastore", name: "Datastore", type: "string", description: "Datastore name", required: false },
      { id: "storageformat", name: "StorageFormat", type: "select", description: "Disk format", required: false, options: ["Thin", "Thick", "EagerZeroedThick"] }
    ],
    example: 'New-HardDisk -VM "WebServer01" -CapacityGB 100 -StorageFormat "Thin"'
  },

  // ===================================
  // DOCKER CMDLETS
  // ===================================
  {
    id: "get-container",
    name: "Get-Container",
    category: "Docker",
    description: "Gets Docker containers",
    syntax: "Get-Container [-Name <string>] [-All]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Container name", required: false },
      { id: "all", name: "All", type: "switch", description: "Include stopped containers", required: false, defaultValue: false }
    ],
    example: 'Get-Container -All'
  },
  {
    id: "start-container",
    name: "Start-Container",
    category: "Docker",
    description: "Starts a Docker container",
    syntax: "Start-Container -Name <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Container name", required: true }
    ],
    example: 'Start-Container -Name "webapp"'
  },
  {
    id: "stop-container",
    name: "Stop-Container",
    category: "Docker",
    description: "Stops a Docker container",
    syntax: "Stop-Container -Name <string> [-Force]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Container name", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force stop", required: false, defaultValue: false }
    ],
    example: 'Stop-Container -Name "webapp" -Force'
  },
  {
    id: "new-container",
    name: "New-Container",
    category: "Docker",
    description: "Creates and runs a new Docker container",
    syntax: "New-Container -Image <string> [-Name <string>] [-Port <string>]",
    parameters: [
      { id: "image", name: "Image", type: "string", description: "Docker image", required: true },
      { id: "name", name: "Name", type: "string", description: "Container name", required: false },
      { id: "port", name: "Port", type: "string", description: "Port mapping (host:container)", required: false }
    ],
    example: 'New-Container -Image "nginx:latest" -Name "webserver" -Port "80:80"'
  },
  {
    id: "get-dockerimage",
    name: "Get-DockerImage",
    category: "Docker",
    description: "Gets Docker images on the local system",
    syntax: "Get-DockerImage [-Repository <string>] [-Tag <string>]",
    parameters: [
      { id: "repository", name: "Repository", type: "string", description: "Image repository name", required: false },
      { id: "tag", name: "Tag", type: "string", description: "Image tag", required: false }
    ],
    example: 'Get-DockerImage -Repository "nginx"'
  },
  {
    id: "remove-dockerimage",
    name: "Remove-DockerImage",
    category: "Docker",
    description: "Removes a Docker image from the local system",
    syntax: "Remove-DockerImage -ImageId <string> [-Force]",
    parameters: [
      { id: "imageid", name: "ImageId", type: "string", description: "Image ID or name:tag", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force removal", required: false, defaultValue: false }
    ],
    example: 'Remove-DockerImage -ImageId "nginx:latest" -Force'
  },
  {
    id: "get-dockernetwork",
    name: "Get-DockerNetwork",
    category: "Docker",
    description: "Gets Docker networks",
    syntax: "Get-DockerNetwork [-Name <string>] [-Driver <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Network name", required: false },
      { id: "driver", name: "Driver", type: "string", description: "Network driver", required: false }
    ],
    example: 'Get-DockerNetwork -Driver "bridge"'
  },
  {
    id: "new-dockernetwork",
    name: "New-DockerNetwork",
    category: "Docker",
    description: "Creates a new Docker network",
    syntax: "New-DockerNetwork -Name <string> [-Driver <string>] [-Subnet <string>] [-Gateway <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Network name", required: true },
      { id: "driver", name: "Driver", type: "select", description: "Network driver", required: false, options: ["bridge", "host", "overlay", "macvlan", "none"] },
      { id: "subnet", name: "Subnet", type: "string", description: "Subnet in CIDR format", required: false },
      { id: "gateway", name: "Gateway", type: "string", description: "Gateway IP address", required: false }
    ],
    example: 'New-DockerNetwork -Name "app-network" -Driver "bridge" -Subnet "172.20.0.0/16"'
  },
  {
    id: "remove-dockernetwork",
    name: "Remove-DockerNetwork",
    category: "Docker",
    description: "Removes a Docker network",
    syntax: "Remove-DockerNetwork -Name <string> [-Force]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Network name", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force removal", required: false, defaultValue: false }
    ],
    example: 'Remove-DockerNetwork -Name "app-network"'
  },
  {
    id: "get-dockervolume",
    name: "Get-DockerVolume",
    category: "Docker",
    description: "Gets Docker volumes",
    syntax: "Get-DockerVolume [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Volume name", required: false }
    ],
    example: 'Get-DockerVolume'
  },
  {
    id: "new-dockervolume",
    name: "New-DockerVolume",
    category: "Docker",
    description: "Creates a new Docker volume",
    syntax: "New-DockerVolume -Name <string> [-Driver <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Volume name", required: true },
      { id: "driver", name: "Driver", type: "string", description: "Volume driver", required: false, defaultValue: "local" }
    ],
    example: 'New-DockerVolume -Name "data-volume"'
  },
  {
    id: "invoke-dockerbuild",
    name: "Invoke-DockerBuild",
    category: "Docker",
    description: "Builds a Docker image from a Dockerfile",
    syntax: "Invoke-DockerBuild -Path <string> -Tag <string> [-NoCache] [-BuildArg <string[]>]",
    parameters: [
      { id: "path", name: "Path", type: "path", description: "Path to Dockerfile directory", required: true },
      { id: "tag", name: "Tag", type: "string", description: "Image name and tag", required: true },
      { id: "nocache", name: "NoCache", type: "switch", description: "Do not use cache", required: false, defaultValue: false },
      { id: "buildarg", name: "BuildArg", type: "array", description: "Build arguments", required: false }
    ],
    example: 'Invoke-DockerBuild -Path "./app" -Tag "myapp:latest" -NoCache'
  },
  {
    id: "get-dockerlog",
    name: "Get-DockerLog",
    category: "Docker",
    description: "Gets logs from a Docker container",
    syntax: "Get-DockerLog -Container <string> [-Tail <int>] [-Follow] [-Since <string>]",
    parameters: [
      { id: "container", name: "Container", type: "string", description: "Container name or ID", required: true },
      { id: "tail", name: "Tail", type: "int", description: "Number of lines from end", required: false },
      { id: "follow", name: "Follow", type: "switch", description: "Follow log output", required: false, defaultValue: false },
      { id: "since", name: "Since", type: "string", description: "Show logs since timestamp", required: false }
    ],
    example: 'Get-DockerLog -Container "webapp" -Tail 100'
  },
  {
    id: "invoke-dockerexec",
    name: "Invoke-DockerExec",
    category: "Docker",
    description: "Executes a command inside a running Docker container",
    syntax: "Invoke-DockerExec -Container <string> -Command <string> [-Interactive] [-TTY]",
    parameters: [
      { id: "container", name: "Container", type: "string", description: "Container name or ID", required: true },
      { id: "command", name: "Command", type: "string", description: "Command to execute", required: true },
      { id: "interactive", name: "Interactive", type: "switch", description: "Keep STDIN open", required: false, defaultValue: false },
      { id: "tty", name: "TTY", type: "switch", description: "Allocate a pseudo-TTY", required: false, defaultValue: false }
    ],
    example: 'Invoke-DockerExec -Container "webapp" -Command "/bin/bash" -Interactive -TTY'
  },

  // ===================================
  // NUTANIX CMDLETS
  // ===================================
  {
    id: "get-ntnxvm",
    name: "Get-NTNXVirtualMachine",
    category: "Nutanix",
    description: "Gets Nutanix virtual machines",
    syntax: "Get-NTNXVirtualMachine [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VM name", required: false }
    ],
    example: 'Get-NTNXVirtualMachine'
  },
  {
    id: "set-ntnxvmpowerstate",
    name: "Set-NTNXVMPowerState",
    category: "Nutanix",
    description: "Sets power state of a Nutanix VM",
    syntax: "Set-NTNXVMPowerState -Uuid <string> -State <string>",
    parameters: [
      { id: "uuid", name: "Uuid", type: "string", description: "VM UUID", required: true },
      { id: "state", name: "State", type: "select", description: "Power state", required: true, options: ["ON", "OFF", "ACPI_SHUTDOWN", "ACPI_REBOOT"] }
    ],
    example: 'Set-NTNXVMPowerState -Uuid "vm-uuid" -State "ON"'
  },
  {
    id: "get-ntnxcluster",
    name: "Get-NTNXCluster",
    category: "Nutanix",
    description: "Gets Nutanix cluster information",
    syntax: "Get-NTNXCluster [-ClusterName <string>]",
    parameters: [
      { id: "clustername", name: "ClusterName", type: "string", description: "Cluster name", required: false }
    ],
    example: 'Get-NTNXCluster'
  },
  {
    id: "get-ntnxcontainer",
    name: "Get-NTNXContainer",
    category: "Nutanix",
    description: "Gets Nutanix storage containers",
    syntax: "Get-NTNXContainer [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Container name", required: false }
    ],
    example: 'Get-NTNXContainer -Name "default-container"'
  },
  {
    id: "new-ntnxvirtualmachine",
    name: "New-NTNXVirtualMachine",
    category: "Nutanix",
    description: "Creates a new Nutanix virtual machine",
    syntax: "New-NTNXVirtualMachine -Name <string> -MemoryMB <int> -NumVcpus <int> [-ContainerName <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VM name", required: true },
      { id: "memorymb", name: "MemoryMB", type: "int", description: "Memory in MB", required: true },
      { id: "numvcpus", name: "NumVcpus", type: "int", description: "Number of vCPUs", required: true },
      { id: "containername", name: "ContainerName", type: "string", description: "Storage container", required: false }
    ],
    example: 'New-NTNXVirtualMachine -Name "NewVM" -MemoryMB 4096 -NumVcpus 2'
  },
  {
    id: "remove-ntnxvirtualmachine",
    name: "Remove-NTNXVirtualMachine",
    category: "Nutanix",
    description: "Removes a Nutanix virtual machine",
    syntax: "Remove-NTNXVirtualMachine -Uuid <string> [-DeleteSnapshots]",
    parameters: [
      { id: "uuid", name: "Uuid", type: "string", description: "VM UUID", required: true },
      { id: "deletesnapshots", name: "DeleteSnapshots", type: "switch", description: "Delete associated snapshots", required: false, defaultValue: false }
    ],
    example: 'Remove-NTNXVirtualMachine -Uuid "vm-uuid" -DeleteSnapshots'
  },
  {
    id: "get-ntnxsnapshot",
    name: "Get-NTNXSnapshot",
    category: "Nutanix",
    description: "Gets Nutanix VM snapshots",
    syntax: "Get-NTNXSnapshot [-VmUuid <string>] [-SnapshotName <string>]",
    parameters: [
      { id: "vmuuid", name: "VmUuid", type: "string", description: "VM UUID", required: false },
      { id: "snapshotname", name: "SnapshotName", type: "string", description: "Snapshot name", required: false }
    ],
    example: 'Get-NTNXSnapshot -VmUuid "vm-uuid"'
  },
  {
    id: "new-ntnxsnapshot",
    name: "New-NTNXSnapshot",
    category: "Nutanix",
    description: "Creates a new Nutanix VM snapshot",
    syntax: "New-NTNXSnapshot -VmUuid <string> -SnapshotName <string>",
    parameters: [
      { id: "vmuuid", name: "VmUuid", type: "string", description: "VM UUID", required: true },
      { id: "snapshotname", name: "SnapshotName", type: "string", description: "Snapshot name", required: true }
    ],
    example: 'New-NTNXSnapshot -VmUuid "vm-uuid" -SnapshotName "PreUpdate"'
  },
  {
    id: "get-ntnxnetwork",
    name: "Get-NTNXNetwork",
    category: "Nutanix",
    description: "Gets Nutanix networks",
    syntax: "Get-NTNXNetwork [-Name <string>] [-VlanId <int>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Network name", required: false },
      { id: "vlanid", name: "VlanId", type: "int", description: "VLAN ID", required: false }
    ],
    example: 'Get-NTNXNetwork -VlanId 100'
  },

  // ===================================
  // CITRIX CMDLETS
  // ===================================
  {
    id: "get-brokerdesktopgroup",
    name: "Get-BrokerDesktopGroup",
    category: "Citrix",
    description: "Gets Citrix desktop groups",
    syntax: "Get-BrokerDesktopGroup [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Desktop group name", required: false }
    ],
    example: 'Get-BrokerDesktopGroup'
  },
  {
    id: "get-brokermachine",
    name: "Get-BrokerMachine",
    category: "Citrix",
    description: "Gets Citrix broker machines",
    syntax: "Get-BrokerMachine [-MachineName <string>] [-DesktopGroupName <string>]",
    parameters: [
      { id: "machinename", name: "MachineName", type: "string", description: "Machine name", required: false },
      { id: "desktopgroupname", name: "DesktopGroupName", type: "string", description: "Desktop group", required: false }
    ],
    example: 'Get-BrokerMachine -DesktopGroupName "Windows 11 Desktops"'
  },
  {
    id: "get-brokersession",
    name: "Get-BrokerSession",
    category: "Citrix",
    description: "Gets Citrix broker sessions",
    syntax: "Get-BrokerSession [-UserName <string>] [-MachineName <string>] [-SessionState <string>]",
    parameters: [
      { id: "username", name: "UserName", type: "string", description: "User name", required: false },
      { id: "machinename", name: "MachineName", type: "string", description: "Machine name", required: false },
      { id: "sessionstate", name: "SessionState", type: "select", description: "Session state", required: false, options: ["Active", "Connected", "Disconnected", "Unknown"] }
    ],
    example: 'Get-BrokerSession -SessionState "Active"'
  },
  {
    id: "stop-brokersession",
    name: "Stop-BrokerSession",
    category: "Citrix",
    description: "Terminates a Citrix broker session",
    syntax: "Stop-BrokerSession -InputObject <string> [-Force]",
    parameters: [
      { id: "inputobject", name: "InputObject", type: "string", description: "Session object or UID", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force session termination", required: false, defaultValue: false }
    ],
    example: 'Stop-BrokerSession -InputObject $session -Force'
  },
  {
    id: "get-brokercatalog",
    name: "Get-BrokerCatalog",
    category: "Citrix",
    description: "Gets Citrix machine catalogs",
    syntax: "Get-BrokerCatalog [-Name <string>] [-CatalogKind <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Catalog name", required: false },
      { id: "catalogkind", name: "CatalogKind", type: "select", description: "Catalog kind", required: false, options: ["PowerManaged", "Unmanaged", "PvsPvd", "Mcs"] }
    ],
    example: 'Get-BrokerCatalog -CatalogKind "Mcs"'
  },
  {
    id: "new-brokercatalog",
    name: "New-BrokerCatalog",
    category: "Citrix",
    description: "Creates a new Citrix machine catalog",
    syntax: "New-BrokerCatalog -Name <string> -CatalogKind <string> -AllocationType <string> -PersistUserChanges <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Catalog name", required: true },
      { id: "catalogkind", name: "CatalogKind", type: "select", description: "Catalog kind", required: true, options: ["PowerManaged", "Unmanaged", "PvsPvd", "Mcs"] },
      { id: "allocationtype", name: "AllocationType", type: "select", description: "Allocation type", required: true, options: ["Static", "Random", "Permanent"] },
      { id: "persistuserchanges", name: "PersistUserChanges", type: "select", description: "User changes persistence", required: true, options: ["OnLocal", "OnPvd", "Discard"] }
    ],
    example: 'New-BrokerCatalog -Name "Windows11-VDI" -CatalogKind "Mcs" -AllocationType "Random" -PersistUserChanges "Discard"'
  },
  {
    id: "get-brokerapplication",
    name: "Get-BrokerApplication",
    category: "Citrix",
    description: "Gets Citrix published applications",
    syntax: "Get-BrokerApplication [-Name <string>] [-DesktopGroupName <string>] [-Enabled <boolean>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Application name", required: false },
      { id: "desktopgroupname", name: "DesktopGroupName", type: "string", description: "Desktop group", required: false },
      { id: "enabled", name: "Enabled", type: "boolean", description: "Enabled status", required: false }
    ],
    example: 'Get-BrokerApplication -Enabled $true'
  },
  {
    id: "new-brokerapplication",
    name: "New-BrokerApplication",
    category: "Citrix",
    description: "Creates a new Citrix published application",
    syntax: "New-BrokerApplication -Name <string> -DesktopGroup <string> -CommandLineExecutable <string> [-WorkingDirectory <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Application name", required: true },
      { id: "desktopgroup", name: "DesktopGroup", type: "string", description: "Desktop group", required: true },
      { id: "commandlineexecutable", name: "CommandLineExecutable", type: "string", description: "Path to executable", required: true },
      { id: "workingdirectory", name: "WorkingDirectory", type: "string", description: "Working directory", required: false }
    ],
    example: 'New-BrokerApplication -Name "Notepad" -DesktopGroup "Apps" -CommandLineExecutable "C:\\Windows\\notepad.exe"'
  },
  {
    id: "get-brokeruser",
    name: "Get-BrokerUser",
    category: "Citrix",
    description: "Gets Citrix broker users with entitlements",
    syntax: "Get-BrokerUser [-Name <string>] [-SID <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "User name (DOMAIN\\User format)", required: false },
      { id: "sid", name: "SID", type: "string", description: "User SID", required: false }
    ],
    example: 'Get-BrokerUser -Name "DOMAIN\\jdoe"'
  },

  // ===================================
  // VEEAM CMDLETS
  // ===================================
  {
    id: "get-vbrjob",
    name: "Get-VBRJob",
    category: "Veeam",
    description: "Gets Veeam backup jobs",
    syntax: "Get-VBRJob [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Job name", required: false }
    ],
    example: 'Get-VBRJob'
  },
  {
    id: "start-vbrjob",
    name: "Start-VBRJob",
    category: "Veeam",
    description: "Starts a Veeam backup job",
    syntax: "Start-VBRJob -Job <string> [-RunAsync]",
    parameters: [
      { id: "job", name: "Job", type: "string", description: "Job name", required: true },
      { id: "runasync", name: "RunAsync", type: "switch", description: "Run asynchronously", required: false, defaultValue: false }
    ],
    example: 'Start-VBRJob -Job "Daily Backup" -RunAsync'
  },
  {
    id: "get-vbrbackup",
    name: "Get-VBRBackup",
    category: "Veeam",
    description: "Gets Veeam backups",
    syntax: "Get-VBRBackup [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Backup name", required: false }
    ],
    example: 'Get-VBRBackup'
  },
  {
    id: "stop-vbrjob",
    name: "Stop-VBRJob",
    category: "Veeam",
    description: "Stops a running Veeam backup job",
    syntax: "Stop-VBRJob -Job <string> [-Force]",
    parameters: [
      { id: "job", name: "Job", type: "string", description: "Job name or object", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force stop without waiting", required: false, defaultValue: false }
    ],
    example: 'Stop-VBRJob -Job "Daily Backup" -Force'
  },
  {
    id: "get-vbrsession",
    name: "Get-VBRSession",
    category: "Veeam",
    description: "Gets Veeam backup session information",
    syntax: "Get-VBRSession [-Job <string>] [-State <string>]",
    parameters: [
      { id: "job", name: "Job", type: "string", description: "Job name", required: false },
      { id: "state", name: "State", type: "select", description: "Session state", required: false, options: ["Running", "Success", "Failed", "Warning", "Pending"] }
    ],
    example: 'Get-VBRSession -State "Running"'
  },
  {
    id: "get-vbrrestorepoint",
    name: "Get-VBRRestorePoint",
    category: "Veeam",
    description: "Gets Veeam restore points for a backup",
    syntax: "Get-VBRRestorePoint [-Backup <string>] [-Name <string>]",
    parameters: [
      { id: "backup", name: "Backup", type: "string", description: "Backup name or object", required: false },
      { id: "name", name: "Name", type: "string", description: "VM name", required: false }
    ],
    example: 'Get-VBRRestorePoint -Backup "Daily Backup"'
  },
  {
    id: "start-vbrrestorevm",
    name: "Start-VBRRestoreVM",
    category: "Veeam",
    description: "Starts a Veeam VM restore operation",
    syntax: "Start-VBRRestoreVM -RestorePoint <string> [-PowerOn] [-Reason <string>]",
    parameters: [
      { id: "restorepoint", name: "RestorePoint", type: "string", description: "Restore point object", required: true },
      { id: "poweron", name: "PowerOn", type: "switch", description: "Power on VM after restore", required: false, defaultValue: false },
      { id: "reason", name: "Reason", type: "string", description: "Restore reason", required: false }
    ],
    example: 'Start-VBRRestoreVM -RestorePoint $restorePoint -PowerOn -Reason "Disaster recovery"'
  },
  {
    id: "get-vbrrepository",
    name: "Get-VBRRepository",
    category: "Veeam",
    description: "Gets Veeam backup repositories",
    syntax: "Get-VBRRepository [-Name <string>] [-Type <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Repository name", required: false },
      { id: "type", name: "Type", type: "select", description: "Repository type", required: false, options: ["Windows", "Linux", "SMB", "NFS", "Object", "Dedup"] }
    ],
    example: 'Get-VBRRepository -Type "Windows"'
  },
  {
    id: "get-vbrserver",
    name: "Get-VBRServer",
    category: "Veeam",
    description: "Gets servers registered in Veeam Backup & Replication",
    syntax: "Get-VBRServer [-Name <string>] [-Type <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Server name", required: false },
      { id: "type", name: "Type", type: "select", description: "Server type", required: false, options: ["VC", "ESXi", "HvHost", "HvCluster", "Windows", "Linux"] }
    ],
    example: 'Get-VBRServer -Type "VC"'
  },

  // ===================================
  // NETAPP CMDLETS
  // ===================================
  {
    id: "get-ncvol",
    name: "Get-NcVol",
    category: "NetApp",
    description: "Gets NetApp volumes",
    syntax: "Get-NcVol [-Name <string>] [-Vserver <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Volume name", required: false },
      { id: "vserver", name: "Vserver", type: "string", description: "Vserver name", required: false }
    ],
    example: 'Get-NcVol -Vserver "svm01"'
  },
  {
    id: "new-ncvol",
    name: "New-NcVol",
    category: "NetApp",
    description: "Creates a new NetApp volume",
    syntax: "New-NcVol -Name <string> -Aggregate <string> -Size <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Volume name", required: true },
      { id: "aggregate", name: "Aggregate", type: "string", description: "Aggregate name", required: true },
      { id: "size", name: "Size", type: "string", description: "Volume size", required: true }
    ],
    example: 'New-NcVol -Name "data_vol1" -Aggregate "aggr1" -Size "100g"'
  },
  {
    id: "get-ncsnapshot",
    name: "Get-NcSnapshot",
    category: "NetApp",
    description: "Gets NetApp volume snapshots",
    syntax: "Get-NcSnapshot -Volume <string> [-Snapshot <string>] [-Vserver <string>]",
    parameters: [
      { id: "volume", name: "Volume", type: "string", description: "Volume name", required: true },
      { id: "snapshot", name: "Snapshot", type: "string", description: "Snapshot name", required: false },
      { id: "vserver", name: "Vserver", type: "string", description: "Vserver name", required: false }
    ],
    example: 'Get-NcSnapshot -Volume "data_vol1"'
  },
  {
    id: "new-ncsnapshot",
    name: "New-NcSnapshot",
    category: "NetApp",
    description: "Creates a new NetApp volume snapshot",
    syntax: "New-NcSnapshot -Volume <string> -Snapshot <string> [-Vserver <string>] [-Comment <string>]",
    parameters: [
      { id: "volume", name: "Volume", type: "string", description: "Volume name", required: true },
      { id: "snapshot", name: "Snapshot", type: "string", description: "Snapshot name", required: true },
      { id: "vserver", name: "Vserver", type: "string", description: "Vserver name", required: false },
      { id: "comment", name: "Comment", type: "string", description: "Snapshot comment", required: false }
    ],
    example: 'New-NcSnapshot -Volume "data_vol1" -Snapshot "backup_snap"'
  },
  {
    id: "remove-ncsnapshot",
    name: "Remove-NcSnapshot",
    category: "NetApp",
    description: "Removes a NetApp volume snapshot",
    syntax: "Remove-NcSnapshot -Volume <string> -Snapshot <string> [-Vserver <string>]",
    parameters: [
      { id: "volume", name: "Volume", type: "string", description: "Volume name", required: true },
      { id: "snapshot", name: "Snapshot", type: "string", description: "Snapshot name", required: true },
      { id: "vserver", name: "Vserver", type: "string", description: "Vserver name", required: false }
    ],
    example: 'Remove-NcSnapshot -Volume "data_vol1" -Snapshot "old_snap"'
  },
  {
    id: "get-nclun",
    name: "Get-NcLun",
    category: "NetApp",
    description: "Gets NetApp LUNs",
    syntax: "Get-NcLun [-Path <string>] [-Vserver <string>]",
    parameters: [
      { id: "path", name: "Path", type: "string", description: "LUN path", required: false },
      { id: "vserver", name: "Vserver", type: "string", description: "Vserver name", required: false }
    ],
    example: 'Get-NcLun -Vserver "svm01"'
  },
  {
    id: "new-nclun",
    name: "New-NcLun",
    category: "NetApp",
    description: "Creates a new NetApp LUN",
    syntax: "New-NcLun -Path <string> -Size <string> [-OsType <string>] [-Vserver <string>]",
    parameters: [
      { id: "path", name: "Path", type: "string", description: "LUN path", required: true },
      { id: "size", name: "Size", type: "string", description: "LUN size", required: true },
      { id: "ostype", name: "OsType", type: "select", description: "OS type", required: false, options: ["windows", "linux", "vmware", "hyper_v", "aix", "solaris"] },
      { id: "vserver", name: "Vserver", type: "string", description: "Vserver name", required: false }
    ],
    example: 'New-NcLun -Path "/vol/data_vol/lun1" -Size "100g" -OsType "windows"'
  },
  {
    id: "get-ncaggregate",
    name: "Get-NcAggregate",
    category: "NetApp",
    description: "Gets NetApp aggregates",
    syntax: "Get-NcAggregate [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Aggregate name", required: false }
    ],
    example: 'Get-NcAggregate'
  },
  {
    id: "get-ncvserver",
    name: "Get-NcVserver",
    category: "NetApp",
    description: "Gets NetApp Vservers (SVMs)",
    syntax: "Get-NcVserver [-Name <string>] [-VserverType <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Vserver name", required: false },
      { id: "vservertype", name: "VserverType", type: "select", description: "Vserver type", required: false, options: ["admin", "data", "node", "system"] }
    ],
    example: 'Get-NcVserver -VserverType "data"'
  },

  // ===================================
  // AWS CMDLETS
  // ===================================
  {
    id: "get-ec2instance",
    name: "Get-EC2Instance",
    category: "AWS",
    description: "Gets AWS EC2 instances",
    syntax: "Get-EC2Instance [-InstanceId <string[]>] [-Region <string>]",
    parameters: [
      { id: "instanceid", name: "InstanceId", type: "array", description: "Instance IDs", required: false },
      { id: "region", name: "Region", type: "string", description: "AWS region", required: false }
    ],
    example: 'Get-EC2Instance -Region "us-east-1"'
  },
  {
    id: "start-ec2instance",
    name: "Start-EC2Instance",
    category: "AWS",
    description: "Starts AWS EC2 instances",
    syntax: "Start-EC2Instance -InstanceId <string[]>",
    parameters: [
      { id: "instanceid", name: "InstanceId", type: "array", description: "Instance IDs to start", required: true }
    ],
    example: 'Start-EC2Instance -InstanceId "i-1234567890abcdef0"'
  },
  {
    id: "stop-ec2instance",
    name: "Stop-EC2Instance",
    category: "AWS",
    description: "Stops AWS EC2 instances",
    syntax: "Stop-EC2Instance -InstanceId <string[]> [-Force]",
    parameters: [
      { id: "instanceid", name: "InstanceId", type: "array", description: "Instance IDs to stop", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force stop", required: false, defaultValue: false }
    ],
    example: 'Stop-EC2Instance -InstanceId "i-1234567890abcdef0" -Force'
  },
  {
    id: "get-s3bucket",
    name: "Get-S3Bucket",
    category: "AWS",
    description: "Gets AWS S3 buckets",
    syntax: "Get-S3Bucket [-BucketName <string>]",
    parameters: [
      { id: "bucketname", name: "BucketName", type: "string", description: "Bucket name", required: false }
    ],
    example: 'Get-S3Bucket'
  },
  {
    id: "new-ec2instance",
    name: "New-EC2Instance",
    category: "AWS",
    description: "Launches new AWS EC2 instances",
    syntax: "New-EC2Instance -ImageId <string> -InstanceType <string> [-KeyName <string>] [-SecurityGroupId <string[]>] [-SubnetId <string>]",
    parameters: [
      { id: "imageid", name: "ImageId", type: "string", description: "AMI image ID", required: true },
      { id: "instancetype", name: "InstanceType", type: "string", description: "Instance type (e.g., t2.micro)", required: true },
      { id: "keyname", name: "KeyName", type: "string", description: "Key pair name", required: false },
      { id: "securitygroupid", name: "SecurityGroupId", type: "array", description: "Security group IDs", required: false },
      { id: "subnetid", name: "SubnetId", type: "string", description: "Subnet ID", required: false }
    ],
    example: 'New-EC2Instance -ImageId "ami-12345678" -InstanceType "t2.micro" -KeyName "my-keypair"'
  },
  {
    id: "get-ec2securitygroup",
    name: "Get-EC2SecurityGroup",
    category: "AWS",
    description: "Gets AWS EC2 security groups",
    syntax: "Get-EC2SecurityGroup [-GroupId <string[]>] [-GroupName <string[]>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "array", description: "Security group IDs", required: false },
      { id: "groupname", name: "GroupName", type: "array", description: "Security group names", required: false }
    ],
    example: 'Get-EC2SecurityGroup -GroupName "web-servers"'
  },
  {
    id: "new-ec2securitygroup",
    name: "New-EC2SecurityGroup",
    category: "AWS",
    description: "Creates a new AWS EC2 security group",
    syntax: "New-EC2SecurityGroup -GroupName <string> -Description <string> [-VpcId <string>]",
    parameters: [
      { id: "groupname", name: "GroupName", type: "string", description: "Security group name", required: true },
      { id: "description", name: "Description", type: "string", description: "Security group description", required: true },
      { id: "vpcid", name: "VpcId", type: "string", description: "VPC ID", required: false }
    ],
    example: 'New-EC2SecurityGroup -GroupName "web-sg" -Description "Web server security group" -VpcId "vpc-12345"'
  },
  {
    id: "get-iamuser",
    name: "Get-IAMUser",
    category: "AWS",
    description: "Gets AWS IAM users",
    syntax: "Get-IAMUser [-UserName <string>]",
    parameters: [
      { id: "username", name: "UserName", type: "string", description: "IAM user name", required: false }
    ],
    example: 'Get-IAMUser -UserName "admin-user"'
  },
  {
    id: "new-iamuser",
    name: "New-IAMUser",
    category: "AWS",
    description: "Creates a new AWS IAM user",
    syntax: "New-IAMUser -UserName <string> [-Path <string>] [-Tags <hashtable>]",
    parameters: [
      { id: "username", name: "UserName", type: "string", description: "IAM user name", required: true },
      { id: "path", name: "Path", type: "string", description: "Path for the user", required: false },
      { id: "tags", name: "Tags", type: "string", description: "Tags for the user", required: false }
    ],
    example: 'New-IAMUser -UserName "new-developer" -Path "/developers/"'
  },
  {
    id: "get-iamrole",
    name: "Get-IAMRole",
    category: "AWS",
    description: "Gets AWS IAM roles",
    syntax: "Get-IAMRole [-RoleName <string>]",
    parameters: [
      { id: "rolename", name: "RoleName", type: "string", description: "IAM role name", required: false }
    ],
    example: 'Get-IAMRole -RoleName "EC2AdminRole"'
  },
  {
    id: "get-lmbfunction",
    name: "Get-LMBFunction",
    category: "AWS",
    description: "Gets AWS Lambda functions",
    syntax: "Get-LMBFunction [-FunctionName <string>] [-Region <string>]",
    parameters: [
      { id: "functionname", name: "FunctionName", type: "string", description: "Lambda function name", required: false },
      { id: "region", name: "Region", type: "string", description: "AWS region", required: false }
    ],
    example: 'Get-LMBFunction -FunctionName "myLambdaFunction"'
  },
  {
    id: "invoke-lmbfunction",
    name: "Invoke-LMBFunction",
    category: "AWS",
    description: "Invokes an AWS Lambda function",
    syntax: "Invoke-LMBFunction -FunctionName <string> [-Payload <string>] [-InvocationType <string>]",
    parameters: [
      { id: "functionname", name: "FunctionName", type: "string", description: "Lambda function name", required: true },
      { id: "payload", name: "Payload", type: "string", description: "JSON payload", required: false },
      { id: "invocationtype", name: "InvocationType", type: "select", description: "Invocation type", required: false, options: ["RequestResponse", "Event", "DryRun"] }
    ],
    example: 'Invoke-LMBFunction -FunctionName "myLambdaFunction" -Payload \'{"key":"value"}\''
  },
  {
    id: "get-rdsdbinstance",
    name: "Get-RDSDBInstance",
    category: "AWS",
    description: "Gets AWS RDS database instances",
    syntax: "Get-RDSDBInstance [-DBInstanceIdentifier <string>] [-Region <string>]",
    parameters: [
      { id: "dbinstanceidentifier", name: "DBInstanceIdentifier", type: "string", description: "DB instance identifier", required: false },
      { id: "region", name: "Region", type: "string", description: "AWS region", required: false }
    ],
    example: 'Get-RDSDBInstance -DBInstanceIdentifier "production-db"'
  },
  {
    id: "get-ecscluster",
    name: "Get-ECSCluster",
    category: "AWS",
    description: "Gets AWS ECS clusters",
    syntax: "Get-ECSCluster [-ClusterName <string[]>] [-Region <string>]",
    parameters: [
      { id: "clustername", name: "ClusterName", type: "array", description: "Cluster names or ARNs", required: false },
      { id: "region", name: "Region", type: "string", description: "AWS region", required: false }
    ],
    example: 'Get-ECSCluster -ClusterName "production-cluster"'
  },

  // ===================================
  // GOOGLE CLOUD CMDLETS
  // ===================================
  {
    id: "get-gccomputeinstance",
    name: "Get-GcComputeInstance",
    category: "Google Cloud",
    description: "Gets Google Cloud compute instances",
    syntax: "Get-GcComputeInstance [-Project <string>] [-Zone <string>]",
    parameters: [
      { id: "project", name: "Project", type: "string", description: "GCP project ID", required: false },
      { id: "zone", name: "Zone", type: "string", description: "GCP zone", required: false }
    ],
    example: 'Get-GcComputeInstance -Project "my-project" -Zone "us-central1-a"'
  },
  {
    id: "start-gccomputeinstance",
    name: "Start-GcComputeInstance",
    category: "Google Cloud",
    description: "Starts a Google Cloud compute instance",
    syntax: "Start-GcComputeInstance -Name <string> -Zone <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Instance name", required: true },
      { id: "zone", name: "Zone", type: "string", description: "GCP zone", required: true }
    ],
    example: 'Start-GcComputeInstance -Name "web-server-1" -Zone "us-central1-a"'
  },
  {
    id: "stop-gccomputeinstance",
    name: "Stop-GcComputeInstance",
    category: "Google Cloud",
    description: "Stops a Google Cloud compute instance",
    syntax: "Stop-GcComputeInstance -Name <string> -Zone <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Instance name", required: true },
      { id: "zone", name: "Zone", type: "string", description: "GCP zone", required: true }
    ],
    example: 'Stop-GcComputeInstance -Name "web-server-1" -Zone "us-central1-a"'
  },
  {
    id: "new-gccomputeinstance",
    name: "New-GcComputeInstance",
    category: "Google Cloud",
    description: "Creates a new Google Cloud compute instance",
    syntax: "New-GcComputeInstance -Name <string> -Zone <string> -MachineType <string> [-Image <string>] [-DiskSizeGb <int>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Instance name", required: true },
      { id: "zone", name: "Zone", type: "string", description: "GCP zone", required: true },
      { id: "machinetype", name: "MachineType", type: "string", description: "Machine type (e.g., n1-standard-1)", required: true },
      { id: "image", name: "Image", type: "string", description: "Boot disk image", required: false },
      { id: "disksizegb", name: "DiskSizeGb", type: "int", description: "Boot disk size in GB", required: false, defaultValue: 10 }
    ],
    example: 'New-GcComputeInstance -Name "web-server-2" -Zone "us-central1-a" -MachineType "n1-standard-1"'
  },
  {
    id: "remove-gccomputeinstance",
    name: "Remove-GcComputeInstance",
    category: "Google Cloud",
    description: "Removes a Google Cloud compute instance",
    syntax: "Remove-GcComputeInstance -Name <string> -Zone <string> [-Force]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Instance name", required: true },
      { id: "zone", name: "Zone", type: "string", description: "GCP zone", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force removal without confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-GcComputeInstance -Name "web-server-1" -Zone "us-central1-a" -Force'
  },
  {
    id: "get-gcstoragebucket",
    name: "Get-GcStorageBucket",
    category: "Google Cloud",
    description: "Gets Google Cloud Storage buckets",
    syntax: "Get-GcStorageBucket [-Name <string>] [-Project <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Bucket name", required: false },
      { id: "project", name: "Project", type: "string", description: "GCP project ID", required: false }
    ],
    example: 'Get-GcStorageBucket -Project "my-project"'
  },
  {
    id: "new-gcstoragebucket",
    name: "New-GcStorageBucket",
    category: "Google Cloud",
    description: "Creates a new Google Cloud Storage bucket",
    syntax: "New-GcStorageBucket -Name <string> -Project <string> [-Location <string>] [-StorageClass <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Bucket name", required: true },
      { id: "project", name: "Project", type: "string", description: "GCP project ID", required: true },
      { id: "location", name: "Location", type: "string", description: "Bucket location", required: false },
      { id: "storageclass", name: "StorageClass", type: "select", description: "Storage class", required: false, options: ["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"] }
    ],
    example: 'New-GcStorageBucket -Name "my-bucket" -Project "my-project" -Location "US"'
  },
  {
    id: "get-gcsqlinstance",
    name: "Get-GcSqlInstance",
    category: "Google Cloud",
    description: "Gets Google Cloud SQL instances",
    syntax: "Get-GcSqlInstance [-Name <string>] [-Project <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Instance name", required: false },
      { id: "project", name: "Project", type: "string", description: "GCP project ID", required: false }
    ],
    example: 'Get-GcSqlInstance -Project "my-project"'
  },
  {
    id: "get-gcproject",
    name: "Get-GcProject",
    category: "Google Cloud",
    description: "Gets Google Cloud projects",
    syntax: "Get-GcProject [-ProjectId <string>]",
    parameters: [
      { id: "projectid", name: "ProjectId", type: "string", description: "Project ID", required: false }
    ],
    example: 'Get-GcProject'
  },
  {
    id: "get-gccomputezone",
    name: "Get-GcComputeZone",
    category: "Google Cloud",
    description: "Gets Google Cloud compute zones",
    syntax: "Get-GcComputeZone [-Project <string>] [-Region <string>]",
    parameters: [
      { id: "project", name: "Project", type: "string", description: "GCP project ID", required: false },
      { id: "region", name: "Region", type: "string", description: "GCP region filter", required: false }
    ],
    example: 'Get-GcComputeZone -Region "us-central1"'
  },

  // ===================================
  // CROWDSTRIKE CMDLETS
  // ===================================
  {
    id: "get-falconhost",
    name: "Get-FalconHost",
    category: "CrowdStrike",
    description: "Gets CrowdStrike Falcon hosts",
    syntax: "Get-FalconHost [-Filter <string>] [-Limit <int>]",
    parameters: [
      { id: "filter", name: "Filter", type: "string", description: "FQL filter", required: false },
      { id: "limit", name: "Limit", type: "int", description: "Result limit", required: false, defaultValue: 100 }
    ],
    example: 'Get-FalconHost -Filter "platform_name:\'Windows\'"'
  },
  {
    id: "invoke-falconrtr",
    name: "Invoke-FalconRtr",
    category: "CrowdStrike",
    description: "Invokes Real Time Response command",
    syntax: "Invoke-FalconRtr -Command <string> -HostId <string>",
    parameters: [
      { id: "command", name: "Command", type: "string", description: "RTR command", required: true },
      { id: "hostid", name: "HostId", type: "string", description: "Host ID", required: true }
    ],
    example: 'Invoke-FalconRtr -Command "runscript" -HostId "host-id"'
  },
  {
    id: "get-falcondetection",
    name: "Get-FalconDetection",
    category: "CrowdStrike",
    description: "Gets CrowdStrike Falcon detections",
    syntax: "Get-FalconDetection [-Filter <string>] [-Limit <int>] [-Sort <string>]",
    parameters: [
      { id: "filter", name: "Filter", type: "string", description: "FQL filter", required: false },
      { id: "limit", name: "Limit", type: "int", description: "Result limit", required: false, defaultValue: 100 },
      { id: "sort", name: "Sort", type: "string", description: "Sort order", required: false }
    ],
    example: 'Get-FalconDetection -Filter "status:\'new\'" -Limit 50'
  },
  {
    id: "get-falconincident",
    name: "Get-FalconIncident",
    category: "CrowdStrike",
    description: "Gets CrowdStrike Falcon incidents",
    syntax: "Get-FalconIncident [-Filter <string>] [-Limit <int>]",
    parameters: [
      { id: "filter", name: "Filter", type: "string", description: "FQL filter", required: false },
      { id: "limit", name: "Limit", type: "int", description: "Result limit", required: false, defaultValue: 100 }
    ],
    example: 'Get-FalconIncident -Filter "state:\'open\'"'
  },
  {
    id: "get-falconpolicy",
    name: "Get-FalconPolicy",
    category: "CrowdStrike",
    description: "Gets CrowdStrike Falcon prevention policies",
    syntax: "Get-FalconPolicy [-Id <string>] [-Filter <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Policy ID", required: false },
      { id: "filter", name: "Filter", type: "string", description: "FQL filter", required: false }
    ],
    example: 'Get-FalconPolicy -Filter "platform_name:\'Windows\'"'
  },
  {
    id: "get-falconsensor",
    name: "Get-FalconSensor",
    category: "CrowdStrike",
    description: "Gets CrowdStrike Falcon sensor information",
    syntax: "Get-FalconSensor [-Id <string>] [-Filter <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Sensor ID", required: false },
      { id: "filter", name: "Filter", type: "string", description: "FQL filter", required: false }
    ],
    example: 'Get-FalconSensor -Filter "platform_name:\'Windows\'"'
  },
  {
    id: "set-falconsensortag",
    name: "Set-FalconSensorTag",
    category: "CrowdStrike",
    description: "Sets tags on CrowdStrike Falcon sensors",
    syntax: "Set-FalconSensorTag -HostId <string> -Tags <string[]>",
    parameters: [
      { id: "hostid", name: "HostId", type: "string", description: "Host ID", required: true },
      { id: "tags", name: "Tags", type: "array", description: "Tags to apply", required: true }
    ],
    example: 'Set-FalconSensorTag -HostId "host-id" -Tags @("Production","Web-Server")'
  },
  {
    id: "get-falconquarantine",
    name: "Get-FalconQuarantine",
    category: "CrowdStrike",
    description: "Gets CrowdStrike Falcon quarantined files",
    syntax: "Get-FalconQuarantine [-Id <string>] [-Filter <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Quarantine ID", required: false },
      { id: "filter", name: "Filter", type: "string", description: "FQL filter", required: false }
    ],
    example: 'Get-FalconQuarantine -Filter "hostname:\'workstation-1\'"'
  },
  {
    id: "remove-falconquarantine",
    name: "Remove-FalconQuarantine",
    category: "CrowdStrike",
    description: "Releases files from CrowdStrike Falcon quarantine",
    syntax: "Remove-FalconQuarantine -Id <string[]> [-Comment <string>]",
    parameters: [
      { id: "id", name: "Id", type: "array", description: "Quarantine IDs", required: true },
      { id: "comment", name: "Comment", type: "string", description: "Release comment", required: false }
    ],
    example: 'Remove-FalconQuarantine -Id "quarantine-id" -Comment "False positive"'
  },

  // ===================================
  // SOPHOS CMDLETS
  // ===================================
  {
    id: "get-sophosendpoint",
    name: "Get-SophosEndpoint",
    category: "Sophos",
    description: "Gets Sophos managed endpoints",
    syntax: "Get-SophosEndpoint [-TenantId <string>]",
    parameters: [
      { id: "tenantid", name: "TenantId", type: "string", description: "Sophos tenant ID", required: false }
    ],
    example: 'Get-SophosEndpoint'
  },
  {
    id: "invoke-sophosscan",
    name: "Invoke-SophosScan",
    category: "Sophos",
    description: "Initiates a Sophos endpoint scan",
    syntax: "Invoke-SophosScan -EndpointId <string>",
    parameters: [
      { id: "endpointid", name: "EndpointId", type: "string", description: "Endpoint ID", required: true }
    ],
    example: 'Invoke-SophosScan -EndpointId "endpoint-guid"'
  },
  {
    id: "get-sophosalert",
    name: "Get-SophosAlert",
    category: "Sophos",
    description: "Gets Sophos Central alerts",
    syntax: "Get-SophosAlert [-TenantId <string>] [-Severity <string>] [-Category <string>]",
    parameters: [
      { id: "tenantid", name: "TenantId", type: "string", description: "Sophos tenant ID", required: false },
      { id: "severity", name: "Severity", type: "select", description: "Alert severity", required: false, options: ["low", "medium", "high", "critical"] },
      { id: "category", name: "Category", type: "string", description: "Alert category", required: false }
    ],
    example: 'Get-SophosAlert -Severity "high"'
  },
  {
    id: "set-sophosendpoint",
    name: "Set-SophosEndpoint",
    category: "Sophos",
    description: "Modifies Sophos endpoint settings",
    syntax: "Set-SophosEndpoint -EndpointId <string> [-TamperProtectionEnabled <bool>] [-LockdownEnabled <bool>]",
    parameters: [
      { id: "endpointid", name: "EndpointId", type: "string", description: "Endpoint ID", required: true },
      { id: "tamperprotectionenabled", name: "TamperProtectionEnabled", type: "switch", description: "Enable tamper protection", required: false },
      { id: "lockdownenabled", name: "LockdownEnabled", type: "switch", description: "Enable lockdown mode", required: false }
    ],
    example: 'Set-SophosEndpoint -EndpointId "endpoint-guid" -TamperProtectionEnabled $true'
  },
  {
    id: "get-sophospolicy",
    name: "Get-SophosPolicy",
    category: "Sophos",
    description: "Gets Sophos Central policies",
    syntax: "Get-SophosPolicy [-TenantId <string>] [-PolicyType <string>]",
    parameters: [
      { id: "tenantid", name: "TenantId", type: "string", description: "Sophos tenant ID", required: false },
      { id: "policytype", name: "PolicyType", type: "select", description: "Policy type", required: false, options: ["threat-protection", "peripheral-control", "application-control", "data-loss-prevention", "web-control"] }
    ],
    example: 'Get-SophosPolicy -PolicyType "threat-protection"'
  },
  {
    id: "get-sophosuser",
    name: "Get-SophosUser",
    category: "Sophos",
    description: "Gets Sophos Central users",
    syntax: "Get-SophosUser [-TenantId <string>] [-Id <string>] [-Email <string>]",
    parameters: [
      { id: "tenantid", name: "TenantId", type: "string", description: "Sophos tenant ID", required: false },
      { id: "id", name: "Id", type: "string", description: "User ID", required: false },
      { id: "email", name: "Email", type: "string", description: "User email", required: false }
    ],
    example: 'Get-SophosUser -Email "user@company.com"'
  },
  {
    id: "get-sophosthreat",
    name: "Get-SophosThreat",
    category: "Sophos",
    description: "Gets detected threats from Sophos Central",
    syntax: "Get-SophosThreat [-TenantId <string>] [-State <string>]",
    parameters: [
      { id: "tenantid", name: "TenantId", type: "string", description: "Sophos tenant ID", required: false },
      { id: "state", name: "State", type: "select", description: "Threat state", required: false, options: ["active", "cleaned", "quarantined", "not_cleaned"] }
    ],
    example: 'Get-SophosThreat -State "active"'
  },
  {
    id: "remove-sophosthreat",
    name: "Remove-SophosThreat",
    category: "Sophos",
    description: "Removes or cleans a detected threat",
    syntax: "Remove-SophosThreat -ThreatId <string> [-Action <string>]",
    parameters: [
      { id: "threatid", name: "ThreatId", type: "string", description: "Threat ID", required: true },
      { id: "action", name: "Action", type: "select", description: "Remediation action", required: false, options: ["clean", "delete", "quarantine"] }
    ],
    example: 'Remove-SophosThreat -ThreatId "threat-guid" -Action "clean"'
  },

  // ===================================
  // OKTA CMDLETS
  // ===================================
  {
    id: "get-oktauser",
    name: "Get-OktaUser",
    category: "Okta",
    description: "Gets Okta users",
    syntax: "Get-OktaUser [-Login <string>] [-Id <string>]",
    parameters: [
      { id: "login", name: "Login", type: "string", description: "User login/email", required: false },
      { id: "id", name: "Id", type: "string", description: "User ID", required: false }
    ],
    example: 'Get-OktaUser -Login "user@company.com"'
  },
  {
    id: "new-oktauser",
    name: "New-OktaUser",
    category: "Okta",
    description: "Creates a new Okta user",
    syntax: "New-OktaUser -Login <string> -FirstName <string> -LastName <string> -Email <string>",
    parameters: [
      { id: "login", name: "Login", type: "string", description: "User login", required: true },
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: true },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: true },
      { id: "email", name: "Email", type: "string", description: "Email address", required: true }
    ],
    example: 'New-OktaUser -Login "jdoe" -FirstName "John" -LastName "Doe" -Email "jdoe@company.com"'
  },
  {
    id: "suspend-oktauser",
    name: "Suspend-OktaUser",
    category: "Okta",
    description: "Suspends an Okta user",
    syntax: "Suspend-OktaUser -Id <string>",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "User ID", required: true }
    ],
    example: 'Suspend-OktaUser -Id "user-id"'
  },
  {
    id: "get-oktagroup",
    name: "Get-OktaGroup",
    category: "Okta",
    description: "Gets Okta groups",
    syntax: "Get-OktaGroup [-Id <string>] [-Query <string>] [-Filter <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Group ID", required: false },
      { id: "query", name: "Query", type: "string", description: "Search query", required: false },
      { id: "filter", name: "Filter", type: "string", description: "Filter expression", required: false }
    ],
    example: 'Get-OktaGroup -Query "IT Admins"'
  },
  {
    id: "new-oktagroup",
    name: "New-OktaGroup",
    category: "Okta",
    description: "Creates a new Okta group",
    syntax: "New-OktaGroup -Name <string> [-Description <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Group name", required: true },
      { id: "description", name: "Description", type: "string", description: "Group description", required: false }
    ],
    example: 'New-OktaGroup -Name "Marketing Team" -Description "Marketing department users"'
  },
  {
    id: "add-oktagroupmember",
    name: "Add-OktaGroupMember",
    category: "Okta",
    description: "Adds a user to an Okta group",
    syntax: "Add-OktaGroupMember -GroupId <string> -UserId <string>",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID", required: true },
      { id: "userid", name: "UserId", type: "string", description: "User ID", required: true }
    ],
    example: 'Add-OktaGroupMember -GroupId "group-id" -UserId "user-id"'
  },
  {
    id: "remove-oktagroupmember",
    name: "Remove-OktaGroupMember",
    category: "Okta",
    description: "Removes a user from an Okta group",
    syntax: "Remove-OktaGroupMember -GroupId <string> -UserId <string>",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID", required: true },
      { id: "userid", name: "UserId", type: "string", description: "User ID", required: true }
    ],
    example: 'Remove-OktaGroupMember -GroupId "group-id" -UserId "user-id"'
  },
  {
    id: "get-oktaapplication",
    name: "Get-OktaApplication",
    category: "Okta",
    description: "Gets Okta applications",
    syntax: "Get-OktaApplication [-Id <string>] [-Query <string>] [-Filter <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Application ID", required: false },
      { id: "query", name: "Query", type: "string", description: "Search query", required: false },
      { id: "filter", name: "Filter", type: "string", description: "Filter expression", required: false }
    ],
    example: 'Get-OktaApplication -Query "Salesforce"'
  },
  {
    id: "set-oktauser",
    name: "Set-OktaUser",
    category: "Okta",
    description: "Modifies an Okta user",
    syntax: "Set-OktaUser -Id <string> [-FirstName <string>] [-LastName <string>] [-Email <string>] [-Department <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "User ID", required: true },
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: false },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: false },
      { id: "email", name: "Email", type: "string", description: "Email address", required: false },
      { id: "department", name: "Department", type: "string", description: "Department", required: false }
    ],
    example: 'Set-OktaUser -Id "user-id" -Department "Engineering"'
  },
  {
    id: "reset-oktauserpassword",
    name: "Reset-OktaUserPassword",
    category: "Okta",
    description: "Resets an Okta user password",
    syntax: "Reset-OktaUserPassword -Id <string> [-SendEmail]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "User ID", required: true },
      { id: "sendemail", name: "SendEmail", type: "switch", description: "Send password reset email", required: false, defaultValue: true }
    ],
    example: 'Reset-OktaUserPassword -Id "user-id" -SendEmail'
  },
  {
    id: "unlock-oktauser",
    name: "Unlock-OktaUser",
    category: "Okta",
    description: "Unlocks an Okta user account",
    syntax: "Unlock-OktaUser -Id <string>",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "User ID", required: true }
    ],
    example: 'Unlock-OktaUser -Id "user-id"'
  },

  // ===================================
  // DUO SECURITY CMDLETS
  // ===================================
  {
    id: "get-duouser",
    name: "Get-DuoUser",
    category: "Duo Security",
    description: "Gets Duo Security users",
    syntax: "Get-DuoUser [-Username <string>]",
    parameters: [
      { id: "username", name: "Username", type: "string", description: "Username filter", required: false }
    ],
    example: 'Get-DuoUser -Username "jdoe"'
  },
  {
    id: "new-duouser",
    name: "New-DuoUser",
    category: "Duo Security",
    description: "Creates a new Duo Security user",
    syntax: "New-DuoUser -Username <string> [-Email <string>] [-RealName <string>]",
    parameters: [
      { id: "username", name: "Username", type: "string", description: "Username", required: true },
      { id: "email", name: "Email", type: "string", description: "Email address", required: false },
      { id: "realname", name: "RealName", type: "string", description: "Real name", required: false }
    ],
    example: 'New-DuoUser -Username "jdoe" -Email "jdoe@company.com" -RealName "John Doe"'
  },
  {
    id: "get-duophone",
    name: "Get-DuoPhone",
    category: "Duo Security",
    description: "Gets Duo Security phones",
    syntax: "Get-DuoPhone [-PhoneId <string>] [-Number <string>]",
    parameters: [
      { id: "phoneid", name: "PhoneId", type: "string", description: "Phone ID", required: false },
      { id: "number", name: "Number", type: "string", description: "Phone number", required: false }
    ],
    example: 'Get-DuoPhone -Number "+15551234567"'
  },
  {
    id: "new-duophone",
    name: "New-DuoPhone",
    category: "Duo Security",
    description: "Creates a new Duo Security phone",
    syntax: "New-DuoPhone -Number <string> -Type <string> [-Platform <string>] [-Name <string>]",
    parameters: [
      { id: "number", name: "Number", type: "string", description: "Phone number", required: true },
      { id: "type", name: "Type", type: "select", description: "Phone type", required: true, options: ["mobile", "landline"] },
      { id: "platform", name: "Platform", type: "select", description: "Phone platform", required: false, options: ["apple", "android", "windows", "blackberry", "unknown"] },
      { id: "name", name: "Name", type: "string", description: "Phone name", required: false }
    ],
    example: 'New-DuoPhone -Number "+15551234567" -Type "mobile" -Platform "apple"'
  },
  {
    id: "remove-duophone",
    name: "Remove-DuoPhone",
    category: "Duo Security",
    description: "Removes a Duo Security phone",
    syntax: "Remove-DuoPhone -PhoneId <string>",
    parameters: [
      { id: "phoneid", name: "PhoneId", type: "string", description: "Phone ID", required: true }
    ],
    example: 'Remove-DuoPhone -PhoneId "phone-id"'
  },
  {
    id: "get-duogroup",
    name: "Get-DuoGroup",
    category: "Duo Security",
    description: "Gets Duo Security groups",
    syntax: "Get-DuoGroup [-GroupId <string>]",
    parameters: [
      { id: "groupid", name: "GroupId", type: "string", description: "Group ID", required: false }
    ],
    example: 'Get-DuoGroup'
  },
  {
    id: "suspend-duouser",
    name: "Suspend-DuoUser",
    category: "Duo Security",
    description: "Suspends a Duo Security user",
    syntax: "Suspend-DuoUser -UserId <string>",
    parameters: [
      { id: "userid", name: "UserId", type: "string", description: "User ID", required: true }
    ],
    example: 'Suspend-DuoUser -UserId "user-id"'
  },
  {
    id: "enable-duouser",
    name: "Enable-DuoUser",
    category: "Duo Security",
    description: "Enables a Duo Security user",
    syntax: "Enable-DuoUser -UserId <string>",
    parameters: [
      { id: "userid", name: "UserId", type: "string", description: "User ID", required: true }
    ],
    example: 'Enable-DuoUser -UserId "user-id"'
  },
  {
    id: "get-duoauthenticationlog",
    name: "Get-DuoAuthenticationLog",
    category: "Duo Security",
    description: "Gets Duo Security authentication logs",
    syntax: "Get-DuoAuthenticationLog [-Mintime <int>] [-Maxtime <int>] [-Users <string[]>]",
    parameters: [
      { id: "mintime", name: "Mintime", type: "int", description: "Minimum timestamp (Unix epoch)", required: false },
      { id: "maxtime", name: "Maxtime", type: "int", description: "Maximum timestamp (Unix epoch)", required: false },
      { id: "users", name: "Users", type: "array", description: "User IDs to filter", required: false }
    ],
    example: 'Get-DuoAuthenticationLog -Mintime 1609459200'
  },

  // ===================================
  // FORTINET CMDLETS
  // ===================================
  {
    id: "get-fgtfirewall",
    name: "Get-FGTFirewallPolicy",
    category: "Fortinet",
    description: "Gets FortiGate firewall policies",
    syntax: "Get-FGTFirewallPolicy [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Policy name", required: false }
    ],
    example: 'Get-FGTFirewallPolicy'
  },
  {
    id: "get-fgtaddress",
    name: "Get-FGTFirewallAddress",
    category: "Fortinet",
    description: "Gets FortiGate firewall addresses",
    syntax: "Get-FGTFirewallAddress [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Address name", required: false }
    ],
    example: 'Get-FGTFirewallAddress'
  },
  {
    id: "new-fgtfirewallpolicy",
    name: "New-FGTFirewallPolicy",
    category: "Fortinet",
    description: "Creates a new FortiGate firewall policy",
    syntax: "New-FGTFirewallPolicy -Name <string> -SrcIntf <string> -DstIntf <string> -SrcAddr <string> -DstAddr <string> -Service <string> -Action <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Policy name", required: true },
      { id: "srcintf", name: "SrcIntf", type: "string", description: "Source interface", required: true },
      { id: "dstintf", name: "DstIntf", type: "string", description: "Destination interface", required: true },
      { id: "srcaddr", name: "SrcAddr", type: "string", description: "Source address", required: true },
      { id: "dstaddr", name: "DstAddr", type: "string", description: "Destination address", required: true },
      { id: "service", name: "Service", type: "string", description: "Service", required: true },
      { id: "action", name: "Action", type: "select", description: "Policy action", required: true, options: ["accept", "deny", "ipsec"] }
    ],
    example: 'New-FGTFirewallPolicy -Name "Allow-Web" -SrcIntf "lan" -DstIntf "wan1" -SrcAddr "all" -DstAddr "all" -Service "HTTP" -Action "accept"'
  },
  {
    id: "remove-fgtfirewallpolicy",
    name: "Remove-FGTFirewallPolicy",
    category: "Fortinet",
    description: "Removes a FortiGate firewall policy",
    syntax: "Remove-FGTFirewallPolicy -PolicyId <int> [-Confirm]",
    parameters: [
      { id: "policyid", name: "PolicyId", type: "int", description: "Policy ID", required: true },
      { id: "confirm", name: "Confirm", type: "switch", description: "Skip confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-FGTFirewallPolicy -PolicyId 5 -Confirm'
  },
  {
    id: "get-fgtfirewalladdressgroup",
    name: "Get-FGTFirewallAddressGroup",
    category: "Fortinet",
    description: "Gets FortiGate firewall address groups",
    syntax: "Get-FGTFirewallAddressGroup [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Address group name", required: false }
    ],
    example: 'Get-FGTFirewallAddressGroup -Name "web-servers"'
  },
  {
    id: "new-fgtfirewalladdress",
    name: "New-FGTFirewallAddress",
    category: "Fortinet",
    description: "Creates a new FortiGate firewall address object",
    syntax: "New-FGTFirewallAddress -Name <string> -Type <string> [-Subnet <string>] [-Fqdn <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Address name", required: true },
      { id: "type", name: "Type", type: "select", description: "Address type", required: true, options: ["ipmask", "fqdn", "iprange", "geography"] },
      { id: "subnet", name: "Subnet", type: "string", description: "Subnet (for ipmask type)", required: false },
      { id: "fqdn", name: "Fqdn", type: "string", description: "FQDN (for fqdn type)", required: false }
    ],
    example: 'New-FGTFirewallAddress -Name "WebServer" -Type "ipmask" -Subnet "192.168.1.10/32"'
  },
  {
    id: "get-fgtvipserver",
    name: "Get-FGTVIPServer",
    category: "Fortinet",
    description: "Gets FortiGate virtual IP servers",
    syntax: "Get-FGTVIPServer [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VIP name", required: false }
    ],
    example: 'Get-FGTVIPServer'
  },
  {
    id: "get-fgtsystem",
    name: "Get-FGTSystem",
    category: "Fortinet",
    description: "Gets FortiGate system information",
    syntax: "Get-FGTSystem [-Type <string>]",
    parameters: [
      { id: "type", name: "Type", type: "select", description: "System info type", required: false, options: ["status", "interface", "dns", "ntp", "admin", "global"] }
    ],
    example: 'Get-FGTSystem -Type "status"'
  },

  // ===================================
  // CISCO CMDLETS
  // ===================================
  {
    id: "get-ucsserver",
    name: "Get-UcsServer",
    category: "Cisco",
    description: "Gets Cisco UCS servers",
    syntax: "Get-UcsServer [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Server name", required: false }
    ],
    example: 'Get-UcsServer'
  },
  {
    id: "get-ucsblade",
    name: "Get-UcsBlade",
    category: "Cisco",
    description: "Gets Cisco UCS blade servers",
    syntax: "Get-UcsBlade [-Dn <string>]",
    parameters: [
      { id: "dn", name: "Dn", type: "string", description: "Distinguished name", required: false }
    ],
    example: 'Get-UcsBlade'
  },
  {
    id: "get-ucsserviceprofile",
    name: "Get-UcsServiceProfile",
    category: "Cisco",
    description: "Gets Cisco UCS service profiles",
    syntax: "Get-UcsServiceProfile [-Name <string>] [-Org <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Service profile name", required: false },
      { id: "org", name: "Org", type: "string", description: "Organization", required: false }
    ],
    example: 'Get-UcsServiceProfile -Name "ESXi-Host-01"'
  },
  {
    id: "new-ucsserviceprofile",
    name: "New-UcsServiceProfile",
    category: "Cisco",
    description: "Creates a new Cisco UCS service profile",
    syntax: "New-UcsServiceProfile -Name <string> -Org <string> [-SrcTempl <string>] [-Type <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Service profile name", required: true },
      { id: "org", name: "Org", type: "string", description: "Organization DN", required: true },
      { id: "srctempl", name: "SrcTempl", type: "string", description: "Source template", required: false },
      { id: "type", name: "Type", type: "select", description: "Profile type", required: false, options: ["initial-template", "updating-template", "instance"] }
    ],
    example: 'New-UcsServiceProfile -Name "ESXi-Host-02" -Org "org-root" -SrcTempl "ESXi-Template"'
  },
  {
    id: "get-ucsvlan",
    name: "Get-UcsVlan",
    category: "Cisco",
    description: "Gets Cisco UCS VLANs",
    syntax: "Get-UcsVlan [-Name <string>] [-Id <int>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VLAN name", required: false },
      { id: "id", name: "Id", type: "int", description: "VLAN ID", required: false }
    ],
    example: 'Get-UcsVlan'
  },
  {
    id: "new-ucsvlan",
    name: "New-UcsVlan",
    category: "Cisco",
    description: "Creates a new Cisco UCS VLAN",
    syntax: "New-UcsVlan -Name <string> -Id <int> [-Sharing <string>] [-DefaultNet <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "VLAN name", required: true },
      { id: "id", name: "Id", type: "int", description: "VLAN ID", required: true },
      { id: "sharing", name: "Sharing", type: "select", description: "VLAN sharing", required: false, options: ["none", "primary", "isolated", "community"] },
      { id: "defaultnet", name: "DefaultNet", type: "select", description: "Default network", required: false, options: ["yes", "no"] }
    ],
    example: 'New-UcsVlan -Name "Production" -Id 100'
  },
  {
    id: "get-ucsorg",
    name: "Get-UcsOrg",
    category: "Cisco",
    description: "Gets Cisco UCS organizations",
    syntax: "Get-UcsOrg [-Name <string>] [-Level <int>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Organization name", required: false },
      { id: "level", name: "Level", type: "int", description: "Organization level", required: false }
    ],
    example: 'Get-UcsOrg'
  },
  {
    id: "get-ucsfabricinterconnect",
    name: "Get-UcsFabricInterconnect",
    category: "Cisco",
    description: "Gets Cisco UCS fabric interconnects",
    syntax: "Get-UcsFabricInterconnect [-Id <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Fabric interconnect ID (A or B)", required: false }
    ],
    example: 'Get-UcsFabricInterconnect -Id "A"'
  },
  {
    id: "set-ucsblade",
    name: "Set-UcsBlade",
    category: "Cisco",
    description: "Modifies Cisco UCS blade settings",
    syntax: "Set-UcsBlade -Blade <object> [-UsrLbl <string>] [-AdminState <string>]",
    parameters: [
      { id: "dn", name: "Dn", type: "string", description: "Blade distinguished name", required: true },
      { id: "usrlbl", name: "UsrLbl", type: "string", description: "User label", required: false },
      { id: "adminstate", name: "AdminState", type: "select", description: "Admin state", required: false, options: ["acknowledged", "re-acknowledge", "removed", "un-acknowledged"] }
    ],
    example: 'Get-UcsBlade -Dn "sys/chassis-1/blade-1" | Set-UcsBlade -UsrLbl "Production-Server"'
  },

  // ===================================
  // GITHUB CMDLETS
  // ===================================
  {
    id: "get-githubrepository",
    name: "Get-GitHubRepository",
    category: "GitHub",
    description: "Gets GitHub repositories",
    syntax: "Get-GitHubRepository [-OwnerName <string>] [-RepositoryName <string>]",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: false },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: false }
    ],
    example: 'Get-GitHubRepository -OwnerName "microsoft" -RepositoryName "PowerShell"'
  },
  {
    id: "new-githubrepository",
    name: "New-GitHubRepository",
    category: "GitHub",
    description: "Creates a new GitHub repository",
    syntax: "New-GitHubRepository -RepositoryName <string> [-Description <string>] [-Private]",
    parameters: [
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "description", name: "Description", type: "string", description: "Repository description", required: false },
      { id: "private", name: "Private", type: "switch", description: "Create as private", required: false, defaultValue: false }
    ],
    example: 'New-GitHubRepository -RepositoryName "my-project" -Description "My new project" -Private'
  },
  {
    id: "get-githubissue",
    name: "Get-GitHubIssue",
    category: "GitHub",
    description: "Gets GitHub issues",
    syntax: "Get-GitHubIssue -OwnerName <string> -RepositoryName <string> [-State <string>]",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "state", name: "State", type: "select", description: "Issue state", required: false, options: ["open", "closed", "all"] }
    ],
    example: 'Get-GitHubIssue -OwnerName "microsoft" -RepositoryName "PowerShell" -State "open"'
  },
  {
    id: "get-githubpullrequest",
    name: "Get-GitHubPullRequest",
    category: "GitHub",
    description: "Gets GitHub pull requests",
    syntax: "Get-GitHubPullRequest -OwnerName <string> -RepositoryName <string> [-State <string>]",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "state", name: "State", type: "select", description: "PR state", required: false, options: ["open", "closed", "all"] }
    ],
    example: 'Get-GitHubPullRequest -OwnerName "microsoft" -RepositoryName "PowerShell" -State "open"'
  },
  {
    id: "new-githubpullrequest",
    name: "New-GitHubPullRequest",
    category: "GitHub",
    description: "Creates a new GitHub pull request",
    syntax: "New-GitHubPullRequest -OwnerName <string> -RepositoryName <string> -Title <string> -Head <string> -Base <string>",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "title", name: "Title", type: "string", description: "PR title", required: true },
      { id: "head", name: "Head", type: "string", description: "Source branch", required: true },
      { id: "base", name: "Base", type: "string", description: "Target branch", required: true }
    ],
    example: 'New-GitHubPullRequest -OwnerName "myorg" -RepositoryName "myrepo" -Title "Feature update" -Head "feature-branch" -Base "main"'
  },
  {
    id: "get-githubrelease",
    name: "Get-GitHubRelease",
    category: "GitHub",
    description: "Gets GitHub releases",
    syntax: "Get-GitHubRelease -OwnerName <string> -RepositoryName <string> [-Tag <string>]",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "tag", name: "Tag", type: "string", description: "Release tag", required: false }
    ],
    example: 'Get-GitHubRelease -OwnerName "microsoft" -RepositoryName "PowerShell" -Tag "v7.3.0"'
  },
  {
    id: "new-githubrelease",
    name: "New-GitHubRelease",
    category: "GitHub",
    description: "Creates a new GitHub release",
    syntax: "New-GitHubRelease -OwnerName <string> -RepositoryName <string> -Tag <string> -Name <string> [-Prerelease]",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "tag", name: "Tag", type: "string", description: "Release tag", required: true },
      { id: "name", name: "Name", type: "string", description: "Release name", required: true },
      { id: "prerelease", name: "Prerelease", type: "switch", description: "Mark as pre-release", required: false, defaultValue: false }
    ],
    example: 'New-GitHubRelease -OwnerName "myorg" -RepositoryName "myrepo" -Tag "v1.0.0" -Name "Version 1.0"'
  },
  {
    id: "get-githubbranch",
    name: "Get-GitHubBranch",
    category: "GitHub",
    description: "Gets GitHub repository branches",
    syntax: "Get-GitHubBranch -OwnerName <string> -RepositoryName <string> [-BranchName <string>]",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "branchname", name: "BranchName", type: "string", description: "Branch name", required: false }
    ],
    example: 'Get-GitHubBranch -OwnerName "microsoft" -RepositoryName "PowerShell"'
  },
  {
    id: "new-githubbranch",
    name: "New-GitHubBranch",
    category: "GitHub",
    description: "Creates a new GitHub branch",
    syntax: "New-GitHubBranch -OwnerName <string> -RepositoryName <string> -BranchName <string> -SourceBranch <string>",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "branchname", name: "BranchName", type: "string", description: "New branch name", required: true },
      { id: "sourcebranch", name: "SourceBranch", type: "string", description: "Source branch", required: true }
    ],
    example: 'New-GitHubBranch -OwnerName "myorg" -RepositoryName "myrepo" -BranchName "feature/new-feature" -SourceBranch "main"'
  },
  {
    id: "get-githubteam",
    name: "Get-GitHubTeam",
    category: "GitHub",
    description: "Gets GitHub organization teams",
    syntax: "Get-GitHubTeam -OrganizationName <string> [-TeamName <string>]",
    parameters: [
      { id: "organizationname", name: "OrganizationName", type: "string", description: "Organization name", required: true },
      { id: "teamname", name: "TeamName", type: "string", description: "Team name", required: false }
    ],
    example: 'Get-GitHubTeam -OrganizationName "myorg"'
  },
  {
    id: "invoke-githubworkflow",
    name: "Invoke-GitHubWorkflow",
    category: "GitHub",
    description: "Triggers a GitHub Actions workflow",
    syntax: "Invoke-GitHubWorkflow -OwnerName <string> -RepositoryName <string> -WorkflowId <string> -Ref <string>",
    parameters: [
      { id: "ownername", name: "OwnerName", type: "string", description: "Repository owner", required: true },
      { id: "repositoryname", name: "RepositoryName", type: "string", description: "Repository name", required: true },
      { id: "workflowid", name: "WorkflowId", type: "string", description: "Workflow file name or ID", required: true },
      { id: "ref", name: "Ref", type: "string", description: "Branch or tag reference", required: true }
    ],
    example: 'Invoke-GitHubWorkflow -OwnerName "myorg" -RepositoryName "myrepo" -WorkflowId "ci.yml" -Ref "main"'
  },

  // ===================================
  // SPLUNK CMDLETS
  // ===================================
  {
    id: "search-splunk",
    name: "Search-Splunk",
    category: "Splunk",
    description: "Searches Splunk events",
    syntax: "Search-Splunk -Query <string> [-Earliest <string>] [-Latest <string>]",
    parameters: [
      { id: "query", name: "Query", type: "string", description: "SPL query", required: true },
      { id: "earliest", name: "Earliest", type: "string", description: "Earliest time", required: false, defaultValue: "-24h" },
      { id: "latest", name: "Latest", type: "string", description: "Latest time", required: false, defaultValue: "now" }
    ],
    example: 'Search-Splunk -Query "index=main error" -Earliest "-1h"'
  },
  {
    id: "get-splunkindex",
    name: "Get-SplunkIndex",
    category: "Splunk",
    description: "Gets Splunk indexes",
    syntax: "Get-SplunkIndex [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Index name", required: false }
    ],
    example: 'Get-SplunkIndex'
  },
  {
    id: "get-splunkalert",
    name: "Get-SplunkAlert",
    category: "Splunk",
    description: "Gets Splunk fired alerts",
    syntax: "Get-SplunkAlert [-Name <string>] [-Severity <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Alert name", required: false },
      { id: "severity", name: "Severity", type: "select", description: "Alert severity", required: false, options: ["info", "low", "medium", "high", "critical"] }
    ],
    example: 'Get-SplunkAlert -Severity "high"'
  },
  {
    id: "new-splunksearch",
    name: "New-SplunkSearch",
    category: "Splunk",
    description: "Creates a new Splunk search job",
    syntax: "New-SplunkSearch -Query <string> [-Earliest <string>] [-Latest <string>] [-ExecMode <string>]",
    parameters: [
      { id: "query", name: "Query", type: "string", description: "SPL query", required: true },
      { id: "earliest", name: "Earliest", type: "string", description: "Earliest time", required: false, defaultValue: "-24h" },
      { id: "latest", name: "Latest", type: "string", description: "Latest time", required: false, defaultValue: "now" },
      { id: "execmode", name: "ExecMode", type: "select", description: "Execution mode", required: false, options: ["blocking", "oneshot", "normal"] }
    ],
    example: 'New-SplunkSearch -Query "index=security sourcetype=auth" -ExecMode "blocking"'
  },
  {
    id: "get-splunkjob",
    name: "Get-SplunkJob",
    category: "Splunk",
    description: "Gets Splunk search job status and results",
    syntax: "Get-SplunkJob [-Sid <string>] [-Status <string>]",
    parameters: [
      { id: "sid", name: "Sid", type: "string", description: "Search job ID", required: false },
      { id: "status", name: "Status", type: "select", description: "Job status filter", required: false, options: ["running", "paused", "done", "failed"] }
    ],
    example: 'Get-SplunkJob -Sid "1234567890.12345"'
  },
  {
    id: "remove-splunkjob",
    name: "Remove-SplunkJob",
    category: "Splunk",
    description: "Removes a Splunk search job",
    syntax: "Remove-SplunkJob -Sid <string> [-Force]",
    parameters: [
      { id: "sid", name: "Sid", type: "string", description: "Search job ID", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force removal without confirmation", required: false, defaultValue: false }
    ],
    example: 'Remove-SplunkJob -Sid "1234567890.12345" -Force'
  },
  {
    id: "get-splunksavedsearch",
    name: "Get-SplunkSavedSearch",
    category: "Splunk",
    description: "Gets Splunk saved searches",
    syntax: "Get-SplunkSavedSearch [-Name <string>] [-Owner <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Saved search name", required: false },
      { id: "owner", name: "Owner", type: "string", description: "Owner username", required: false }
    ],
    example: 'Get-SplunkSavedSearch -Name "Failed Logins"'
  },
  {
    id: "new-splunksavedsearch",
    name: "New-SplunkSavedSearch",
    category: "Splunk",
    description: "Creates a new Splunk saved search",
    syntax: "New-SplunkSavedSearch -Name <string> -Query <string> [-CronSchedule <string>] [-IsScheduled]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Saved search name", required: true },
      { id: "query", name: "Query", type: "string", description: "SPL query", required: true },
      { id: "cronschedule", name: "CronSchedule", type: "string", description: "Cron schedule expression", required: false },
      { id: "isscheduled", name: "IsScheduled", type: "switch", description: "Enable scheduling", required: false, defaultValue: false }
    ],
    example: 'New-SplunkSavedSearch -Name "Daily Security Report" -Query "index=security | stats count by src_ip" -CronSchedule "0 8 * * *" -IsScheduled'
  },

  // ===================================
  // JIRA CMDLETS
  // ===================================
  {
    id: "get-jiraissue",
    name: "Get-JiraIssue",
    category: "Jira",
    description: "Gets Jira issues",
    syntax: "Get-JiraIssue [-Key <string>] [-Query <string>]",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Issue key", required: false },
      { id: "query", name: "Query", type: "string", description: "JQL query", required: false }
    ],
    example: 'Get-JiraIssue -Key "PROJ-123"'
  },
  {
    id: "new-jiraissue",
    name: "New-JiraIssue",
    category: "Jira",
    description: "Creates a new Jira issue",
    syntax: "New-JiraIssue -Project <string> -IssueType <string> -Summary <string>",
    parameters: [
      { id: "project", name: "Project", type: "string", description: "Project key", required: true },
      { id: "issuetype", name: "IssueType", type: "string", description: "Issue type", required: true },
      { id: "summary", name: "Summary", type: "string", description: "Issue summary", required: true }
    ],
    example: 'New-JiraIssue -Project "PROJ" -IssueType "Bug" -Summary "Application crashes on startup"'
  },
  {
    id: "set-jiraissue",
    name: "Set-JiraIssue",
    category: "Jira",
    description: "Updates an existing Jira issue",
    syntax: "Set-JiraIssue -Key <string> [-Summary <string>] [-Description <string>] [-Assignee <string>]",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Issue key", required: true },
      { id: "summary", name: "Summary", type: "string", description: "New summary", required: false },
      { id: "description", name: "Description", type: "string", description: "New description", required: false },
      { id: "assignee", name: "Assignee", type: "string", description: "Assignee username", required: false }
    ],
    example: 'Set-JiraIssue -Key "PROJ-123" -Assignee "john.doe"'
  },
  {
    id: "get-jiraproject",
    name: "Get-JiraProject",
    category: "Jira",
    description: "Gets Jira projects",
    syntax: "Get-JiraProject [-Key <string>]",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Project key", required: false }
    ],
    example: 'Get-JiraProject -Key "PROJ"'
  },
  {
    id: "get-jirauser",
    name: "Get-JiraUser",
    category: "Jira",
    description: "Gets Jira users",
    syntax: "Get-JiraUser [-Username <string>] [-Email <string>]",
    parameters: [
      { id: "username", name: "Username", type: "string", description: "Username", required: false },
      { id: "email", name: "Email", type: "string", description: "User email", required: false }
    ],
    example: 'Get-JiraUser -Username "john.doe"'
  },
  {
    id: "get-jiracomment",
    name: "Get-JiraComment",
    category: "Jira",
    description: "Gets comments on a Jira issue",
    syntax: "Get-JiraComment -Key <string>",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Issue key", required: true }
    ],
    example: 'Get-JiraComment -Key "PROJ-123"'
  },
  {
    id: "add-jiracomment",
    name: "Add-JiraComment",
    category: "Jira",
    description: "Adds a comment to a Jira issue",
    syntax: "Add-JiraComment -Key <string> -Body <string>",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Issue key", required: true },
      { id: "body", name: "Body", type: "string", description: "Comment body", required: true }
    ],
    example: 'Add-JiraComment -Key "PROJ-123" -Body "Updated the configuration"'
  },
  {
    id: "get-jiratransition",
    name: "Get-JiraTransition",
    category: "Jira",
    description: "Gets available transitions for a Jira issue",
    syntax: "Get-JiraTransition -Key <string>",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Issue key", required: true }
    ],
    example: 'Get-JiraTransition -Key "PROJ-123"'
  },
  {
    id: "invoke-jiratransition",
    name: "Invoke-JiraTransition",
    category: "Jira",
    description: "Transitions a Jira issue to a new status",
    syntax: "Invoke-JiraTransition -Key <string> -TransitionId <int> [-Comment <string>]",
    parameters: [
      { id: "key", name: "Key", type: "string", description: "Issue key", required: true },
      { id: "transitionid", name: "TransitionId", type: "int", description: "Transition ID", required: true },
      { id: "comment", name: "Comment", type: "string", description: "Transition comment", required: false }
    ],
    example: 'Invoke-JiraTransition -Key "PROJ-123" -TransitionId 21 -Comment "Moving to Done"'
  },

  // ===================================
  // SLACK CMDLETS
  // ===================================
  {
    id: "send-slackmessage",
    name: "Send-SlackMessage",
    category: "Slack",
    description: "Sends a message to Slack",
    syntax: "Send-SlackMessage -Channel <string> -Message <string> [-Username <string>]",
    parameters: [
      { id: "channel", name: "Channel", type: "string", description: "Channel name or ID", required: true },
      { id: "message", name: "Message", type: "string", description: "Message text", required: true },
      { id: "username", name: "Username", type: "string", description: "Bot username", required: false }
    ],
    example: 'Send-SlackMessage -Channel "#general" -Message "Deployment complete!"'
  },
  {
    id: "get-slackchannel",
    name: "Get-SlackChannel",
    category: "Slack",
    description: "Gets Slack channels",
    syntax: "Get-SlackChannel [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Channel name", required: false }
    ],
    example: 'Get-SlackChannel'
  },
  {
    id: "get-slackuser",
    name: "Get-SlackUser",
    category: "Slack",
    description: "Gets Slack users",
    syntax: "Get-SlackUser [-UserId <string>] [-Email <string>]",
    parameters: [
      { id: "userid", name: "UserId", type: "string", description: "User ID", required: false },
      { id: "email", name: "Email", type: "string", description: "User email", required: false }
    ],
    example: 'Get-SlackUser -Email "john.doe@company.com"'
  },
  {
    id: "invoke-slackapi",
    name: "Invoke-SlackAPI",
    category: "Slack",
    description: "Invokes a Slack API method",
    syntax: "Invoke-SlackAPI -Method <string> [-Body <hashtable>]",
    parameters: [
      { id: "method", name: "Method", type: "string", description: "API method name", required: true },
      { id: "body", name: "Body", type: "string", description: "Request body as JSON", required: false }
    ],
    example: 'Invoke-SlackAPI -Method "users.list"'
  },
  {
    id: "new-slackchannel",
    name: "New-SlackChannel",
    category: "Slack",
    description: "Creates a new Slack channel",
    syntax: "New-SlackChannel -Name <string> [-IsPrivate]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Channel name", required: true },
      { id: "isprivate", name: "IsPrivate", type: "switch", description: "Create as private channel", required: false, defaultValue: false }
    ],
    example: 'New-SlackChannel -Name "project-alerts" -IsPrivate'
  },
  {
    id: "set-slackchannel",
    name: "Set-SlackChannel",
    category: "Slack",
    description: "Updates a Slack channel",
    syntax: "Set-SlackChannel -ChannelId <string> [-Topic <string>] [-Purpose <string>]",
    parameters: [
      { id: "channelid", name: "ChannelId", type: "string", description: "Channel ID", required: true },
      { id: "topic", name: "Topic", type: "string", description: "Channel topic", required: false },
      { id: "purpose", name: "Purpose", type: "string", description: "Channel purpose", required: false }
    ],
    example: 'Set-SlackChannel -ChannelId "C1234567890" -Topic "DevOps Alerts"'
  },
  {
    id: "get-slackmessage",
    name: "Get-SlackMessage",
    category: "Slack",
    description: "Gets messages from a Slack channel",
    syntax: "Get-SlackMessage -ChannelId <string> [-Limit <int>] [-Oldest <string>]",
    parameters: [
      { id: "channelid", name: "ChannelId", type: "string", description: "Channel ID", required: true },
      { id: "limit", name: "Limit", type: "int", description: "Max messages to return", required: false, defaultValue: 100 },
      { id: "oldest", name: "Oldest", type: "string", description: "Oldest message timestamp", required: false }
    ],
    example: 'Get-SlackMessage -ChannelId "C1234567890" -Limit 50'
  },
  {
    id: "remove-slackmessage",
    name: "Remove-SlackMessage",
    category: "Slack",
    description: "Deletes a Slack message",
    syntax: "Remove-SlackMessage -ChannelId <string> -Timestamp <string>",
    parameters: [
      { id: "channelid", name: "ChannelId", type: "string", description: "Channel ID", required: true },
      { id: "timestamp", name: "Timestamp", type: "string", description: "Message timestamp", required: true }
    ],
    example: 'Remove-SlackMessage -ChannelId "C1234567890" -Timestamp "1234567890.123456"'
  },

  // ===================================
  // ZOOM CMDLETS
  // ===================================
  {
    id: "get-zoomuser",
    name: "Get-ZoomUser",
    category: "Zoom",
    description: "Gets Zoom users",
    syntax: "Get-ZoomUser [-UserId <string>] [-Status <string>]",
    parameters: [
      { id: "userid", name: "UserId", type: "string", description: "User ID or email", required: false },
      { id: "status", name: "Status", type: "select", description: "User status", required: false, options: ["active", "inactive", "pending"] }
    ],
    example: 'Get-ZoomUser -Status "active"'
  },
  {
    id: "new-zoommeeting",
    name: "New-ZoomMeeting",
    category: "Zoom",
    description: "Creates a new Zoom meeting",
    syntax: "New-ZoomMeeting -UserId <string> -Topic <string> [-Type <int>]",
    parameters: [
      { id: "userid", name: "UserId", type: "string", description: "Host user ID", required: true },
      { id: "topic", name: "Topic", type: "string", description: "Meeting topic", required: true },
      { id: "type", name: "Type", type: "select", description: "Meeting type", required: false, options: ["1", "2", "3", "8"] }
    ],
    example: 'New-ZoomMeeting -UserId "user@company.com" -Topic "Team Standup" -Type 2'
  },
  {
    id: "get-zoommeeting",
    name: "Get-ZoomMeeting",
    category: "Zoom",
    description: "Gets Zoom meetings",
    syntax: "Get-ZoomMeeting [-MeetingId <string>] [-UserId <string>]",
    parameters: [
      { id: "meetingid", name: "MeetingId", type: "string", description: "Meeting ID", required: false },
      { id: "userid", name: "UserId", type: "string", description: "User ID to list meetings", required: false }
    ],
    example: 'Get-ZoomMeeting -UserId "user@company.com"'
  },
  {
    id: "remove-zoommeeting",
    name: "Remove-ZoomMeeting",
    category: "Zoom",
    description: "Deletes a Zoom meeting",
    syntax: "Remove-ZoomMeeting -MeetingId <string> [-NotifyHosts]",
    parameters: [
      { id: "meetingid", name: "MeetingId", type: "string", description: "Meeting ID", required: true },
      { id: "notifyhosts", name: "NotifyHosts", type: "switch", description: "Notify meeting hosts", required: false, defaultValue: false }
    ],
    example: 'Remove-ZoomMeeting -MeetingId "123456789"'
  },
  {
    id: "get-zoomrecording",
    name: "Get-ZoomRecording",
    category: "Zoom",
    description: "Gets Zoom cloud recordings",
    syntax: "Get-ZoomRecording [-MeetingId <string>] [-UserId <string>] [-From <string>] [-To <string>]",
    parameters: [
      { id: "meetingid", name: "MeetingId", type: "string", description: "Meeting ID", required: false },
      { id: "userid", name: "UserId", type: "string", description: "User ID", required: false },
      { id: "from", name: "From", type: "string", description: "Start date (yyyy-MM-dd)", required: false },
      { id: "to", name: "To", type: "string", description: "End date (yyyy-MM-dd)", required: false }
    ],
    example: 'Get-ZoomRecording -UserId "user@company.com" -From "2024-01-01" -To "2024-01-31"'
  },
  {
    id: "remove-zoomrecording",
    name: "Remove-ZoomRecording",
    category: "Zoom",
    description: "Deletes a Zoom cloud recording",
    syntax: "Remove-ZoomRecording -MeetingId <string> [-Action <string>]",
    parameters: [
      { id: "meetingid", name: "MeetingId", type: "string", description: "Meeting ID", required: true },
      { id: "action", name: "Action", type: "select", description: "Delete action", required: false, options: ["trash", "delete"] }
    ],
    example: 'Remove-ZoomRecording -MeetingId "123456789" -Action "trash"'
  },
  {
    id: "get-zoomreport",
    name: "Get-ZoomReport",
    category: "Zoom",
    description: "Gets Zoom usage reports",
    syntax: "Get-ZoomReport -ReportType <string> [-From <string>] [-To <string>]",
    parameters: [
      { id: "reporttype", name: "ReportType", type: "select", description: "Report type", required: true, options: ["daily", "meetings", "webinars", "users", "telephone"] },
      { id: "from", name: "From", type: "string", description: "Start date (yyyy-MM-dd)", required: false },
      { id: "to", name: "To", type: "string", description: "End date (yyyy-MM-dd)", required: false }
    ],
    example: 'Get-ZoomReport -ReportType "daily" -From "2024-01-01" -To "2024-01-31"'
  },
  {
    id: "update-zoomuser",
    name: "Update-ZoomUser",
    category: "Zoom",
    description: "Updates a Zoom user",
    syntax: "Update-ZoomUser -UserId <string> [-FirstName <string>] [-LastName <string>] [-Type <int>]",
    parameters: [
      { id: "userid", name: "UserId", type: "string", description: "User ID or email", required: true },
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: false },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: false },
      { id: "type", name: "Type", type: "select", description: "User type", required: false, options: ["1", "2", "3"] }
    ],
    example: 'Update-ZoomUser -UserId "user@company.com" -Type 2'
  },

  // ===================================
  // SERVICENOW CMDLETS
  // ===================================
  {
    id: "get-servicenowincident",
    name: "Get-ServiceNowIncident",
    category: "ServiceNow",
    description: "Gets ServiceNow incidents",
    syntax: "Get-ServiceNowIncident [-Number <string>] [-Query <string>]",
    parameters: [
      { id: "number", name: "Number", type: "string", description: "Incident number", required: false },
      { id: "query", name: "Query", type: "string", description: "Encoded query", required: false }
    ],
    example: 'Get-ServiceNowIncident -Number "INC0010001"'
  },
  {
    id: "new-servicenowincident",
    name: "New-ServiceNowIncident",
    category: "ServiceNow",
    description: "Creates a new ServiceNow incident",
    syntax: "New-ServiceNowIncident -ShortDescription <string> [-Category <string>] [-Priority <int>]",
    parameters: [
      { id: "shortdescription", name: "ShortDescription", type: "string", description: "Short description", required: true },
      { id: "category", name: "Category", type: "string", description: "Category", required: false },
      { id: "priority", name: "Priority", type: "int", description: "Priority (1-5)", required: false, defaultValue: 3 }
    ],
    example: 'New-ServiceNowIncident -ShortDescription "Server down" -Category "Hardware" -Priority 1'
  },
  {
    id: "set-servicenowincident",
    name: "Set-ServiceNowIncident",
    category: "ServiceNow",
    description: "Updates an existing ServiceNow incident",
    syntax: "Set-ServiceNowIncident -Number <string> [-State <string>] [-AssignedTo <string>] [-WorkNotes <string>]",
    parameters: [
      { id: "number", name: "Number", type: "string", description: "Incident number", required: true },
      { id: "state", name: "State", type: "select", description: "Incident state", required: false, options: ["New", "In Progress", "On Hold", "Resolved", "Closed"] },
      { id: "assignedto", name: "AssignedTo", type: "string", description: "Assigned user", required: false },
      { id: "worknotes", name: "WorkNotes", type: "string", description: "Work notes", required: false }
    ],
    example: 'Set-ServiceNowIncident -Number "INC0010001" -State "In Progress" -AssignedTo "john.doe"'
  },
  {
    id: "get-servicenowchangerequest",
    name: "Get-ServiceNowChangeRequest",
    category: "ServiceNow",
    description: "Gets ServiceNow change requests",
    syntax: "Get-ServiceNowChangeRequest [-Number <string>] [-Query <string>]",
    parameters: [
      { id: "number", name: "Number", type: "string", description: "Change request number", required: false },
      { id: "query", name: "Query", type: "string", description: "Encoded query", required: false }
    ],
    example: 'Get-ServiceNowChangeRequest -Number "CHG0010001"'
  },
  {
    id: "new-servicenowchangerequest",
    name: "New-ServiceNowChangeRequest",
    category: "ServiceNow",
    description: "Creates a new ServiceNow change request",
    syntax: "New-ServiceNowChangeRequest -ShortDescription <string> [-Type <string>] [-Risk <string>]",
    parameters: [
      { id: "shortdescription", name: "ShortDescription", type: "string", description: "Short description", required: true },
      { id: "type", name: "Type", type: "select", description: "Change type", required: false, options: ["Standard", "Normal", "Emergency"] },
      { id: "risk", name: "Risk", type: "select", description: "Risk level", required: false, options: ["Low", "Moderate", "High"] }
    ],
    example: 'New-ServiceNowChangeRequest -ShortDescription "Deploy new patch" -Type "Normal" -Risk "Moderate"'
  },
  {
    id: "get-servicenowuser",
    name: "Get-ServiceNowUser",
    category: "ServiceNow",
    description: "Gets ServiceNow users",
    syntax: "Get-ServiceNowUser [-UserName <string>] [-Email <string>]",
    parameters: [
      { id: "username", name: "UserName", type: "string", description: "Username", required: false },
      { id: "email", name: "Email", type: "string", description: "Email address", required: false }
    ],
    example: 'Get-ServiceNowUser -UserName "john.doe"'
  },
  {
    id: "get-servicenowcmdb",
    name: "Get-ServiceNowCMDB",
    category: "ServiceNow",
    description: "Gets ServiceNow CMDB configuration items",
    syntax: "Get-ServiceNowCMDB [-Class <string>] [-Name <string>] [-Query <string>]",
    parameters: [
      { id: "class", name: "Class", type: "select", description: "CI class", required: false, options: ["cmdb_ci_server", "cmdb_ci_database", "cmdb_ci_app_server", "cmdb_ci_network_device", "cmdb_ci_storage_device"] },
      { id: "name", name: "Name", type: "string", description: "CI name", required: false },
      { id: "query", name: "Query", type: "string", description: "Encoded query", required: false }
    ],
    example: 'Get-ServiceNowCMDB -Class "cmdb_ci_server" -Name "prod-web-01"'
  },
  {
    id: "get-servicenowtask",
    name: "Get-ServiceNowTask",
    category: "ServiceNow",
    description: "Gets ServiceNow tasks",
    syntax: "Get-ServiceNowTask [-Number <string>] [-AssignedTo <string>] [-State <string>]",
    parameters: [
      { id: "number", name: "Number", type: "string", description: "Task number", required: false },
      { id: "assignedto", name: "AssignedTo", type: "string", description: "Assigned user", required: false },
      { id: "state", name: "State", type: "select", description: "Task state", required: false, options: ["Open", "Work in Progress", "Closed Complete", "Closed Incomplete"] }
    ],
    example: 'Get-ServiceNowTask -AssignedTo "john.doe" -State "Open"'
  },

  // ===================================
  // SALESFORCE CMDLETS
  // ===================================
  {
    id: "get-sfaccount",
    name: "Get-SFAccount",
    category: "Salesforce",
    description: "Gets Salesforce accounts",
    syntax: "Get-SFAccount [-Id <string>] [-Name <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Account ID", required: false },
      { id: "name", name: "Name", type: "string", description: "Account name", required: false }
    ],
    example: 'Get-SFAccount -Name "Acme Corp"'
  },
  {
    id: "new-sfopportunity",
    name: "New-SFOpportunity",
    category: "Salesforce",
    description: "Creates a new Salesforce opportunity",
    syntax: "New-SFOpportunity -Name <string> -AccountId <string> -StageName <string> -CloseDate <string>",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Opportunity name", required: true },
      { id: "accountid", name: "AccountId", type: "string", description: "Account ID", required: true },
      { id: "stagename", name: "StageName", type: "string", description: "Sales stage", required: true },
      { id: "closedate", name: "CloseDate", type: "string", description: "Expected close date", required: true }
    ],
    example: 'New-SFOpportunity -Name "Enterprise License" -AccountId "001xxx" -StageName "Prospecting" -CloseDate "2024-06-30"'
  },
  {
    id: "get-sfcontact",
    name: "Get-SFContact",
    category: "Salesforce",
    description: "Gets Salesforce contacts",
    syntax: "Get-SFContact [-Id <string>] [-Email <string>] [-AccountId <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Contact ID", required: false },
      { id: "email", name: "Email", type: "string", description: "Contact email", required: false },
      { id: "accountid", name: "AccountId", type: "string", description: "Account ID", required: false }
    ],
    example: 'Get-SFContact -Email "john.doe@company.com"'
  },
  {
    id: "new-sfcontact",
    name: "New-SFContact",
    category: "Salesforce",
    description: "Creates a new Salesforce contact",
    syntax: "New-SFContact -FirstName <string> -LastName <string> -AccountId <string> [-Email <string>]",
    parameters: [
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: true },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: true },
      { id: "accountid", name: "AccountId", type: "string", description: "Account ID", required: true },
      { id: "email", name: "Email", type: "string", description: "Email address", required: false }
    ],
    example: 'New-SFContact -FirstName "John" -LastName "Doe" -AccountId "001xxx" -Email "john.doe@company.com"'
  },
  {
    id: "set-sfaccount",
    name: "Set-SFAccount",
    category: "Salesforce",
    description: "Updates a Salesforce account",
    syntax: "Set-SFAccount -Id <string> [-Name <string>] [-Industry <string>] [-Website <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Account ID", required: true },
      { id: "name", name: "Name", type: "string", description: "Account name", required: false },
      { id: "industry", name: "Industry", type: "string", description: "Industry", required: false },
      { id: "website", name: "Website", type: "string", description: "Website URL", required: false }
    ],
    example: 'Set-SFAccount -Id "001xxx" -Industry "Technology" -Website "https://acme.com"'
  },
  {
    id: "get-sflead",
    name: "Get-SFLead",
    category: "Salesforce",
    description: "Gets Salesforce leads",
    syntax: "Get-SFLead [-Id <string>] [-Status <string>] [-Owner <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Lead ID", required: false },
      { id: "status", name: "Status", type: "select", description: "Lead status", required: false, options: ["Open", "Working", "Closed - Converted", "Closed - Not Converted"] },
      { id: "owner", name: "Owner", type: "string", description: "Lead owner", required: false }
    ],
    example: 'Get-SFLead -Status "Open"'
  },
  {
    id: "new-sflead",
    name: "New-SFLead",
    category: "Salesforce",
    description: "Creates a new Salesforce lead",
    syntax: "New-SFLead -FirstName <string> -LastName <string> -Company <string> [-Email <string>]",
    parameters: [
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: true },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: true },
      { id: "company", name: "Company", type: "string", description: "Company name", required: true },
      { id: "email", name: "Email", type: "string", description: "Email address", required: false }
    ],
    example: 'New-SFLead -FirstName "Jane" -LastName "Smith" -Company "TechCorp" -Email "jane.smith@techcorp.com"'
  },
  {
    id: "get-sfcase",
    name: "Get-SFCase",
    category: "Salesforce",
    description: "Gets Salesforce cases",
    syntax: "Get-SFCase [-Id <string>] [-CaseNumber <string>] [-Status <string>]",
    parameters: [
      { id: "id", name: "Id", type: "string", description: "Case ID", required: false },
      { id: "casenumber", name: "CaseNumber", type: "string", description: "Case number", required: false },
      { id: "status", name: "Status", type: "select", description: "Case status", required: false, options: ["New", "Working", "Escalated", "Closed"] }
    ],
    example: 'Get-SFCase -Status "New"'
  },
  {
    id: "new-sfcase",
    name: "New-SFCase",
    category: "Salesforce",
    description: "Creates a new Salesforce case",
    syntax: "New-SFCase -Subject <string> -AccountId <string> [-Priority <string>] [-Origin <string>]",
    parameters: [
      { id: "subject", name: "Subject", type: "string", description: "Case subject", required: true },
      { id: "accountid", name: "AccountId", type: "string", description: "Account ID", required: true },
      { id: "priority", name: "Priority", type: "select", description: "Case priority", required: false, options: ["Low", "Medium", "High"] },
      { id: "origin", name: "Origin", type: "select", description: "Case origin", required: false, options: ["Phone", "Email", "Web", "Chat"] }
    ],
    example: 'New-SFCase -Subject "Product issue" -AccountId "001xxx" -Priority "High" -Origin "Email"'
  },

  // ===================================
  // CONNECTWISE CMDLETS
  // ===================================
  {
    id: "get-cwticket",
    name: "Get-CWTicket",
    category: "ConnectWise",
    description: "Gets ConnectWise tickets",
    syntax: "Get-CWTicket [-TicketId <int>] [-Conditions <string>]",
    parameters: [
      { id: "ticketid", name: "TicketId", type: "int", description: "Ticket ID", required: false },
      { id: "conditions", name: "Conditions", type: "string", description: "Filter conditions", required: false }
    ],
    example: 'Get-CWTicket -Conditions "status/name=\'Open\'"'
  },
  {
    id: "new-cwticket",
    name: "New-CWTicket",
    category: "ConnectWise",
    description: "Creates a new ConnectWise ticket",
    syntax: "New-CWTicket -Summary <string> -Company <string> [-Priority <string>]",
    parameters: [
      { id: "summary", name: "Summary", type: "string", description: "Ticket summary", required: true },
      { id: "company", name: "Company", type: "string", description: "Company ID or name", required: true },
      { id: "priority", name: "Priority", type: "string", description: "Ticket priority", required: false }
    ],
    example: 'New-CWTicket -Summary "Network outage" -Company "123" -Priority "High"'
  },
  {
    id: "set-cwticket",
    name: "Set-CWTicket",
    category: "ConnectWise",
    description: "Updates an existing ConnectWise ticket",
    syntax: "Set-CWTicket -TicketId <int> [-Status <string>] [-Priority <string>] [-AssignedTo <string>]",
    parameters: [
      { id: "ticketid", name: "TicketId", type: "int", description: "Ticket ID", required: true },
      { id: "status", name: "Status", type: "select", description: "Ticket status", required: false, options: ["New", "In Progress", "Scheduled", "Waiting on Customer", "Completed", "Closed"] },
      { id: "priority", name: "Priority", type: "select", description: "Ticket priority", required: false, options: ["Low", "Medium", "High", "Critical"] },
      { id: "assignedto", name: "AssignedTo", type: "string", description: "Assigned member", required: false }
    ],
    example: 'Set-CWTicket -TicketId 12345 -Status "In Progress" -Priority "High"'
  },
  {
    id: "get-cwcompany",
    name: "Get-CWCompany",
    category: "ConnectWise",
    description: "Gets ConnectWise companies",
    syntax: "Get-CWCompany [-CompanyId <int>] [-Name <string>] [-Conditions <string>]",
    parameters: [
      { id: "companyid", name: "CompanyId", type: "int", description: "Company ID", required: false },
      { id: "name", name: "Name", type: "string", description: "Company name", required: false },
      { id: "conditions", name: "Conditions", type: "string", description: "Filter conditions", required: false }
    ],
    example: 'Get-CWCompany -Name "Acme Corp"'
  },
  {
    id: "new-cwcompany",
    name: "New-CWCompany",
    category: "ConnectWise",
    description: "Creates a new ConnectWise company",
    syntax: "New-CWCompany -Name <string> -Identifier <string> [-Status <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Company name", required: true },
      { id: "identifier", name: "Identifier", type: "string", description: "Company identifier", required: true },
      { id: "status", name: "Status", type: "select", description: "Company status", required: false, options: ["Active", "Inactive", "Not Approved"] }
    ],
    example: 'New-CWCompany -Name "New Client Corp" -Identifier "NEWCLIENT" -Status "Active"'
  },
  {
    id: "get-cwcontact",
    name: "Get-CWContact",
    category: "ConnectWise",
    description: "Gets ConnectWise contacts",
    syntax: "Get-CWContact [-ContactId <int>] [-CompanyId <int>] [-Email <string>]",
    parameters: [
      { id: "contactid", name: "ContactId", type: "int", description: "Contact ID", required: false },
      { id: "companyid", name: "CompanyId", type: "int", description: "Company ID", required: false },
      { id: "email", name: "Email", type: "string", description: "Contact email", required: false }
    ],
    example: 'Get-CWContact -CompanyId 123'
  },
  {
    id: "new-cwcontact",
    name: "New-CWContact",
    category: "ConnectWise",
    description: "Creates a new ConnectWise contact",
    syntax: "New-CWContact -FirstName <string> -LastName <string> -CompanyId <int> [-Email <string>]",
    parameters: [
      { id: "firstname", name: "FirstName", type: "string", description: "First name", required: true },
      { id: "lastname", name: "LastName", type: "string", description: "Last name", required: true },
      { id: "companyid", name: "CompanyId", type: "int", description: "Company ID", required: true },
      { id: "email", name: "Email", type: "string", description: "Email address", required: false }
    ],
    example: 'New-CWContact -FirstName "John" -LastName "Doe" -CompanyId 123 -Email "john.doe@client.com"'
  },
  {
    id: "get-cwserviceboard",
    name: "Get-CWServiceBoard",
    category: "ConnectWise",
    description: "Gets ConnectWise service boards",
    syntax: "Get-CWServiceBoard [-BoardId <int>] [-Name <string>]",
    parameters: [
      { id: "boardid", name: "BoardId", type: "int", description: "Board ID", required: false },
      { id: "name", name: "Name", type: "string", description: "Board name", required: false }
    ],
    example: 'Get-CWServiceBoard -Name "Help Desk"'
  },

  // ===================================
  // PDQ DEPLOY CMDLETS
  // ===================================
  {
    id: "get-pdqpackage",
    name: "Get-PDQPackage",
    category: "PDQ Deploy",
    description: "Gets PDQ Deploy packages",
    syntax: "Get-PDQPackage [-Name <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Package name", required: false }
    ],
    example: 'Get-PDQPackage'
  },
  {
    id: "start-pdqdeploy",
    name: "Start-PDQDeploy",
    category: "PDQ Deploy",
    description: "Starts a PDQ deployment",
    syntax: "Start-PDQDeploy -PackageName <string> -TargetComputer <string[]>",
    parameters: [
      { id: "packagename", name: "PackageName", type: "string", description: "Package to deploy", required: true },
      { id: "targetcomputer", name: "TargetComputer", type: "array", description: "Target computers", required: true }
    ],
    example: 'Start-PDQDeploy -PackageName "Chrome" -TargetComputer "PC001","PC002"'
  },
  {
    id: "get-pdqcomputer",
    name: "Get-PDQComputer",
    category: "PDQ Deploy",
    description: "Gets PDQ Inventory computers",
    syntax: "Get-PDQComputer [-Name <string>] [-Collection <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Computer name", required: false },
      { id: "collection", name: "Collection", type: "string", description: "Collection name", required: false }
    ],
    example: 'Get-PDQComputer -Collection "All Windows 10 Computers"'
  },
  {
    id: "get-pdqdeployment",
    name: "Get-PDQDeployment",
    category: "PDQ Deploy",
    description: "Gets PDQ Deploy deployment status",
    syntax: "Get-PDQDeployment [-DeploymentId <int>] [-Status <string>]",
    parameters: [
      { id: "deploymentid", name: "DeploymentId", type: "int", description: "Deployment ID", required: false },
      { id: "status", name: "Status", type: "select", description: "Deployment status", required: false, options: ["Running", "Successful", "Failed", "Queued", "Cancelled"] }
    ],
    example: 'Get-PDQDeployment -Status "Running"'
  },
  {
    id: "stop-pdqdeployment",
    name: "Stop-PDQDeployment",
    category: "PDQ Deploy",
    description: "Stops a running PDQ deployment",
    syntax: "Stop-PDQDeployment -DeploymentId <int> [-Force]",
    parameters: [
      { id: "deploymentid", name: "DeploymentId", type: "int", description: "Deployment ID", required: true },
      { id: "force", name: "Force", type: "switch", description: "Force stop without confirmation", required: false, defaultValue: false }
    ],
    example: 'Stop-PDQDeployment -DeploymentId 12345 -Force'
  },
  {
    id: "new-pdqschedule",
    name: "New-PDQSchedule",
    category: "PDQ Deploy",
    description: "Creates a new PDQ Deploy schedule",
    syntax: "New-PDQSchedule -Name <string> -PackageName <string> -Targets <string[]> [-Triggers <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Schedule name", required: true },
      { id: "packagename", name: "PackageName", type: "string", description: "Package to schedule", required: true },
      { id: "targets", name: "Targets", type: "array", description: "Target computers or collection", required: true },
      { id: "triggers", name: "Triggers", type: "select", description: "Schedule trigger", required: false, options: ["Once", "Daily", "Weekly", "Monthly", "Heartbeat"] }
    ],
    example: 'New-PDQSchedule -Name "Weekly Chrome Update" -PackageName "Chrome" -Targets "All Workstations" -Triggers "Weekly"'
  },
  {
    id: "get-pdqcollection",
    name: "Get-PDQCollection",
    category: "PDQ Deploy",
    description: "Gets PDQ Inventory collections",
    syntax: "Get-PDQCollection [-Name <string>] [-Type <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Collection name", required: false },
      { id: "type", name: "Type", type: "select", description: "Collection type", required: false, options: ["Static", "Dynamic"] }
    ],
    example: 'Get-PDQCollection -Type "Dynamic"'
  },

  // ===================================
  // CHOCOLATEY CMDLETS
  // ===================================
  {
    id: "choco-install",
    name: "choco install",
    category: "Chocolatey",
    description: "Installs a Chocolatey package",
    syntax: "choco install <package> [-y] [--version <version>]",
    parameters: [
      { id: "package", name: "Package", type: "string", description: "Package name", required: true },
      { id: "y", name: "Confirm", type: "switch", description: "Confirm all prompts", required: false, defaultValue: true },
      { id: "version", name: "Version", type: "string", description: "Specific version", required: false }
    ],
    example: 'choco install googlechrome -y'
  },
  {
    id: "choco-upgrade",
    name: "choco upgrade",
    category: "Chocolatey",
    description: "Upgrades Chocolatey packages",
    syntax: "choco upgrade <package> [-y]",
    parameters: [
      { id: "package", name: "Package", type: "string", description: "Package name or 'all'", required: true },
      { id: "y", name: "Confirm", type: "switch", description: "Confirm all prompts", required: false, defaultValue: true }
    ],
    example: 'choco upgrade all -y'
  },
  {
    id: "choco-list",
    name: "choco list",
    category: "Chocolatey",
    description: "Lists installed Chocolatey packages",
    syntax: "choco list [--local-only]",
    parameters: [
      { id: "localonly", name: "LocalOnly", type: "switch", description: "List local packages only", required: false, defaultValue: true }
    ],
    example: 'choco list --local-only'
  },
  {
    id: "choco-uninstall",
    name: "choco uninstall",
    category: "Chocolatey",
    description: "Uninstalls a Chocolatey package",
    syntax: "choco uninstall <package> [-y] [--remove-dependencies]",
    parameters: [
      { id: "package", name: "Package", type: "string", description: "Package name", required: true },
      { id: "y", name: "Confirm", type: "switch", description: "Confirm all prompts", required: false, defaultValue: true },
      { id: "removedependencies", name: "RemoveDependencies", type: "switch", description: "Remove dependencies", required: false, defaultValue: false }
    ],
    example: 'choco uninstall googlechrome -y'
  },
  {
    id: "choco-search",
    name: "choco search",
    category: "Chocolatey",
    description: "Searches for Chocolatey packages",
    syntax: "choco search <filter> [--exact] [--by-id-only]",
    parameters: [
      { id: "filter", name: "Filter", type: "string", description: "Search filter", required: true },
      { id: "exact", name: "Exact", type: "switch", description: "Exact match only", required: false, defaultValue: false },
      { id: "byidonly", name: "ByIdOnly", type: "switch", description: "Search by package ID only", required: false, defaultValue: false }
    ],
    example: 'choco search chrome --exact'
  },
  {
    id: "choco-info",
    name: "choco info",
    category: "Chocolatey",
    description: "Gets information about a Chocolatey package",
    syntax: "choco info <package> [--local-only]",
    parameters: [
      { id: "package", name: "Package", type: "string", description: "Package name", required: true },
      { id: "localonly", name: "LocalOnly", type: "switch", description: "Show local package info only", required: false, defaultValue: false }
    ],
    example: 'choco info googlechrome'
  },
  {
    id: "choco-source",
    name: "choco source",
    category: "Chocolatey",
    description: "Manages Chocolatey sources",
    syntax: "choco source <command> [--name <name>] [--source <url>]",
    parameters: [
      { id: "command", name: "Command", type: "select", description: "Source command", required: true, options: ["list", "add", "remove", "disable", "enable"] },
      { id: "name", name: "Name", type: "string", description: "Source name", required: false },
      { id: "source", name: "Source", type: "string", description: "Source URL", required: false }
    ],
    example: 'choco source add --name "internal" --source "https://nuget.company.com/chocolatey"'
  },
  {
    id: "choco-config",
    name: "choco config",
    category: "Chocolatey",
    description: "Manages Chocolatey configuration",
    syntax: "choco config <command> [--name <name>] [--value <value>]",
    parameters: [
      { id: "command", name: "Command", type: "select", description: "Config command", required: true, options: ["list", "get", "set", "unset"] },
      { id: "name", name: "Name", type: "string", description: "Config setting name", required: false },
      { id: "value", name: "Value", type: "string", description: "Config setting value", required: false }
    ],
    example: 'choco config set --name "cacheLocation" --value "C:\\ChocoCache"'
  },

  // ===================================
  // JAMF CMDLETS
  // ===================================
  {
    id: "get-jamfcomputer",
    name: "Get-JamfComputer",
    category: "JAMF",
    description: "Gets JAMF Pro managed computers",
    syntax: "Get-JamfComputer [-Id <int>] [-Name <string>]",
    parameters: [
      { id: "id", name: "Id", type: "int", description: "Computer ID", required: false },
      { id: "name", name: "Name", type: "string", description: "Computer name", required: false }
    ],
    example: 'Get-JamfComputer'
  },
  {
    id: "invoke-jamfpolicy",
    name: "Invoke-JamfPolicy",
    category: "JAMF",
    description: "Runs a JAMF policy on a computer",
    syntax: "Invoke-JamfPolicy -PolicyId <int> -ComputerId <int>",
    parameters: [
      { id: "policyid", name: "PolicyId", type: "int", description: "Policy ID", required: true },
      { id: "computerid", name: "ComputerId", type: "int", description: "Target computer ID", required: true }
    ],
    example: 'Invoke-JamfPolicy -PolicyId 1 -ComputerId 100'
  },
  {
    id: "get-jamfmobiledevice",
    name: "Get-JamfMobileDevice",
    category: "JAMF",
    description: "Gets JAMF Pro managed mobile devices",
    syntax: "Get-JamfMobileDevice [-Id <int>] [-SerialNumber <string>]",
    parameters: [
      { id: "id", name: "Id", type: "int", description: "Mobile device ID", required: false },
      { id: "serialnumber", name: "SerialNumber", type: "string", description: "Device serial number", required: false }
    ],
    example: 'Get-JamfMobileDevice -SerialNumber "C02ABC123DEF"'
  },
  {
    id: "get-jamfpolicy",
    name: "Get-JamfPolicy",
    category: "JAMF",
    description: "Gets JAMF Pro policies",
    syntax: "Get-JamfPolicy [-Id <int>] [-Name <string>]",
    parameters: [
      { id: "id", name: "Id", type: "int", description: "Policy ID", required: false },
      { id: "name", name: "Name", type: "string", description: "Policy name", required: false }
    ],
    example: 'Get-JamfPolicy -Name "Software Update"'
  },
  {
    id: "new-jamfpolicy",
    name: "New-JamfPolicy",
    category: "JAMF",
    description: "Creates a new JAMF Pro policy",
    syntax: "New-JamfPolicy -Name <string> -Enabled <bool> [-Frequency <string>]",
    parameters: [
      { id: "name", name: "Name", type: "string", description: "Policy name", required: true },
      { id: "enabled", name: "Enabled", type: "switch", description: "Enable policy", required: true, defaultValue: true },
      { id: "frequency", name: "Frequency", type: "select", description: "Execution frequency", required: false, options: ["Once per computer", "Once per user", "Ongoing"] }
    ],
    example: 'New-JamfPolicy -Name "Install Chrome" -Enabled $true -Frequency "Once per computer"'
  },
  {
    id: "get-jamfuser",
    name: "Get-JamfUser",
    category: "JAMF",
    description: "Gets JAMF Pro user accounts",
    syntax: "Get-JamfUser [-Id <int>] [-Name <string>]",
    parameters: [
      { id: "id", name: "Id", type: "int", description: "User ID", required: false },
      { id: "name", name: "Name", type: "string", description: "Username", required: false }
    ],
    example: 'Get-JamfUser -Name "admin"'
  },
  {
    id: "get-jamfgroup",
    name: "Get-JamfGroup",
    category: "JAMF",
    description: "Gets JAMF Pro computer or mobile device groups",
    syntax: "Get-JamfGroup [-Id <int>] [-Type <string>]",
    parameters: [
      { id: "id", name: "Id", type: "int", description: "Group ID", required: false },
      { id: "type", name: "Type", type: "select", description: "Group type", required: false, options: ["computer", "mobiledevice"] }
    ],
    example: 'Get-JamfGroup -Type "computer"'
  },
  {
    id: "invoke-jamfcommand",
    name: "Invoke-JamfCommand",
    category: "JAMF",
    description: "Sends a remote command to a JAMF managed device",
    syntax: "Invoke-JamfCommand -DeviceId <int> -Command <string> [-DeviceType <string>]",
    parameters: [
      { id: "deviceid", name: "DeviceId", type: "int", description: "Device ID", required: true },
      { id: "command", name: "Command", type: "select", description: "Remote command", required: true, options: ["BlankPush", "DeviceLock", "EraseDevice", "RestartDevice", "ShutDownDevice", "UpdateInventory"] },
      { id: "devicetype", name: "DeviceType", type: "select", description: "Device type", required: false, options: ["computer", "mobiledevice"] }
    ],
    example: 'Invoke-JamfCommand -DeviceId 100 -Command "UpdateInventory" -DeviceType "computer"'
  }
];

export function getCommandsByCategory(category: CommandCategory): Command[] {
  return powershellCommands.filter(cmd => cmd.category === category);
}

export function getCommandById(id: string): Command | undefined {
  return powershellCommands.find(cmd => cmd.id === id);
}

export function searchCommands(query: string): Command[] {
  const lowerQuery = query.toLowerCase();
  return powershellCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery)
  );
}
