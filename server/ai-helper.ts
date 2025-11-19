import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CommandSuggestion {
  commandId: string;
  commandName: string;
  reason: string;
  suggestedParameters?: Record<string, string>;
}

interface AIHelperResponse {
  response: string;
  suggestions: CommandSuggestion[];
  customScript?: string;
}

const POWERSHELL_COMMAND_LIBRARY = `
Available PowerShell Commands:

FILE SYSTEM:
- Get-ChildItem (id: get-childitem): Lists files and directories
- Copy-Item (id: copy-item): Copies files or directories
- Remove-Item (id: remove-item): Deletes files or directories
- Move-Item (id: move-item): Moves files or directories
- New-Item (id: new-item): Creates new files or directories
- Get-Content (id: get-content): Reads file content
- Set-Content (id: set-content): Writes content to a file

NETWORK:
- Test-Connection (id: test-connection): Tests network connectivity (ping)
- Invoke-WebRequest (id: invoke-webrequest): Makes HTTP requests
- Test-NetConnection (id: test-netconnection): Tests network connectivity and diagnostics

SERVICES:
- Get-Service (id: get-service): Gets service status
- Start-Service (id: start-service): Starts a service
- Stop-Service (id: stop-service): Stops a service
- Restart-Service (id: restart-service): Restarts a service

PROCESS MANAGEMENT:
- Get-Process (id: get-process): Gets running processes
- Stop-Process (id: stop-process): Stops a process

EVENT LOGS:
- Get-EventLog (id: get-eventlog): Retrieves event log entries

ACTIVE DIRECTORY:
- Get-ADUser (id: get-aduser): Gets Active Directory user information
- New-ADUser (id: new-aduser): Creates a new AD user
- Set-ADUser (id: set-aduser): Modifies AD user properties
- Remove-ADUser (id: remove-aduser): Deletes an AD user
- Get-ADGroup (id: get-adgroup): Gets AD group information
- Add-ADGroupMember (id: add-adgroupmember): Adds members to AD group
- Get-ADComputer (id: get-adcomputer): Gets AD computer information

REGISTRY:
- Get-ItemProperty (id: get-itemproperty): Gets registry values
- Set-ItemProperty (id: set-itemproperty): Sets registry values

SECURITY:
- Set-ExecutionPolicy (id: set-executionpolicy): Sets PowerShell execution policy

AZURE (Az Module):
- Get-AzVM (id: get-azvm): Gets Azure virtual machines
- Start-AzVM (id: start-azvm): Starts an Azure VM
- Stop-AzVM (id: stop-azvm): Stops an Azure VM
- New-AzResourceGroup (id: new-azresourcegroup): Creates an Azure resource group
- Get-AzStorageAccount (id: get-azstorageaccount): Gets Azure storage accounts

EXCHANGE ONLINE:
- Get-EXOMailbox (id: get-exomailbox): Gets Exchange Online mailbox information
- New-Mailbox (id: new-mailbox): Creates a new shared mailbox
- Set-Mailbox (id: set-mailbox): Modifies mailbox properties
- Get-DistributionGroupMember (id: get-distributiongroupmember): Gets distribution group members

AZURE AD:
- Get-AzureADUser (id: get-azureaduser): Gets Azure AD user information
- New-AzureADUser (id: new-azureaduser): Creates a new Azure AD user
- Get-AzureADGroup (id: get-azureadgroup): Gets Azure AD group information
- Add-AzureADGroupMember (id: add-azureadgroupmember): Adds members to Azure AD group

SHAREPOINT ONLINE:
- Connect-SPOService (id: connect-sposervice): Connects to SharePoint Online
- Get-SPOSite (id: get-sposite): Gets SharePoint site information
- New-SPOSite (id: new-sposite): Creates a new SharePoint site

MECM (Configuration Manager):
- Get-CMDevice (id: get-cmdevice): Gets Configuration Manager device information
- New-CMDeviceCollection (id: new-cmdevicecollection): Creates a device collection
- Invoke-CMClientAction (id: invoke-cmclientaction): Triggers client actions
- Get-CMApplication (id: get-cmapplication): Gets Configuration Manager applications

EXCHANGE SERVER:
- Get-Mailbox (id: get-mailbox-onprem): Gets Exchange Server mailbox objects
- Get-MailboxDatabase (id: get-mailboxdatabase): Gets mailbox database configuration
- Test-MAPIConnectivity (id: test-mapit): Tests MAPI connectivity to mailboxes

HYPER-V:
- Get-VM (id: get-vm): Gets virtual machines on Hyper-V host
- Start-VM (id: start-vm): Starts a virtual machine
- Stop-VM (id: stop-vm): Stops a virtual machine
- New-VM (id: new-vm): Creates a new virtual machine

WINDOWS SERVER:
- Get-WindowsFeature (id: get-windowsfeature): Lists Windows Server features
- Install-WindowsFeature (id: install-windowsfeature): Installs Windows Server features
- Restart-Computer (id: restart-computer): Restarts the computer
- Get-ComputerInfo (id: get-computerinfo): Gets detailed computer information
- Set-DnsClientServerAddress (id: set-dnsclientserveraddress): Configures DNS settings
- Get-Hotfix (id: get-hotfix): Gets installed Windows updates
- Get-Disk (id: get-disk): Gets disk information
`;

