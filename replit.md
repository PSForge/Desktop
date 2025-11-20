# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It provides visual PowerShell script creation via an intuitive GUI, offering real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export. The project operates on a freemium model, streamlining PowerShell script development for IT professionals by offering a Free Tier with basic commands and tasks, and a Pro Tier ($5/month) which unlocks an AI Assistant and extensive automation tasks across enterprise IT platforms.

## User Preferences
- Default theme: Dark mode
- Auto-save script to localStorage
- Real-time validation enabled by default

## System Architecture

### UI/UX Decisions
- **Design Language**: Dark mode by default with light mode toggle, responsive design, consistent spacing.
- **Typography**: Inter for UI, JetBrains Mono for code.
- **Layout**: Tabbed interface featuring Script Generator, AI Assistant, GUI Builder, and Script Wizard.

### Technical Implementations
- **Frontend**: React with Vite, Tailwind CSS, Shadcn UI, React hooks with localStorage persistence.
- **Backend**: Express.js with TypeScript, PostgreSQL using Drizzle ORM, custom session-based authentication with Passport.js and express-session (bcrypt for hashing), and role-based access control (free, subscriber, admin).
- **Authentication**: Custom login/signup, session-based with secure cookies, protected routes, account management, and a production-ready password reset system with Office 365 email integration.
- **Feature Gating**: Premium features (AI Assistant, extensive automation tasks) are locked for free users with upgrade prompts.
- **Scripting Features**:
    - **Command Library**: 150+ PowerShell cmdlets including Microsoft Graph, Exchange, SharePoint, SQL Server, Group Policy, and Security cmdlets.
    - **Script Editor**: Monaco Editor (VS Code engine) with PowerShell syntax highlighting, code folding, auto-formatting, and cmdlet hover tooltips.
    - **Validation System**: Dual-mode validation with automatic Basic validation for real-time syntax checking and on-demand Comprehensive validation providing scored assessment, dependency detection, impact analysis, Microsoft PowerShell best practices, and compliance validation.
    - **GUI Builder**: Task-based script generation with dynamic parameter forms, supporting 1000 automation tasks across 48 platforms.
    - **Script Wizard**: 5-step multi-platform bulk operations wizard supporting CSV file path reference, embedded CSV data, manual entry, and parameter mapping.
    - **Export**: Download .ps1 file or save to profile with security analysis.
    - **Script Management**: Comprehensive script library with tag system, favorites, recent scripts tracking, and advanced search.
    - **AI Script Optimization (Pro Feature)**: Advanced AI-powered script analysis for performance, security deep-scans, best practices enforcement, and alternative approaches with prioritized recommendations.
    - **AI Documentation**: Auto-generate comment-based help documentation following Microsoft PowerShell standards.
- **Security Features**:
    - **Malicious Code Scanner**: Detects 15+ dangerous PowerShell patterns.
    - **Script Integrity**: SHA-256 hashing for script verification.
    - **Security Dashboard**: Visual security score with warnings and recommendations.
    - PowerShell injection prevention, robust input validation, comprehensive error handling.
- **Admin Features**: Admin dashboard with analytics, user management, and default admin account. Real-time metrics include total users, subscribers, MRR, scripts generated/saved, top tasks, new signups, conversion/churn rate, and ARPU.
- **Notification System**: Admin-controlled notification banner system for homepage announcements with user dismissal.
- **Support Request System**: User-facing support card on the account page, integrated with Office 365 SMTP.
- **Subscription Management**: Automatic Stripe webhook processing for Pro tier upgrades, manual sync tool, and promo code support.
- **Git Integration**: GitHub OAuth integration, repository connection/disconnection, branch management, commit/push/pull operations, commit history tracking, and visual diff viewer. Per-user GitHub credential isolation.
- **Templates Marketplace (Phase 3 v4.2)**: Community-driven template sharing platform enabling users to publish, discover, and install PowerShell script templates. Features include:
    - **Template Publishing**: Users can publish scripts as templates with metadata (title, description, category, tags, version), automatic security scanning with risk acknowledgment for dangerous patterns, and admin moderation workflow (pending → approved/rejected).
    - **Marketplace Browsing**: Public marketplace with search, category filtering, sorting (popular/newest/top-rated), featured templates, and responsive grid layout with security badges.
    - **Template Details**: Full template view with Monaco Editor code preview, star ratings (1-5) and review system, installation/download functionality, author information, and related statistics (downloads, installs, avg rating).
    - **Admin Moderation**: Dedicated admin dashboard with tabbed interface (Pending/Approved/Rejected/All), template approval/rejection workflow, security scan results display, and bulk moderation capabilities.
    - **User Contributions**: Account page section displaying user's published templates, contribution statistics (total templates, downloads, installs, avg rating), and template management (edit pending/rejected templates).
    - **Security Integration**: Automated malicious code scanning on publish using existing security-scanner.ts, color-coded security badges (Safe/Caution/Dangerous), explicit risk acknowledgment for dangerous templates, and admin visibility of security scores.
    - **Database Schema**: 4 new tables (templates, template_categories, template_ratings, template_installs) with proper relationships and Zod validation.
    - **API Endpoints**: 16 RESTful endpoints for templates, categories, ratings, and installs with proper authentication and admin-only routes protected by requireAdmin middleware.

## External Dependencies
- **PostgreSQL**: Primary database for persistent storage.
- **OpenAI API**: Powers the AI Assistant for natural language processing, command suggestions, custom PowerShell script generation, AI documentation generation, and script optimization analysis.
- **Stripe API**: Handles payment processing, subscription management, and webhook events.
- **Office 365 SMTP**: Used for sending transactional emails (password reset, support requests).