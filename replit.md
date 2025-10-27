# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It enables visual PowerShell script creation through an intuitive GUI, offering real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities with a $5/month subscription model for premium features.

## Subscription Model
**Free Tier:**
- Script Generator (full access to all 80+ PowerShell commands)
- GUI Builder access to 8 basic Windows management categories:
  - Event Logs, File System, Networking, Process Management
  - Registry, Security Management, Services, Active Directory

**Pro Tier ($5/month):**
- Everything in Free tier
- AI Assistant with OpenAI-powered natural language command suggestions
- GUI Builder access to all 16 enterprise IT platform categories:
  - Azure AD/Entra ID, Azure Resources, Exchange Online, Exchange Server
  - Hyper-V, Intune, MECM, Microsoft Teams, Office 365, OneDrive
  - Power Platform, SharePoint Online, SharePoint On-Premises
  - Windows 365, Windows Server
- **Total:** 623 automation tasks across 23 categories

**No Trial Period:** Affordable $5/month pricing makes the subscription accessible without requiring a trial.

## User Preferences
- Default theme: Dark mode
- Auto-save script to localStorage
- Real-time validation enabled by default

## System Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Styling**: Tailwind CSS + Shadcn UI components
- **State Management**: React hooks with localStorage persistence
- **Theme**: Dark mode by default with light mode toggle
- **Layout**: Tabbed interface with three main sections:
    - **Script Generator**: Direct code editor with command sidebar and real-time preview.
    - **AI Assistant**: Full-screen AI chat interface for natural language command help.
    - **GUI Builder**: Category-based task interface for common configuration scripts with user-friendly forms, supporting 623 automation tasks across 16 enterprise IT platforms (Active Directory, Azure AD/Entra ID, Azure Resources, MECM, Exchange Online/Server, Hyper-V, Intune, Microsoft Teams, Office 365, OneDrive, Power Platform, SharePoint Online/On-Premises, Windows 365, Windows Server) and 7 Windows management categories (Event Logs, File System, Networking, Process Management, Registry, Security Management, Services).
- **UI/UX Decisions**: Dark mode default, responsive design for mobile/tablet/desktop, consistent spacing, Inter for UI typography, JetBrains Mono for code.

### Backend (Express.js)
- **Server**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage) for users, sessions, and subscriptions
- **Authentication**: Custom session-based auth with Passport.js and express-session
  - Secure password hashing with bcrypt
  - Session persistence in memory store
  - Role-based access control (free, subscriber, admin)
- **API Routes**:
  - `/auth/*`: Login, register, logout, session management
  - `/api/billing/*`: Stripe checkout, customer portal, webhook handler
  - `/api/admin/*`: Admin analytics and user management (admin-only)
- **Stripe Integration**:
  - Webhook endpoint (`/api/billing/webhook`) handles all subscription lifecycle events
  - Automatic role updates when subscriptions are created/updated/canceled
  - Customer portal integration for self-service subscription management
  - Comprehensive event handling: checkout.session.completed, customer.subscription.created/updated/deleted

### Key Features & Implementations
- **Authentication System**:
  - Custom login/signup pages with email and password
  - Session-based authentication with secure cookies
  - Role-based feature access (free, subscriber, admin)
  - Account management page with subscription status display
  - Automatic redirect for protected routes
- **Feature Gating**:
  - GUI Builder: 16 premium enterprise categories locked with Pro badges and lock icons
  - AI Assistant: Full upgrade prompt for free users with value proposition
  - Upgrade modal with Stripe checkout integration
  - Clear visual indicators for premium features
- **Stripe Billing**:
  - $5/month subscription product configured in Stripe
  - Checkout session creation for new subscriptions
  - Customer portal for subscription management
  - Webhook handler for real-time subscription updates
  - Automatic role synchronization with Stripe subscription status
