# PowerShell Script Generator

## Overview
A professional web-based PowerShell script generator that allows IT technicians and system administrators to build PowerShell scripts visually through an intuitive GUI. The application features real-time syntax generation, parameter validation, error checking, and script export functionality.

## Recent Changes (October 21, 2025)
- Initial project setup with full-stack JavaScript architecture
- Implemented complete frontend with dark mode theme as default
- Created comprehensive PowerShell command library with 15+ common commands
- Built visual script builder with drag-and-drop interface
- Added real-time code preview with syntax highlighting
- Implemented validation panel with error/warning detection
- Added export functionality for .ps1 file download

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

## Next Steps
- Implement backend validation API endpoints
- Add advanced PowerShell cmdlets
- Implement script templates library
- Add collaborative features for sharing scripts
- Implement script version history
