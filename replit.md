# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation through an intuitive GUI, providing real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities. It operates on a freemium model, offering a Free Tier with access to 80+ PowerShell commands and 8 basic Windows management categories, and a Pro Tier ($5/month) which unlocks an AI Assistant and access to 779+ automation tasks across 23 enterprise IT platform categories. The project aims to streamline PowerShell script development for IT professionals.

## Recent Changes (October 31, 2025)
🚀 **PSFORGE 2.0 RELEASED** 🚀

### Version 2.0.2 (October 31, 2025)
- **Multi-Platform Enterprise Expansion:**
  - **Total Expansion**: +29 automation tasks across 3 critical platforms (779+ tasks total)
  - **Exchange Online**: Expanded from 20 to 30 tasks (+10 tasks)
    - Mail Flow & Transport: Inbound connectors, accepted domains, remote domains
    - Migration & Compliance: Migration batches, archive enablement, eDiscovery cases
    - Security & DLP: DKIM signing, DLP policies, mobile device access rules, transport rules
  - **Exchange Server On-Prem**: Expanded from 20 to 29 tasks (+9 tasks)
    - DAG & High Availability: Create DAG, add database copies, seed/reseed databases
    - Certificates & Virtual Directories: Certificate requests, OWA virtual directory config
    - Transport & Connectors: Send/receive connectors
    - Maintenance & Health: Maintenance mode (enter/exit), MRS Proxy enablement
  - **Active Directory On-Prem**: Expanded from 30 to 40 tasks (+10 tasks)
    - DNS Operations: Create zones (Primary/Secondary), A records, scavenging, conditional forwarders
    - Sites & Services: Create sites, subnets, site links
    - Domain/Forest Operations: Transfer FSMO roles, raise functional levels, promote DC
  - Fixed DNS Zone task to properly support Secondary zones with master server configuration
  - All 29 tasks comprehensively reviewed and architect-approved
  - Zero LSP/TypeScript errors, all code quality standards met

### Version 2.0.1 (October 31, 2025)
- **Microsoft 365 Tenant-Level Platform Expansion:**
  - Expanded from 30 to 40 tasks (+10 critical tenant configuration tasks)
  - Added new "User Lifecycle" category for automated provisioning/deprovisioning
  - New Security Tasks: Configure Security Defaults, Block Legacy Authentication
  - New Collaboration Tasks: SharePoint External Sharing, Teams External Access, Teams Meeting Defaults
  - New Health Monitoring: Export Message Center Posts, Export Service Health Incidents
  - New Reporting: Export MFA Enrollment Status (comprehensive authentication status)
  - New Lifecycle Bundles: Complete User Onboarding, Complete User Offboarding
  - Fixed PowerShell boolean escaping bug in all new checkbox parameters
  - All new tasks architect-reviewed and approved

### Version 2.0 Features (October 30, 2025)
- **Monaco Editor Integration (Script Tab Enhancement):**
  - Replaced basic textarea with professional Monaco Editor (VS Code engine)
  - PowerShell syntax highlighting with proper language mode
  - Code folding for better code organization
  - Auto-formatting support (Shift+Alt+F or Format button)
  - Intelligent cmdlet hover tooltips showing syntax, parameters, and examples
  - Built-in PowerShell cmdlet reference library (20+ cmdlets documented)
  - Professional IDE-like experience for script editing

- **Platform Update Notifications:**
  - Admin-controlled notification banner system for homepage announcements
  - Create, update, enable/disable, and delete notifications via admin dashboard
  - Notification banner displays at top of homepage (between header and hero)
  - User dismissal with localStorage persistence (per notification ID)
  - Real-time updates via TanStack Query for instant visibility
  - Secure API endpoints with admin-only access control

- **Script Wizard Tab:** New 4-step interactive wizard for bulk automation
  - Step 1: Multi-platform selection (all 23 platforms available)
  - Step 2: Task selection with subscription-aware filtering
  - Step 3: CSV upload/manual data entry for bulk operations
  - Step 4: Script preview with integrated security analysis

- **Security Features (App-Wide):**
  - Malicious code scanner detecting dangerous PowerShell patterns (Add-Type, -EncodedCommand, COM objects, credential harvesting, etc.)
  - SHA-256 script integrity verification
  - Security dashboard with visual security score (0-100)
  - Integrated into all export dialogs (Script Generator, AI Assistant, GUI Builder, Script Wizard)

- **Bulk Operations:**
  - CSV parsing and validation with row-level error reporting
  - Bulk PowerShell script generation with foreach loops
  - Error handling and progress tracking in generated scripts
  - Template CSV download for easy data structure

### Version 1.0 Complete (October 28, 2025)
🎉 **114/114 automation tasks** 🎉

