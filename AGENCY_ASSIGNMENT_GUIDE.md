# Agency Third Party Assignment System - Complete Guide

## 📋 Overview
The Agency Third Party Assignment system allows administrators to assign third parties to agencies for performance monitoring. Agencies can then view and track the performance of their assigned third parties.

## 🚀 How to Access & Manage

### For Administrators

#### 1. **Access the Management Interface**
- Login as an **Admin** user
- Navigate to: **Menu → Agency Assignments** (in the admin section)
- Direct URL: `/admin/agency-assignments`

#### 2. **Assign a Third Party to an Agency**
1. Click the **"Assign Third Party"** button
2. Select an **Agency** from the dropdown
3. Select a **Third Party** from the dropdown
4. Check/uncheck **"Allow agency to view third party performance data"**
5. Click **"Assign"**

#### 3. **View Current Assignments**
- The main page shows all active assignments in a table
- Information displayed:
  - Agency name and details
  - Third party name and details
  - Performance access permissions
  - Performance score
  - Assignment date
  - Who assigned them

#### 4. **Remove an Assignment**
- Click the **trash icon** next to any assignment
- Confirm the removal
- The assignment will be deactivated (not deleted, for audit purposes)

### For Agencies

#### 1. **View Assigned Third Parties**
- Login as an **Agency** user
- Your dashboard automatically shows:
  - **Third Party Network Overview** - Quick cards showing top 3 third parties
  - **Performance Metrics** - Success rates, completion times, revenue
  - **Upcoming Deadlines** - Critical dates requiring attention

#### 2. **Access Detailed Performance**
- Click on any third party card to view:
  - Full exchange portfolio
  - Performance trends over time
  - Monthly activity charts
  - Risk assessments
  - Financial metrics

#### 3. **Filter Exchanges by Third Party**
- Go to the **Exchanges** tab in your dashboard
- Use the **"Filter by Third Party"** dropdown
- View only exchanges for specific third parties

### For Third Parties

#### 1. **View Your Agency Assignments**
- Login as a **Third Party** user
- Go to your **User Profile** page
- See the **"Agency Assignments"** section showing:
  - Which agencies are monitoring your performance
  - Your performance score with each agency
  - Assignment dates
  - Performance monitoring status

## 📊 Data Flow

```
Admin assigns Third Party to Agency
        ↓
Both parties receive notifications
        ↓
Agency Dashboard populates with:
- Third party cards
- Performance metrics
- Exchange portfolios
        ↓
Third Party Profile shows:
- Agency assignments
- Performance visibility status
```

## 🔔 Notifications

When an assignment is created:
- **Agency receives**: "New Third Party Assignment" notification
- **Third Party receives**: "Agency Assignment" notification
- Both parties are notified via in-app notifications

## 📈 Performance Metrics Tracked

Agencies can monitor:
- **Total Exchanges**: Number of exchanges assigned
- **Active Exchanges**: Currently in-progress exchanges
- **Success Rate**: Percentage of completed exchanges
- **Average Completion Time**: Days to complete exchanges
- **Total Revenue**: Combined value of all exchanges
- **Performance Score**: Overall performance rating (0-100)
- **Upcoming Deadlines**: Exchanges with deadlines within 30 days

## 🔐 Permissions

### Admin
- Create/remove assignments
- View all assignments
- Access all agency and third party data

### Agency
- View assigned third parties only
- Access performance data (if permission granted)
- Cannot modify assignments

### Third Party
- View which agencies they're assigned to
- Cannot modify assignments
- Performance data visible to assigned agencies

## 📝 Database Schema

### Table: `agency_third_party_assignments`
- `id`: Unique identifier
- `agency_contact_id`: Reference to agency contact
- `third_party_contact_id`: Reference to third party contact
- `assigned_by`: Admin who created assignment
- `assignment_date`: When assignment was created
- `can_view_performance`: Permission flag
- `performance_score`: Current performance rating
- `is_active`: Assignment status

## 🛠️ Technical Setup

### SQL Migrations Required
1. `205_create_agency_assignments_table.sql` - Creates the main table
2. `206_fix_agency_assignments_columns.sql` - Adds any missing columns

### API Endpoints
- `POST /api/agency/assign-third-party` - Create assignment
- `DELETE /api/agency/assign-third-party` - Remove assignment
- `GET /api/agency/assignments` - List all assignments
- `GET /api/agency/third-parties` - Get third parties for an agency
- `GET /api/agency/third-party/:id/performance` - Get detailed performance

### Frontend Routes
- `/admin/agency-assignments` - Admin management interface
- `/dashboard` - Agency dashboard with third party data
- `/users/user-profile/:id` - User profile with agency assignments

## 🎯 Use Cases

1. **Multi-Agency Oversight**: A third party can be assigned to multiple agencies
2. **Performance Monitoring**: Agencies track third party success rates
3. **Portfolio Management**: Agencies oversee all exchanges for their third parties
4. **Risk Assessment**: Identify upcoming deadlines and high-risk exchanges
5. **Revenue Tracking**: Monitor total portfolio value across third parties

## 💡 Tips

- Assignments are **permanent** until explicitly removed by an admin
- Performance scores update automatically based on exchange outcomes
- Agencies can only see third parties assigned to them
- Third parties can see all agencies they're assigned to
- The system maintains a full audit trail of assignments

## 🚨 Troubleshooting

### "Column not found" error
- Run migration: `206_fix_agency_assignments_columns.sql`

### Third parties not showing in agency dashboard
- Verify assignment exists in admin panel
- Check `is_active` status is true
- Ensure `can_view_performance` is enabled

### Notifications not received
- Check notification service is running
- Verify users have valid email addresses
- Check notification preferences in user settings

---

This system provides complete oversight and performance tracking for agency-third party relationships, ensuring transparency and accountability across the platform.