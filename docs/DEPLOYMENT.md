# ITSM Pro — Step-by-Step Deployment Guide

> **Stack**: Node.js 20 LTS · PostgreSQL 15 · Nginx · PM2 · React (Vite)
> **OS**: Ubuntu 22.04 LTS (also works on Debian 12, CentOS 8+)
> **All software is free & open-source (MIT / Apache 2.0 licensed)**

---

## 📋 Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04 | Ubuntu 22.04 LTS |
| Open ports | 22, 80, 443 | 22, 80, 443 |

---

## 🚀 Quick Automated Deployment (Recommended)

```bash
# 1. Upload project to server
scp -r ./itsmpro ubuntu@YOUR_SERVER_IP:/tmp/

# 2. SSH into server
ssh ubuntu@YOUR_SERVER_IP

# 3. Run deploy script (takes ~5 minutes)
cd /tmp/itsmpro
chmod +x scripts/deploy.sh
sudo DOMAIN=itsm.yourcompany.com ./scripts/deploy.sh
```

That's it — the script handles everything in Steps 1–13.

---

## 🔧 Manual Step-by-Step Deployment

### STEP 1 — Update System

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git unzip build-essential
```

---

### STEP 2 — Install Node.js 20 LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version    # should show v20.x.x
npm --version     # should show 10.x.x

# Install PM2 globally
sudo npm install -g pm2
pm2 --version
```

---

### STEP 3 — Install PostgreSQL 15

```bash
sudo apt-get install -y postgresql-15 postgresql-client-15

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo systemctl status postgresql
```

---

### STEP 4 — Install Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
nginx -v
curl http://localhost  # should show Nginx welcome page
```

---

### STEP 5 — Create Application User

```bash
# Create dedicated non-root user for the app
sudo useradd -r -m -s /bin/bash itsmpro

# Create directories
sudo mkdir -p /var/www/itsmpro/{backend,frontend,logs,uploads}
sudo chown -R itsmpro:itsmpro /var/www/itsmpro
```

---

### STEP 6 — Set Up PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

-- Inside psql shell:
CREATE USER itsmpro_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
CREATE DATABASE itsmpro OWNER itsmpro_user;
GRANT ALL PRIVILEGES ON DATABASE itsmpro TO itsmpro_user;
\q
```

> **Important**: Replace `YOUR_STRONG_PASSWORD_HERE` with a strong, random password.
> Generate one: `openssl rand -base64 24`

---

### STEP 7 — Deploy Application Files

```bash
# Copy backend files
sudo cp -r ./backend/. /var/www/itsmpro/backend/
sudo cp ecosystem.config.js /var/www/itsmpro/
sudo chown -R itsmpro:itsmpro /var/www/itsmpro
```

---

### STEP 8 — Configure Environment

```bash
sudo cp /var/www/itsmpro/backend/.env.example /var/www/itsmpro/backend/.env
sudo nano /var/www/itsmpro/backend/.env
```

Fill in these required values:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://itsm.yourcompany.com

DB_HOST=localhost
DB_PORT=5432
DB_NAME=itsmpro
DB_USER=itsmpro_user
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Generate with: openssl rand -base64 48
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
JWT_REFRESH_SECRET=GENERATE_ANOTHER_64_CHAR_STRING

BCRYPT_ROUNDS=12
SMTP_HOST=your.smtp.server.com
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your_smtp_password
```

```bash
# Lock down the .env file
sudo chmod 600 /var/www/itsmpro/backend/.env
sudo chown itsmpro:itsmpro /var/www/itsmpro/backend/.env
```

---

### STEP 9 — Install Node Dependencies

```bash
cd /var/www/itsmpro/backend
sudo -u itsmpro npm install --production
```

---

### STEP 10 — Run Database Migration & Seed

```bash
cd /var/www/itsmpro/backend

# Create all tables
sudo -u itsmpro node src/utils/migrate.js

# Seed demo users and sample data
sudo -u itsmpro node src/utils/seed.js
```

Expected output:
```
✅ PostgreSQL connected: PostgreSQL 15.x
✅ Schema created successfully
✅ Migration complete!

🌱 Seeding ITSM Pro database...
  ✓ Alex Morgan (SUPER_ADMIN)
  ✓ Sarah Chen (ADMIN)
  ... 11 users seeded
  ✓ 12 catalog items
  ✓ 3 SLA policies
🎉 Seed complete!
```

---

### STEP 11 — Start Application with PM2

```bash
cd /var/www/itsmpro

# Start all processes
pm2 start ecosystem.config.js --env production

# Verify it's running
pm2 list
pm2 logs itsmpro-api --lines 20

# Test API
curl http://localhost:5000/health
# Expected: {"status":"ok","service":"ITSM Pro API","version":"1.0.0"}

# Save PM2 process list (survives reboots)
pm2 save

