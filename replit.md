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

## Paid Template Marketplace (v4.4 - December 2025)
Monetization system allowing Pro users to sell PowerShell templates with 70/30 revenue split:
- **Seller Onboarding**: Pro subscription required, Stripe Connect Standard integration for payment processing, secure bank account linking
- **Template Pricing**: Publishers can set prices from $1-$50 per template, with live earnings preview showing 70% creator share
- **Purchase Flow**: Stripe Checkout for secure payments, automatic ownership tracking, instant access after purchase
- **Seller Dashboard** (`/seller-dashboard`): Comprehensive analytics showing:
    - Total earnings, pending balance, and paid out amounts
    - Sales history with template details and transaction dates
    - Payout management with request functionality (minimum $10 balance)
- **My Purchases Section**: Account page section showing purchased templates with seller info and view access
- **Ownership Access Control**: Purchase verification via `/api/templates/:id/ownership` endpoint, conditional Install/Purchase buttons
- **Database Schema**: 2 new tables (template_purchases, seller_payouts) with buyer/seller relationships, pricing, and payout tracking
- **API Endpoints**: 
    - POST `/api/seller/connect` - Create Stripe Connect account
    - GET `/api/seller/onboarding-status` - Check seller status
    - GET `/api/seller/earnings` - Get earnings and sales data
    - POST `/api/seller/payout` - Request payout transfer
    - POST `/api/templates/:id/purchase` - Create Stripe checkout session
    - GET `/api/user/purchases` - Get user's purchased templates
    - GET `/api/templates/:id/ownership` - Verify template ownership
- **Revenue Split**: Platform keeps 30% fee (PLATFORM_FEE_PERCENTAGE = 30), creators receive 70%
- **Stripe Webhooks**: `checkout.session.completed` handles purchase recording and seller earnings credit

## Case Studies (v4.3 - December 2025)
SEO-optimized public case studies for lead generation and conversion:
- **Landing Page** (`/case-studies`): Overview page with all 3 case studies, SEO meta tags, public access without login
- **TechCorp Solutions** (`/case-studies/techcorp-onboarding-automation`): 85% faster employee onboarding, Active Directory + Exchange Online automation, keywords: employee onboarding automation, bulk user provisioning, CSV import
- **MidWest Healthcare** (`/case-studies/midwest-healthcare-compliance`): 100% HIPAA audit pass rate, security auditing, keywords: HIPAA compliance, AD security audit, Kerberoasting prevention
- **CloudFirst Consulting** (`/case-studies/cloudfront-storage-management`): Zero weekend emergencies, MSP automation across 50+ clients, keywords: MSP automation, disk space monitoring, VMware capacity planning
- **Conversion Features**: Each page includes prominent FREE30 promo code CTA linking to `/signup?promo=FREE30`, testimonials, ROI calculations
- **Homepage Integration**: Case studies teaser section on homepage with three preview cards, footer link under Resources

## Public Pages (v4.3 - December 2025)
Public-facing informational pages accessible without login:
- **About PSForge** (`/about`): Company mission, differentiating features (real scripts not templates, security first, built by practitioners, instant productivity), company values, and product statistics
- **Privacy Policy** (`/privacy`): Comprehensive privacy policy covering data collection, usage, sharing, security, retention, and user rights
- **Terms of Service** (`/terms`): Full terms including account registration, subscription/payments, acceptable use, IP rights, script responsibility, disclaimers, and liability limitations
- **Security** (`/security`): Detailed security features page highlighting malicious code scanner (15+ patterns), injection prevention, comprehensive validation, script integrity (SHA-256), platform security (authentication, data protection, access control), and security score dashboard
- **Footer Navigation**: Homepage footer reorganized with working links to all public pages (Case Studies, Security, About, Contact Support, Privacy, Terms)

## Pro Conversion System (v4.3 - November 2025)
Comprehensive Free-to-Pro conversion strategy with psychological triggers and value demonstrations:
- **Power User Nudge System**: Smart detection of heavy usage patterns with contextual Pro upgrade suggestions
- **Success Milestone Approach**: Celebrates user achievements (1st script, 5 scripts, 10 scripts, 25 scripts, 50 scripts, 100 scripts) with Pro value messaging
- **Community Status Lever**: Badge system (Newcomer, Builder, Craftsman, Expert, Master) showing progression and Pro-exclusive badges
- **Time-Value Calculator**: Tracks time saved per script (30-120 min based on complexity) with ROI visualization
- **Database Schema**: Extended users table with tracking fields (totalScriptsCreated, totalTimeSavedMinutes, firstScriptDate, communityBadge), new tables (user_milestones, nudge_dismissals)
- **Components**: ValueWidget, ProNudgeModal, InScriptTimeTracker, InlineSuggestionCard, CommunityBadgeDisplay, ProgressDashboard
- **Promo Code**: "FREE30" auto-populated at checkout for conversion campaigns

## External Dependencies
- **PostgreSQL**: Primary database for persistent storage.
- **OpenAI API**: Powers the AI Assistant for natural language processing, command suggestions, custom PowerShell script generation, AI documentation generation, and script optimization analysis.
- **Stripe API**: Handles payment processing, subscription management, and webhook events.
- **Office 365 SMTP**: Used for sending transactional emails (password reset, support requests).

## Recent Bug Fixes (v4.2.1 - November 2025)
### Critical apiRequest Bug Pattern
- **Issue**: Discovered widespread bug where apiRequest calls used wrong argument order throughout codebase
- **Correct signature**: `apiRequest(url, method, data)` 
- **Fixed files** (10 instances total):
  - marketplace-detail.tsx: install, rate, delete mutations
  - admin-template-moderation-section.tsx: moderate mutation
  - admin-notifications-section.tsx: update, delete mutations
  - admin-email-templates-section.tsx: update mutation
  - admin.tsx: update role, delete user mutations
  - account.tsx: delete script mutation

### Security Badge Theming
- **Issue**: Hard-coded Badge colors (e.g., `bg-green-600 dark:bg-green-700`) didn't adapt properly to theme
- **Solution**: Use semantic Badge variants with theme-aware colors:
  - Safe: `variant="secondary"` + `text-green-600 dark:text-green-400`
  - Caution: `variant="secondary"` + `text-yellow-600 dark:text-yellow-400`
  - Dangerous: `variant="destructive"`
  - Priority badges: Similar pattern for critical/high/medium/low
- **Fixed files** (4 instances):
  - marketplace.tsx, script-library.tsx, admin-template-moderation-section.tsx: Security badges
  - script-optimization-panel.tsx: Priority badges