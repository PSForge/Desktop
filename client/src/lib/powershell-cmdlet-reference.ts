export interface CmdletParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface CmdletReference {
  name: string;
  syntax: string;
  description: string;
  parameters: CmdletParameter[];
  examples: string[];
  category: string;
}

export const powershellCmdlets: Record<string, CmdletReference> = {
  // Active Directory
  'Get-ADUser': {
    name: 'Get-ADUser',
    syntax: 'Get-ADUser [-Identity] <ADUser> [-Properties <string[]>]',
    description: 'Gets one or more Active Directory users',
    category: 'ActiveDirectory',
    parameters: [
      { name: 'Identity', type: 'ADUser', required: true, description: 'Specifies an Active Directory user object' },
      { name: 'Filter', type: 'string', required: false, description: 'Specifies a query string' },
      { name: 'Properties', type: 'string[]', required: false, description: 'Specifies the properties to retrieve' }
    ],
    examples: [
      'Get-ADUser -Identity jdoe',
      'Get-ADUser -Filter "Department -eq \'IT\'" -Properties Department,EmailAddress'
    ]
  },
  'New-ADUser': {
    name: 'New-ADUser',
    syntax: 'New-ADUser [-Name] <string> [-SamAccountName] <string>',
    description: 'Creates a new Active Directory user',
    category: 'ActiveDirectory',
    parameters: [
      { name: 'Name', type: 'string', required: true, description: 'Display name for the user' },
      { name: 'SamAccountName', type: 'string', required: true, description: 'Logon name (pre-Windows 2000)' },
      { name: 'UserPrincipalName', type: 'string', required: false, description: 'UPN for the user' },
      { name: 'AccountPassword', type: 'SecureString', required: false, description: 'Password for the account' }
    ],
    examples: [
      'New-ADUser -Name "John Doe" -SamAccountName "jdoe"',
      '$password = ConvertTo-SecureString "P@ssw0rd" -AsPlainText -Force; New-ADUser -Name "John Doe" -SamAccountName "jdoe" -AccountPassword $password'
    ]
  },
  'Set-ADUser': {
    name: 'Set-ADUser',
    syntax: 'Set-ADUser [-Identity] <ADUser> [-Property] <value>',
    description: 'Modifies an Active Directory user',
    category: 'ActiveDirectory',
    parameters: [
      { name: 'Identity', type: 'ADUser', required: true, description: 'User to modify' },
      { name: 'Department', type: 'string', required: false, description: 'Department name' },
      { name: 'Title', type: 'string', required: false, description: 'Job title' }
    ],
    examples: [
      'Set-ADUser -Identity jdoe -Department "IT" -Title "System Administrator"'
    ]
  },
  'Remove-ADUser': {
    name: 'Remove-ADUser',
    syntax: 'Remove-ADUser [-Identity] <ADUser>',
    description: 'Removes an Active Directory user',
    category: 'ActiveDirectory',
    parameters: [
      { name: 'Identity', type: 'ADUser', required: true, description: 'User to remove' },
      { name: 'Confirm', type: 'SwitchParameter', required: false, description: 'Prompts for confirmation' }
    ],
    examples: [
      'Remove-ADUser -Identity jdoe',
      'Remove-ADUser -Identity jdoe -Confirm:$false'
    ]
  },

  // File System
  'Get-ChildItem': {
    name: 'Get-ChildItem',
    syntax: 'Get-ChildItem [[-Path] <string[]>] [-Filter <string>] [-Recurse]',
    description: 'Gets the items and child items in one or more specified locations',
    category: 'FileSystem',
    parameters: [
      { name: 'Path', type: 'string[]', required: false, description: 'Path to the items' },
      { name: 'Filter', type: 'string', required: false, description: 'Filter in provider format' },
      { name: 'Recurse', type: 'SwitchParameter', required: false, description: 'Get items in subdirectories' }
    ],
    examples: [
      'Get-ChildItem -Path C:\\Users',
      'Get-ChildItem -Path C:\\*.txt -Recurse'
    ]
  },
  'Copy-Item': {
    name: 'Copy-Item',
    syntax: 'Copy-Item [-Path] <string[]> [-Destination] <string>',
    description: 'Copies an item from one location to another',
    category: 'FileSystem',
    parameters: [
      { name: 'Path', type: 'string[]', required: true, description: 'Path to items to copy' },
      { name: 'Destination', type: 'string', required: true, description: 'Path to destination' },
      { name: 'Recurse', type: 'SwitchParameter', required: false, description: 'Copy subdirectories' }
    ],
    examples: [
      'Copy-Item -Path C:\\file.txt -Destination D:\\file.txt',
      'Copy-Item -Path C:\\Folder -Destination D:\\Folder -Recurse'
    ]
  },
  'Remove-Item': {
    name: 'Remove-Item',
    syntax: 'Remove-Item [-Path] <string[]> [-Force] [-Recurse]',
    description: 'Deletes the specified items',
    category: 'FileSystem',
    parameters: [
      { name: 'Path', type: 'string[]', required: true, description: 'Path to items to delete' },
      { name: 'Force', type: 'SwitchParameter', required: false, description: 'Force deletion' },
      { name: 'Recurse', type: 'SwitchParameter', required: false, description: 'Delete subdirectories' }
    ],
    examples: [
      'Remove-Item -Path C:\\file.txt',
      'Remove-Item -Path C:\\Folder -Recurse -Force'
    ]
  },

  // Services
  'Get-Service': {
    name: 'Get-Service',
    syntax: 'Get-Service [[-Name] <string[]>]',
    description: 'Gets the services on a local or remote computer',
    category: 'Services',
    parameters: [
      { name: 'Name', type: 'string[]', required: false, description: 'Service names' },
      { name: 'DisplayName', type: 'string[]', required: false, description: 'Display names' }
    ],
    examples: [
      'Get-Service',
      'Get-Service -Name W32Time'
    ]
  },
  'Start-Service': {
    name: 'Start-Service',
    syntax: 'Start-Service [-Name] <string[]>',
    description: 'Starts one or more stopped services',
    category: 'Services',
    parameters: [
      { name: 'Name', type: 'string[]', required: true, description: 'Service names to start' }
    ],
    examples: [
      'Start-Service -Name W32Time'
    ]
  },
  'Stop-Service': {
    name: 'Stop-Service',
    syntax: 'Stop-Service [-Name] <string[]>',
    description: 'Stops one or more running services',
    category: 'Services',
    parameters: [
      { name: 'Name', type: 'string[]', required: true, description: 'Service names to stop' },
      { name: 'Force', type: 'SwitchParameter', required: false, description: 'Force stop' }
    ],
    examples: [
      'Stop-Service -Name W32Time',
      'Stop-Service -Name W32Time -Force'
    ]
  },
  'Restart-Service': {
    name: 'Restart-Service',
    syntax: 'Restart-Service [-Name] <string[]>',
    description: 'Stops and then starts one or more services',
    category: 'Services',
    parameters: [
      { name: 'Name', type: 'string[]', required: true, description: 'Service names to restart' }
    ],
    examples: [
      'Restart-Service -Name W32Time'
    ]
  },

  // Exchange Online
  'Get-Mailbox': {
    name: 'Get-Mailbox',
    syntax: 'Get-Mailbox [[-Identity] <MailboxIdParameter>]',
    description: 'Gets mailbox objects and attributes',
    category: 'ExchangeOnline',
    parameters: [
      { name: 'Identity', type: 'MailboxIdParameter', required: false, description: 'Mailbox identity' },
      { name: 'Filter', type: 'string', required: false, description: 'Filter string' }
    ],
    examples: [
      'Get-Mailbox -Identity john.doe@contoso.com',
      'Get-Mailbox -Filter "Department -eq \'IT\'"'
    ]
  },
  'New-Mailbox': {
    name: 'New-Mailbox',
    syntax: 'New-Mailbox [-Name] <string> [-UserPrincipalName] <string>',
    description: 'Creates a new mailbox',
    category: 'ExchangeOnline',
    parameters: [
      { name: 'Name', type: 'string', required: true, description: 'Display name' },
      { name: 'UserPrincipalName', type: 'string', required: true, description: 'UPN for mailbox' }
    ],
    examples: [
      'New-Mailbox -Name "John Doe" -UserPrincipalName john.doe@contoso.com'
    ]
  },

  // Azure AD
  'Get-AzureADUser': {
    name: 'Get-AzureADUser',
    syntax: 'Get-AzureADUser [-ObjectId <string>]',
    description: 'Gets a user from Azure Active Directory',
    category: 'AzureAD',
    parameters: [
      { name: 'ObjectId', type: 'string', required: false, description: 'User object ID' },
      { name: 'Filter', type: 'string', required: false, description: 'OData filter' }
    ],
    examples: [
      'Get-AzureADUser -ObjectId "12345678-1234-1234-1234-123456789012"',
      'Get-AzureADUser -Filter "Department eq \'IT\'"'
    ]
  },
  'New-AzureADUser': {
    name: 'New-AzureADUser',
    syntax: 'New-AzureADUser -DisplayName <string> -UserPrincipalName <string> -AccountEnabled <bool> -MailNickName <string> -PasswordProfile <PasswordProfile>',
    description: 'Creates an Azure AD user',
    category: 'AzureAD',
    parameters: [
      { name: 'DisplayName', type: 'string', required: true, description: 'Display name' },
      { name: 'UserPrincipalName', type: 'string', required: true, description: 'User principal name' },
      { name: 'AccountEnabled', type: 'bool', required: true, description: 'Enable account' },
      { name: 'MailNickName', type: 'string', required: true, description: 'Mail alias' }
    ],
    examples: [
      '$PasswordProfile = New-Object -TypeName Microsoft.Open.AzureAD.Model.PasswordProfile; $PasswordProfile.Password = "P@ssw0rd"; New-AzureADUser -DisplayName "John Doe" -UserPrincipalName "john.doe@contoso.com" -AccountEnabled $true -MailNickName "jdoe" -PasswordProfile $PasswordProfile'
    ]
  },

  // Common cmdlets
  'Write-Host': {
    name: 'Write-Host',
    syntax: 'Write-Host [[-Object] <Object>] [-ForegroundColor <ConsoleColor>]',
    description: 'Writes customized output to the host',
    category: 'Utility',
    parameters: [
      { name: 'Object', type: 'Object', required: false, description: 'Objects to display' },
      { name: 'ForegroundColor', type: 'ConsoleColor', required: false, description: 'Text color' },
      { name: 'BackgroundColor', type: 'ConsoleColor', required: false, description: 'Background color' }
    ],
    examples: [
      'Write-Host "Hello World"',
      'Write-Host "Error!" -ForegroundColor Red'
    ]
  },
  'Write-Output': {
    name: 'Write-Output',
    syntax: 'Write-Output [-InputObject] <PSObject[]>',
    description: 'Sends objects to the next command in the pipeline',
    category: 'Utility',
    parameters: [
      { name: 'InputObject', type: 'PSObject[]', required: true, description: 'Objects to send' }
    ],
    examples: [
      'Write-Output "Hello World"',
      '"One", "Two", "Three" | Write-Output'
    ]
  },
  'ForEach-Object': {
    name: 'ForEach-Object',
    syntax: 'ForEach-Object [-Process] <ScriptBlock[]>',
    description: 'Performs an operation against each item in a collection',
    category: 'Utility',
    parameters: [
      { name: 'Process', type: 'ScriptBlock[]', required: true, description: 'Script block to execute' }
    ],
    examples: [
      '1..10 | ForEach-Object { $_ * 2 }',
      'Get-ChildItem | ForEach-Object { $_.Name }'
    ]
  }
};

