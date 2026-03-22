# ITSMPro - Step by Step Implementation Guide

## 🎯 Goal: Build a Fully Functional ITSM System

By the end of this guide, you'll have a complete, working ITSM platform that:
- ✅ Has a real database
- ✅ Manages users & authentication
- ✅ Handles incidents, requests, and changes
- ✅ Sends notifications
- ✅ Tracks assets
- ✅ Creates reports

---

## 📋 Prerequisites

Before starting, you need:

```
1. Node.js v18 or higher
   Download from: https://nodejs.org/
   Verify: Open terminal, type: node --version
   
2. PostgreSQL 14 or higher
   Download from: https://www.postgresql.org/download/
   Verify: Type: psql --version
   
3. Git
   Download from: https://git-scm.com/
   Verify: Type: git --version
   
4. A code editor
   Download VSCode: https://code.visualstudio.com/
   
5. Postman (for testing API)
   Download from: https://www.postman.com/
```

### Installation Steps:

**Windows:**
```
1. Download Node.js → Run installer → Click Next → Finish
2. Download PostgreSQL → Run installer → Enter password (remember it!) → Finish
3. Download Git → Run installer → Click Next → Finish
4. Download VSCode → Run installer → Finish
5. Download Postman → Run installer → Finish
```

**Mac:**
```
1. Install Homebrew (if not installed):
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

2. Install Node.js:
   brew install node

3. Install PostgreSQL:
   brew install postgresql
   brew services start postgresql

4. Install Git:
   brew install git

5. Download VSCode from website
6. Download Postman from website
```

**Linux (Ubuntu/Debian):**
```
sudo apt update
sudo apt install nodejs npm postgresql postgresql-contrib git

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## ⚙️ PHASE 1: Environment Setup (30 minutes)

### Step 1.1: Create Project Structure

Open terminal/command prompt and run:

```bash
# Navigate to your projects folder
cd C:\Users\YourName\Projects
# (or your preferred location)

# Create main project folder
mkdir itsmpro
cd itsmpro

# Create backend folder
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# This creates package.json - your project config file
```

### Step 1.2: Install Required Dependencies

```bash
# Still in backend folder, run:

npm install express cors dotenv pg bcryptjs jsonwebtoken joi winston axios

# What each does:
# - express: Web framework for building API
# - cors: Handle requests from different domains
# - dotenv: Load environment variables from .env file
# - pg: PostgreSQL database driver
# - bcryptjs: Hash passwords securely
# - jsonwebtoken: Create JWT tokens for auth
# - joi: Validate incoming data
# - winston: Log events and errors
# - axios: Make HTTP requests
```

For development tools:

```bash
npm install --save-dev nodemon

# What it does:
# - nodemon: Auto-restart server when you save changes
```

### Step 1.3: Create Folder Structure

In your `backend` folder, create these folders:

```bash
# From backend folder:
mkdir -p src/config
mkdir -p src/middleware
mkdir -p src/routes
mkdir -p src/controllers
mkdir -p src/models
mkdir -p src/utils
mkdir -p src/validators
mkdir -p database
```

Final structure:
```
backend/
├── node_modules/
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── utils/
│   └── validators/
├── database/
├── package.json
├── package-lock.json
└── .env
```

### Step 1.4: Create Environment File

Create file `backend/.env` with this content:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itsmpro
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_min_32_characters
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Email (optional - for later)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Step 1.5: Update package.json

Open `backend/package.json` and replace the scripts section:

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

---

## 🗄️ PHASE 2: Database Setup (45 minutes)

### Step 2.1: Create PostgreSQL Database

Open PostgreSQL command prompt or terminal:

```bash
# Connect to PostgreSQL as admin
psql -U postgres

# You'll be prompted for password (the one you set during install)
```

Once connected, run:

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

-- Exit
\q
```

### Step 2.2: Create Database Schema

