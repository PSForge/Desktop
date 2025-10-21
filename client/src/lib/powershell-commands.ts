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
