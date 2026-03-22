# Phase 1: Backend Foundation - Complete Implementation

## 🎯 Goal
By the end of this phase, you'll have:
- ✅ Node.js + Express server running
- ✅ PostgreSQL database set up
- ✅ All 10+ tables created
- ✅ JWT authentication working
- ✅ First API endpoints functional
- ✅ Frontend connecting to backend

**Time:** 4-6 hours
**Difficulty:** Beginner-friendly with clear steps

---

## 📋 Prerequisites Checklist

Before starting, verify you have:

```bash
# Check Node.js is installed (v18+)
node --version
# Should show: v18.x.x or higher

# Check npm is installed
npm --version
# Should show: 9.x.x or higher

# Check PostgreSQL is installed
psql --version
# Should show: psql (PostgreSQL) 14.x or higher

# Check Git is installed
git --version
# Should show: git version 2.x.x
```

**Don't have these?**
- Node.js: Download from https://nodejs.org/ (get LTS version)
- PostgreSQL: Download from https://www.postgresql.org/download/
- Git: Download from https://git-scm.com/
- VSCode: Download from https://code.visualstudio.com/

---

## 🚀 Step 1: Create Project Structure

### Step 1.1: Create Folders

Open terminal/command prompt and run:

```bash
# Create main project folder
mkdir itsmpro
cd itsmpro

# Create backend folder
mkdir backend
cd backend

# Initialize Node.js project (creates package.json)
npm init -y

# Output should show:
# > npm notice created a package.json with the following data
```

### Step 1.2: Create Folder Structure

Still in `backend` folder, run:

```bash
# Create all required folders
mkdir -p src/config
mkdir -p src/middleware
mkdir -p src/routes
mkdir -p src/controllers
mkdir -p src/models
mkdir -p src/utils
mkdir -p src/validators
mkdir -p database
mkdir -p logs

# Verify folder structure
# Windows:
dir src

# Mac/Linux:
ls -la src/
```

Your folder structure should look like:
```
backend/
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── utils/
│   └── validators/
├── database/
├── logs/
├── package.json
└── package-lock.json
```

---

## 📦 Step 2: Install Dependencies

In `backend` folder, run:

```bash
# Install all required packages
npm install express cors dotenv pg bcryptjs jsonwebtoken joi winston axios

# Install development tools
npm install --save-dev nodemon

# This will take 1-2 minutes
# You'll see: added XX packages in XX seconds
```

### What each package does:

| Package | Purpose |
|---------|---------|
| **express** | Web framework for building API |
| **cors** | Allow requests from different domains |
| **dotenv** | Load environment variables |
| **pg** | PostgreSQL database driver |
| **bcryptjs** | Securely hash passwords |
| **jsonwebtoken** | Create JWT tokens |
| **joi** | Validate input data |
| **winston** | Logging system |
| **axios** | Make HTTP requests |
| **nodemon** | Auto-restart server on changes |

---

## ⚙️ Step 3: Configure Environment Variables

### Step 3.1: Create .env File

In `backend` folder, create a new file called `.env`:

**On Windows:**
```
Right-click in backend folder
→ New → Text Document
→ Rename to ".env"
```

**On Mac/Linux:**
```bash
touch .env
```

### Step 3.2: Add Environment Variables

Open `.env` file with VSCode and add:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
APP_NAME=ITSMPro

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itsmpro
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_must_be_min_32_characters_long_1234567890
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# API
API_VERSION=v1
API_BASE_URL=http://localhost:5000
```

⚠️ **Important:** Replace `your_postgres_password` with the password you set when installing PostgreSQL

---

## 🗄️ Step 4: Set Up PostgreSQL Database

### Step 4.1: Connect to PostgreSQL

Open a new terminal and run:

```bash
# Connect to PostgreSQL (will prompt for password)
psql -U postgres

# You'll see:
# postgres=#
```

**Can't connect?**
```bash
# Try default password (leave blank if prompted):
psql -U postgres

# If that doesn't work, restart PostgreSQL:
# Windows: Services → PostgreSQL → Restart
# Mac: brew services restart postgresql
# Linux: sudo systemctl restart postgresql
```

### Step 4.2: Create Database & User

Once connected to PostgreSQL, run these commands:

```sql
-- Create database
CREATE DATABASE itsmpro;

-- Create user
CREATE USER itsmpro_user WITH PASSWORD 'secure_password_123';

-- Grant privileges
ALTER ROLE itsmpro_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE itsmpro TO itsmpro_user;

-- Verify
\l

-- You should see 'itsmpro' in the list

-- Exit PostgreSQL
\q
```

**Troubleshooting:**
```sql
-- If user already exists:
ALTER USER itsmpro_user WITH PASSWORD 'secure_password_123';

