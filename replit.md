# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder that allows IT technicians and system administrators to build PowerShell scripts visually through an intuitive GUI. The application features real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export functionality.

## Recent Changes (October 21, 2025)
- Initial project setup with full-stack JavaScript architecture
- Implemented complete frontend with dark mode theme as default
- Created comprehensive PowerShell command library with 80+ enterprise commands across 18 categories
- Built visual script builder with drag-and-drop interface
- Added real-time code preview with syntax highlighting
- Implemented validation panel with error/warning detection
- Added export functionality for .ps1 file download
- **AI Helper Bot** - Integrated OpenAI-powered assistant with natural language command suggestions
- **Updated Branding** - Rebranded to PSForge with new logo featuring anvil/forge icon (transparent background, 56px height for readability)
- **Tabbed Interface** - Restructured app with three tabs:
  - Script Generator: Visual command builder (original functionality)
  - AI Assistant: Dedicated full-screen AI chat interface
  - GUI Builder: Placeholder for future PowerShell GUI creation tool
- **LATEST: Expanded Command Library** - Added 25+ new cmdlets including:
  - File System: New-Item, Move-Item, Rename-Item, Test-Path, Get-Content, Set-Content, Add-Content
  - Network: Invoke-WebRequest, Get-NetIPAddress, Get-NetAdapter, Test-NetConnection, Resolve-DnsName
  - Services: Stop-Service, Restart-Service, Set-Service
  - Process Management: Start-Process, Wait-Process
  - Event Logs: Get-WinEvent, Clear-EventLog, Write-EventLog
  - Security: Get-Credential, Get-Acl, Set-Acl

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Styling**: Tailwind CSS + Shadcn UI components
- **State Management**: React hooks with localStorage persistence
- **Theme**: Dark mode by default with light mode toggle
- **Layout**: Tabbed interface with three main sections
  - Script Generator tab - Visual command builder with parameter forms and code preview
  - AI Assistant tab - Full-screen AI chat interface for natural language command help
  - GUI Builder tab - Placeholder for future PowerShell GUI builder functionality
- **Key Pages**:
  - `/` - ScriptBuilder (main application with tabbed interface)

### Backend (Express.js)
- **Server**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage)
- **API Routes**: Validation endpoints (to be implemented)

### Key Components
1. **CommandSidebar** - Categorized PowerShell command library with search
2. **ParameterForm** - Dynamic form for configuring command parameters
3. **CodePreview** - Syntax-highlighted PowerShell code output
4. **ValidationPanel** - Real-time error and warning display
5. **Header** - Application navigation with export/save actions
6. **ThemeToggle** - Dark/light mode switcher
7. **AIHelperBot** - OpenAI-powered assistant for command suggestions
   - Collapsible right-side panel (384px width)
   - Natural language query processing
   - Context-aware command suggestions with parameter recommendations
   - One-click command addition to script
   - Conversation history persistence via localStorage
   - Security: Sanitized conversation history (10 msg limit, 5k char/msg)
   - Type coercion for suggested parameters (boolean, int, array handling)

### PowerShell Command Categories (80+ Commands)
- **File System** (10 commands): Get-ChildItem, Copy-Item, Remove-Item, New-Item, Move-Item, Rename-Item, Test-Path, Get-Content, Set-Content, Add-Content
- **Network** (7 commands): Test-Connection, Invoke-WebRequest, Get-NetIPAddress, Get-NetAdapter, Test-NetConnection, Resolve-DnsName
- **Services** (6 commands): Get-Service, Start-Service, Stop-Service, Restart-Service, Set-Service
- **Process Management** (4 commands): Get-Process, Stop-Process, Start-Process, Wait-Process
- **Event Logs** (4 commands): Get-EventLog, Get-WinEvent, Clear-EventLog, Write-EventLog
- **Security** (4 commands): Set-ExecutionPolicy, Get-Credential, Get-Acl, Set-Acl
- **Active Directory** (7 commands): Get-ADUser, New-ADUser, Set-ADUser, Remove-ADUser, Get-ADGroup, New-ADGroup, Add-ADGroupMember
- **Registry** (2 commands): Get-ItemProperty, Set-ItemProperty
- **Azure** (5 commands): Get-AzVM, Start-AzVM, Stop-AzVM, New-AzVM, Get-AzResourceGroup
- **Azure AD** (4 commands): Get-AzureADUser, New-AzureADUser, Set-AzureADUser, Get-AzureADGroup
- **Exchange Online** (4 commands): Get-Mailbox, New-Mailbox, Set-Mailbox, Get-MailboxStatistics
- **SharePoint** (3 commands): Get-SPOSite, New-SPOSite, Set-SPOSite
- **MECM** (4 commands): Get-CMDevice, New-CMDeviceCollection, Add-CMDeviceCollectionMember, Invoke-CMDeviceCollectionUpdate
- **Exchange Server** (3 commands): Get-ExchangeServer, Get-MailboxDatabase, Test-ServiceHealth
- **Hyper-V** (4 commands): Get-VM, Start-VM, Stop-VM, New-VM
- **Windows Server** (8 commands): Get-WindowsFeature, Install-WindowsFeature, Restart-Computer, Get-ComputerInfo, Get-Disk, Test-NetConnection

## Design System
- **Primary Color**: PowerShell Blue (217 91% 60%)
- **Background**: Deep charcoal (222 20% 11%) for dark mode
- **Typography**: Inter for UI, JetBrains Mono for code
- **Spacing**: Consistent 4, 6, 8 unit system
- **Layout**: Two-panel (sidebar + main content + code preview)

## User Preferences
- Default theme: Dark mode
- Auto-save script to localStorage
- Real-time validation enabled by default

## Development Workflow
1. `npm run dev` - Starts both frontend (Vite) and backend (Express) servers
2. Frontend: http://localhost:5000
3. Backend API: http://localhost:5000/api/*

## Completed Features
- ✅ Backend validation API with PowerShell syntax checking
- ✅ Expanded command library with 40+ enterprise commands
- ✅ AI-powered assistant for command suggestions
- ✅ Conversation history persistence
- ✅ Security hardening (conversation sanitization, type validation)
- ✅ E2E testing passing

## Next Steps (Future Enhancements)
- Implement script templates library (pre-built common scenarios)
- Add collaborative features for sharing scripts
- Implement script version history
- Add PowerShell script debugging capabilities
- Integrate with PowerShell Gallery for module discovery
