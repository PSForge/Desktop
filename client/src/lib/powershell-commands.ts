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
    id: "test-netconnection",
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
    description: "Removes a user from Azure Active Directory",
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
    description: "Creates a new group in Azure AD (Security Group or Microsoft 365 Group)",
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
    description: "Assigns or removes Microsoft 365 licenses for a user",
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
    description: "Gets subscribed SKUs (licenses) for the organization",
    syntax: "Get-MgSubscribedSku",
    parameters: [],
    example: 'Get-MgSubscribedSku | Select SkuPartNumber,ConsumedUnits'
  },
  {
    id: "new-mginvitation",
    name: "New-MgInvitation",
    category: "Azure AD",
    description: "Creates an invitation for a guest user",
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
    description: "Creates a new application registration in Azure AD",
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
    description: "Enables a mailbox for an existing Active Directory user",
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
    description: "Adds permissions to a mailbox",
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
    id: "get-mailboxdatabase",
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
    description: "Creates a new transport rule",
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
    description: "Gets retention policies",
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
    description: "Creates a new retention policy",
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
    id: "new-sposite",
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
