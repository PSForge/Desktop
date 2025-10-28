# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation through an intuitive GUI, providing real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities. It operates on a freemium model, offering a Free Tier with access to 80+ PowerShell commands and 8 basic Windows management categories, and a Pro Tier ($5/month) which unlocks an AI Assistant and access to 623 automation tasks across 16 enterprise IT platform categories. The project aims to streamline PowerShell script development for IT professionals.

## Recent Changes (October 28, 2025)
🎉 **SharePoint Online Category COMPLETE! (293/353 tasks - 83.0%)** 🎉
- **Latest Milestone:** SharePoint Online category 100% complete (25/25 tasks documented)
- **SharePoint Tasks Completed:**
  - Batch 1 (12 tasks): Create/delete/restore sites, quota management, admin permissions, external sharing, versioning, user/group exports, permission inheritance, hub sites
  - Batch 2 (13 tasks): Hub association, site title, lock/unlock, modern UI, search reindex, permission audits, bulk upload, guest expiration, download blocking, file inventory, file type blocking, cache management
- **Quality Assurance:**
  - All 25 tasks expanded from minified format with comprehensive instructions
  - ISO timestamps present: `# Generated: ${new Date().toISOString()}`
  - PowerShell technical accuracy verified through architect review
  - Security warnings for destructive/sensitive operations (delete, lock, download blocking, file type blocking, permission changes)
  - All cmdlets verified: Connect-SPOService, New-SPOSite, Remove-SPOSite, Restore-SPODeletedSite, Set-SPOSite, Set-SPOUser, Set-SPOTenant, PnP cmdlets
- **Previous Milestones:**
  - OneDrive: 25/25 tasks complete with technical fixes (od-access-requests uses `-ODBAccessRequests`, od-bulk-set-quota has null check)
- **Formatting Standards (Strictly Enforced):**
  - "How This Task Works" → hyphenated bullets (-)
  - "Prerequisites" → hyphenated bullets (-)
  - "What You Need to Provide" → hyphenated bullets (-)
  - "What the Script Does" → NUMBERED bullets (1. 2. 3.)
  - "Important Notes" → hyphenated bullets (-)
- **Remaining Work:** 60 tasks across MECM (10), Windows Server (25), Power Platform (25)
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
    - **AI Assistant**: Full-screen chat interface for natural language command help.
    - **GUI Builder**: Category-based task interface with user-friendly forms.

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
    - **GUI Builder**: Task-based script generation with dynamic parameter forms, supporting 623 automation tasks across 16 enterprise IT platforms (Azure AD/Entra ID, Azure Resources, Exchange Online/Server, Hyper-V, Intune, MECM, Microsoft Teams, Office 365, OneDrive, Power Platform, SharePoint Online/On-Premises, Windows 365, Windows Server) and 7 Windows management categories (Event Logs, File System, Networking, Process Management, Registry, Security Management, Services).
    - **Export**: Copy to clipboard and .ps1 file download.
- **Security**: PowerShell injection prevention via input escaping, robust input validation, comprehensive error handling.
- **Admin Features**: Admin dashboard with analytics (total users, subscribers, MRR, churn, growth trends), user management (create, view, edit roles), and a default admin account for initial setup.

## External Dependencies
- **OpenAI API**: Powers the AI Helper Bot for natural language processing and command suggestions.
- **Stripe API**: Handles payment processing, subscription management, billing, and webhook events for real-time subscription status synchronization.