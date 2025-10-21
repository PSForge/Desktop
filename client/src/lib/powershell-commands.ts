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
    id: "stop-service",
    name: "Stop-Service",
    category: "Services",
    description: "Stops one or more running services",
    syntax: "Stop-Service [-Name] <string[]> [-Force]",
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
        description: "Forces the command to run without asking for user confirmation",
        required: false,
        defaultValue: false
      }
    ],
    example: 'Stop-Service -Name "Spooler" -Force'
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
    id: "invoke-webrequest",
    name: "Invoke-WebRequest",
    category: "Network",
    description: "Gets content from a web page on the internet",
    syntax: "Invoke-WebRequest [-Uri] <Uri> [-Method <string>] [-Headers <IDictionary>]",
    parameters: [
      {
        id: "uri",
        name: "Uri",
        type: "string",
        description: "Specifies the URI of the web page",
        required: true
      },
      {
        id: "method",
        name: "Method",
        type: "string",
        description: "Specifies the method used for the web request",
        required: false,
        defaultValue: "GET"
      }
    ],
    example: 'Invoke-WebRequest -Uri "https://api.example.com/data"'
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
