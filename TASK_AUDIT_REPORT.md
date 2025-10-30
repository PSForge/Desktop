# PSForge Task Coverage Audit Report
## Generated: October 30, 2025

This document audits all 23 platforms against the requirements in "Full Repo_1761827302846.txt" to ensure complete task coverage.

---

## Executive Summary

**Total Platforms**: 23
**Total Task Files**: 23
**Total Tasks Implemented**: 461+ (preliminary count)

---

## Platform-by-Platform Analysis

### 1. Active Directory (On-Prem) - `ad-tasks.ts`
**Task Count**: 30 tasks

**Document Requirements** (from Full Repo txt):
- Users: create/import; set attributes; move OU; enable/disable; unlock; reset/expire password; profile/home path; logon hours; manager/department; thumbnailPhoto; UPN suffix changes; convert external→member; stale/inactive discovery; bulk offboard
- Groups: create/security/distribution; owners; add/remove/bulk membership; nested groups; convert type/scope; cleanup empty/orphaned; export membership
- Computers: join/unjoin; move OU; rename; reset account; reimage flags; stale device cleanup; BitLocker key backup; delegated local admin
- OUs & Delegation: create OU tree; link/unlink GPO; protect-from-accidental-deletion; delegation model; audit permissions drift
- GPO: create/copy/backup/restore; import settings; link order/enforcement; security filtering/WMI filters; RSOP reports; drift report
- DNS: zones/records CRUD; scavenging; aging; conditional forwarders; zone transfers; SOA/NS management; stale record cleanup
- Sites & Services: site/subnet CRUD; site links/cost/schedule; bridgehead/DC placement
- Domain/Forest Ops: FSMO transfer/seize; functional level checks; replication health/force; SYSVOL status; DC promotion/demotion; time source config
- PKI/Certificates: template CRUD; auto-enrollment settings; CRL publish; backup/restore
- Auditing & Reports: privileged groups members; password never expires; locked/disabled; duplicated SPNs; constrained/unconstrained delegation; kerberoastable accounts; last logon reports

**Status**: ✅ NEEDS DETAILED REVIEW - File has 30 tasks covering Identity Lifecycle, Groups & Access, Computers & OUs, GPO & Configuration, Security & Compliance, DNS/DHCP, Reporting & Inventory, Migrations & Hygiene, Bulk Actions

**Potential Gaps Identified** (needs verification):
- DNS operations (zones/records CRUD, scavenging, aging, conditional forwarders)
- Sites & Services operations (site/subnet CRUD, site links management)
- Domain/Forest Ops (FSMO operations, functional level checks, DC ops)
- PKI/Certificates operations (template CRUD, auto-enrollment, CRL)
- Some specific user operations (thumbnailPhoto, UPN suffix changes, logon hours)
- Group conversion operations (type/scope conversion)
- Computer join/unjoin operations
- OU tree creation and delegation
- GPO creation, copy, import settings, security filtering, WMI filters

---

### 2. Exchange Online - `exchange-online-tasks.ts`
**Task Count**: 20 tasks

**Document Requirements**:
- Recipients: user/shared/resource mailboxes; room/equipment; mail users/contacts; distribution lists & dynamic DLs; groups to Teams conversion; aliases/proxy; mailbox moves; archive enable; litigation hold/in-place hold; mailbox permissions (FullAccess/SendAs/SendOnBehalf)
- Policies & Config: mailbox plans; retention/MRM; OWA/Mobile/POP/IMAP; transport rules; journaling; DLP policies; spam/anti-phish; safe/blocked senders; DKIM/DMARC/SPF
- Mail Flow: connectors (inbound/outbound); accepted domains; remote domains; TLS; rules with exceptions; disclaimers; automatic forwarding/redirect governance
- Migrations: cutover/staged/hybrid batches; PST import/export jobs; mapping CSV prep; reports/progress
- Mobile: ActiveSync policies; quarantine/allow devices; wipe device
- Compliance & Audit: mailbox audit enable; eDiscovery cases/searches/exports; content search; message trace; admin audit log export; high-risk rule detection
- Reporting: mailbox sizes/quotas; inactive mailboxes; send/receive stats; transport rule hit counts; spam/phish trends

**Status**: 🔍 NEEDS DETAILED REVIEW

**Potential Gaps** (needs verification):
- Migration operations (PST import/export, migration batches)
- DLP policies
- DKIM/DMARC/SPF configuration
- eDiscovery operations
- Mobile device management (ActiveSync policies, device wipe)
- Advanced mail flow (connectors, accepted domains, remote domains)

---

### 3. Exchange Server (On-Prem) - `exchange-server-tasks.ts`
**Task Count**: 20 tasks

**Document Requirements**:
- Org/Server: install roles; virtual directories URLs; certificates; backup/restore of configs; DAG setup/seeds; database mounts/moves; circular logging toggles; maintenance mode; health probes
- Databases: create/mount/dismount; move DB/logs; mailbox moves; defrag/offline maintenance; backup status
- Recipients & Mail Flow: all EO tasks analogues plus Edge/Hub connectors; receive connectors; send connectors; transport queues management
- Hybrid: HCW automation; accepted domains sync; free/busy; connectors; centralized transport
- Compliance: journaling, retention tags/policies; message tracking logs
- Reporting: DAG copy/lag health; queue trends; protocol logs; client access logs

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 4. Microsoft Entra ID (Azure AD) - `azure-ad-tasks.ts`
**Task Count**: 25 tasks