Create file `backend/database/schema.sql`:

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
    request_type VARCHAR(20), -- 'provision', 'move', 'add', 'change'
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
    priority VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
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
    related_incident_ids TEXT, -- JSON array
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
    change_type VARCHAR(50), -- 'standard', 'normal', 'emergency'
    status VARCHAR(50) DEFAULT 'draft',
    impact_assessment TEXT,
    risk_level VARCHAR(20), -- 'low', 'medium', 'high'
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
    type VARCHAR(100), -- 'computer', 'printer', 'server', etc
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
    type VARCHAR(100), -- 'application', 'database', 'server', etc
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
    relationship_type VARCHAR(50), -- 'depends_on', 'supports', 'contains'
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
    type VARCHAR(50), -- 'operational', 'business', 'compliance'
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
    type VARCHAR(100), -- 'slack', 'active_directory', 'salesforce'
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

-- Insert roles
INSERT INTO roles (name, description) VALUES
('Admin', 'Full system access'),
('Manager', 'Team management and approvals'),
('Technician', 'Incident resolution'),
('Analyst', 'Problem analysis and reporting'),
('Approver', 'Change advisory board member'),
('User', 'End user access');

-- Insert default SLAs
INSERT INTO sla_definitions (name, response_time_minutes, resolution_time_minutes, priority_level) VALUES
('Premium', 60, 240, 'critical'),
('Standard', 240, 1440, 'high'),
('Basic', 480, 2880, 'low');

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_incidents_created_by ON incidents(created_by);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### Step 2.3: Run Database Schema

From `backend` folder, run:

```bash
# Connect to database and run schema
psql -U postgres -d itsmpro -f database/schema.sql

# Verify tables were created
psql -U postgres -d itsmpro

# Inside psql, list tables:
\dt

# Exit
\q
```

---

## 🔐 PHASE 3: Authentication System (1 hour)

### Step 3.1: Create Database Connection

Create file `backend/src/config/database.js`:

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

module.exports = pool;
```

### Step 3.2: Create Authentication Middleware

Create file `backend/src/middleware/auth.js`:

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
    return res.status(401).json({ message: 'Invalid token' });
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

### Step 3.3: Create Auth Controller

Create file `backend/src/controllers/authController.js`:

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
      [email, hashedPassword, firstName, lastName, roleId || 6] // 6 = User role
    );

    return res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
    return res.status(500).json({ message: 'Internal server error' });
  }
};
```

### Step 3.4: Create Auth Routes

Create file `backend/src/routes/auth.js`:

```javascript
const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
```

---

## 🚀 PHASE 4: Create Main Server (30 minutes)

### Step 4.1: Create Server File

Create file `backend/src/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
});
```

### Step 4.2: Test the Server

From `backend` folder:

```bash
# Start development server
npm run dev

# You should see:
# ✅ Server running on http://localhost:5000
```

Keep this running! Open another terminal window for next steps.

---

## 👥 PHASE 5: Create Incidents Module (1 hour)

### Step 5.1: Create Incident Controller

Create file `backend/src/controllers/incidentController.js`:

