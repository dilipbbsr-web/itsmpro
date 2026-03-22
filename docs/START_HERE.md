# 🚀 START HERE - Phase 1: Backend Foundation

## What You're Doing Right Now

You're building the **backend engine** that powers ITSMPro.

Think of it like this:
- **Frontend (HTML files)**: The car's dashboard and buttons
- **Backend (what you're building)**: The car's engine

Right now you're building the engine. In 4-6 hours, you'll have a working backend.

---

## ⏱️ Time Investment

- **Phase 1:** 4-6 hours today
- **Result:** Working API + Database
- **Effort:** Copy/paste code + run commands

---

## 📋 Before You Start (10 minutes)

### 1️⃣ Check Prerequisites

Open terminal/command prompt and run:

```bash
node --version
```

If you see something like `v18.x.x` ✅ you're good.

If you get "command not found":
- **Download Node.js:** https://nodejs.org/ (get LTS version)
- **Run installer and finish installation**
- **Restart your computer**
- **Try again:** `node --version`

```bash
psql --version
```

If you see `psql (PostgreSQL) 14.x` or higher ✅ you're good.

If you get "command not found":
- **Download PostgreSQL:** https://www.postgresql.org/download/
- **Run installer, SET A PASSWORD (remember it!)**
- **Finish installation**
- **Restart your computer**
- **Try again:** `psql --version`

### 2️⃣ Download All Files

You have files in your downloads/outputs folder:
- All the documentation
- All the HTML frontend files
- This guide

**Download them all to one folder called `itsmpro`**

### 3️⃣ Open Code Editor

Download **VSCode** from https://code.visualstudio.com/ and install it.

---

## 🎯 The 16 Steps (Takes 4-6 Hours)

### **Steps 1-2: Create Folders (10 minutes)**

Open terminal and run:

```bash
# Go to your projects folder
cd Desktop
# or: cd Documents
# or: cd wherever_you_want

# Create project
mkdir itsmpro
cd itsmpro
mkdir backend
cd backend

# Initialize Node.js
npm init -y
```

You now have a `backend` folder with `package.json` file.

### **Steps 3-4: Install Code & Setup (20 minutes)**

Still in backend folder:

```bash
# Install all packages
npm install express cors dotenv pg bcryptjs jsonwebtoken joi winston axios

# Install development tools
npm install --save-dev nodemon
```

Wait for it to finish (shows "added XX packages").

Create `.env` file (use VSCode):
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itsmpro
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_super_secret_jwt_key_here_must_be_min_32_characters_long_1234567890
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
API_VERSION=v1
API_BASE_URL=http://localhost:5000
```

⚠️ **Replace `your_postgres_password` with the password you set when installing PostgreSQL**

### **Step 5: Create Database (30 minutes)**

This is the tricky one, but I'll walk you through it.

Open a **NEW terminal** (don't close the first one):

```bash
# Connect to PostgreSQL
psql -U postgres

# It will ask for password - enter the one you set during install
```

Once connected (you'll see `postgres=#`), copy/paste these commands one by one:

```sql
CREATE DATABASE itsmpro;

CREATE USER itsmpro_user WITH PASSWORD 'secure_password_123';

ALTER ROLE itsmpro_user WITH CREATEDB;

GRANT ALL PRIVILEGES ON DATABASE itsmpro TO itsmpro_user;

\q
```

✅ Database is created!

Update `.env` file:
```
DB_USER=itsmpro_user
DB_PASSWORD=secure_password_123
```

### **Step 5.2: Create Tables (15 minutes)**

In VSCode, create file: `backend/database/schema.sql`

Open the file `PHASE_1_BACKEND.md` and find the "Database Tables" section.

Copy the entire SQL code and paste into `schema.sql`.

Run in terminal:

```bash
psql -U itsmpro_user -d itsmpro -f database/schema.sql
```

✅ All 10+ tables created!

### **Steps 6-10: Create Code Files (1 hour)**

Create these files with the code from `PHASE_1_BACKEND.md`:

1. `backend/src/config/database.js` - Copy from guide
2. `backend/src/middleware/auth.js` - Copy from guide
3. `backend/src/controllers/authController.js` - Copy from guide
4. `backend/src/routes/auth.js` - Copy from guide
5. `backend/src/server.js` - Copy from guide

**How to create files in VSCode:**
- Right-click folder in sidebar
- Click "New File"
- Type filename
- Paste code
- Save (Ctrl+S / Cmd+S)

### **Step 11: Update package.json (5 minutes)**

Open `backend/package.json`, find `"scripts"` section.

Replace:
```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

With:
```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

### **Step 12: Start the Server! (5 minutes)**

In terminal (in backend folder):

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║     ⚡ ITSMPro Backend Server          ║
╠════════════════════════════════════════╣
║ Server:   http://localhost:5000        ║
║ API:      http://localhost:5000/api/v1 ║
║ Health:   http://localhost:5000/api/v1/health ║
║ Status:   🟢 Running                   ║
╚════════════════════════════════════════╝
```

✅ **Server is running!** Keep this terminal open.

### **Steps 13-14: Test with Postman (30 minutes)**

Download Postman: https://www.postman.com/

**Test 1: Health Check**
- New request
- GET
- URL: `http://localhost:5000/api/v1/health`
- Send

Should return 200 with `"message": "Server is running"`

**Test 2: Register User**
- New request
- POST
- URL: `http://localhost:5000/api/v1/auth/register`
- Headers: Content-Type = application/json
- Body (raw):
```json
{
  "email": "admin@itsmpro.com",
  "password": "AdminPassword123!",
  "firstName": "Admin",
  "lastName": "User",
  "roleId": 1
}
```
- Send

Should return 201 with user details

**Test 3: Login**
- New request
- POST
- URL: `http://localhost:5000/api/v1/auth/login`
- Headers: Content-Type = application/json
- Body:
```json
{
  "email": "admin@itsmpro.com",
  "password": "AdminPassword123!"
}
```
- Send

Should return 200 with JWT token

### **Steps 15-16: Verify & Document (20 minutes)**

Create `.gitignore` file in backend:
```
node_modules/
package-lock.json
.env
logs/
.DS_Store
.vscode/
.idea/
*.log
```

Create `backend/README.md`:
```markdown
# ITSMPro Backend API

## Setup
1. npm install
2. Create .env file
3. Run schema: psql -U itsmpro_user -d itsmpro -f database/schema.sql
4. npm run dev

## API
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/health
```

---

## ✅ You're Done!

If you see all tests passing ✅ you've completed Phase 1.

You now have:
- ✅ Node.js + Express backend
- ✅ PostgreSQL database with 10+ tables
- ✅ User registration & login
- ✅ JWT authentication
- ✅ Working API endpoints

---

## 🎯 What Happens Next?

### **Immediately After Phase 1:**

1. **Keep server running** (leave terminal open)
2. **Test a few more endpoints** with Postman
3. **Check database** with: `psql -U itsmpro_user -d itsmpro`
4. **Query users:** `SELECT * FROM users;`

### **Phase 2: Add Incidents Module** (Next 2-3 hours)

Follow similar pattern:
1. Create `controllers/incidentController.js`
2. Create `routes/incidents.js`
3. Add routes to server.js
4. Test with Postman
5. Verify in database

### **Phase 3: Connect Frontend** (Next 2-3 hours)

1. Update HTML files to call API
2. Add login form
3. Display real incidents
4. Test end-to-end

---

## 🆘 If Something Goes Wrong

### "npm: command not found"
→ Node.js not installed. Download from https://nodejs.org/

### "psql: command not found"
→ PostgreSQL not installed. Download from https://www.postgresql.org/download/

### "Cannot connect to database"
→ PostgreSQL not running. Restart it or check Services.

### "Port 5000 already in use"
→ Change PORT in .env to 5001

### "Module not found"
→ Run: `npm install` again

### "Syntax error in SQL"
→ Check you copied the schema correctly. Paste again from PHASE_1_BACKEND.md

### Still stuck?
→ Read PHASE_1_BACKEND.md troubleshooting section

---

## 📊 Time Breakdown

| Step | What | Time |
|------|------|------|
| 1-2 | Folders & npm | 10 min |
| 3-4 | Packages & setup | 20 min |
| 5 | Database | 30 min |
| 6-10 | Code files | 60 min |
| 11 | Update package.json | 5 min |
| 12 | Start server | 5 min |
| 13-14 | Test API | 30 min |
| 15-16 | Verify & document | 20 min |
| **Total** | **Phase 1** | **4-6 hours** |

---

## 🎓 What You're Learning

- Node.js basics
- Express.js framework
- PostgreSQL database
- REST API design
- JWT authentication
- How backend systems work

This is **professional software development**. 💼

---

## 🚀 Ready to Go?

1. **Have Node.js?** ✅
2. **Have PostgreSQL?** ✅
3. **Have VSCode?** ✅
4. **Have files downloaded?** ✅

**Then start with Step 1 above and follow each step in order.**

Don't skip steps. Don't skip sections. Follow the guide exactly.

---

## 💡 Pro Tips

1. **Copy/paste code** from PHASE_1_BACKEND.md carefully
2. **Run one command at a time** - wait for it to complete
3. **Check your spelling** in .env file - small typos cause errors
4. **Read error messages** - they usually tell you what's wrong
5. **Take breaks** - don't code for 6 hours straight

---

## ✨ When You Finish

You'll have working proof that you can:
- Set up a backend system
- Design databases
- Create APIs
- Implement authentication
- Write production code

**This is valuable!** Add it to your portfolio. 💪

---

**You've got this! Start with Step 1 now.** 🚀

Questions? Check PHASE_1_BACKEND.md for detailed explanations of each step.

Good luck! 🎉