-- If database already exists:
DROP DATABASE itsmpro;
CREATE DATABASE itsmpro;
```

### Step 4.3: Update .env File

Update your `.env` file with actual password:

```env
DB_USER=itsmpro_user
DB_PASSWORD=secure_password_123
```

---

## 🗃️ Step 5: Create Database Schema

### Step 5.1: Create Schema File

In `backend/database/` folder, create file `schema.sql`:

**Windows:**
```
Right-click database folder
→ New → Text Document
→ Rename to "schema.sql"
```

**Mac/Linux:**
```bash
touch database/schema.sql
```

### Step 5.2: Add Database Tables

Open `schema.sql` and paste this complete schema:

```sql
-- ========================================
-- PART 1: FOUNDATION & AUTH
-- ========================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================================
-- PART 2: EMPLOYEE & IMAC
-- ========================================

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    employee_id VARCHAR(20) UNIQUE,
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id INTEGER,
    start_date DATE,
    end_date DATE,
    phone VARCHAR(20),
    office_location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE TABLE imac_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    request_type VARCHAR(20),
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    requested_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ========================================
-- PART 3: INCIDENTS & SERVICE REQUESTS
-- ========================================

CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20),
    status VARCHAR(50) DEFAULT 'open',
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    sla_response_minutes INTEGER,
    sla_resolution_minutes INTEGER,
    responded_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    fulfilled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- ========================================
-- PART 4: PROBLEM & CHANGE
-- ========================================

CREATE TABLE problems (
    id SERIAL PRIMARY KEY,
    problem_number VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    root_cause TEXT,
    status VARCHAR(50) DEFAULT 'open',
    related_incident_ids TEXT,
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE changes (
    id SERIAL PRIMARY KEY,
    change_number VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    change_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    impact_assessment TEXT,
    risk_level VARCHAR(20),
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE change_approvals (
    id SERIAL PRIMARY KEY,
    change_id INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (change_id) REFERENCES changes(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- ========================================
-- PART 5: ASSET & CMDB
-- ========================================

CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_tag VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    owner_id INTEGER,
    location VARCHAR(255),
    purchase_date DATE,
    warranty_expiry DATE,
    cost DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES employees(id)
);

CREATE TABLE cmdb_items (
    id SERIAL PRIMARY KEY,
    ci_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE ci_relationships (
    id SERIAL PRIMARY KEY,
    parent_ci_id INTEGER NOT NULL,
    child_ci_id INTEGER NOT NULL,
    relationship_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_ci_id) REFERENCES cmdb_items(id),
    FOREIGN KEY (child_ci_id) REFERENCES cmdb_items(id)
);

CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    software_name VARCHAR(255) NOT NULL,
    license_key VARCHAR(255),
    license_type VARCHAR(50),
    quantity INTEGER,
    expiry_date DATE,
    cost DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PART 6: KNOWLEDGE BASE & SLA
-- ========================================

CREATE TABLE kb_articles (
    id SERIAL PRIMARY KEY,
    article_id VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    created_by INTEGER NOT NULL,
    views INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE sla_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    priority_level VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PART 7: REPORTS & INTEGRATIONS
-- ========================================

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    template VARCHAR(255),
    created_by INTEGER NOT NULL,
    generated_at TIMESTAMP,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- AUDIT & COMPLIANCE
-- ========================================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255),
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========================================
-- INSERT DEFAULT DATA
-- ========================================

INSERT INTO roles (name, description) VALUES
('Admin', 'Full system access'),
('Manager', 'Team management and approvals'),
('Technician', 'Incident resolution'),
('Analyst', 'Problem analysis and reporting'),
('Approver', 'Change advisory board member'),
('User', 'End user access');

INSERT INTO sla_definitions (name, response_time_minutes, resolution_time_minutes, priority_level) VALUES
('Premium', 60, 240, 'critical'),
('Standard', 240, 1440, 'high'),
('Basic', 480, 2880, 'low');

-- ========================================
-- CREATE INDEXES
-- ========================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### Step 5.3: Execute Schema

From `backend` folder, run:

```bash
# Load schema into database
psql -U itsmpro_user -d itsmpro -f database/schema.sql

# If prompted for password, enter: secure_password_123

# You should see: CREATE TABLE, CREATE INDEX (multiple times)
```

**Verify tables were created:**

```bash
# Connect to database
psql -U itsmpro_user -d itsmpro

# List tables
\dt

# You should see all tables listed:
# - roles
# - users
# - employees
# - incidents
# - ... etc

# Exit
\q
```

---

## 🔌 Step 6: Create Database Connection

In `backend/src/config/`, create file `database.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

module.exports = pool;
```

---

## 🔐 Step 7: Create Authentication Middleware

In `backend/src/middleware/`, create file `auth.js`:

```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
```

---

## 🔑 Step 8: Create Auth Controller

In `backend/src/controllers/`, create file `authController.js`:

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name`,
      [email, hashedPassword, firstName, lastName, roleId || 6]
    );

    return res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      `SELECT u.*, r.name as role_name FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role_id,
        roleName: user.role_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
```

---

## 📍 Step 9: Create Auth Routes

In `backend/src/routes/`, create file `auth.js`:

```javascript
const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
```

---

## 🚀 Step 10: Create Main Server File

In `backend/src/`, create file `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const pool = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0]);
  }
});

