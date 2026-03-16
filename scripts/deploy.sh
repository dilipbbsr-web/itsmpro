#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# ITSM Pro — Automated Deployment Script
# Tested on: Ubuntu 22.04 LTS / Debian 12
#
# Usage:
#   chmod +x scripts/deploy.sh
#   sudo ./scripts/deploy.sh
# ════════════════════════════════════════════════════════
set -euo pipefail

# ── Colours ─────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${CYAN}▸${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗ ERROR:${NC} $1" >&2; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}══ $1 ══${NC}\n"; }

# ── Configuration ────────────────────────────────────────
APP_USER="${APP_USER:-itsmpro}"
APP_DIR="${APP_DIR:-/var/www/itsmpro}"
DOMAIN="${DOMAIN:-itsm.yourcompany.com}"
DB_NAME="${DB_NAME:-itsmpro}"
DB_USER="${DB_USER:-itsmpro_user}"
NODE_VERSION="20"

header "ITSM Pro Deployment Script"
info "App directory : $APP_DIR"
info "Domain        : $DOMAIN"
info "Database      : $DB_NAME"
echo ""

# ── Must run as root ────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Run as root: sudo ./scripts/deploy.sh"

# ════════════════════════════════════════════════════════
# STEP 1 — System update
# ════════════════════════════════════════════════════════
header "Step 1: System Update"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git unzip build-essential
ok "System packages updated"

# ════════════════════════════════════════════════════════
# STEP 2 — Node.js 20 LTS
# ════════════════════════════════════════════════════════
header "Step 2: Node.js $NODE_VERSION LTS"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
  ok "Node.js $(node -v) installed"
else
  ok "Node.js $(node -v) already installed"
fi

# PM2 globally
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 --silent
  ok "PM2 installed"
fi

# ════════════════════════════════════════════════════════
# STEP 3 — PostgreSQL 15
# ════════════════════════════════════════════════════════
header "Step 3: PostgreSQL 15"
if ! command -v psql &>/dev/null; then
  apt-get install -y -qq postgresql-15 postgresql-client-15
  systemctl enable postgresql
  systemctl start postgresql
  ok "PostgreSQL 15 installed and started"
else
  ok "PostgreSQL already installed: $(psql --version | head -1)"
fi

# ════════════════════════════════════════════════════════
# STEP 4 — Nginx
# ════════════════════════════════════════════════════════
header "Step 4: Nginx"
if ! command -v nginx &>/dev/null; then
  apt-get install -y -qq nginx
  systemctl enable nginx
  ok "Nginx installed"
fi

# ════════════════════════════════════════════════════════
# STEP 5 — Create app user & directories
# ════════════════════════════════════════════════════════
header "Step 5: Application User & Directories"
if ! id "$APP_USER" &>/dev/null; then
  useradd -r -m -s /bin/bash "$APP_USER"
  ok "Created user: $APP_USER"
fi

mkdir -p "$APP_DIR"/{backend,frontend,logs,uploads}
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
ok "Directories created at $APP_DIR"

# ════════════════════════════════════════════════════════
# STEP 6 — PostgreSQL database & user
# ════════════════════════════════════════════════════════
header "Step 6: PostgreSQL Database"

# Generate strong password if not set
DB_PASS="${DB_PASSWORD:-$(openssl rand -base64 24)}"

# Create DB user
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" \
  | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';"

# Create database
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" \
  | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
ok "Database '$DB_NAME' ready"

# ════════════════════════════════════════════════════════
# STEP 7 — Copy application files
# ════════════════════════════════════════════════════════
header "Step 7: Copy Application Files"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cp -r "$PROJECT_ROOT/backend/."    "$APP_DIR/backend/"
cp -r "$PROJECT_ROOT/nginx/."      "$APP_DIR/nginx/"
cp    "$PROJECT_ROOT/ecosystem.config.js" "$APP_DIR/"

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
ok "Application files copied to $APP_DIR"

