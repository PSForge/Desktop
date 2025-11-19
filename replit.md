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
    - **Script Management (v4.0)**: Comprehensive script library with advanced features:
        - **Tag System**: Create custom tags with colors, add/remove tags from scripts, filter scripts by tags
        - **Favorites**: Mark scripts as favorites for quick access, dedicated favorites view
        - **Recent Scripts**: Track last accessed timestamp, view recently used scripts (up to 10)
        - **Advanced Search**: Filter scripts by name, description, platform category, and tags
        - **AI Documentation**: Auto-generate comment-based help documentation following Microsoft PowerShell standards
    - **AI Script Optimization (v4.0 - Pro Feature)**: Advanced AI-powered script analysis with:
        - **Performance Analysis**: Detect inefficient patterns, suggest parallel processing opportunities, loop optimizations, memory improvements
        - **Security Deep-Scan**: Identify hardcoded credentials, unsafe cmdlets, privilege escalation risks, code injection vulnerabilities
        - **Best Practices Enforcement**: Check for missing error handling, parameter validation, approved verbs, comment-based help, WhatIf/Confirm support
        - **Alternative Approaches**: Provide 2-3 different implementation methods with pros/cons analysis
        - **Categorized Recommendations**: Organized by priority (critical, high, medium, low) with line numbers and code snippets
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
- **OpenAI API**: Powers the AI Assistant for natural language processing, command suggestions, custom PowerShell script generation, AI documentation generation, and script optimization analysis (v4.0).
- **Stripe API**: Handles payment processing, subscription management, and webhook events.
- **Office 365 SMTP**: Used for sending transactional emails (password reset, support requests).

## Version History

### 🎯 PSForge v4.0 Strategic Roadmap

**Phase 1 (v4.0)**: Script Library + AI Optimization ✅ COMPLETED
**Phase 2 (v4.1)**: Git Integration 🚧 IN PROGRESS
**Phase 3 (v4.2)**: Templates Marketplace 📋 PLANNED

---

### v4.0 Phase 1 (November 2025) - Enhanced Script Library & AI Optimization ✅ COMPLETED
**Script Library Management:**
- Tag system with custom colors and many-to-many script-tag relationships
- Favorites system with toggle capability and dedicated favorites view
- Recent scripts tracking with last_accessed timestamps
- Advanced filtering by platform category, tags, name, and description
- Comprehensive script library page at `/library` with tabs for All/Favorites/Recent
- Real-time tag state updates after add/remove mutations (prevents stale UI data)

**AI-Powered Features (Pro Tier):**
- AI Documentation Generator: Auto-generate PowerShell comment-based help
- AI Script Optimizer with four analysis categories:
  - Performance recommendations (parallel processing, loop optimization)
  - Security vulnerability detection (credentials, unsafe cmdlets)
  - Best practices enforcement (error handling, parameter validation)
  - Alternative implementation approaches with pros/cons
- Priority-based styling with Tailwind classes for all recommendations

**Database Schema Updates:**
- `tags` table: id, userId, name, color, createdAt
- `script_tags` junction table with UNIQUE constraint on (script_id, tag_id) to prevent duplicates
- `scripts` table: Added is_favorite, last_accessed, documentation fields

**API Endpoints:**
- Tag management: POST /api/tags, GET /api/tags, DELETE /api/tags/:id
- Script-tag relationships: POST /api/scripts/:scriptId/tags/:tagId, DELETE /api/scripts/:scriptId/tags/:tagId
- Library features: GET /api/scripts/library/favorites, GET /api/scripts/library/recent, PATCH /api/scripts/:id/favorite
- AI features: POST /api/ai/generate-docs, POST /api/ai/optimize (Pro only)