const SYSTEM_PROMPT = `You are a PowerShell expert assistant helping IT technicians build PowerShell scripts. Your job is to:

1. Understand what the user wants to accomplish
2. Suggest commands from the PSForge library when available OR generate custom PowerShell scripts
3. Follow Microsoft PowerShell best practices at all times
4. Provide production-ready, secure PowerShell code

${POWERSHELL_COMMAND_LIBRARY}

Microsoft PowerShell Best Practices:
- Use approved verbs (Get-, Set-, New-, Remove-, Add-, etc.)
- Include error handling with try/catch blocks
- Use -ErrorAction parameter appropriately
- Add -WhatIf and -Confirm support for destructive operations
- Include parameter validation ([ValidateNotNullOrEmpty], [ValidateSet], etc.)
- Use proper cmdlet naming convention (Verb-Noun)
- Add comment-based help at the top of scripts
- Use Write-Verbose for detailed logging
- Never hardcode credentials - use Get-Credential or secure string parameters
- Test for prerequisites (modules, permissions) before executing
- Use pipeline properly instead of foreach loops when possible
- Include proper terminating errors for critical failures

ALWAYS respond with valid JSON in this exact format:
{
  "response": "Your helpful explanation here",
  "suggestions": [
    {
      "commandId": "command-id-from-library",
      "commandName": "Command-Name",
      "reason": "Brief explanation of why this command is useful",
      "suggestedParameters": {
        "parameterId": "suggested value"
      }
    }
  ],
  "customScript": "Optional: Complete PowerShell script when request goes beyond library commands"
}

Response Guidelines:
- If commands exist in the PSForge library, use "suggestions" array with commandIds
- If user requests commands not in the library, generate a complete script in "customScript"
- You can use BOTH suggestions and customScript together if appropriate
- customScript should be production-ready with error handling and comments
- customScript should follow all Microsoft PowerShell best practices
- Always include "response" text explaining what you're providing
- Keep explanations concise and practical
- If the user's request is unclear, ask clarifying questions in "response"`;

export async function getAIHelperResponse(
  userMessage: string,
  conversationHistory: Message[]
): Promise<AIHelperResponse> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  conversationHistory.slice(-5).forEach((msg) => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  });

  messages.push({ role: "user", content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(responseText);
      return {
        response: parsed.response || "I'm here to help with PowerShell commands!",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        customScript: parsed.customScript || undefined,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Response text:", responseText);
      
      // Fallback: return a safe response
      return {
        response: "I'm having trouble formatting my response right now. Could you rephrase your question?",
        suggestions: [],
        customScript: undefined,
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get AI response");
  }
}
