# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation through an intuitive GUI, providing real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities.

**Version 3.0 Released!** The project operates on a freemium model, offering a Free Tier with access to 80+ PowerShell commands and **110 basic Windows management tasks** (19 new tasks added for comprehensive coverage), and a Pro Tier ($5/month) which unlocks an AI Assistant and access to **exactly 1000 total automation tasks across 48 enterprise IT platform categories** (909 premium + 110 free). Version 3.0 adds 25 new enterprise platforms including VMware vSphere, AWS, GCP, CrowdStrike, Okta, ServiceNow, Cisco, Docker/Kubernetes, Veeam, Nutanix, Citrix, PDQ, Chocolatey, Sophos, Fortinet, Duo, NetApp, JAMF, Slack, Zoom, GitHub, GitLab, Splunk, Jira, and Salesforce. Its primary goal is to streamline PowerShell script development for IT professionals.

**Recent Enhancements (v3.0.1):** Expanded free tier with 19 new fundamental automation tasks covering essential file operations (copy, delete, search, ZIP compression), network diagnostics (port testing, firewall management, traceroute), and process management (start processes, get detailed process info), ensuring comprehensive coverage of basic IT operations.

## User Preferences
- Default theme: Dark mode
- Auto-save script to localStorage
- Real-time validation enabled by default

## System Architecture

### UI/UX Decisions
- **Design Language**: Dark mode by default with a light mode toggle, responsive design, consistent spacing.
- **Typography**: Inter for UI, JetBrains Mono for code.
- **Layout**: Tabbed interface featuring Script Generator, AI Assistant, GUI Builder, and Script Wizard.

### Technical Implementations
- **Frontend**: React with Vite, Tailwind CSS, Shadcn UI components, React hooks for state management with localStorage persistence.
- **Backend**: Express.js with TypeScript, PostgreSQL database using Drizzle ORM, custom session-based authentication with Passport.js and express-session (bcrypt for hashing), and role-based access control (free, subscriber, admin).
- **Authentication**: Custom login/signup, session-based with secure cookies, protected routes, account management, and a production-ready password reset system with Office 365 email integration.
- **Feature Gating**: Premium features (AI Assistant, 41 enterprise GUI categories with 909 premium tasks) are locked for free users with clear upgrade prompts. All premium tasks include `isPremium: true` flag for proper subscription enforcement.
- **Scripting Features**:
    - **Command Library**: Over 80 PowerShell commands.
    - **Script Editor**: Monaco Editor (VS Code engine) with PowerShell syntax highlighting, code folding, auto-formatting, and cmdlet hover tooltips.
    - **Code Preview**: Syntax-highlighted PowerShell output.
    - **Validation Panel**: Real-time error and warning display.
    - **GUI Builder**: Task-based script generation with dynamic parameter forms, supporting **exactly 1000 automation tasks across 48 platforms** (909 premium tasks across 41 enterprise platforms + 91 free tasks across 7 Windows management platforms). Version 3.0 expansion added 91 new premium tasks distributed across Microsoft Identity (Hyper-V +8, Power Platform +8, Windows Server +6, AD +5), Office 365 ecosystems (Exchange Online +10, Exchange Server +8, Office 365 +5), Azure (Azure Resources +7), AWS +8, GCP +5, and virtualization/infrastructure platforms (Docker/K8s +5, VMware +6, Citrix +5, Veeam +5, Nutanix +5). All 909 premium tasks include `isPremium: true` runtime flags for subscription enforcement.
    - **Script Wizard**: 4-step multi-platform bulk operations wizard supporting CSV import and task automation across all 48 platforms.
    - **Export**: Download .ps1 file or save to profile with security analysis.
    - **Script Management**: Save, view, load, and delete user scripts.
- **Security Features**:
    - **Malicious Code Scanner**: Detects 15+ dangerous PowerShell patterns.
    - **Script Integrity**: SHA-256 hashing for script verification.
    - **Security Dashboard**: Visual security score (0-100) with warnings and recommendations.
    - PowerShell injection prevention, robust input validation, comprehensive error handling.
- **Admin Features**: Admin dashboard with analytics, user management, and a default admin account.
- **Notification System**: Admin-controlled notification banner system for homepage announcements with user dismissal.
- **Support Request System**: User-facing support card on the account page, integrated with Office 365 SMTP for professional email communication.

## External Dependencies
- **PostgreSQL**: Primary database for persistent storage of user accounts, sessions, scripts, and subscription data.
- **OpenAI API**: Powers the AI Helper Bot for natural language processing and command suggestions.
- **Stripe API**: Handles payment processing, subscription management, billing, and webhook events.
- **Office 365 SMTP**: Used for sending transactional emails, specifically for password reset flows and support requests.