**Document Requirements**:
- Users: create/import; attributes; license assign/reclaim with plan toggles; password reset; MFA methods; convert guest/member; delete/restore (soft delete)
- Groups: security/M365; dynamic rules; owners; membership CRUD; role-assignable groups; naming policies
- Apps & Enterprise Apps: app registrations; secrets/certs rotation; API permissions grant; service principal assignments; consent policies; SSO config; SCIM provisioning
- Roles & PIM: assign/remove roles; eligible/active (PIM); approval workflows; access reviews
- Conditional Access: policy CRUD; include/exclude; session controls; report-only vs enforce; break-glass validation
- Identity Protection: risky users/sign-ins export; remediation actions
- B2B/B2C: invite guests; redeem status; custom attributes; external collaboration settings
- Audit & Reporting: sign-in logs; directory audit; license usage; stale accounts; last sign-in

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 5. Azure Resources - `azure-resources-tasks.ts`
**Task Count**: 31 tasks

**Document Requirements**: Comprehensive Azure management (Subscriptions/RGs, Compute, Networking, Storage, RBAC, Policy, Monitor, Backup/Recovery, Cost, Hygiene)

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 6. SharePoint Online - `sharepoint-online-tasks.ts`
**Task Count**: 30 tasks

**Document Requirements**: Sites, Permissions, Libraries/Lists, Content, Governance, Search/Taxonomy, Reporting

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 7. SharePoint Server (On-Prem) - `sharepoint-onprem-tasks.ts`
**Task Count**: 30 tasks (expanded from initial 5)

**Document Requirements**: Farm, Web Apps & Site Collections, Permissions/Content, Search, Governance/Reporting

**Status**: ✅ APPEARS COMPLETE - Has 30 tasks covering farm management, site collections, backups, content databases, service applications, web apps, features

---

### 8. MECM/SCCM - `mecm-tasks.ts`
**Task Count**: 30 tasks

**Document Requirements**: Collections, Applications/Packages, OSD, Software Updates, Compliance Settings, Devices, Infrastructure, Reporting

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 9. Hyper-V - `hyper-v-tasks.ts`
**Task Count**: 31 tasks

**Document Requirements**: Hosts, VMs, Storage, Networking, Replica/DR, Reporting

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 10. Intune - `intune-tasks.ts`
**Task Count**: 31 tasks

**Document Requirements**: Autopilot, Devices, Configuration, Compliance, Apps, Update Management, Security, RBAC/Scope, Reports

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 11. Power Platform - `power-platform-tasks.ts`
**Task Count**: 30 tasks

**Document Requirements**: Environments, DLP Policies, Apps, Flows, Power BI, Copilot/Chatbots, Governance Reports

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 12. Microsoft Teams - `teams-tasks.ts`
**Task Count**: 29 tasks

**Document Requirements**: Teams/Channels, Membership, Policies, Voice, Meetings/Webinars, App Governance, Lifecycle, Reporting

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### 13. Microsoft 365 (Tenant-Level) - `office365-tasks.ts`
**Task Count**: 5 tasks

**Document Requirements**: Org Config, Licensing, Security/Compliance, Sharing & Collaboration Defaults, Health & Message Center, User Lifecycle, Reporting

**Status**: ⚠️ CRITICAL GAP - Only 5 tasks, document requires comprehensive tenant-level operations

**Known Tasks**:
1. Configure Audit Logging
2. Add Custom Domain
3. Remove Custom Domain
4. Configure Password Policy
5. (Unknown 5th task)

**MAJOR GAPS IDENTIFIED**:
- Org branding and company profile
- Service plan toggles
- Security defaults configuration
- Legacy auth disable
- DLP/retention labels/policies (tenant-level)
- Insider risk management
- SPO/ODFB external sharing posture
- Teams external domains
- Meeting defaults
- Health & Message Center pulls
- User onboarding/offboarding bundles
- Comprehensive reporting (license usage, MFA status, storage consumption)

---

### 14. Windows 365 (Cloud PC) - `windows365-tasks.ts`
**Task Count**: 30 tasks (expanded from initial 5)

**Document Requirements**: Licenses, Provisioning Policies, Images, Azure Network Connections, Cloud PC Ops, Boot/Switch/Offline, Monitoring/Reporting

**Status**: ✅ APPEARS COMPLETE - Has 30 tasks covering all major areas

---

### 15. OneDrive for Business - `onedrive-tasks.ts`
**Task Count**: 30 tasks

**Document Requirements**: Provisioning, Access, Sharing, Content, Reporting, Lifecycle

**Status**: ✅ APPEARS COMPLETE - Has 25 tasks from earlier verification

---

### 16. Windows Server (General) - `windows-server-tasks.ts`
**Task Count**: 29 tasks

**Document Requirements**: Local Users/Groups, Networking, Storage/FS, Services/Processes, Event Logs, Registry, Security, Roles & Features, Backup/Recovery, Monitoring/Reporting

**Status**: 🔍 NEEDS DETAILED REVIEW

---

### Plus Base Windows Management Categories:
- File System - `file-system-tasks.ts` (14 tasks)
- Networking - `networking-tasks.ts` (15 tasks)
- Services - `services-tasks.ts` (14 tasks)
- Process Management - `process-management-tasks.ts` (11 tasks)
- Event Logs - `event-log-tasks.ts` (12 tasks)
- Registry - `registry-tasks.ts` (10 tasks)
- Security Management - `security-management-tasks.ts` (15 tasks)

---

## Next Steps

1. ✅ Complete detailed audit of each platform's task file
2. ⚠️ Identify specific gaps in each platform
3. 📋 Create comprehensive list of missing tasks
4. ✏️ Implement missing tasks (if any found)
5. ✅ Ensure no duplicate tasks exist
6. 📊 Generate final coverage report

---

## Notes

- This is a preliminary audit based on task counts
- Detailed content review of each task file is required
- Must verify against exact requirements in source document
- Critical to avoid creating duplicate tasks