# Configure PM2 to start on system boot
pm2 startup
# ↑ This prints a command — copy and run it
```

---

### STEP 12 — Configure Nginx (HTTP first)

```bash
# Copy HTTP-only config for now (before SSL)
sudo tee /etc/nginx/sites-available/itsmpro-http << 'EOF'
server {
    listen 80;
    server_name itsm.yourcompany.com;
    root /var/www/itsmpro/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000;
    }

    location / {
        try_files $uri /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/itsmpro-http /etc/nginx/sites-enabled/itsmpro
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

### STEP 13 — Install SSL Certificate (Let's Encrypt — FREE)

> **Prerequisite**: Your domain DNS must point to this server's IP before running this.

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get free SSL certificate
sudo certbot --nginx -d itsm.yourcompany.com

# Certbot auto-renews every 90 days. Test renewal:
sudo certbot renew --dry-run

# Now switch to the full HTTPS Nginx config
sudo cp /var/www/itsmpro/nginx/itsmpro.conf /etc/nginx/sites-available/itsmpro
sudo sed -i 's/itsm.yourcompany.com/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/itsmpro
sudo ln -sf /etc/nginx/sites-available/itsmpro /etc/nginx/sites-enabled/itsmpro
sudo nginx -t && sudo systemctl reload nginx
```

---

### STEP 14 — Build & Deploy React Frontend

```bash
# On your LOCAL machine (or CI/CD):
cd frontend
npm install
npm run build        # creates frontend/dist/

# Upload dist to server
scp -r dist/ ubuntu@YOUR_SERVER:/var/www/itsmpro/frontend/

# Or if cloning to server:
cd /var/www/itsmpro/frontend
npm install
npm run build
```

---

### STEP 15 — Configure Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5000       # Block direct API port from outside
sudo ufw status
```

---

## ✅ Verification Checklist

```bash
# 1. API health
curl https://itsm.yourcompany.com/health
# → {"status":"ok","service":"ITSM Pro API"}

# 2. Login
curl -X POST https://itsm.yourcompany.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@itsm.com","password":"Admin@123"}'
# → {"accessToken":"...","user":{...}}

# 3. Process status
pm2 list               # itsmpro-api = online
sudo systemctl status nginx postgresql   # both active

# 4. Logs
pm2 logs itsmpro-api   # no errors
tail -50 /var/log/nginx/itsmpro_error.log
```

---

## 🔄 Update / Redeploy

```bash
# Pull latest code
cd /tmp && git pull origin main

# Backend update
cp -r backend/. /var/www/itsmpro/backend/
cd /var/www/itsmpro/backend
sudo -u itsmpro npm install --production

# Zero-downtime reload (PM2 cluster)
pm2 reload itsmpro-api

# Frontend update (if changed)
cd frontend && npm run build
cp -r dist/ /var/www/itsmpro/frontend/
```

---

## 🗄️ Database Backup

```bash
# Backup
sudo -u postgres pg_dump itsmpro > /backup/itsmpro_$(date +%Y%m%d_%H%M).sql
gzip /backup/itsmpro_*.sql

# Restore
gunzip < /backup/itsmpro_20250314_1200.sql.gz | sudo -u postgres psql itsmpro

# Automated daily backup (add to crontab: crontab -e)
0 2 * * * pg_dump -U itsmpro_user itsmpro | gzip > /backup/itsmpro_$(date +\%Y\%m\%d).sql.gz
```

---

## 📊 Monitoring

```bash
# PM2 monitoring dashboard (in terminal)
pm2 monit

# Check memory and CPU
pm2 list

# Application logs
pm2 logs itsmpro-api --lines 100

# Nginx logs
tail -f /var/log/nginx/itsmpro_access.log
tail -f /var/log/nginx/itsmpro_error.log

# PostgreSQL
sudo -u postgres psql itsmpro -c "SELECT count(*) FROM users;"
```

---

## 🔑 Demo Login Credentials (After Seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@itsm.com | Admin@123 |
| Admin | admin@itsm.com | Admin@123 |
| Employee | employee@company.com | Employee@123 |
| Helpdesk | helpdesk@company.com | Helpdesk@123 |
| Agent | agent@company.com | Agent@123 |
| Service Manager | manager@company.com | Manager@123 |

> **⚠️ Change all passwords immediately after first login in production!**

---

## 🆘 Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 5000 not responding | `pm2 restart itsmpro-api` |
| DB connection refused | `sudo systemctl start postgresql` |
| Nginx 502 Bad Gateway | Check PM2 is running: `pm2 list` |
| SSL cert issues | `sudo certbot renew --force-renewal` |
| Permission denied on uploads | `sudo chown -R itsmpro:itsmpro /var/www/itsmpro/uploads` |
| Out of memory | Increase server RAM or set `max_memory_restart` in PM2 config |

---

## 📞 Support

For issues, check logs first:
```bash
pm2 logs itsmpro-api --err --lines 50
```