# ════════════════════════════════════════════════════════
# STEP 8 — Create .env from template
# ════════════════════════════════════════════════════════
header "Step 8: Environment Configuration"
ENV_FILE="$APP_DIR/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  JWT_SECRET=$(openssl rand -base64 48)
  JWT_REFRESH=$(openssl rand -base64 48)

  cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://$DOMAIN

DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_SSL=false

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=$JWT_REFRESH
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_ROUNDS=12

SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=ITSM Pro <noreply@$DOMAIN>

UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
LOG_LEVEL=info
EOF

  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok ".env created"
  warn "Review $ENV_FILE and update SMTP settings before starting"
else
  ok ".env already exists — skipping"
fi

# ════════════════════════════════════════════════════════
# STEP 9 — Install Node dependencies
# ════════════════════════════════════════════════════════
header "Step 9: Node Dependencies"
cd "$APP_DIR/backend"
sudo -u "$APP_USER" npm install --production --silent
ok "Backend dependencies installed"

# ════════════════════════════════════════════════════════
# STEP 10 — Run database migration & seed
# ════════════════════════════════════════════════════════
header "Step 10: Database Migration & Seed"
cd "$APP_DIR/backend"
sudo -u "$APP_USER" node src/utils/migrate.js
ok "Database schema migrated"
sudo -u "$APP_USER" node src/utils/seed.js
ok "Sample data seeded"

# ════════════════════════════════════════════════════════
# STEP 11 — Nginx configuration
# ════════════════════════════════════════════════════════
header "Step 11: Nginx Configuration"
NGINX_CONF="/etc/nginx/sites-available/itsmpro"

# Replace placeholder domain
sed "s/itsm.yourcompany.com/$DOMAIN/g" \
  "$APP_DIR/nginx/itsmpro.conf" > "$NGINX_CONF"

# For initial HTTP-only (before SSL cert)
cat > "/etc/nginx/sites-available/itsmpro-http" << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    root /var/www/itsmpro/frontend/dist;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location / { try_files $uri /index.html; }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/itsmpro-http /etc/nginx/sites-enabled/itsmpro
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t && systemctl reload nginx
ok "Nginx configured (HTTP — run SSL step separately)"

# ════════════════════════════════════════════════════════
# STEP 12 — Start with PM2
# ════════════════════════════════════════════════════════
header "Step 12: Start Application with PM2"
cd "$APP_DIR"
pm2 delete itsmpro-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true
ok "Application started with PM2"

# ════════════════════════════════════════════════════════
# STEP 13 — Firewall
# ════════════════════════════════════════════════════════
header "Step 13: Firewall (UFW)"
if command -v ufw &>/dev/null; then
  ufw --force enable
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS
  ufw deny 5000/tcp  # Block direct API access
  ok "UFW firewall configured"
fi

# ════════════════════════════════════════════════════════
# DONE
# ════════════════════════════════════════════════════════
header "🎉 Deployment Complete!"
echo -e "${GREEN}${BOLD}ITSM Pro is running!${NC}\n"
echo -e "  ${BOLD}API URL:${NC}       http://$(hostname -I | awk '{print $1}'):5000/health"
echo -e "  ${BOLD}App URL:${NC}       http://$(hostname -I | awk '{print $1}') (add SSL for HTTPS)"
echo -e "  ${BOLD}PM2 status:${NC}    pm2 list"
echo -e "  ${BOLD}API logs:${NC}      pm2 logs itsmpro-api"
echo -e "  ${BOLD}DB password:${NC}   $DB_PASS"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Install SSL: sudo apt install certbot python3-certbot-nginx"
echo -e "     sudo certbot --nginx -d $DOMAIN"
echo -e "  2. Update SMTP settings in $APP_DIR/backend/.env"
echo -e "  3. Build and deploy React frontend (see docs/DEPLOYMENT.md)"
echo -e "  4. Configure DNS: point $DOMAIN → $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo ""
