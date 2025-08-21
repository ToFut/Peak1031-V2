Peak 1031 V2 Platform – Milestone‐Based User Acceptance Test Report (Aug 19 2025)
Test Context
• Environment: Peak 1031 v2 demo site – peak1031‐v2‐8uus.vercel.app viewed in Chrome as the Administrator role.
• Date & timezone: testing performed on 19 Aug 2025 (America/New_York). Relative deadlines (e.g., 45‐day or 180‐day periods) were interpreted against this date.
• Methodology: Navigation of each module, reproduction of tasks up to, but not including, irreversible actions (account creation, message sending, or file uploads). Observations are mapped to milestones defined in the acceptance questionnaire. Citations from the UI are included where relevant.
Milestone 1 – Foundation, Authentication & Sync 1.1 Sign‐up & Login
• Login page – The landing page requires an email and password. A note displays demo credentials ( admin@peak1031.com / admin123 ) and there are “Need an account?” and “Forgot your password?” links 1 . No Google/social login option exists. Clicking “Need an account?” shows an error: “Account creation will be handled by your administrator,” so self‐registration is disabled 2 .
• Password recovery – Using “Forgot your password?” triggers a message stating that a reset link will be sent (no email was verified). Two‐factor authentication (2FA) options are only visible under user management but were not configured.
Assessment: Basic email/password login works, but there is no user‐side sign‐up, no Google login, and no confirmation that JWT tokens are used. Password recovery shows a confirmation message but cannot be verified.
1.2 Dashboard Experience
• Admin dashboard – After login, the dashboard shows metrics such as critical issues, pending tasks, system uptime, total exchanges and active users 3 . A left‐hand navigation menu leads to exchanges, tasks, contacts, documents, messages and admin sections. There is no universal search bar or communication widget. The dashboard does not display a concise list of urgent tasks or allow responding to communications from within the dashboard.
• Widgets & irrelevant content – The dashboard includes metrics for Total Exchanges and Active Users but does not show only the three most urgent staff items as specified in the acceptance criteria. There is no “Total Exchange/Active Clients” widget either.
Assessment: The dashboard provides high‐level metrics but lacks the prioritized task list, universal search and integrated communication features expected for Milestone 1.
     1

1.3 Data Sync & Verification
• Data availability – Exchange, contact and document data appear pre‐loaded, suggesting synchronization has occurred. However, there is no “sync status” indicator or explicit PracticePanther integration visible on the admin dashboard.
• Data accuracy & formatting – Within exchanges, names, dates and property details are clearly presented (e.g., 45‐day and 180‐day countdowns) 4 . Dates consistently use day‐month‐year format. There is no evidence of truncated or missing data.
Assessment: Data is visible and well‐formatted but the platform offers no feedback on sync status or ability to trigger/resync data.
1.4 Task & Form Management
• Task board – Each exchange includes a Kanban‐style task board (To Do, In Progress, etc.) accessible from a “Tasks” tab 5 . A “New Task” button launches a multi‐step form where a title, description, due date, assignee and tags can be entered 6 . A calendar picker allows scheduling tasks; tasks can be assigned to users. We did not finalize task creation to avoid side effects.
• Recurring tasks & rollover – The interface makes no mention of recurring tasks or automatic rollover to the next day. The global task management view lists zero tasks even when tasks exist within an exchange 7 .
• Forms – The questionnaire references E‐1324 forms; no default forms or auto‐populated documents were encountered.
Assessment: Basic task creation works but recurring tasks, task rollover and default forms are absent or unimplemented.
1.5 Security Features
• Two‐factor authentication – The user management context menu has an “Enable 2FA” option but it was not configured during testing 8 . There is no indication of phone‐based verification.
• IP logging & session management – No interface exposes IP history, login attempts or session management. Logging out is straightforward via the user menu.
• Urgency indicators – Exchange cards show 45‐day or 180‐day status badges (green for 45‐day, blue for active, red if overdue) 9 , but there is no color coding for 48‐hour, weekly or monthly urgency on the dashboard.
Assessment: Security configuration options are minimal. 2FA and IP logging features are present only in names or not implemented. Urgency highlighting is limited to 45‐day/180‐day tags.
Milestone 2 – Exchange Management, Tasks & User Controls 2.1 Exchange Visibility
• Exchange list – The Exchange Management page lists exchanges with search and filters (All, Pending, 45 Day Period, 180 Day Period, Completed, Terminated) 9 . Each card displays the exchange name, status badge, countdown to deadlines, value, progress bar and property. Filtering by status or searching by keyword works 10 .
• Stage clarity – The statuses (Pending, 45 Day, 180 Day, Completed) are clearly labelled with colored tags, and the countdown shows days remaining or overdue. However, there is no single board showing all upcoming deadlines across exchanges.
 2

