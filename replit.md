# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder that allows IT technicians and system administrators to build PowerShell scripts visually through an intuitive GUI. The application features real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export functionality.

## Recent Changes (October 23, 2025)
- Initial project setup with full-stack JavaScript architecture
- Implemented complete frontend with dark mode theme as default
- Created comprehensive PowerShell command library with 80+ enterprise commands across 18 categories
- Built visual script builder with drag-and-drop interface
- Added real-time code preview with syntax highlighting
- Implemented validation panel with error/warning detection
- Added export functionality for .ps1 file download
- **AI Helper Bot** - Integrated OpenAI-powered assistant with natural language command suggestions
- **Updated Branding** - Rebranded to PSForge with new logo featuring anvil/forge icon
- **Tabbed Interface** - Restructured app with three tabs:
  - Script Generator: Visual command builder (original functionality)
  - AI Assistant: Dedicated full-screen AI chat interface
  - GUI Builder: Category-based task interface for common configuration scripts with user-friendly forms
- **Expanded Command Library** - Added 25+ new cmdlets including:
  - File System: New-Item, Move-Item, Rename-Item, Test-Path, Get-Content, Set-Content, Add-Content
  - Network: Invoke-WebRequest, Get-NetIPAddress, Get-NetAdapter, Test-NetConnection, Resolve-DnsName
  - Services: Stop-Service, Restart-Service, Set-Service
  - Process Management: Start-Process, Wait-Process
  - Event Logs: Get-WinEvent, Clear-EventLog, Write-EventLog
  - Security: Get-Credential, Get-Acl, Set-Acl
- **Fixed TabsContent Layout Issue** - Eliminated persistent white space at bottom of viewport:
  - Modified TabsContent component to use `data-[state=inactive]:absolute` positioning
  - Inactive tabs no longer participate in flex layout (absolutely positioned & invisible)
  - Removed `md:shrink-0` constraint from CodePreview for proper flex sizing
  - Desktop layout now properly fills viewport height without extra bottom spacing
- **LATEST: Active Directory Tasks in GUI Builder** - Implemented complete task-based script generation:
  - **22 comprehensive Active Directory automation tasks** covering all major AD administration areas
  - **Task selection UI** - Clickable task cards showing task name, category, and description
  - **Dynamic parameter forms** - Intelligently rendered forms based on task requirements (text, email, path, number, boolean, select, textarea)
  - **Secure script generation** - All user inputs are safely escaped to prevent PowerShell injection
  - **Input validation** - Required field validation with user-friendly error messages
  - **Script preview dialog** - View generated PowerShell scripts before download
  - **Copy & Export** - Copy to clipboard and download as .ps1 files
  
  **Available Active Directory Tasks (22 total):**
  
  **Identity Lifecycle (5 tasks):**
  1. **New Hire Provisioning** - Create user with groups, home drive, manager assignment
  2. **User Offboarding** - Disable account, remove groups, move to disabled OU, archive home drive
  3. **Password Expiry Notification** - Find expiring passwords and send email notifications
  4. **Bulk User Import from CSV** - Import multiple users from HR CSV file
  5. **Password Reset & Account Unlock** - Reset passwords and unlock locked accounts
  
  **Groups & Access (3 tasks):**
  6. **Audit Privileged Groups** - Monitor Domain Admins, Enterprise Admins with change alerts
  7. **Orphaned/Empty Groups Report** - Find and optionally delete empty security groups
  8. **Nested Group Depth Audit** - Identify token bloat from deep group nesting
  
  **Computers & OUs (3 tasks):**
  9. **Cleanup Stale Computers** - Report/disable/quarantine/delete inactive computer accounts
  10. **Move Computers by Site** - Auto-place computers in OUs based on site assignments
  11. **BitLocker Recovery Key Audit** - Export BitLocker recovery keys from AD
  
  **GPO & Configuration (2 tasks):**
  12. **Backup All GPOs** - Timestamped GPO backups with retention policy
  13. **GPO Drift Report** - Compare GPO backups and detect configuration drift
  
  **DNS / DHCP (1 task):**
  14. **Report Stale DNS Records** - Find stale DNS records for cleanup
  
  **File/Print & Permissions (1 task):**
  15. **NTFS Permissions Review** - Audit NTFS permissions and least privilege violations
  
  **Security & Compliance (2 tasks):**
  16. **Audit Kerberoastable SPNs** - Find service accounts vulnerable to Kerberoasting
  17. **Password Never Expires Audit** - Find accounts with password never expires flag
  
  **Reporting & Inventory (4 tasks):**
  18. **Weekly AD Health Report** - Comprehensive health check (DCs, replication, DIT size)
  19. **Find Account Lockout Source** - Hunt for lockout sources across DCs
  20. **Replication Failure Watcher** - Monitor and alert on replication failures
  21. **UPN & Email Suffix Consistency** - Report on UPN/email consistency issues
  
  **Migrations & Hygiene (1 task):**
  22. **CSV-Driven Mass Moves/Renames** - Bulk move or rename AD objects from CSV
