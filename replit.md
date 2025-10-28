# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation through an intuitive GUI, providing real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities. It operates on a freemium model, offering a Free Tier with access to 80+ PowerShell commands and 8 basic Windows management categories, and a Pro Tier ($5/month) which unlocks an AI Assistant and access to 623 automation tasks across 16 enterprise IT platform categories. The project aims to streamline PowerShell script development for IT professionals.

## Recent Changes (October 28, 2025)
🎉 **OneDrive Category COMPLETE! (268/353 tasks - 75.9%)** 🎉
- **Latest Milestone:** OneDrive category 100% complete (25/25 tasks documented)
- **Technical Fixes Applied:**
  - od-access-requests: Now uses correct `Set-SPOTenant -ODBAccessRequests On/Off` for tenant-wide OneDrive access request control (verified via Microsoft Learn documentation)
  - od-bulk-set-quota: Added null check for Get-SPOSite results to handle missing/unprovisioned OneDrive sites gracefully
- **OneDrive Tasks Completed:**
  - Batch 1 (15 tasks): Sharing, quota management, version control, external access, sync settings, default storage, retention, versioning, lifecycle policies
  - Batch 2 (10 tasks): Access requests, legacy auth, idle timeout, unmanaged devices, bulk operations (delete sites, set quotas), permissions, activity reports, file type blocking, restore deleted
- **Quality Assurance:**
  - All 25 tasks have comprehensive instructions with 5 required sections
  - ISO timestamps present: `# Generated: ${new Date().toISOString()}`
  - PowerShell technical accuracy verified through web research and architect review
  - Security warnings for destructive operations (bulk delete, permission changes)
- **Formatting Standards (Strictly Enforced):**
  - "How This Task Works" → hyphenated bullets (-)
  - "Prerequisites" → hyphenated bullets (-)
  - "What You Need to Provide" → hyphenated bullets (-)
  - "What the Script Does" → NUMBERED bullets (1. 2. 3.)
  - "Important Notes" → hyphenated bullets (-)
- **Remaining Work:** 85 tasks across SharePoint Online (25), Windows Server (25), Power Platform (20), Others (15)
- **Application Status:** Workflow running successfully with HMR, ready for continued development

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