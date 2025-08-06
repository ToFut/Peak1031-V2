APPENDIX A: PROJECT SPECIFICATIONS – PEAK 1031 V1 PLATFORM
A.1 SYSTEM OVERVIEW
A secure, modern web platform displaying synced 1031 exchange data from PracticePanther. The system supports multiple user roles, task tracking, secure messaging, and manual document management.
 
A.2 TECHNOLOGY STACK
•	Backend: Node.js + Express.js + PostgreSQL / Python
•	Frontend: React.js + TypeScript + Tailwind CSS
•	Infrastructure: AWS / GCP / Firebase
•	Integrations --- any limitation of API out of scope
o	PracticePanther API (Main data source)
o	SendGrid (Email notifications)
o	Twilio (SMS alerts & MFA codes)
o	AWS / GCP / Firebase
 
A.3 FUNCTIONAL SPECIFICATIONS
A.3.1 USER MANAGEMENT
•	JWT-based login authentication
•	Role-based views: Admin, Client, Third Party, Agency, Exchange Coordinator
•	User status management (Active/Inactive)
•	Profile view and edit
•	Exchange participant assignment (manually or based on synced PracticePanther data)
A.3.2 EXCHANGE MANAGEMENT
•	Display PracticePanther "matters" as exchanges
•	View exchange details: status, key dates, assigned users
•	Status tracking: PENDING, 45D, 180D, COMPLETED
•	Filter/search by user, stage, or property
•	Assign users to specific exchanges (Admin + Client Approval)
A.3.3 MESSAGING SYSTEM
•	Real-time messaging between exchange members
•	File attachment support: PDF, DOCX, JPG
•	View message history
•	Notifications via email and/or SMS (if configured)
A.3.4 DOCUMENT MANAGEMENT
•	Manual upload/download of documents
•	Documents organized by exchange (based on PracticePanther data or manual assignment)
•	Third-party users can view, but cannot upload
•	Basic document activity logs
•	PIN-protected access for sensitive files
•	Auto-generate documents from templates using exchange members data
A.3.5 TASK MANAGEMENT
•	View tasks synced from PracticePanther
•	Task status indicators: PENDING, IN_PROGRESS, COMPLETE
•	Track due dates and completion if applicatble from PP or other data resource 
A.3.6 PRACTICEPANTHER INTEGRATION
•	One-way sync: Clients, Matters, Contacts (GET no POST)
•	Configurable sync frequency (hourly or daily)
•	Manual sync triggering option
•	Display synced data in frontend views
•	Admin panel for monitoring sync status
A.3.7 AUDIT LOGGING
•	Login events: success/failure, 2FA attempts (Email/Password or Google login)
•	Document activity: upload, download, review
•	Task activity: fetched from PracticePanther, assignment, completion
•	User actions: status changes and assignments
•	Sync logs from PracticePanther
•	IP logging for audit and security
 

A.4 SECURITY & ACCESS
•	Role-based access control per exchange
•	JWT token authentication
•	PIN protection for document access
•	Server-side permission enforcement
•	2FA for admin accounts
•	Activity auditing
 
A.5 DATA & DEPLOYMENT
A.5.1 DATA CAPABILITIES
•	Import: CSV/Excel contact upload, bulk document processing by tagging exchange
•	Export: Exchange / users / system reports (PDF/Excel), audit logs
•	API Access: External endpoints for future integrations
A.5.2 DELIVERABLES
•	Full source code
•	Deployment scripts & database schema
•	Role-based user documentation
•	Admin operation guide
A.5.3 SUPPORT (9 MONTHS)
•	Bug fixes
•	Minor adjustment
