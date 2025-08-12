APPENDIX C: DEVELOPMENT MILESTONES &
ACCEPTANCE CRITERIA
C.1 Overview
The project will be delivered in four (4) milestones over five (5) weeks. Each milestone includes a review
session and written sign-off. PracticePanther serves as the core data source throughout the platform.
C.2 Milestone 1: Foundation, Authentication, and Sync (Week 1)
Focus: Establish backend infrastructure, user authentication, and initial PracticePanther integration.
Deliverables:
• Backend and database setup (PostgreSQL / Node.js)
• Frontend layout and role-based routing (React / Tailwind)
• JWT login system for all user roles
• PracticePanther one-way sync: Clients, Matters, Contacts
• Manual and scheduled sync configuration
• Admin panel to monitor and trigger syncs
Acceptance Criteria:
• All user roles can log in and access appropriate dashboards
• Synced data from PracticePanther is visible in the system
• Admin can view sync logs and manually trigger data updates
C.3 Milestone 2: Exchange Management, Tasks, and User Controls (Weeks 2–
3)
Focus: Build out the exchange engine, implement task workflows, and complete user role management.
Deliverables:
• Display of PracticePanther "Matters" as exchanges
• Exchange status tracking: Pending, 45-Day, 180-Day, Completed
• Manual exchange creation and editing
• User assignment to exchanges (admin-controlled)
• Task sync from PracticePanther with status and due dates (if applicable)
• Filtering/search by user, status, or exchange
• Admin controls: activate/deactivate users, edit user details
Docusign Envelope ID: 9D135FAF-C401-4E7C-8C68-22B6911A10A5
Acceptance Criteria:
• Exchanges and tasks appear correctly from PracticePanther
• Manual creation and assignment of users
• Filtering and search tools operate as specified
C.4 Milestone 3: Documents, Messaging, and Notifications (Week 4)
Focus: Enable user collaboration through secure document handling and real-time communication.
Deliverables:
• Document upload/download per exchange
• Role-based access and PIN-protected files
• Document auto-generation from templates using exchange/member data
• Real-time exchange-specific messaging chat
• File attachments within chat
• Notification system (email via SendGrid, optional SMS via Twilio)
Acceptance Criteria:
• Users can securely upload, download, and view documents with correct permissions
• Messaging and file sharing functions as designed
• Notifications are sent based on system events
C.5 Milestone 4: Audit Logging, Admin Tools, Exporting, and Deployment
(Week 5)
Focus: Finalize administrative control, visibility, and move to production.
Deliverables:
• Audit logs: login events, sync activity, document and task actions
• Export capabilities (CSV/PDF): exchanges, tasks, user logs, reports
• Admin dashboard with access to logs, system metrics, and sync controls
• Enforcement of final user roles and access restrictions
• Production deployment with domain, SSL, and cloud hosting (AWS/GCP/Firebase)
• Staging cleanup and project handoff
• Delivery of full source code and admin documentation
Acceptance Criteria:
• Admin has full control and visibility over user and system activity
• Export tools generate accurate, downloadable reports
• Final system is deployed securely and performs as specified
Docusign Envelope ID: 9D135FAF-C401-4E7C-8C68-22B6911A10A5