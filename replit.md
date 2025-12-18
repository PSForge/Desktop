# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It offers visual PowerShell script creation via an intuitive GUI, real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export. Operating on a freemium model, PSForge streamlines PowerShell script development by providing a Free Tier with basic commands and tasks, and a Pro Tier ($5/month) which unlocks an AI Assistant and extensive automation tasks across enterprise IT platforms. The project aims to improve IT efficiency, automate routine tasks, and offer a community-driven marketplace for PowerShell script templates.

## User Preferences
- Default theme: Dark mode
- Auto-save script to localStorage
- Real-time validation enabled by default

## System Architecture

### UI/UX Decisions
The platform features a dark mode by default with a light mode toggle, a responsive design, and consistent spacing. Typography uses Inter for UI and JetBrains Mono for code. The layout is a tabbed interface with sections for Script Generator, AI Assistant, GUI Builder, and Script Wizard. Key public pages include About, Privacy Policy, Terms of Service, Security, and Case Studies for lead generation.

### Technical Implementations
PSForge uses a React frontend with Vite, Tailwind CSS, and Shadcn UI, persisting data via React hooks and localStorage. The backend is built with Express.js and TypeScript, using PostgreSQL with Drizzle ORM for data storage. Authentication is custom, session-based with Passport.js, bcrypt for hashing, and role-based access control (free, subscriber, admin). Premium features are gated, prompting upgrades for Pro tier access.

**Key Features:**
- **Scripting:**
    - **Command Library:** Over 150 PowerShell cmdlets across various Microsoft services.
    - **Script Editor:** Monaco Editor with PowerShell syntax highlighting, code folding, auto-formatting, and cmdlet tooltips.
    - **Validation System:** Dual-mode validation offering real-time basic checks and on-demand comprehensive assessments with best practices and compliance.
    - **GUI Builder:** Task-based script generation supporting over 2,400 automation tasks across 48 platforms.
    - **Script Wizard:** A 5-step multi-platform bulk operations wizard with CSV import options.
    - **Script Management:** A comprehensive library with tagging, favorites, recent scripts, and advanced search.
    - **AI Script Optimization (Pro):** AI-powered analysis for performance, security, and best practices.
    - **AI Documentation:** Auto-generates comment-based help documentation.
- **Security:** Malicious code scanner detecting 15+ dangerous PowerShell patterns, SHA-256 hashing for script integrity, a visual Security Dashboard, PowerShell injection prevention, robust input validation, and comprehensive error handling.
- **Admin & Monitoring:** Admin dashboard with analytics, user management, and real-time metrics.
- **Notifications & Support:** Admin-controlled notification banner system and a user-facing support request system.
- **Subscription Management:** Automatic Stripe webhook processing for Pro tier upgrades, manual sync tool, and promo code support.
- **Git Integration:** GitHub OAuth for repository management, commit/push/pull, history, and diff viewing.
- **Templates Marketplace:**
    - **Community-driven:** Users can publish, discover, and install PowerShell script templates with metadata, security scanning, and admin moderation.
    - **Browsing:** Public marketplace with search, filtering, and sorting.
    - **Details:** Full template view with code preview, ratings, reviews, and installation functionality.
    - **Admin Moderation:** Dashboard for approving/rejecting templates, viewing security scan results.
    - **Paid Template Marketplace (Planned):** Allows Pro users to sell templates with a 70/30 revenue split, featuring seller onboarding via Stripe Connect, flexible pricing, a seller dashboard for earnings, and a "My Purchases" section for buyers.

### System Design Choices
The project emphasizes a robust, scalable architecture with a clear separation of concerns between frontend and backend. The use of a specialized code editor (Monaco), comprehensive validation, and AI integration are central to its design. Security is a primary concern, integrated throughout the development process from code scanning to secure authentication. The freemium model and planned marketplace are key business model drivers, leveraging Stripe for monetization.

## External Dependencies
- **PostgreSQL:** Primary database for persistent data storage.
- **OpenAI API:** Powers AI Assistant features including natural language processing, command suggestions, script generation, documentation, and optimization analysis.
- **Stripe API:** Handles payment processing, subscription management, and webhook events for monetization.
- **Office 365 SMTP:** Used for sending transactional emails (e.g., password resets, support requests).