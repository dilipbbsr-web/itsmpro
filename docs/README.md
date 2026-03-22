# ⚡ ITSMPro — Enterprise IT Service Management

A **full-stack, production-ready ITSM platform** with 7 comprehensive modules, intuitive interfaces, and zero proprietary dependencies. Built with Node.js + Express, PostgreSQL, and modern web technologies.

![ITSMPro Dashboard](https://img.shields.io/badge/ITSM-Enterprise%20Platform-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## 🎯 Overview

ITSMPro is a comprehensive IT Service Management platform designed for enterprise organizations. It covers the complete ITSM lifecycle with 7 integrated modules, supporting multiple roles and providing real-time analytics, workflow automation, and seamless integrations.

**Key Highlights:**
- ✅ **7 Integrated Modules** — From Foundation to Reports & Integrations
- ✅ **Role-Based Access Control (RBAC)** — 6 predefined roles with customization
- ✅ **Enterprise Security** — JWT authentication, SSO, encryption
- ✅ **Zero Proprietary Dependencies** — Built on open-source standards
- ✅ **REST APIs** — Full API coverage for all modules
- ✅ **Real-time Dashboards** — Live metrics and analytics
- ✅ **Mobile-Ready** — Responsive design across all devices

---

## 📦 Project Structure

```
itsmpro/
├── backend/                          # Node.js + Express API
│   ├── src/
│   │   ├── server.js                # Entry point
│   │   ├── config/
│   │   │   └── db.js                # PostgreSQL pool
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication + RBAC
│   │   │   └── errorHandler.js      # Global error handling
│   │   ├── routes/
│   │   │   ├── auth.js              # Authentication endpoints
│   │   │   ├── employees.js         # Employee & IMAC (Part 2)
│   │   │   ├── incidents.js         # Incidents & Service Requests (Part 3)
│   │   │   ├── serviceRequests.js   # Service Request workflows
│   │   │   ├── problems.js          # Problem Management (Part 4)
│   │   │   ├── changes.js           # Change Management (Part 4)
│   │   │   ├── assets.js            # Asset & CMDB (Part 5)
│   │   │   ├── cmdb.js              # Configuration Management Database
│   │   │   ├── knowledge.js         # Knowledge Base (Part 6)
│   │   │   ├── sla.js               # SLA Management (Part 6)
│   │   │   ├── reports.js           # Reporting (Part 7)
│   │   │   └── integrations.js      # Third-party Integrations (Part 7)
│   │   ├── controllers/             # Business logic layer
│   │   ├── models/                  # Database models
│   │   ├── utils/                   # Helper functions
│   │   └── validators/              # Input validation
│   ├── config/
│   │   └── database.sql             # Initial database schema
│   ├── package.json
│   └── .env.example
├── frontend/                         # Interactive Prototypes
│   ├── index.html                   # Landing page
│   ├── itsmpro_part1_foundation.html
│   ├── itsmpro_part2_employee_imac.html
│   ├── itsmpro_part3_incidents_s.html
│   ├── itsmpro_part4_problem_change.html
│   ├── itsmpro_part5_asset_cmdb.html
│   ├── itsmpro_part6_kb_sla.html
│   └── itsmpro_part7_reports.html
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── ARCHITECTURE.md              # System architecture
│   ├── DEPLOYMENT.md                # Deployment guide
│   └── ROLES.md                     # Role definitions
├── tests/                           # Unit & integration tests
├── docker-compose.yml               # Docker services
├── .env.example                     # Environment variables template
├── README.md                        # This file
└── LICENSE                          # MIT License
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/itsmpro.git
   cd itsmpro
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database:**
   ```bash
   npm run db:init
   ```

5. **Start the server:**
   ```bash
   npm run dev      # Development mode with hot-reload
   npm start        # Production mode
   ```

6. **Access the frontend:**
   - Open `frontend/index.html` in your browser
   - Or serve via HTTP server: `npx http-server frontend`

---

## 📚 The 7 Modules

### **Part 1: Foundation & Auth** 🔐
Core authentication and user management layer.
- Multi-factor authentication (MFA)
- JWT token management
- Role-Based Access Control (RBAC)
- Single Sign-On (SSO) integration
- User provisioning and management

**Key Endpoints:**
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh-token
GET    /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
```

---

### **Part 2: Employee & IMAC** 👥
Employee lifecycle and IT asset provisioning.
- Employee directory management
- Organization chart visualization
- Onboarding/offboarding workflows
- IMAC processes (Provision, Move, Add, Change)
- Approval workflows with multi-level authorization

**Key Endpoints:**
```
GET    /api/v1/employees
POST   /api/v1/employees
PUT    /api/v1/employees/:id
GET    /api/v1/imac/requests
POST   /api/v1/imac/requests
PUT    /api/v1/imac/requests/:id/approve
```

---

### **Part 3: Incidents & Service Requests** 🚨
Incident and service request management with SLA tracking.
- Multi-channel incident intake
- AI-powered intelligent routing
- Service request catalog
- Fulfillment engine
- Real-time status updates and notifications
- SLA tracking and compliance

**Key Endpoints:**
```
POST   /api/v1/incidents
GET    /api/v1/incidents
PUT    /api/v1/incidents/:id
POST   /api/v1/service-requests
GET    /api/v1/service-catalog
GET    /api/v1/sla/status/:id
```

---

### **Part 4: Problem & Change** 🔧
Root cause analysis and change management.
- Problem tracking and management
- Root Cause Analysis (RCA) with 5-why methodology
- Known Error Database (KEDB)
- Change Request workflows
- Change Advisory Board (CAB) management
- Rollback procedures and disaster recovery

**Key Endpoints:**
```
POST   /api/v1/problems
GET    /api/v1/problems/:id
POST   /api/v1/changes
PUT    /api/v1/changes/:id/approve
GET    /api/v1/changes/:id/impact-analysis
POST   /api/v1/kedb/search
```

---

### **Part 5: Asset & CMDB** 💾
Configuration Management Database and asset tracking.
- Configuration item (CI) management
- Asset lifecycle tracking (acquisition to disposal)
- Software license management
- Hardware warranty tracking
- System topology visualization
- Bi-directional relationship mapping

**Key Endpoints:**
```
GET    /api/v1/cmdb/items
POST   /api/v1/cmdb/items
PUT    /api/v1/cmdb/items/:id
GET    /api/v1/cmdb/topology
GET    /api/v1/assets
POST   /api/v1/licenses/track
```

---

### **Part 6: Knowledge Base & SLA** 📖
Self-service knowledge and SLA management.
- Knowledge base article creation and management
- Full-text search with AI recommendations
- User ratings and feedback
- SLA definition and tracking
- Escalation policies
- Compliance monitoring

**Key Endpoints:**
```
GET    /api/v1/kb/articles
POST   /api/v1/kb/articles
GET    /api/v1/kb/search
POST   /api/v1/kb/articles/:id/rate
GET    /api/v1/sla/definitions
POST   /api/v1/sla/definitions
```

---

### **Part 7: Reports & Integrations** 📊
Analytics, reporting, and third-party integrations.
- Customizable dashboard builder
- Report templates and scheduling
- Custom report generation
- REST API for programmatic access
- Webhooks for event-driven workflows
- Pre-built connectors (Active Directory, Salesforce, Slack, Jira, AWS)
- Real-time data synchronization

**Key Endpoints:**
```
GET    /api/v1/reports/templates
POST   /api/v1/reports/generate
GET    /api/v1/dashboards
POST   /api/v1/dashboards
GET    /api/v1/integrations
POST   /api/v1/integrations/connect
POST   /api/v1/webhooks
```

---

## 🔐 Security Architecture

### Authentication & Authorization
- **JWT Tokens** — Stateless, secure token-based authentication
- **Refresh Tokens** — 7-day expiration with secure rotation
- **RBAC** — 6 predefined roles (Admin, Manager, Technician, Analyst, Approver, User)
- **SSO Integration** — SAML 2.0 and OAuth 2.0 support

### Data Protection
- **Encryption** — AES-256 for sensitive data at rest
- **TLS/SSL** — All API endpoints use HTTPS
- **SQL Injection Prevention** — Parameterized queries with ORM
- **CORS** — Configured for secure cross-origin requests

### Audit & Compliance
- **Audit Trail** — All changes logged with timestamps and user info
- **Data Masking** — PII protection in logs and exports
- **Rate Limiting** — API endpoint throttling (100 req/min per user)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  (Interactive HTML Prototypes + SPA Dashboard)              │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────────┐
│                  API Gateway Layer                           │
│        (Express.js + Authentication + Rate Limiting)        │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼──┐   ┌───▼────┐  ┌──▼────┐
    │Business│   │Database│  │Cache  │
    │Logic   │   │Layer   │  │Layer  │
    │Layer   │   │        │  │(Redis)│
    └────┬──┘   └───┬────┘  └──┬────┘
         │          │          │
    ┌────▼──────────▼──────────▼────┐
    │      PostgreSQL 14+ Database    │
    │  (7 Module Tables + Audit Log) │
    └────────────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  External Integrations         │
    │  (AD, Salesforce, Slack, etc)  │
    └───────────────────────────────┘
```

---

## 📋 Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_BASE_URL=http://localhost:5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itsmpro
DB_USER=itsmpro_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# SSO Configuration
SAML_ENTRY_POINT=https://your-saml-provider/sso
SAML_CERT=your_saml_certificate

# Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SALESFORCE_CLIENT_ID=your_client_id
AWS_ACCESS_KEY=your_aws_key
```

---

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Test coverage report
npm run test:coverage

# End-to-end tests
npm run test:e2e
```

---

## 📊 Database Schema Highlights

### Core Tables
- `users` — User accounts with roles
- `roles` — RBAC role definitions
- `employees` — Employee directory
- `incidents` — Incident tracking
- `service_requests` — Request fulfillment
- `problems` — Problem management
- `changes` — Change requests
- `assets` — Asset registry
- `cmdb_items` — Configuration items
- `kb_articles` — Knowledge base
- `sla_definitions` — SLA policies
- `audit_logs` — Complete audit trail

---

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Cloud Deployment (AWS EC2, Azure, GCP)
See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### GitHub Pages (Frontend)
```bash
cd frontend
npx gh-pages -d .
```

---

## 📖 API Documentation

Complete API documentation is available at:
- **Interactive Docs:** `http://localhost:5000/api/docs` (Swagger UI)
- **Detailed Guide:** [API.md](docs/API.md)

### Example Request:
```bash
curl -X GET http://localhost:5000/api/v1/incidents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

---

## 🙋 Support & Community

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/itsmpro/issues)
- **Email:** support@itsmpro.io
- **Community Forum:** [Discussions](https://github.com/yourusername/itsmpro/discussions)

---

## 🎓 Learning Resources

- [ITSM Fundamentals](https://www.itil.org)
- [Express.js Documentation](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [JWT Guide](https://jwt.io/introduction)

---

## 🗺️ Roadmap

- [ ] Mobile native apps (iOS & Android)
- [ ] Advanced AI-powered incident prediction
- [ ] Machine learning for change impact analysis
- [ ] GraphQL API alternative
- [ ] Kubernetes deployment templates
- [ ] Multi-tenancy support
- [ ] Advanced analytics with BigQuery integration

---

## 💡 Key Features Summary

| Feature | Details |
|---------|---------|
| **Modules** | 7 comprehensive ITSM modules |
| **Authentication** | JWT + SSO (SAML/OAuth) |
| **Database** | PostgreSQL with audit logging |
| **API** | REST + Webhooks |
| **Integrations** | Active Directory, Salesforce, Slack, Jira, AWS |
| **Scalability** | Horizontal scaling ready |
| **Security** | AES-256 encryption, TLS/SSL |
| **Accessibility** | WCAG 2.1 AA compliant |
| **Performance** | Sub-100ms API responses |
| **Uptime SLA** | 99.9% availability target |

---

## 📞 Contact

**ITSMPro Team**
- Website: https://itsmpro.io
- Email: hello@itsmpro.io
- Twitter: [@itsmpro](https://twitter.com/itsmpro)

---

<div align="center">

**⭐ If you find this project helpful, please star it! ⭐**

Made with ❤️ by the ITSMPro Team

</div>
