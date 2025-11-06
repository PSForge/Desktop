# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation through an intuitive GUI, providing real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities. The project operates on a freemium model, offering a Free Tier with access to 80+ PowerShell commands and 91 basic Windows management tasks, and a Pro Tier which unlocks an AI Assistant and access to 506 total automation tasks across 23 enterprise IT platform categories. Its primary goal is to streamline PowerShell script development for IT professionals.

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
- **Feature Gating**: Premium features (AI Assistant, 16 enterprise GUI categories) are locked for free users with clear upgrade prompts.
- **Scripting Features**:
    - **Command Library**: Over 80 PowerShell commands.
    - **Script Editor**: Monaco Editor (VS Code engine) with PowerShell syntax highlighting, code folding, auto-formatting, and cmdlet hover tooltips.
    - **Code Preview**: Syntax-highlighted PowerShell output.
    - **Validation Panel**: Real-time error and warning display.
    - **GUI Builder**: Task-based script generation with dynamic parameter forms, supporting 506 automation tasks across 23 platforms (16 enterprise + 7 Windows management).
    - **Script Wizard**: Bulk operations wizard supporting CSV import and multi-platform task automation.
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