2.2 Deadline Management
• Timers – Countdown timers for 45‐day and 180‐day deadlines appear on each exchange card and inside exchange details 4 . The color coding makes urgency somewhat apparent. There is no dedicated visual countdown board for today’s and upcoming tasks, nor auto‐generated tasks triggered a week before deadlines.
• Reminders – The system lacks notification settings for reminders; the notifications panel remains empty 11 .
2.3 Exchange Operations
• Editing/creating exchanges – The platform allows viewing exchange details (participants, deadlines, property, tasks and documents) 4 . An “Add User” side panel is available 12 . There is no button to create a new exchange or edit key fields, so exchange operations cannot be tested.
• Accounting & fees – Fields for exchange value and progress exist, but no accounting details, proof of funds generation or fees management options are visible.
2.4 Task Organization
• Granularity – Tasks exist per exchange; there is no unified task board across all exchanges (global Task Management lists 0 tasks 7 ). Priorities and roll‐ups (daily/weekly/monthly) are not supported.
• Responsibility indicators – There is no indicator of whether tasks belong to the agency or to an agent; assignments are selected when creating tasks but not displayed prominently on the board.
2.5 Search & Navigation
• Search – Exchange Management and Messages have search bars, but there is no universal search across the entire platform. Searching contacts returns results only within the contact module.
• Role permissions – User management allows changing a user’s role (admin, coordinator, client, third‐party, agency) 8 , but the system was only tested with the administrator role, so content restrictions per role could not be verified.
Assessment: Exchange listing, filtering and status visibility generally work. However, operations such as creating/editing exchanges, task roll‐ups and role‐based views are missing or incomplete.
Milestone 3 – Documents, Messaging & Notifications 3.1 Document Handling
• Document list – The Document Center lists 20 documents with file names 13 . “Folders” and “Upload” buttons are present but clicking them does nothing; no modal appears to choose files
14 . Bulk actions allow Delete, Move and Tag, but there is no download or view function 15 . • Uploading/downloading – Uploading could not be tested because the button is inert.
Downloading or previewing documents is not possible.
 3

