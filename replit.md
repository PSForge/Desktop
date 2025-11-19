# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation through an intuitive GUI, providing real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities. The project operates on a freemium model, offering a Free Tier with access to 80+ PowerShell commands and 110 basic Windows management tasks, and a Pro Tier ($5/month) which unlocks an AI Assistant and access to 1000+ total automation tasks across 48 enterprise IT platform categories. Its primary goal is to streamline PowerShell script development for IT professionals.

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
- **Feature Gating**: Premium features (AI Assistant, 48 enterprise platforms with 909 premium tasks) are locked for free users with clear upgrade prompts.
- **Scripting Features**:
    - **Command Library**: 150+ PowerShell cmdlets including Microsoft Graph, Exchange, SharePoint, SQL Server, Group Policy, and Security cmdlets.
    - **Script Editor**: Monaco Editor (VS Code engine) with PowerShell syntax highlighting, code folding, auto-formatting, and cmdlet hover tooltips.
    - **Validation System**: Dual-mode validation with automatic Basic validation for real-time syntax checking and on-demand Comprehensive validation providing scored assessment (0-100), dependency detection, impact analysis, Microsoft PowerShell best practices checking, and compliance validation.
    - **GUI Builder**: Task-based script generation with dynamic parameter forms, supporting exactly 1000 automation tasks across 48 platforms.
    - **Script Wizard**: 5-step multi-platform bulk operations wizard supporting CSV file path reference, embedded CSV data, manual entry, and parameter mapping.
    - **Export**: Download .ps1 file or save to profile with security analysis.
    - **Script Management**: Save, view, load, and delete user scripts.
- **Security Features**:
    - **Malicious Code Scanner**: Detects 15+ dangerous PowerShell patterns.
    - **Script Integrity**: SHA-256 hashing for script verification.
    - **Security Dashboard**: Visual security score (0-100) with warnings and recommendations.
    - PowerShell injection prevention, robust input validation, comprehensive error handling.
- **Admin Features**: Admin dashboard with analytics, user management, and a default admin account. Real-time dashboard metrics include total users, active subscribers, free users, MRR, scripts generated, scripts saved, top tasks, new signups, conversion rate, churn rate, and average revenue per user.
- **Notification System**: Admin-controlled notification banner system for homepage announcements with user dismissal.
- **Support Request System**: User-facing support card on the account page, integrated with Office 365 SMTP for professional email communication.
- **Subscription Management**: Automatic Stripe webhook processing for Pro tier upgrades, manual sync tool, and promo code support (TRIAL30).

## External Dependencies
- **PostgreSQL**: Primary database for persistent storage.
- **OpenAI API**: Powers the AI Assistant for natural language processing, command suggestions, and custom PowerShell script generation.
- **Stripe API**: Handles payment processing, subscription management, and webhook events.
- **Office 365 SMTP**: Used for sending transactional emails (password reset, support requests).