- **Command Library**: Over 80 PowerShell commands across 16 categories, including extensive support for File System, Network, Services, Process Management, Event Logs, Security, Active Directory, Azure, Exchange, and Windows Server (used in Script Generator tab).
- **Script Editor**: Editable textarea with cursor-based command insertion and real-time line count.
- **Code Preview**: Syntax-highlighted PowerShell code output.
- **Validation Panel**: Real-time error and warning display.
- **AI Helper Bot** (Pro feature): OpenAI-powered assistant providing context-aware command suggestions and one-click command addition, with conversation history persistence and sanitized input.
- **GUI Builder**: Task-based script generation with dynamic parameter forms supporting various input types, required field validation, and secure PowerShell script generation with input escaping. Supports **623 automation tasks** across **16 enterprise IT platforms** and **7 Windows management categories**:
  
  **Windows Management Categories** (91 tasks):
  - **Event Logs** (12 tasks): Event Query & Filtering, Export & Archiving, Maintenance & Retention, Security Monitoring
  - **File System** (14 tasks): File Operations, Share Management, Permissions & Security, Cleanup & Maintenance, Reporting & Auditing
  - **Networking** (15 tasks): IP Configuration, DNS Configuration, Firewall Management, Diagnostics & Testing, Advanced NIC Config
  - **Process Management** (11 tasks): Process Inventory, Process Control, Performance Monitoring, Startup & Boot, Diagnostics & Troubleshooting
  - **Registry** (10 tasks): Registry Operations, Backup & Export, Search & Query, Security & Permissions
  - **Security Management** (15 tasks): Account Security, Windows Defender, BitLocker & Encryption, Security Policy, Security Monitoring, Patch Management
  - **Services** (14 tasks): Service Inventory, Service Control, Startup Configuration, Service Accounts, Service Dependencies, Recovery & Failover, Service Health, Security Hardening, Backup & Documentation
  
  **Enterprise IT Platforms** (532 tasks):
  - **Active Directory** (30 tasks): User & Computer Management, Group Policy, Organization & Delegation, Security & Permissions, Replication & Sites, Reporting & Auditing
  - **Azure AD / Entra ID** (30 tasks): User Lifecycle Management, Groups & Access Management, Reporting & Auditing, Device & Identity Management, Maintenance & Governance
  - **Azure Resources** (30 tasks): Resource Management, Networking, Compute, Storage, Monitoring, Policy & Governance
  - **Exchange Online** (20 tasks): User Mailboxes & Licenses, Distribution & Groups, Transport Rules & Mail Flow, Message Trace & Reporting, Shared & Resource Mailboxes, Security & Compliance, Maintenance & Hygiene, Reporting & Inventory
  - **Exchange Server** (20 tasks): Mailboxes & Users, Distribution Groups & Contacts, Mail Flow & Transport Rules, Database & DAG Management, Maintenance & Hygiene, Security & Compliance, Reporting & Inventory, Server & Service Management
  - **Hyper-V** (30 tasks): VM Lifecycle, Networking, Storage & Backup, Performance & Monitoring, Replication, Security
  - **Intune** (30 tasks): Device Management, Compliance & Reporting, Updates, Applications, Configuration, Security
  - **MECM** (30 tasks): Collections & Queries, Applications & Deployments, Software Updates, Client Management & Health, Packages & Programs, Operating System Deployment, Reporting & Inventory, Site Configuration & Maintenance
  - **Microsoft Teams** (30 tasks): Teams Management, User Management, Policies, Reporting, Meetings, Voice, Compliance
  - **Office 365** (30 tasks): Licensing, Security, Tenant Management, Reporting, Administration, Compliance
  - **OneDrive** (30 tasks): User Management, Security & Compliance, Reporting, Sharing, Storage, Administration
  - **Power Platform** (30 tasks): Environment Management, Apps & Flows, Connectors, Governance, Data Management
  - **SharePoint Online** (30 tasks): Site Management, Permissions, Content Management, Security, Storage, Sharing
  - **SharePoint On-Premises** (30 tasks): Farm Management, Site Collections, Service Applications, Content, Security
  - **Windows 365** (30 tasks): Cloud PC Management, Provisioning, Monitoring, User Assignment, Policies
  - **Windows Server** (30 tasks): Roles & Features, Active Directory Integration, Monitoring, Security, Services