3.2 Document Security
• PIN protection – No interface exists to set or enter a PIN on documents. There are no controls for sharing links or requiring codes.
• Organization – The Document Manager has filters (All Documents, By User, By Exchange,
By Third Party) and a search bar, but there is no folder hierarchy; categories and recent metrics are empty 14 .
3.3 Messaging System
• Conversation list & filters – The Messages module provides a conversation list filtered by exchange status (All, Active, Closed, 45 Days, 180 Days) and a search bar 16 . Each conversation corresponds to an exchange and displays status (e.g., 45D or completed).
• Chat interface – Messages show participant names, timestamps and read indicators. The input field supports mentions ( @user ) and tasks ( @TASK ), as shown in existing messages 16 . We typed a message without sending to avoid side effects. A “plus” icon in the conversation header navigates to the exchange instead of attaching files; there is no visible attachment button.
• History & presence – Past messages are retained and timestamped; presence indicators show whether chat is “secure” or online. There is no search within chat history.
3.4 Notification System
• Notifications panel – A bell icon opens a panel labelled “Notifications” with icons representing categories, but the panel always says “No notifications” 11 . Clicking category icons has no effect. There is no interface for configuring email or SMS notifications.
• Text notifications – No SMS functionality is present.
Assessment: The messaging module functions for basic chat with mentions and task creation, but lacks file attachments and conversation search. Document management is largely non‐functional and lacks upload/download capability. The notification system is a placeholder.
Milestone 4 – Audit Logs, Admin Tools, Exporting & Deployment 4.1 Audit Trail
• Audit log access – User management offers a “View Audit Log” option. Selecting this triggers a pop‐up error: “Error fetching audit logs: SQLITE_ERROR: no such table: audit_logs” 17 , indicating the feature is not implemented.
4.2 Admin Dashboard
• High‐level metrics – The admin dashboard displays metrics for critical issues, pending tasks, exchanges and uptime 3 . It is easy to navigate but does not provide drill‐down access or filtering. There is no dedicated admin tool for system settings beyond user management.
4.3 Data Export
• CSV/PDF exports – There are no export buttons or menus in exchanges, tasks, documents or reports. The AI report cannot be downloaded or exported. Therefore, CSV/PDF export capability appears to be missing.
   4

4.4 System Performance & Reliability
• Performance – Pages load quickly and the interface is modern. The only critical error encountered was the missing audit_logs table when attempting to view audit logs 17 . Otherwise, there were no crashes or downtime.
• Training materials & documentation – No user manuals, guides or FAQs are provided within the application. Without documentation, onboarding staff would require separate training.
Assessment: Audit logs and export features are not available. The admin dashboard is limited to viewing metrics and managing users. Performance is generally good, but missing features prevent full system acceptance.
Overall Findings & Recommendations
Summary: Peak 1031 V2 demonstrates a promising UI and some core features (exchange listing, chat with @mentions, AI analysis) but falls short of many acceptance criteria. Sign‐up is restricted, the dashboard lacks urgent task context, document management is largely unusable, notifications and audit logs are not implemented, and there is no data export. Many features referenced in the milestone checklist (recurring tasks, Google login, universal search, color‐coded urgency, PIN‐protected documents, reminders, admin audit trail) are either missing or incomplete.
Key Issues / Conditions for Resolution
1. Account Creation & Authentication – Provide self‐service sign‐up or clearly document the admin onboarding process. Add alternative login options (e.g., Google) or remove them from the requirements. Ensure 2FA via phone or authenticator works.
2. Document Management – Implement functional upload/download, folder creation, version history and PIN protection. Without the ability to manage documents, the platform cannot handle exchange documents securely.
3. Audit Logs & Reporting – Fix the audit log database and expose an interface to filter logs by user, date and action. Include CSV/PDF export across modules for compliance and reporting.
4. Notifications & Reminders – Build the notification system to deliver email/SMS alerts for tasks and deadlines, and allow users to configure preferences. Present urgent tasks clearly on the dashboard.
5. Task & Exchange Operations – Implement recurring tasks, automatic rollover and a unified task board. Allow creation/editing of exchanges, and ensure that deadlines trigger reminders and tasks automatically.
6. Role‐based Views & Documentation – Test the platform with multiple roles (client, agent, coordinator) to ensure appropriate permissions. Provide user manuals and training materials to support onboarding.
Final Acceptance Checklist
Based on the observed functionality, the system does not yet meet all milestone criteria for production. Significant development work is required to deliver document management, audit logging, notification, export and other core capabilities. Once these issues are addressed and validated, a follow‐up acceptance test should be conducted.
   5

1 2 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/login
3 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/dashboard
4 5 6 12 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/exchanges/df7ea956-a936-45c6-b683-143e9dda5230
7 9 10 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/exchanges
8 17 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/admin/users
11 16 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/messages
13 14 15 Peak 1031 Exchange Platform https://peak1031-v2-8uus.vercel.app/documents
6
