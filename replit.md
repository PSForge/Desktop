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
    - **AI Log Troubleshooter (Pro):** Upload log files (.log, .txt, .json, .xml, .csv) from any of the 50 supported platforms for AI-powered diagnosis. Returns identified issues with severity ratings (critical/error/warning/info), root cause analysis, plain-English fix descriptions, ready-to-run PowerShell remediation scripts, step-by-step workarounds, and prevention tips. Scripts can be sent directly to the Script Editor. Backend route: POST /api/ai/troubleshoot (requireSubscriber).
- **Security:** Malicious code scanner detecting 15+ dangerous PowerShell patterns, SHA-256 hashing for script integrity, a visual Security Dashboard, PowerShell injection prevention, robust input validation, and comprehensive error handling.
- **Admin & Monitoring:** Admin dashboard with analytics, user management, and real-time metrics.
- **Notifications & Support:** Admin-controlled notification banner system and a user-facing support request system.
- **Subscription Management:** 
    - **Stripe Integration:** Automatic Stripe webhook processing for Pro tier upgrades, manual sync tool, and promo code support.
    - **Apple In-App Purchase (IAP):** Server-side integration for iOS app subscriptions:
        - Receipt validation via Apple's verifyReceipt API
        - Server-to-Server v2 notification handling at `/webhooks/apple`
        - Transaction storage and user linking via `/api/apple/link-receipt`
        - Subscription status checking via `/api/apple/subscription-status`
        - Automatic user role sync based on subscription status (active/expired/revoked)
        - Admin monitoring at `/api/admin/apple-notifications`
        - Supports all v2 notification types: SUBSCRIBED, DID_RENEW, DID_RECOVER, EXPIRED, REFUND, REVOKE, DID_FAIL_TO_RENEW, GRACE_PERIOD_EXPIRED, etc.
- **CLI Companion Backend:**
    - API key management: users generate `psf_`-prefixed keys via Settings page (`/settings`)
    - Keys are SHA-256 hashed; only prefix stored for display; full key returned once on creation
    - Bearer token auth: `Authorization: Bearer <key>` accepted in `attachUser` middleware alongside session cookies
    - API key routes: `POST/GET /api/user/api-keys`, `DELETE /api/user/api-keys/:id`
    - CLI endpoints (all return `{ ok, data, error }` envelope):
        - Phase 1 (requireAuth unless noted):
            - `GET /cli/me` — flat UserProfile for CLI login/whoami: `{id, email, name, role, totalScriptsCreated, proSinceDate}`
            - `GET /cli/scripts` — list user's scripts; returns `[{id, name, description, createdAt}]`
            - `GET /cli/scripts/:id` — fetch full script content for a specific script
            - `POST /cli/validate` — validate PowerShell script
            - `POST /cli/diagnose` — AI error/code root-cause diagnosis (requireSubscriber)
            - `POST /cli/explain` — AI plain-English explanation of script/error/log (requireSubscriber)
        - Phase 2 – GUI Builder task access (public unless noted):
            - `GET /cli/tasks/platforms` — list all 49 platforms with task counts
            - `GET /cli/tasks` — search tasks (?search, ?platformId, ?category, ?freeOnly, ?limit, ?offset)
            - `GET /cli/tasks/:id` — task detail + parameters (without generate function)
            - `POST /cli/tasks/generate` — generate PowerShell from a task (requireAuth; premium tasks require subscriber)
        - Phase 2 – Marketplace templates (public unless noted):
            - `GET /cli/templates` — search approved templates (?search, ?categoryId, ?sort, ?limit, ?offset)
            - `GET /cli/templates/:id` — template detail + content
            - `POST /cli/templates/:id/install` — install template into script library (requireAuth; paid templates check purchase)
    - Task registry: `server/task-registry.ts` — imports all 49 platform task files, exports `searchTasks()`, `getTaskById()`, `getPlatforms()`
    - Settings page at `/settings` with API key management UI and CLI quick-start guide
    - DB table: `api_keys` (id, userId, name, keyHash, prefix, lastUsedAt, createdAt, revokedAt)
    - Phase 4 – PSForge website updates:
        - `/cli` page (`client/src/pages/cli.tsx`) — full CLI download/docs page: hero, Windows .exe download, npm install, quick-start steps, command reference (8 commands with aliases + Pro badge), feature highlights, GitHub link
        - Settings page updated with "Get CLI" button in CLI Companion card linking to `/cli`
        - Auto-detecting CLI activity: green "CLI active" banner with `lastUsedAt` relative time when any API key has been used
        - Discovery nudge: blue info banner when user has no API keys yet, linking to `/cli`
        - `lastUsedAt` in key list now shows relative time (e.g., "3h ago") with Activity icon
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