- **All Categories Complete with Full Instructions:**
  - OneDrive: 25/25 ✅
  - SharePoint Online: 25/25 ✅
  - MECM: 10/10 ✅
  - Windows Server: 29/29 ✅ (5 original + 24 newly created)
  - Power Platform: 30/30 ✅ (5 original + 25 newly created)

- **Latest Milestone (October 28):**
  - Created 49 brand new tasks from scratch with complete structure, parameters, 5-section instructions, and PowerShell script templates
  - Windows Server: 24 new tasks (roles, services, event logs, file sharing, firewall, disk management, domain operations)
  - Power Platform: 25 new tasks (environments, apps, flows, connectors, governance, DLP, reporting, solutions)
  - Fixed ISO timestamp format across all 59 tasks in both categories
  - **Critical Bug Fix:** Resolved runtime error preventing Windows Server/Power Platform tasks from displaying
    - Error: "Objects are not valid as a React child (found: object with keys {value, label})"
    - Root cause: TaskDetailForm select rendering only supported string[] options, not {value, label}[] objects
    - Solution: Updated ADTaskParameter interface and TaskDetailForm to support both formats
  - All tasks architect-reviewed and approved (including bug fix)

- **Formatting Standards (Strictly Enforced Across All 114 Tasks):**
  - "How This Task Works" → hyphenated bullets (-) or descriptive paragraph
  - "Prerequisites" → hyphenated bullets (-)
  - "What You Need to Provide" → hyphenated bullets (-)
  - "What the Script Does" → descriptive bullets (-) or numbered (1. 2. 3.)
  - "Important Notes" → hyphenated bullets (-)
  - ISO timestamp: `# Generated: ${new Date().toISOString()}`
  - Security warnings (⚠️) for destructive operations
  - Proper PowerShell cmdlet usage throughout
  - Comprehensive error handling with try/catch
  - escapePowerShellString() for all user inputs
  - Colored console output for better UX

- **Known Issues:**
  - Verification script has module import bug with MECM causing false "missing instructions" errors (tasks actually complete)

- **Application Status:** Workflow running successfully with HMR on port 5000

## User Preferences
- Default theme: Dark mode
- Auto-save script to localStorage
- Real-time validation enabled by default

## System Architecture

### UI/UX Decisions
- **Design Language**: Dark mode by default with a light mode toggle, responsive design for all devices, consistent spacing.
- **Typography**: Inter for UI, JetBrains Mono for code.
- **Layout**: Tabbed interface featuring:
    - **Script Generator**: Code editor with command sidebar.
    - **AI Assistant**: Full-screen chat interface for natural language command help (Pro).
    - **GUI Builder**: Category-based task interface with user-friendly forms.
    - **Script Wizard**: Multi-step wizard for bulk automation operations (Free + Pro with task filtering).

### Technical Implementations
- **Frontend**: React with Vite, Tailwind CSS, Shadcn UI components, React hooks for state management with localStorage persistence.
- **Backend**: Express.js with TypeScript, in-memory storage (MemStorage), custom session-based authentication with Passport.js and express-session (bcrypt for hashing), and role-based access control (free, subscriber, admin).
- **Authentication**: Custom login/signup, session-based with secure cookies, protected routes, account management.
- **Feature Gating**: Premium features (AI Assistant, 16 enterprise GUI categories) are locked for free users with clear upgrade prompts and visual indicators.
- **Scripting Features**:
    - **Command Library**: Over 80 PowerShell commands across various categories.
    - **Script Editor**: Editable textarea with cursor-based command insertion.
    - **Code Preview**: Syntax-highlighted PowerShell output.
    - **Validation Panel**: Real-time error and warning display.
    - **GUI Builder**: Task-based script generation with dynamic parameter forms, supporting 461 automation tasks across 23 platforms (16 enterprise + 7 Windows management).
    - **Script Wizard**: Bulk operations wizard supporting CSV import and multi-platform task automation.
    - **Export**: Copy to clipboard and .ps1 file download with security analysis.
- **Security Features (v2.0)**:
    - **Malicious Code Scanner**: Detects 15+ dangerous PowerShell patterns including encoded commands, COM objects, credential harvesting
    - **Script Integrity**: SHA-256 hashing for script verification
    - **Security Dashboard**: Visual security score (0-100) with detailed warnings and recommendations
    - PowerShell injection prevention via input escaping, robust input validation, comprehensive error handling.
- **Admin Features**: Admin dashboard with analytics (total users, subscribers, MRR, churn, growth trends), user management (create, view, edit roles), and a default admin account for initial setup.

## External Dependencies
- **OpenAI API**: Powers the AI Helper Bot for natural language processing and command suggestions.
- **Stripe API**: Handles payment processing, subscription management, billing, and webhook events for real-time subscription status synchronization.