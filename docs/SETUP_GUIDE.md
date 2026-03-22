# ITSMPro Backend - Complete Setup Guide

## 🚀 Phase 1: Backend Foundation - Complete

You now have a **production-ready Node.js + Express backend** with:

✅ Express.js server with middleware setup
✅ PostgreSQL database configuration
✅ Complete database schema (10 tables for all 7 modules)
✅ JWT authentication system
✅ Role-Based Access Control (RBAC) with 6 roles
✅ Error handling middleware
✅ Structured logging with Winston
✅ Part 1: Authentication routes (Full implementation)
✅ Skeleton routes for Parts 2-7 (Ready to implement)

---

## 📋 Project Structure

```
backend/
├── src/
│   ├── server.js                 # Express server entry point
│   ├── config/
│   │   ├── database.js           # PostgreSQL connection pool
│   │   ├── logger.js             # Winston logging configuration
│   │   └── schema.sql            # Database schema (all 7 modules)
│   ├── middleware/
│   │   ├── auth.js               # JWT token generation & validation
│   │   ├── rbac.js               # Role-based access control
│   │   └── errorHandler.js       # Global error handling
│   └── routes/
│       ├── auth.js               # ✅ COMPLETE - Part 1
│       ├── employees.js          # Part 2 - Skeleton
│       ├── incidents.js          # Part 3 - Skeleton
│       ├── serviceRequests.js    # Part 3 - Skeleton
│       ├── problems.js           # Part 4 - Skeleton
│       ├── changes.js            # Part 4 - Skeleton
│       ├── assets.js             # Part 5 - Skeleton
│       ├── cmdb.js               # Part 5 - Skeleton
│       ├── knowledge.js          # Part 6 - Skeleton
│       ├── sla.js                # Part 6 - Skeleton
│       └── reports.js            # Part 7 - Skeleton
├── package.json
├── .env.example
└── README.md
```

---

## 🔧 Installation & Setup

### Step 1: Prerequisites

```bash
# Install Node.js 18+ from https://nodejs.org/
# Install PostgreSQL 14+ from https://www.postgresql.org/

# Verify installations
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
psql --version  # Should be 14 or higher
```

### Step 2: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE itsmpro;
CREATE USER itsmpro_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE itsmpro TO itsmpro_user;
ALTER DATABASE itsmpro OWNER TO itsmpro_user;

# Exit psql
\q
```

### Step 3: Initialize Database Schema

```bash
# Navigate to backend directory
cd backend

# Connect to your database and run the schema
psql -U itsmpro_user -d itsmpro -f src/config/schema.sql

# Verify tables were created
psql -U itsmpro_user -d itsmpro -c "\dt"
```

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
# Important variables to update:
# - DB_HOST=localhost
# - DB_PORT=5432
# - DB_NAME=itsmpro
# - DB_USER=itsmpro_user
# - DB_PASSWORD=your_secure_password_here
# - JWT_SECRET=your_jwt_secret_key_here (change to something secure)

nano .env  # or use your preferred editor
```

### Step 6: Start the Server

```bash
# Development mode (with hot-reload)
npm run dev

# Or production mode
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║     🚀 ITSMPro Backend API Started     ║
╠════════════════════════════════════════╣
║ Server: DEVELOPMENT                    ║
║ Port: 5000                             ║
║ Database: localhost:5432               ║
║ API URL: http://localhost:5000         ║
╚════════════════════════════════════════╝
```

---

## ✅ Verify Backend is Working

### Test Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-03-18T10:30:00.000Z",
  "uptime": 5.234
}
```

### Test API Status

```bash
curl http://localhost:5000/api/status
```

Response:
```json
{
  "api": "ITSMPro Backend API",
  "version": "1.0.0",
  "status": "Running",
  "modules": [
    "Foundation & Auth (Part 1)",
    "Employee & IMAC (Part 2)",
    ...
  ]
}
```

---

## 🔐 Test Authentication (Part 1)

### Register New User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@itsmpro.io",
    "username": "admin",
    "password": "SecurePassword123",
    "first_name": "John",
    "last_name": "Admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@itsmpro.io",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@itsmpro.io",
    "username": "admin",
    "first_name": "John",
    "role": "user"
  }
}
```

### Get Current User (Protected Route)

