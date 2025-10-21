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
2. Suggest the most appropriate PowerShell commands from the available library
3. Provide clear explanations and guidance
4. Suggest parameter values when appropriate

${POWERSHELL_COMMAND_LIBRARY}

When suggesting commands, ALWAYS respond with valid JSON in this exact format:
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
  ]
}

Guidelines:
- Only suggest commands from the library above using their exact IDs
- Provide 1-3 most relevant command suggestions
- Keep explanations concise and practical
- Suggest parameter values when they're obvious from context
- If the user's request is unclear, ask clarifying questions
- If no commands in the library match, explain what's possible and suggest alternatives`;

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
    });

    const responseText = completion.choices[0]?.message?.content || "";

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          response: parsed.response || responseText,
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
    }

    return {
      response: responseText,
      suggestions: [],
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get AI response");
  }
}
