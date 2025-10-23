# PSForge - PowerShell Script Builder

## Overview
PSForge is a professional web-based PowerShell script builder designed for IT technicians and system administrators. It enables visual PowerShell script creation through an intuitive GUI, offering real-time syntax generation, AI-powered command suggestions, parameter validation, error checking, and script export capabilities. The project aims to streamline script development, enhance administrative efficiency, and provide a comprehensive platform for managing PowerShell automation.

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
    - **GUI Builder**: Category-based task interface for common configuration scripts with user-friendly forms, supporting 183 automation tasks across 16 enterprise IT platforms including Active Directory, Azure AD/Entra ID, Azure Resources, MECM, Exchange Online/Server, Hyper-V, Intune, Microsoft Teams, Office 365, OneDrive, Power Platform, SharePoint Online/On-Premises, Windows 365, and Windows Server.
- **UI/UX Decisions**: Dark mode default, responsive design for mobile/tablet/desktop, consistent spacing, Inter for UI typography, JetBrains Mono for code.

### Backend (Express.js)
- **Server**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage)
- **API Routes**: Validation endpoints.

### Key Features & Implementations
- **Command Library**: Over 80 PowerShell commands across 16 categories, including extensive support for File System, Network, Services, Process Management, Event Logs, Security, Active Directory, Azure, Exchange, and Windows Server (used in Script Generator tab).
- **Script Editor**: Editable textarea with cursor-based command insertion and real-time line count.
- **Code Preview**: Syntax-highlighted PowerShell code output.
- **Validation Panel**: Real-time error and warning display.
- **AI Helper Bot**: OpenAI-powered assistant providing context-aware command suggestions and one-click command addition, with conversation history persistence and sanitized input.
- **GUI Builder**: Task-based script generation with dynamic parameter forms supporting various input types, required field validation, and secure PowerShell script generation with input escaping. Supports **183 automation tasks** across **16 enterprise IT platforms**:
  - **Active Directory** (30 tasks): User & Computer Management, Group Policy, Organization & Delegation, Security & Permissions, Replication & Sites, Reporting & Auditing
  - **Azure AD / Entra ID** (30 tasks): User Lifecycle Management, Groups & Access Management, Reporting & Auditing, Device & Identity Management, Maintenance & Governance
  - **Azure Resources** (15 tasks): Resource Management, Networking, Compute, Storage, Monitoring
  - **Exchange Online** (20 tasks): User Mailboxes & Licenses, Distribution & Groups, Transport Rules & Mail Flow, Message Trace & Reporting, Shared & Resource Mailboxes, Security & Compliance, Maintenance & Hygiene, Reporting & Inventory
  - **Exchange Server** (20 tasks): Mailboxes & Users, Distribution Groups & Contacts, Mail Flow & Transport Rules, Database & DAG Management, Maintenance & Hygiene, Security & Compliance, Reporting & Inventory, Server & Service Management
  - **Hyper-V** (10 tasks): VM Lifecycle, Networking, Storage & Backup, Performance & Monitoring
  - **Intune** (5 tasks): Device Management, Compliance & Reporting, Updates
  - **MECM** (13 tasks): Collections & Queries, Applications & Deployments, Software Updates
  - **Microsoft Teams** (5 tasks): Teams Management, User Management, Policies, Reporting
  - **Office 365** (5 tasks): Licensing, Security, Tenant Management, Reporting
  - **OneDrive** (5 tasks): User Management, Security & Compliance, Reporting
  - **Power Platform** (5 tasks): Environment Management, App Management, Data Management
  - **SharePoint Online** (5 tasks): Site Management, Permissions, Content Management
  - **SharePoint On-Premises** (5 tasks): Farm Management, Site Collections, Service Applications
  - **Windows 365** (5 tasks): Cloud PC Management, Provisioning, Monitoring
  - **Windows Server** (5 tasks): Roles & Features, Active Directory Integration, Monitoring, Security
- **Export Functionality**: Enhanced dialog with scrollable script preview, copy to clipboard, and .ps1 file download.
- **Security**: PowerShell injection prevention through input escaping, robust input validation, and comprehensive error handling.

## External Dependencies
- **OpenAI API**: Used for the AI Helper Bot's natural language processing and command suggestion capabilities.