- **Export Functionality**: Enhanced dialog with scrollable script preview, copy to clipboard, and .ps1 file download.
- **Security**: PowerShell injection prevention through input escaping, robust input validation, and comprehensive error handling.

## External Dependencies
- **OpenAI API**: Used for the AI Helper Bot's natural language processing and command suggestion capabilities (Pro feature).
- **Stripe API**: Payment processing, subscription management, and billing infrastructure.

## Admin Features
- **Default Admin Account**:
  - Email: admin@psforge.com
  - Password: admin123
  - Auto-created on server startup
  - Full access to all features and admin dashboard
- **Admin Dashboard** (/admin route):
  - **Navigation**: "Account Settings" button to navigate back to user account page
  - **Analytics Overview**: Total users, active subscribers, monthly recurring revenue (MRR), churn rate
  - **Growth Trends**: 30-day signups, new subscriptions, cancellations
  - **User Breakdown**: Distribution by role (free, subscriber, admin) with percentages
  - **Recent Activity**: Detailed metrics for new signups, subscriptions, and cancellations
  - Access restricted to admin role only via requireAdmin middleware
- **User Management**:
  - **Create Users**: Form-based user creation with configurable roles
    - Backend endpoint: POST /api/admin/users with email uniqueness validation
    - Fields: email, password (min 8 chars), name, role (free/subscriber/admin)
    - Automatic password hashing with bcrypt
    - Real-time analytics and user list updates
    - Toast feedback for success/error states
  - **View Users**: All users displayed with email, name, role, and join date
  - **Edit Roles**: Inline role editing with dropdown selection
  - **Real-time Updates**: Optimistic UI with cache invalidation
  - **Stripe Integration**: Customer identification badges for subscribers
  - Accessible from admin dashboard at /admin

## Recent Changes (October 27, 2025)
- Implemented complete subscription system with Stripe integration
- Added authentication system with login/signup pages
- Implemented feature gating for AI Assistant and premium GUI categories
- Created upgrade modal and account management page
- Fixed authentication state handling for anonymous and logged-in users
- Built admin dashboard with analytics and user management
- Added admin endpoints for analytics and role management
- Fixed AI Assistant JSON parsing bug with OpenAI response_format
- **Revamped homepage with professional branding:**
  - Integrated custom PSForge logos (icon, transparent, and light versions)
  - Added comprehensive pricing section showcasing Free vs Pro tiers
  - Enterprise platform showcase highlighting 16 premium IT platforms
  - Hero section with gradient background and icon showcase
  - Clear subscription benefits and feature comparison
  - Multiple CTAs strategically placed for signup conversion
  - Responsive design with dark/light mode logo adaptation
- **Password Change Feature:**
  - Added secure password change form on account page
  - Backend endpoint validates current password before allowing change
  - Uses bcrypt for password hashing
  - Requires minimum 8 characters for new password
  - Form validation ensures new password and confirmation match
  - Success/error feedback with toast notifications
  - Form automatically resets after successful password change
  - Fully tested end-to-end with admin account
- **Fixed React Link Component Issues:**
  - Corrected nested anchor tag warnings in login and signup pages
  - Link components now properly render without nesting
- **Admin User Creation Feature:**
  - Added user creation form on admin dashboard with role selection
  - Backend endpoint (POST /api/admin/users) validates email uniqueness and hashes passwords
  - Admins can create users with any role (free, subscriber, admin) directly from dashboard
  - Form includes proper validation, error handling, and success feedback
  - Real-time analytics and user list updates after user creation
  - Navigation buttons added between admin dashboard and account page