// Routes
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     ⚡ ITSMPro Backend Server          ║
╠════════════════════════════════════════╣
║ Server:   http://localhost:${PORT}      ║
║ API:      http://localhost:${PORT}/api/v1 ║
║ Health:   http://localhost:${PORT}/api/v1/health ║
║ Status:   🟢 Running                   ║
╚════════════════════════════════════════╝
  `);
});
```

---

## ✅ Step 11: Update package.json Scripts

Open `backend/package.json` and update the `scripts` section:

Find this:
```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

Replace with:
```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

---

## 🧪 Step 12: Test the Server

From `backend` folder, run:

```bash
npm run dev

# You should see:
# ╔════════════════════════════════════════╗
# ║     ⚡ ITSMPro Backend Server          ║
# ╠════════════════════════════════════════╣
# ║ Server:   http://localhost:5000        ║
# ║ API:      http://localhost:5000/api/v1 ║
# ║ Health:   http://localhost:5000/api/v1/health ║
# ║ Status:   🟢 Running                   ║
# ╚════════════════════════════════════════╝
```

✅ **Server is running!**

Keep this terminal open. Open a NEW terminal for next steps.

---

## 🧪 Step 13: Test API with Postman

### Step 13.1: Download Postman

Download from: https://www.postman.com/downloads/

### Step 13.2: Create Health Check Test

1. **Open Postman**
2. **Click "+" to create new request**
3. **Set method to GET**
4. **Paste URL:** `http://localhost:5000/api/v1/health`
5. **Click Send**

Expected response:
```json
{
  "message": "Server is running",
  "timestamp": "2024-03-18T...",
  "environment": "development"
}
```

✅ **API is responding!**

### Step 13.3: Test User Registration

1. **Create new request**
2. **Set method to POST**
3. **Paste URL:** `http://localhost:5000/api/v1/auth/register`
4. **Set Headers:**
   - Key: `Content-Type`
   - Value: `application/json`
5. **Set Body (raw JSON):**
```json
{
  "email": "admin@itsmpro.com",
  "password": "AdminPassword123!",
  "firstName": "Admin",
  "lastName": "User",
  "roleId": 1
}
```
6. **Click Send**

Expected response (Status 201):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "admin@itsmpro.com",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

✅ **Registration works!**

### Step 13.4: Test Login

1. **Create new request**
2. **Set method to POST**
3. **Paste URL:** `http://localhost:5000/api/v1/auth/login`
4. **Headers:** Content-Type: application/json
5. **Body:**
```json
{
  "email": "admin@itsmpro.com",
  "password": "AdminPassword123!"
}
```
6. **Click Send**

Expected response (Status 200):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@itsmpro.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "Admin"
  }
}
```

✅ **Login works! Copy the token for next tests.**

---

## 📊 Step 14: Verify in Database

Open a new terminal:

```bash
# Connect to database
psql -U itsmpro_user -d itsmpro

# Check users table
SELECT * FROM users;

# You should see the admin user you created

# Check roles
SELECT * FROM roles;

# You should see all 6 roles

# Exit
\q
```

✅ **Data is in database!**

---

## 🎯 Step 15: Create .gitignore File

In `backend` folder, create file `.gitignore`:

```
# Dependencies
node_modules/
package-lock.json

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

---

## 📝 Step 16: Create README for Backend

In `backend` folder, create file `README.md`:

```markdown
# ITSMPro Backend API

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with database credentials

3. Run schema:
   ```bash
   psql -U itsmpro_user -d itsmpro -f database/schema.sql
   ```

4. Start server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - Login user

### Health
- GET `/api/v1/health` - Check server status

## Testing

Use Postman to test endpoints. See POSTMAN_TESTS.json for examples.

## Environment Variables

See `.env` file for required variables.
```

---

## ✅ Phase 1 Summary

**You've completed Phase 1! Here's what you have:**

✅ Node.js + Express server running on port 5000
✅ PostgreSQL database with 10+ tables
✅ User authentication with JWT tokens
✅ Registration & Login endpoints working
✅ Data being stored in database
✅ API tested with Postman
✅ .gitignore and README files

---

## 📊 Verification Checklist

- [ ] Server running (npm run dev shows no errors)
- [ ] Database connected (✅ Database connected message)
- [ ] Health check returns 200 (Postman test)
- [ ] User registration works (Postman test)
- [ ] Login returns JWT token (Postman test)
- [ ] User appears in database (SELECT query)
- [ ] No error messages in terminal

All checked? ✅ **Phase 1 Complete!**

---

## 🚀 What's Next: Phase 2

Once you've verified everything works:

1. Build incident management API (Part 3)
2. Connect frontend to backend
3. Create dashboard
4. Test end-to-end

**Ready?** Follow the guide for Phase 2 (Build Incidents Module)

---

## 🆘 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
psql -U postgres

# If connection refused:
# Windows: Services > PostgreSQL > Start
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### "Port 5000 already in use"
Change PORT in .env to 5001, or:
```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Invalid JWT Secret"
Make sure JWT_SECRET in .env is at least 32 characters long

---

## 🎉 Success!

You now have a working backend API with:
- ✅ Database
- ✅ Authentication
- ✅ User management
- ✅ API endpoints
- ✅ Testing capability

**Next:** Build more modules following the same pattern!