```javascript
const pool = require('../config/database');

// Generate incident number
const generateIncidentNumber = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM incidents'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `INC-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createIncident = async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description required' });
    }

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    // Get SLA based on priority
    const slaResult = await pool.query(
      `SELECT response_time_minutes, resolution_time_minutes 
       FROM sla_definitions 
       WHERE priority_level = $1`,
      [priority || 'high']
    );

    const sla = slaResult.rows[0] || {
      response_time_minutes: 240,
      resolution_time_minutes: 1440,
    };

    // Create incident
    const result = await pool.query(
      `INSERT INTO incidents 
       (incident_number, title, description, priority, status, created_by, 
        sla_response_minutes, sla_resolution_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        incidentNumber,
        title,
        description,
        priority || 'high',
        'open',
        createdBy,
        sla.response_time_minutes,
        sla.resolution_time_minutes,
      ]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'incidents', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'Incident created successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getIncidents = async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;

    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${params.length + 1}`;
      params.push(priority);
    }
    if (assignedTo) {
      query += ` AND assigned_to = $${params.length + 1}`;
      params.push(assignedTo);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.json({
      total: result.rows.length,
      incidents: result.rows,
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM incidents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get incident error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, description } = req.body;
    const userId = req.user.userId;

    // Get old values for audit
    const oldResult = await pool.query(
      'SELECT * FROM incidents WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const oldValues = oldResult.rows[0];

    // Update incident
    let updateQuery = 'UPDATE incidents SET ';
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push(`status = $${updateParams.length + 1}`);
      updateParams.push(status);

      if (status === 'resolved') {
        updateFields.push(`resolved_at = NOW()`);
      }
    }
    if (assignedTo) {
      updateFields.push(`assigned_to = $${updateParams.length + 1}`);
      updateParams.push(assignedTo);
    }
    if (description) {
      updateFields.push(`description = $${updateParams.length + 1}`);
      updateParams.push(description);
    }

    updateFields.push('updated_at = NOW()');

    updateQuery += updateFields.join(', ');
    updateQuery += ` WHERE id = $${updateParams.length + 1} RETURNING *`;
    updateParams.push(id);

    const result = await pool.query(updateQuery, updateParams);

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'UPDATE', 'incidents', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Incident updated successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Update incident error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
```

### Step 5.2: Create Incident Routes

Create file `backend/src/routes/incidents.js`:

```javascript
const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const incidentController = require('../controllers/incidentController');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create incident (Users)
router.post('/', incidentController.createIncident);

// Get all incidents (Everyone)
router.get('/', incidentController.getIncidents);

// Get incident by ID (Everyone)
router.get('/:id', incidentController.getIncidentById);

// Update incident (Technicians & Managers)
router.put('/:id', 
  roleMiddleware([2, 3]), // Manager & Technician
  incidentController.updateIncident
);

module.exports = router;
```

### Step 5.3: Add Routes to Server

Update `backend/src/server.js` to include incidents routes:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');  // ADD THIS

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/incidents', incidentRoutes);  // ADD THIS

// ... rest of code
```

---

## 🧪 PHASE 6: Test Your API (30 minutes)

### Step 6.1: Test with Postman

1. **Open Postman**
2. **Create a new request** → Set to POST
3. **URL:** `http://localhost:5000/api/v1/auth/register`
4. **Headers:** 
   - Content-Type: application/json
5. **Body (raw JSON):**
```json
{
  "email": "admin@itsmpro.com",
  "password": "password123",
  "firstName": "Admin",
  "lastName": "User",
  "roleId": 1
}
```
6. **Send** → You should get status 201

### Step 6.2: Login Test

1. **New request** → POST
2. **URL:** `http://localhost:5000/api/v1/auth/login`
3. **Body:**
```json
{
  "email": "admin@itsmpro.com",
  "password": "password123"
}
```
4. **Send** → Copy the token from response

### Step 6.3: Create Incident

1. **New request** → POST
2. **URL:** `http://localhost:5000/api/v1/incidents`
3. **Headers:**
   - Content-Type: application/json
   - Authorization: Bearer {paste_your_token_here}
4. **Body:**
```json
{
  "title": "Email server down",
  "description": "Users cannot access email",
  "priority": "critical"
}
```
5. **Send** → You should get status 201 with incident details

### Step 6.4: Get All Incidents

1. **New request** → GET
2. **URL:** `http://localhost:5000/api/v1/incidents`
3. **Headers:**
   - Authorization: Bearer {your_token}
4. **Send** → Should return list of incidents

---

## 🎨 PHASE 7: Connect Frontend to Backend (45 minutes)

### Step 7.1: Modify Frontend HTML

Edit `frontend/index.html` and add this JavaScript at the end before `</body>`:

```html
<script>
const API_BASE_URL = 'http://localhost:5000/api/v1';
let userToken = localStorage.getItem('token');

// Login function
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      userToken = data.token;
      alert('Login successful!');
      return data;
    } else {
      alert('Login failed: ' + data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Error: ' + error.message);
  }
}

// Get incidents function
async function getIncidents() {
  try {
    const response = await fetch(`${API_BASE_URL}/incidents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('Incidents:', data.incidents);
      return data.incidents;
    } else {
      alert('Failed to get incidents: ' + data.message);
    }
  } catch (error) {
    console.error('Get incidents error:', error);
  }
}

