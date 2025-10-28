# Admin Panel - Online Examination System

## Overview
A comprehensive, modern admin panel for managing the Online Examination System built with Node.js, Express, EJS, and Bootstrap 5.

## Features

### 1. Dashboard Overview
- **Statistics Cards**: Total Users, Exams, Attempts, and Revenue
- **Charts**: User growth and exam participation trends using Chart.js
- **Recent Activities**: Latest exam attempts and results
- **Top Performers**: Leaderboard of highest-scoring users

### 2. User Management
- View all registered users in a paginated table
- Add new users with role assignment (User, Admin, Super Admin)
- Edit existing user details and roles
- Delete users
- Filter users by role and status
- Search functionality

### 3. Exam Management
- Create, update, and delete exams/quizzes
- Add questions with multiple choice options
- Set correct answers and marks
- Manage exam schedules (start/end dates)
- Categorize exams

### 4. Result Management
- View all submitted exam results
- Filter results by exam, status, and date range
- Detailed view of individual results
- Export results to CSV/PDF
- Performance statistics (pass rate, average score)

### 5. Payment Management
- Track all user payments
- Manage subscription plans
- View payment history
- Payment gateway configuration

### 6. Notifications & Announcements
- Send notifications to users
- Broadcast announcements
- System alerts
- Track read rates
- Priority levels (Low, Medium, High)

### 7. Settings
- **General Settings**: Site title, logo, contact info, timezone
- **Appearance**: Theme (Light/Dark), colors, fonts
- **Email Configuration**: SMTP settings
- **Payment Settings**: Gateway API keys, currency
- **Security**: Password policies, 2FA, session timeout
- **Backup & Restore**: Automated backups, manual backup creation

## File Structure

```
src/
├── views/
│   ├── layouts/
│   │   └── admin.ejs                 # Admin panel layout with sidebar
│   └── pages/
│       └── admin/
│           ├── dashboard.ejs          # Dashboard overview
│           ├── users.ejs              # User management
│           ├── results.ejs            # Results management
│           ├── notifications.ejs      # Notifications
│           └── settings.ejs           # Admin settings
├── controllers/
│   └── admin.controller.js            # Admin panel logic
└── routes/
    └── admin.routes.js                # Admin routes
```

## Routes

### Admin Routes (All require authentication and admin role)

```javascript
GET  /admin/dashboard              # Dashboard overview
GET  /admin/users                  # User management page
POST /admin/users                  # Create new user
PUT  /admin/users/:id              # Update user
DELETE /admin/users/:id            # Delete user
GET  /admin/results                # Results management
GET  /admin/notifications          # Notifications page
POST /admin/notifications/send     # Send notification
GET  /admin/settings               # Settings page
GET  /admin/payments               # Payment management
```

## Features Breakdown

### Dashboard (dashboard.ejs)
```ejs
- Statistics cards showing key metrics
- Line chart for user growth and exam participation
- Doughnut chart for exam categories
- Recent exam attempts table
- Top performers list
```

### User Management (users.ejs)
```ejs
- Searchable user table
- Filter by role and status
- Add/Edit/Delete user modals
- Bulk selection with checkboxes
- Pagination
```

### Results Management (results.ejs)
```ejs
- Results table with scores and status
- Filter by exam, status, date range
- Export to CSV/PDF buttons
- Detailed result view modal
- Performance statistics
```

### Notifications (notifications.ejs)
```ejs
- Send notification modal
- Notification types (Notification, Announcement, Alert)
- Priority levels
- Recipient selection (All, Active, Admins, Custom)
- Email and push notification options
```

### Settings (settings.ejs)
```ejs
- Tabbed interface for different settings
- General, Appearance, Email, Payment, Security, Backup
- Form controls for all settings
- Backup management with download/delete
```

## Styling Features

### Layout
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Sidebar Navigation**: Collapsible sidebar with icons
- **Top Header**: Search bar, notifications, theme toggle, user dropdown
- **Dark/Light Mode**: Toggle with localStorage persistence

### Components
- **Statistics Cards**: Hover effects, gradient icons
- **Tables**: Hover effects, sortable headers
- **Modals**: Bootstrap 5 modals for forms
- **Charts**: Chart.js integration
- **Buttons**: Primary actions, icon buttons
- **Badges**: Status indicators, role badges
- **Progress Bars**: Score visualization

### Color Scheme
```css
Primary: #3b82f6 (Blue)
Success: #22c55e (Green)
Warning: #f97316 (Orange)
Danger: #ef4444 (Red)
Info: #8b5cf6 (Purple)
```

## Usage

### Accessing Admin Panel
1. Login with admin credentials
2. Navigate to `/admin/dashboard`
3. Use sidebar navigation to access different sections

### Creating a User
```javascript
// POST /admin/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "user",
  "status": "active"
}
```

### Sending Notification
```javascript
// POST /admin/notifications/send
{
  "type": "announcement",
  "title": "New Feature Available",
  "message": "Check out our new video lessons!",
  "recipients": "all",
  "priority": "medium"
}
```

## Dummy Data

The views include dummy data for demonstration:

### Dashboard Statistics
```javascript
{
  totalUsers: 1247,
  totalExams: 87,
  totalAttempts: 3542,
  totalRevenue: 12450
}
```

### Sample Users
```javascript
[
  { name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', exams: 12 },
  { name: 'Jane Smith', email: 'jane@example.com', role: 'admin', status: 'active', exams: 8 }
]
```

### Sample Results
```javascript
[
  { student: 'John Doe', exam: 'JavaScript Basics', score: 85, total: 100, status: 'pass' },
  { student: 'Jane Smith', exam: 'React Advanced', score: 92, total: 100, status: 'pass' }
]
```

## Security

### Authentication & Authorization
- All admin routes require authentication (`requireAuth` middleware)
- Admin-specific routes require admin role (`requireAdmin` middleware)
- JWT token-based authentication
- Session management with timeout

### Best Practices
- Password hashing with bcrypt
- Input validation and sanitization
- CSRF protection
- Rate limiting on API endpoints
- SQL injection prevention with Mongoose

## Dependencies

```json
{
  "express": "^4.18.2",
  "ejs": "^3.1.9",
  "bootstrap": "^5.3.2",
  "chart.js": "^4.4.0",
  "bootstrap-icons": "^1.11.1",
  "mongoose": "^7.0.0",
  "express-ejs-layouts": "^2.5.1"
}
```

## Customization

### Changing Colors
Edit the CSS variables in `admin.ejs`:
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
}
```

### Adding New Menu Items
In `layouts/admin.ejs`:
```html
<a href="/admin/custom" class="menu-item">
  <i class="bi bi-custom-icon"></i>
  <span>Custom Page</span>
</a>
```

### Adding New Settings Tabs
In `settings.ejs`:
```html
<a href="#custom" class="list-group-item list-group-item-action" data-bs-toggle="list">
  <i class="bi bi-custom me-2"></i>Custom Settings
</a>
```

## Future Enhancements

1. Real-time notifications with WebSockets
2. Advanced analytics and reporting
3. Bulk operations (bulk delete, bulk email)
4. Activity logs and audit trails
5. Role-based permissions (granular access control)
6. Multi-language support
7. API documentation with Swagger
8. Data export in multiple formats (Excel, JSON)
9. Advanced search with filters
10. Dashboard widgets customization

## Support

For issues or questions, contact the development team or create an issue in the repository.

## License

This admin panel is part of the Online Examination System and follows the same license.