// Function to find cmdlet by name (case-insensitive)
export function getCmdletReference(cmdletName: string): CmdletReference | undefined {
  const normalizedName = Object.keys(powershellCmdlets).find(
    key => key.toLowerCase() === cmdletName.toLowerCase()
  );
  return normalizedName ? powershellCmdlets[normalizedName] : undefined;
}

// Function to format cmdlet documentation for tooltip
export function formatCmdletDocumentation(cmdlet: CmdletReference): string {
  let doc = `**${cmdlet.name}**\n\n`;
  doc += `${cmdlet.description}\n\n`;
  doc += `**Syntax:**\n\`\`\`powershell\n${cmdlet.syntax}\n\`\`\`\n\n`;
  
  if (cmdlet.parameters.length > 0) {
    doc += `**Parameters:**\n`;
    cmdlet.parameters.forEach(param => {
      const required = param.required ? '(Required)' : '(Optional)';
      doc += `- \`-${param.name}\` [${param.type}] ${required}: ${param.description}\n`;
    });
    doc += '\n';
  }
  
  if (cmdlet.examples.length > 0) {
    doc += `**Examples:**\n`;
    cmdlet.examples.forEach((example, index) => {
      doc += `${index + 1}. \`\`\`powershell\n${example}\n\`\`\`\n`;
    });
  }
  
  return doc;
}