- **Comprehensive Responsive Design** - Full mobile/tablet/desktop support with E2E testing:
  - **Single document scroll on mobile** (< 768px): No nested scrollbars, natural content flow
  - **Fixed layout on desktop** (≥ 768px): Internal component scrolls only (sidebar & parameters)
  - **Adaptive breakpoints**: Mobile (<768px), Tablet (768-1023px), Desktop (≥1024px)
  - **Responsive components**:
    - Root container: `min-h-screen` mobile (grows), `md:h-screen` desktop (fixed)
    - Sidebar: full-width mobile, 320-384px fixed width desktop
    - Code preview: constrained heights (192px mobile, 256px tablet, 320px desktop)
    - Parameter form: natural height mobile, internal scroll desktop
  - **Smooth transitions** between breakpoints with content persistence
  - **Tested across viewports**: 375x667 (iPhone), 768x1024 (iPad), 1920x1080 (Desktop)
  - All content accessible on all device sizes

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Styling**: Tailwind CSS + Shadcn UI components
- **State Management**: React hooks with localStorage persistence
- **Theme**: Dark mode by default with light mode toggle
- **Layout**: Tabbed interface with three main sections
  - Script Generator tab - Visual command builder with parameter forms and code preview
  - AI Assistant tab - Full-screen AI chat interface for natural language command help
  - GUI Builder tab - Category-based interface with 16 categories, each with custom icons and task selection
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
8. **GUIBuilderTab** - Task-based script generation interface
   - Category selection with 16 PowerShell categories
   - Task list view for selected category
   - Task detail form with dynamic input rendering
9. **TaskDetailForm** - Dynamic form component for task parameters
   - Supports 7 input types: text, email, path, number, boolean, select, textarea
   - Required field validation with toast notifications
   - Safe PowerShell script generation with escaping
10. **ScriptPreviewDialog** - Script preview and export dialog
    - Syntax-highlighted PowerShell code preview
    - Copy to clipboard functionality
    - Download as .ps1 file

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
- ✅ Expanded command library with 80+ enterprise commands
- ✅ AI-powered assistant for command suggestions
- ✅ Conversation history persistence
- ✅ Security hardening (conversation sanitization, type validation)
- ✅ GUI Builder with Active Directory task automation (6 tasks)
- ✅ Secure PowerShell script generation with input escaping
- ✅ Input validation with user-friendly error messages
- ✅ Script preview and export functionality (.ps1 download)
- ✅ E2E testing passing with validation and security tests

## Security Features
- **PowerShell Injection Prevention** - All user inputs are escaped using dedicated utility functions
  - Escapes backticks, quotes, dollar signs, and special characters
  - Safe array building from comma-separated values
  - Proper boolean conversion to PowerShell $true/$false
- **Input Validation** - Required field validation before script generation
- **Error Handling** - Try-catch blocks with user-friendly error messages

## Next Steps (Future Enhancements)
- Add remaining tasks for other 15 PowerShell categories in GUI Builder
- Implement script templates library (pre-built common scenarios)
- Add collaborative features for sharing scripts
- Implement script version history
- Add PowerShell script debugging capabilities
- Integrate with PowerShell Gallery for module discovery
- Add unit tests for PowerShell utility functions
