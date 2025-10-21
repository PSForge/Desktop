# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder that allows IT technicians and system administrators to build PowerShell scripts visually through an intuitive GUI. The application features real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export functionality.

## Recent Changes (October 21, 2025)
- Initial project setup with full-stack JavaScript architecture
- Implemented complete frontend with dark mode theme as default
- Created comprehensive PowerShell command library with 40+ enterprise commands across 18 categories
- Built visual script builder with drag-and-drop interface
- Added real-time code preview with syntax highlighting
- Implemented validation panel with error/warning detection
- Added export functionality for .ps1 file download
- **NEW: AI Helper Bot** - Integrated OpenAI-powered assistant that suggests PowerShell commands based on natural language requests, with conversation history persistence and one-click command addition

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Styling**: Tailwind CSS + Shadcn UI components
- **State Management**: React hooks with localStorage persistence
- **Theme**: Dark mode by default with light mode toggle
- **Key Pages**:
  - `/` - ScriptBuilder (main application interface)

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

### PowerShell Command Categories
- File System (Get-ChildItem, Copy-Item, Remove-Item)
- Network (Test-Connection, Invoke-WebRequest)
- Services (Get-Service, Start-Service, Stop-Service)
- Process Management (Get-Process, Stop-Process)
- Event Logs (Get-EventLog)
- Active Directory (Get-ADUser, New-ADUser)
- Registry (Get-ItemProperty, Set-ItemProperty)
- Security (Set-ExecutionPolicy)

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
