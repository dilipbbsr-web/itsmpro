# ⚡ ITSM Pro — Enterprise IT Service Management

> Full-stack, production-ready ITSM platform — 7 modules, 6 roles, zero proprietary dependencies.

---

## 📦 Project Structure

```
itsmpro/
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── server.js          # Entry point
│   │   ├── config/
│   │   │   ├── db.js          # PostgreSQL pool
│   │   │   └── schema.sql     # Full database schema
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT authentication + RBAC
│   │   │   └── errorHandler.js
│   │   ├── routes/            # REST API endpoints (one file per module)
│   │   │   ├── auth.js
│   │   │   ├── incidents.js
│   │   │   ├── serviceRequests.js
│   │   │   ├── imac.js
│   │   │   ├── problems.js
│   │   │   ├── changes.js
│   │   │   ├── cmdb.js
│   │   │   ├── knowledge.js
│   │   │   ├── sla.js
│   │   │   ├── employees.js
│   │   │   ├── users.js
│   │   │   ├── reports.js
│   │   │   ├── integrations.js
│   │   │   ├── webhooks.js
│   │   │   └── dashboard.js
│   │   └── utils/
│   │       ├── migrate.js     # Run schema.sql against DB
│   │       └── seed.js        # Demo users + sample data
│   ├── .env.example           # Copy to .env and fill in
│   └── package.json
│
├── frontend/                  # React 18 + Vite
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js      # Axios + JWT auto-refresh
│   │   └── ...                # Components from Part 1–7 prototypes
│   ├── vite.config.js
│   └── package.json
│
├── nginx/
│   └── itsmpro.conf           # Production Nginx config (HTTPS + proxy)
│
├── scripts/
│   └── deploy.sh              # Full automated deployment script
│
├── docs/
│   └── DEPLOYMENT.md          # Step-by-step deployment guide
│
├── ecosystem.config.js        # PM2 cluster config
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology | License |
|-------|-----------|---------|
| Runtime | Node.js 20 LTS | MIT |
| Framework | Express.js 4 | MIT |
| Database | PostgreSQL 15 | PostgreSQL License (free) |
| Auth | JWT + bcryptjs | MIT |
| Frontend | React 18 + Vite | MIT |
| State | Zustand | MIT |
| HTTP Client | Axios | MIT |
| Process Manager | PM2 | AGPL (free for commercial use) |
| Web Server | Nginx | BSD 2-clause |
| SSL | Let's Encrypt / Certbot | Mozilla Public License |

**Total cost: $0 in software licenses.**

---

## 🔐 User Roles & Permissions

| Role | Access |
|------|--------|
| Super Admin | Full access including deletion and all configurations |
| Admin | Full access except permanent deletion (requires Super Admin approval) |
| Employee | Log incidents, submit service requests, view own tickets, KB |
| Helpdesk | View/assign all tickets, cannot close or delete |
| Agent | Update and close own assigned tickets only |
| Service Manager | Full action on any ticket, reports, SLA management |

---

## 📡 API Endpoints

Base URL: `https://your-domain.com/api/v1`
Auth: `Authorization: Bearer <JWT_TOKEN>`

| Module | Endpoints |
|--------|-----------|
| Auth | POST /auth/login, /auth/logout, /auth/refresh, GET /auth/me |
| Incidents | CRUD /incidents, POST /incidents/:id/notes |
| Service Requests | CRUD /service-requests, POST /sr/:id/approve |
| IMAC | CRUD /imac, POST /imac/:id/approve |
| Problems | CRUD /problems |
| Changes | CRUD /changes, POST /changes/:id/cab-vote |
| CMDB | CRUD /cmdb/cis, /cmdb/cis/:id/relationships |
| Knowledge Base | CRUD /knowledge, POST /knowledge/:id/feedback |
| SLA | GET/PUT /sla/policies, /sla/escalation-rules |
| Users | CRUD /users |
| Dashboard | GET /dashboard/summary |
| Reports | GET /reports/analytics, POST /reports/export |
| Integrations | CRUD /integrations |
| Webhooks | CRUD /webhooks, GET /webhooks/deliveries |

---

## 🚀 Quick Start (Development)

```bash
# 1. Clone project
git clone https://github.com/your-org/itsmpro.git
cd itsmpro

# 2. Backend
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
npm install
node src/utils/migrate.js  # create tables
node src/utils/seed.js     # seed demo data
npm run dev                # starts on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                # starts on http://localhost:3000
```

---

## 🏭 Production Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the complete step-by-step guide.

**Quick automated deploy:**
```bash
sudo DOMAIN=itsm.yourcompany.com ./scripts/deploy.sh
```

---

## 📊 7 Modules Delivered

1. ✅ **Foundation** — Auth, JWT, RBAC, User Management
2. ✅ **Employee & IMAC** — Org hierarchy, 3-level approval workflow
3. ✅ **Incidents & Service Requests** — P1–P4, SLA, 12-item catalog
4. ✅ **Problem & Change** — RCA, KEDB, CAB voting, rollback tracking
5. ✅ **Asset & CMDB** — 12 CI types, relationship topology, license management
6. ✅ **Knowledge Base & SLA** — Markdown KB, SLA policies, escalation rules
7. ✅ **Reports & Integrations** — Analytics charts, 8 report templates, 12 connectors, REST API docs

---

*ITSM Pro — Built with 100% free, open-source software. Ready for enterprise scale.*