**Critical Bug Fixes:**
- Fixed apiRequest parameter order (url, method, data) across entire codebase
- Fixed unique constraint on script_tags to prevent duplicate tag assignments
- Fixed scriptTags state updates after mutations for real-time UI updates
- Fixed priority styling in optimization panel using Tailwind classes instead of CSS variables
- Fixed navigation URLs from /library to /builder with correct tab parameters

### v4.1 Phase 2 (November 2025) - Git Integration 🚧 IN PROGRESS
**Implemented Features:**
- GitHub OAuth integration using Replit's native GitHub connector
- Repository connection/disconnection with user-specific isolation
- Branch management (create, switch, delete) with protection for default branches
- Commit and push operations directly from PSForge to GitHub
- Pull scripts from GitHub repositories
- Git panel in script builder with visual status indicators
- Commit history tracking with database persistence
- Visual diff viewer for comparing script versions

**Database Schema:**
- `git_repositories` table: userId, provider, repoOwner, repoName, defaultBranch, currentBranch, lastSyncedAt, createdAt
- `git_commits` table: repositoryId, scriptId, commitSha, message, branch, author, createdAt
- Foreign key relationships ensuring data integrity

**API Endpoints (12 total):**
- GET /api/git/user - Fetch authenticated GitHub user
- GET /api/git/repositories - List connected repositories (database)
- GET /api/git/github/repositories - List available GitHub repositories
- POST /api/git/repositories - Connect repository
- GET /api/git/repositories/:id - Get repository details
- DELETE /api/git/repositories/:id - Disconnect repository
- GET /api/git/repositories/:id/branches - List branches
- POST /api/git/repositories/:id/branches - Create branch
- DELETE /api/git/repositories/:id/branches/:name - Delete branch
- POST /api/git/repositories/:id/checkout - Switch branch
- POST /api/git/repositories/:id/commit - Commit and push to GitHub
- POST /api/git/repositories/:id/pull - Pull script from GitHub
- GET /api/git/repositories/:id/commits - Get commit history
- GET /api/git/repositories/:id/github-commits - Get GitHub commits

**UI Components:**
- Git Panel (`client/src/components/git-panel.tsx`): Repository connection, branch management, commit interface
- Diff Viewer (`client/src/components/diff-viewer.tsx`): Visual comparison of script versions
- Git Tab in script builder: Dedicated interface for Git operations

**Security Architecture:**
- **CRITICAL FIX**: Per-user GitHub credential isolation
  - All GitHub client functions accept userId parameter
  - NO module-level credential caching
  - Connector settings fetched per-request to prevent cross-user contamination
  - Each request validates user authorization before accessing Git resources
  - Prevents severe multi-tenant credential leakage vulnerability

**Remaining Work:**
- GitLab and Azure DevOps support (manual OAuth + API integration)
- Enhanced conflict resolution UI
- Multi-file commit support
- Git integration testing

**Target Complexity**: High | **Timeline**: 3-4 days
**Enterprise Value**: Provides enterprise credibility and workflow integration

### v4.2 Phase 3 (Future) - Templates Marketplace 📋 PLANNED
**Planned Features:**
- Public marketplace for PowerShell script templates
- Community-contributed templates with ratings/reviews
- Revenue sharing model (70/30 split for creators)
- Admin moderation tools
- Featured collections and categories
- Template versioning and updates
- Search and discovery features
- Author profiles and analytics

**Target Complexity**: High | **Timeline**: 3-4 days
**Business Value**: Community growth engine and additional revenue stream

### v3.1.0 (November 2025) - Comprehensive Script Validation
- Dual-mode validation system with Basic (automatic) and Comprehensive (on-demand)
- Scored assessment (0-100) with dependency detection and impact analysis
- Microsoft PowerShell best practices checking and compliance validation
- Stale-results prevention logic with toast notifications for errors

### v3.0.0 (October 2025) - Initial Production Release
- 1000 automation tasks across 48 enterprise IT platforms
- Stripe subscription system with webhook processing
- Admin dashboard with real-time analytics
- Password reset system with Office 365 email integration