// Create incident function
async function createIncident(title, description, priority) {
  try {
    const response = await fetch(`${API_BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ title, description, priority })
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('Incident created: ' + data.incident.incident_number);
      return data.incident;
    } else {
      alert('Failed to create incident: ' + data.message);
    }
  } catch (error) {
    console.error('Create incident error:', error);
  }
}

// Example usage (call from browser console)
// login('admin@itsmpro.com', 'password123');
// getIncidents();
// createIncident('Test', 'Test description', 'high');
</script>
```

---

## 📊 PHASE 8: Quick Dashboard (1 hour)

### Step 8.1: Create Simple Dashboard

Create file `frontend/dashboard.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>ITSMPro Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f1d2d 0%, #1a2f42 100%);
      color: #e0e7ff;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: rgba(26, 47, 66, 0.8);
      border-radius: 12px;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .login-section {
      background: rgba(26, 47, 66, 0.8);
      padding: 30px;
      border-radius: 12px;
      max-width: 400px;
      margin: 20px auto;
      border: 1px solid #334155;
    }
    .login-section input {
      width: 100%;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #334155;
      border-radius: 6px;
      background: rgba(0,0,0,0.3);
      color: #e0e7ff;
    }
    .login-section button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #3b82f6, #06b6d4);
      border: none;
      border-radius: 6px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 10px;
    }
    .login-section button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
    }
    .dashboard {
      display: none;
    }
    .dashboard.active {
      display: block;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .metric-card {
      background: rgba(26, 47, 66, 0.8);
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .metric-card h3 { font-size: 14px; color: #94a3b8; margin-bottom: 10px; }
    .metric-card .value { font-size: 28px; font-weight: 700; color: #3b82f6; }
    .incidents-section {
      background: rgba(26, 47, 66, 0.8);
      padding: 30px;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .incident-item {
      background: rgba(0, 0, 0, 0.3);
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    .incident-title { font-weight: 600; margin-bottom: 5px; }
    .incident-meta { font-size: 12px; color: #94a3b8; }
    .logout-btn {
      padding: 10px 20px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      float: right;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ ITSMPro Dashboard</h1>
      <p>Enterprise IT Service Management</p>
      <button class="logout-btn" onclick="logout()" style="display:none;" id="logoutBtn">Logout</button>
    </div>

    <!-- Login Section -->
    <div class="login-section" id="loginSection">
      <h2>Login</h2>
      <input type="email" id="email" placeholder="Email" value="admin@itsmpro.com">
      <input type="password" id="password" placeholder="Password" value="password123">
      <button onclick="handleLogin()">Login</button>
      <p style="text-align: center; margin-top: 10px; color: #94a3b8; font-size: 12px;">
        Demo: admin@itsmpro.com / password123
      </p>
    </div>

    <!-- Dashboard -->
    <div class="dashboard" id="dashboard">
      <div class="metrics">
        <div class="metric-card">
          <h3>Open Incidents</h3>
          <div class="value" id="openIncidents">0</div>
        </div>
        <div class="metric-card">
          <h3>In Progress</h3>
          <div class="value" id="inProgressIncidents">0</div>
        </div>
        <div class="metric-card">
          <h3>SLA Compliance</h3>
          <div class="value" id="slaCompliance">95%</div>
        </div>
        <div class="metric-card">
          <h3>Avg Response Time</h3>
          <div class="value" id="avgResponseTime">2.3h</div>
        </div>
      </div>

      <div class="incidents-section">
        <h2>Recent Incidents</h2>
        <button onclick="showCreateIncidentForm()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px;">
          + Create Incident
        </button>
        <div id="incidentsList"></div>
      </div>
    </div>
  </div>

  <script>
    const API_BASE_URL = 'http://localhost:5000/api/v1';
    let userToken = localStorage.getItem('token');

    if (userToken) {
      showDashboard();
      loadIncidents();
    }

    async function handleLogin() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        userToken = data.token;
        localStorage.setItem('token', userToken);
        showDashboard();
        loadIncidents();
      } else {
        alert('Login failed: ' + data.message);
      }
    }

    function showDashboard() {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('dashboard').classList.add('active');
      document.getElementById('logoutBtn').style.display = 'block';
    }

    function logout() {
      localStorage.removeItem('token');
      userToken = null;
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('dashboard').classList.remove('active');
      document.getElementById('logoutBtn').style.display = 'none';
    }

    async function loadIncidents() {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      const data = await response.json();
      const incidents = data.incidents || [];

      const openCount = incidents.filter(i => i.status === 'open').length;
      const inProgressCount = incidents.filter(i => i.status === 'in_progress').length;

      document.getElementById('openIncidents').textContent = openCount;
      document.getElementById('inProgressIncidents').textContent = inProgressCount;

      const list = document.getElementById('incidentsList');
      list.innerHTML = incidents.slice(0, 5).map(incident => `
        <div class="incident-item">
          <div class="incident-title">${incident.incident_number}: ${incident.title}</div>
          <div class="incident-meta">
            Priority: ${incident.priority} | Status: ${incident.status} | Created: ${new Date(incident.created_at).toLocaleDateString()}
          </div>
        </div>
      `).join('');
    }

    function showCreateIncidentForm() {
      const title = prompt('Incident Title:');
      if (!title) return;

      const description = prompt('Description:');
      if (!description) return;

      const priority = prompt('Priority (critical/high/medium/low):');
      if (!priority) return;

      createIncident(title, description, priority);
    }

    async function createIncident(title, description, priority) {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ title, description, priority })
      });

      const data = await response.json();
      if (response.ok) {
        alert('Incident created: ' + data.incident.incident_number);
        loadIncidents();
      } else {
        alert('Failed: ' + data.message);
      }
    }
  </script>
</body>
</html>
```

---

## ✅ PHASE 9: Summary & Next Steps

### You Now Have:

1. ✅ **PostgreSQL Database** with 10+ tables
2. ✅ **Node.js + Express Backend** with JWT authentication
3. ✅ **Incident Management API** (create, read, update)
4. ✅ **Role-Based Access Control** (6 roles)
5. ✅ **Working Dashboard** connected to backend
6. ✅ **Tested API endpoints** with Postman

### What's Running:

```bash
Frontend (HTML):
http://localhost:3000 (serve with: npx http-server frontend)

Backend (API):
http://localhost:5000 (running with: npm run dev)

Database:
PostgreSQL on localhost:5432
```

### Test It End-to-End:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Serve frontend
cd frontend
npx http-server -p 3000

# Terminal 3: Open browser
http://localhost:3000/dashboard.html

# Test:
1. Login with admin@itsmpro.com / password123
2. Click "Create Incident"
3. See incident appear in dashboard
4. Check database with: psql -U postgres -d itsmpro
5. Query: SELECT * FROM incidents;
```

### Next Modules to Build:

Following the same pattern, build:
1. Part 2: Employee & IMAC
2. Part 3: Service Requests
3. Part 4: Changes & Problems
4. Part 5: Assets & CMDB
5. Part 6: Knowledge Base & SLA
6. Part 7: Reports & Integrations

Each module = Controller + Routes + Tests (1-2 hours per module)

---

## 🆘 Troubleshooting

**"Cannot connect to database"**
```bash
# Check PostgreSQL is running
psql -U postgres

# If error, restart PostgreSQL
# Windows: Services > PostgreSQL > Restart
# Mac: brew services restart postgresql
```

**"Port 5000 already in use"**
```bash
# Change PORT in .env file to 5001
# Or kill process: lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill
```

**"JWT token invalid"**
```bash
# Make sure JWT_SECRET in .env is set
# Re-login to get new token
```

---

## 🎓 Learning Resources

- Express.js: https://expressjs.com/
- PostgreSQL: https://www.postgresql.org/docs/
- JWT: https://jwt.io/introduction
- REST API Design: https://restfulapi.net/

---

**Congratulations! You now have a working ITSM backend!** 🚀

Questions? Each phase has error handling. Check terminal logs for details.