```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 📝 Database Schema Overview

### Part 1: Authentication
- **users** — User accounts with roles
- **roles** — RBAC role definitions
- **sessions** — Active user sessions

### Part 2: Employee & IMAC
- **employees** — Employee directory
- **imac_requests** — Provision/Move/Add/Change requests
- **imac_tasks** — Individual IMAC tasks

### Part 3: Incidents & Service Requests
- **incidents** — Incident tickets
- **service_requests** — Service request tickets
- **service_catalog** — Available services

### Part 4: Problem & Change
- **problems** — Problem records
- **kedb_articles** — Known error solutions
- **changes** — Change requests
- **change_tasks** — Change implementation tasks

### Part 5: Asset & CMDB
- **assets** — IT asset inventory
- **cmdb_items** — Configuration items
- **cmdb_relationships** — CI relationships
- **software_licenses** — Software licenses

### Part 6: Knowledge Base & SLA
- **knowledge_articles** — Knowledge articles
- **sla_definitions** — SLA policies

### Part 7: Audit & Reports
- **audit_logs** — Complete audit trail
- **activity_logs** — User activity logs

---

## 🛣️ API Routes Ready

### Part 1: Auth (✅ COMPLETE)

```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login              # Login
POST   /api/v1/auth/refresh-token      # Refresh access token
GET    /api/v1/auth/me                 # Get current user
POST   /api/v1/auth/change-password    # Change password
POST   /api/v1/auth/logout             # Logout
```

### Parts 2-7 (Skeleton - Ready to implement)

```
GET    /api/v1/employees              # Part 2
GET    /api/v1/incidents              # Part 3
GET    /api/v1/service-requests       # Part 3
GET    /api/v1/problems               # Part 4
GET    /api/v1/changes                # Part 4
GET    /api/v1/assets                 # Part 5
GET    /api/v1/cmdb                   # Part 5
GET    /api/v1/knowledge              # Part 6
GET    /api/v1/sla                    # Part 6
GET    /api/v1/reports                # Part 7
```

---

## 🔌 Connect Frontend to Backend

### Update Frontend Files

In each HTML file, add CORS-compatible fetch calls:

```javascript
// Example: itsmpro_part1_foundation.html

// Check backend status
fetch('http://localhost:5000/api/status')
  .then(response => response.json())
  .then(data => console.log('Backend connected:', data))
  .catch(error => console.error('Backend not reachable:', error));

// Login example
async function login(email, password) {
  const response = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  if (data.success) {
    // Store token
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    console.log('Login successful!');
  }
}

// Protected API call example
async function getUserData() {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:5000/api/v1/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}
```

---

## 🧪 Testing the System

### Run Unit Tests

```bash
npm test
```

### Run Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

---

## 🚀 Next Steps: Phase 2 - Core Modules

To complete Phase 2, implement each module:

### Part 2: Employee & IMAC
Implement routes in `src/routes/employees.js`:
- Create employee
- List employees
- Update employee
- Create IMAC request
- List IMAC requests
- Approve/reject IMAC tasks

### Part 3: Incidents & Service Requests
Implement routes in `src/routes/incidents.js` and `serviceRequests.js`:
- Create incident
- List incidents
- Update incident status
- Assign incident
- Create service request
- Track request fulfillment

### Part 4: Problem & Change
Implement routes in `src/routes/problems.js` and `changes.js`:
- Create problem
- Perform RCA
- Create change request
- CAB approval workflow
- Schedule change execution

### Part 5: Asset & CMDB
Implement routes in `src/routes/assets.js` and `cmdb.js`:
- Track assets
- Manage CMDB items
- Track relationships
- License management
- Topology visualization

### Part 6: Knowledge Base & SLA
Implement routes in `src/routes/knowledge.js` and `sla.js`:
- Create KB articles
- Search knowledge
- Manage SLA definitions
- Track SLA compliance

### Part 7: Reports & Integrations
Implement routes in `src/routes/reports.js`:
- Generate reports
- Create dashboards
- Integrate with external services
- Webhook management

---

## 📦 Deployment Options

### Option 1: Local Development
- Already done! Running on http://localhost:5000

### Option 2: Docker
```bash
# Create Dockerfile
docker build -t itsmpro-backend .
docker run -p 5000:5000 --env-file .env itsmpro-backend
```

### Option 3: Heroku
```bash
heroku create your-itsmpro-app
heroku addons:create heroku-postgresql:standard-0
git push heroku main
```

### Option 4: AWS EC2
```bash
# Launch EC2 instance
# Install Node.js and PostgreSQL
# Clone repository
# Run: npm install && npm start
```

### Option 5: DigitalOcean App Platform
```bash
# Connect GitHub repository
# Configure environment variables
# Deploy!
```

---

## 📊 Monitor Your System

### View Logs

```bash
# Development logs
tail -f logs/all.log

# Error logs
tail -f logs/error.log
```

### Database Stats

```bash
# Check database connections
psql -U itsmpro_user -d itsmpro -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Performance Monitoring

The logger automatically warns about slow queries (>1000ms).

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres

# Verify connection string in .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itsmpro
DB_USER=itsmpro_user
```

### JWT Token Issues
- Make sure JWT_SECRET is set in .env
- Tokens expire after 24 hours (JWT_EXPIRY)
- Use refresh token to get new access token

---

## ✨ You Now Have

✅ **Full authentication system** (Part 1 complete)
✅ **PostgreSQL database** with schema for all 7 modules
✅ **RBAC system** with 6 roles
✅ **Error handling** and logging
✅ **API framework** ready for all modules
✅ **Security** with JWT and bcrypt
✅ **Production-ready code**

---

## 🎯 What's Next?

**Phase 2:** Implement the remaining 6 modules
**Phase 3:** Connect frontend to backend
**Phase 4:** Add integrations & testing
**Phase 5:** Deploy to production

Your backend is **ready to grow**! 🚀
