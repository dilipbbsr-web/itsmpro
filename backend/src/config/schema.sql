-- ═══════════════════════════════════════════════════════════
-- ITSM PRO — Complete Database Schema
-- PostgreSQL 14+  |  Run once on fresh database
-- ═══════════════════════════════════════════════════════════

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fast text search

-- ────────────────────────────────────────────────────────────
-- PART 1: USERS & ROLES
-- ────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'HELPDESK', 'AGENT', 'SERVICE_MANAGER'
);

CREATE TYPE user_status AS ENUM ('active', 'inactive');

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emp_id           VARCHAR(20)  UNIQUE,
  name             VARCHAR(120) NOT NULL,
  email            VARCHAR(200) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             user_role    NOT NULL DEFAULT 'EMPLOYEE',
  dept             VARCHAR(80),
  title            VARCHAR(120),
  phone            VARCHAR(30),
  location         VARCHAR(120),
  manager_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  status           user_status  NOT NULL DEFAULT 'active',
  doj              DATE,
  dob              DATE,
  blood_group      VARCHAR(5),
  emergency_contact TEXT,
  skills           TEXT,
  certifications   TEXT,
  bio              TEXT,
  contract_type    VARCHAR(40)  DEFAULT 'Permanent',
  on_probation     BOOLEAN      DEFAULT FALSE,
  avatar_url       VARCHAR(500),
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_users_dept     ON users(dept);
CREATE INDEX idx_users_manager  ON users(manager_id);

-- Pending deletion requests (Admin → Super Admin)
CREATE TABLE user_delete_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  reason       TEXT,
  reviewed_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PART 2: EMPLOYEE EXTRAS & IMAC
-- ────────────────────────────────────────────────────────────

CREATE TYPE imac_type   AS ENUM ('Install','Move','Add','Change');
CREATE TYPE imac_status AS ENUM (
  'Draft','Submitted','L1 Pending','L1 Approved',
  'L2 Pending','L2 Approved','L3 Pending',
  'Approved','In Progress','Completed','Rejected','Cancelled'
);
CREATE TYPE priority_level AS ENUM ('Low','Medium','High','Critical');

CREATE TABLE imac_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no       VARCHAR(30) NOT NULL UNIQUE,
  type            imac_type   NOT NULL,
  category        VARCHAR(100),
  title           VARCHAR(300) NOT NULL,
  description     TEXT NOT NULL,
  justification   TEXT,
  priority        priority_level NOT NULL DEFAULT 'Medium',
  status          imac_status    NOT NULL DEFAULT 'L1 Pending',
  asset_item      VARCHAR(200),
  target_date     DATE,
  requested_by    UUID NOT NULL REFERENCES users(id),
  assigned_to     UUID REFERENCES users(id),
  l1_approver     UUID REFERENCES users(id),
  l2_approver     UUID REFERENCES users(id),
  l3_approver     UUID REFERENCES users(id),
  l1_status       VARCHAR(20) DEFAULT 'Pending',
  l2_status       VARCHAR(20) DEFAULT 'Pending',
  l3_status       VARCHAR(20) DEFAULT 'Pending',
  l1_comment      TEXT,
  l2_comment      TEXT,
  l3_comment      TEXT,
  l1_date         TIMESTAMPTZ,
  l2_date         TIMESTAMPTZ,
  l3_date         TIMESTAMPTZ,
  tags            TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE imac_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imac_id    UUID NOT NULL REFERENCES imac_requests(id) ON DELETE CASCADE,
  action     VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES users(id),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imac_requested_by ON imac_requests(requested_by);
CREATE INDEX idx_imac_status       ON imac_requests(status);
CREATE INDEX idx_imac_created      ON imac_requests(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- PART 3: INCIDENTS & SERVICE REQUESTS
-- ────────────────────────────────────────────────────────────

CREATE TYPE incident_status AS ENUM (
  'New','Assigned','In Progress','Pending','Resolved','Closed','Cancelled'
);
CREATE TYPE incident_priority AS ENUM ('P1','P2','P3','P4');

CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no       VARCHAR(30) NOT NULL UNIQUE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(100),
  priority        incident_priority NOT NULL DEFAULT 'P3',
  status          incident_status   NOT NULL DEFAULT 'New',
  dept            VARCHAR(80),
  location        VARCHAR(120),
  requested_by    UUID NOT NULL REFERENCES users(id),
  assigned_to     UUID REFERENCES users(id),
  assigned_group  VARCHAR(80),
  sla_policy_id   UUID,
  sla_due         TIMESTAMPTZ,
  sla_breached    BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  tags            TEXT[],
  parent_problem  UUID,  -- links to problems.id (set after FK created)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id  UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  note_type    VARCHAR(20) NOT NULL DEFAULT 'work',  -- work|resolution|update|user
  content      TEXT NOT NULL,
  is_internal  BOOLEAN DEFAULT TRUE,
  author       UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id  UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action       VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES users(id),
  note         TEXT,
  old_value    TEXT,
  new_value    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status     ON incidents(status);
CREATE INDEX idx_incidents_priority   ON incidents(priority);
CREATE INDEX idx_incidents_requested  ON incidents(requested_by);
CREATE INDEX idx_incidents_assigned   ON incidents(assigned_to);
CREATE INDEX idx_incidents_created    ON incidents(created_at DESC);
CREATE INDEX idx_incidents_sla        ON incidents(sla_breached, sla_due);
-- Text search index
CREATE INDEX idx_incidents_search ON incidents USING GIN (to_tsvector('english', title || ' ' || COALESCE(description,'')));

-- Service Request Catalog
CREATE TABLE sr_catalog (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(200) NOT NULL,
  category     VARCHAR(80),
  icon         VARCHAR(10),
  description  TEXT,
  sla_hours    INTEGER DEFAULT 24,
  needs_approval BOOLEAN DEFAULT TRUE,
  fields_json  JSONB,  -- array of field names
  active       BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE sr_status AS ENUM (
  'Submitted','Pending Approval','Approved','In Progress','Fulfilled','Closed','Rejected'
);

CREATE TABLE service_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no      VARCHAR(30) NOT NULL UNIQUE,
  catalog_id     UUID REFERENCES sr_catalog(id),
  title          VARCHAR(300) NOT NULL,
  description    TEXT,
  fields_data    JSONB,  -- { "Software Name": "Zoom", ... }
  priority       priority_level NOT NULL DEFAULT 'Medium',
  status         sr_status      NOT NULL DEFAULT 'Submitted',
  sla_hours      INTEGER,
  sla_due        TIMESTAMPTZ,
  requested_by   UUID NOT NULL REFERENCES users(id),
  assigned_to    UUID REFERENCES users(id),
  l1_approver    UUID REFERENCES users(id),
  l2_approver    UUID REFERENCES users(id),
  l3_approver    UUID REFERENCES users(id),
  l1_status      VARCHAR(20) DEFAULT 'Pending',
  l2_status      VARCHAR(20) DEFAULT 'Pending',
  l3_status      VARCHAR(20) DEFAULT 'Pending',
  l1_comment     TEXT,
  l2_comment     TEXT,
  l3_comment     TEXT,
  l1_date        TIMESTAMPTZ,
  l2_date        TIMESTAMPTZ,
  l3_date        TIMESTAMPTZ,
  fulfilled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sr_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sr_id         UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  is_internal   BOOLEAN DEFAULT FALSE,
  author        UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sr_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sr_id         UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  action        VARCHAR(100) NOT NULL,
  performed_by  UUID REFERENCES users(id),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_status      ON service_requests(status);
CREATE INDEX idx_sr_requested   ON service_requests(requested_by);
CREATE INDEX idx_sr_created     ON service_requests(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- PART 4: PROBLEMS & CHANGES
-- ────────────────────────────────────────────────────────────

CREATE TYPE problem_status AS ENUM (
  'Open','Under Investigation','Root Cause Identified',
  'Known Error','Fix In Progress','Resolved','Closed'
);
CREATE TYPE impact_level AS ENUM ('Low','Medium','High','Critical');

CREATE TABLE problems (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no       VARCHAR(30) NOT NULL UNIQUE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(100),
  impact          impact_level    NOT NULL DEFAULT 'Medium',
  status          problem_status  NOT NULL DEFAULT 'Open',
  owner_id        UUID REFERENCES users(id),
  team            VARCHAR(80),
  root_cause      TEXT,
  workaround      TEXT,
  fix_plan        TEXT,
  is_known_error  BOOLEAN DEFAULT FALSE,
  kedb_id         VARCHAR(30) UNIQUE,
  linked_incidents TEXT[],  -- array of ticket_no
  linked_changes  TEXT[],
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE problem_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id   UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  action       VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES users(id),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_problems_status ON problems(status);
CREATE INDEX idx_problems_impact ON problems(impact);

-- Changes
CREATE TYPE change_type   AS ENUM ('Standard','Normal','Emergency');
CREATE TYPE change_status AS ENUM (
  'Draft','Submitted','CAB Review','CAB Approved','Scheduled',
  'In Progress','Completed','Failed','Rolled Back','Cancelled'
);

CREATE TABLE changes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no         VARCHAR(30) NOT NULL UNIQUE,
  type              change_type   NOT NULL DEFAULT 'Normal',
  title             VARCHAR(300)  NOT NULL,
  description       TEXT NOT NULL,
  category          VARCHAR(100),
  risk_level        VARCHAR(20)   NOT NULL DEFAULT 'Medium',
  business_impact   VARCHAR(40),
  status            change_status NOT NULL DEFAULT 'Draft',
  requested_by      UUID NOT NULL REFERENCES users(id),
  owner_id          UUID REFERENCES users(id),
  team              VARCHAR(80),
  justification     TEXT,
  rollback_plan     TEXT NOT NULL,
  test_plan         TEXT NOT NULL,
  impacted_systems  TEXT[],
  linked_problems   TEXT[],
  scheduled_start   TIMESTAMPTZ,
  scheduled_end     TIMESTAMPTZ,
  actual_start      TIMESTAMPTZ,
  actual_end        TIMESTAMPTZ,
  cab_votes         JSONB DEFAULT '[]',
  implementation_notes TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE change_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_id    UUID NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  action       VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES users(id),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_changes_status  ON changes(status);
CREATE INDEX idx_changes_type    ON changes(type);
CREATE INDEX idx_changes_created ON changes(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- PART 5: ASSETS & CMDB
-- ────────────────────────────────────────────────────────────

CREATE TYPE ci_status AS ENUM (
  'Active','Inactive','In Repair','Retired','In Transit','Reserved','Disposed','Lost/Stolen'
);

CREATE TABLE configuration_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ci_id           VARCHAR(30)  NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  ci_type         VARCHAR(80)  NOT NULL,
  ci_category     VARCHAR(40),
  status          ci_status    NOT NULL DEFAULT 'Active',
  environment     VARCHAR(40),
  location        VARCHAR(120),
  dept            VARCHAR(80),
  assigned_to     UUID REFERENCES users(id),
  managed_by      UUID REFERENCES users(id),
  purchase_date   DATE,
  warranty_expiry DATE,
  last_seen       TIMESTAMPTZ,
  tags            TEXT[],
  fields_data     JSONB DEFAULT '{}',
  linked_incidents TEXT[],
  linked_changes  TEXT[],
  linked_problems TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ci_relationships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_ci         UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  to_ci           UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  relationship    VARCHAR(80) NOT NULL,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_ci, to_ci, relationship)
);

CREATE TABLE ci_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ci_id      UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  author     UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ci_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ci_id      UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  action     VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES users(id),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ci_type     ON configuration_items(ci_type);
CREATE INDEX idx_ci_status   ON configuration_items(status);
CREATE INDEX idx_ci_assigned ON configuration_items(assigned_to);
CREATE INDEX idx_ci_search   ON configuration_items USING GIN (to_tsvector('english', name));

-- ────────────────────────────────────────────────────────────
-- PART 6: KNOWLEDGE BASE & SLA
-- ────────────────────────────────────────────────────────────

CREATE TYPE kb_status AS ENUM ('Published','Draft','Under Review','Archived');

CREATE TABLE kb_articles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id   VARCHAR(30) NOT NULL UNIQUE,
  title        VARCHAR(300) NOT NULL,
  content      TEXT NOT NULL,
  category     VARCHAR(80),
  product_area VARCHAR(80),
  status       kb_status NOT NULL DEFAULT 'Draft',
  author_id    UUID NOT NULL REFERENCES users(id),
  reviewer_id  UUID REFERENCES users(id),
  is_internal  BOOLEAN DEFAULT FALSE,
  is_featured  BOOLEAN DEFAULT FALSE,
  views        INTEGER DEFAULT 0,
  helpful_votes     INTEGER DEFAULT 0,
  not_helpful_votes INTEGER DEFAULT 0,
  tags         TEXT[],
  linked_incidents TEXT[],
  related_articles TEXT[],
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kb_feedback (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX idx_kb_status   ON kb_articles(status);
CREATE INDEX idx_kb_category ON kb_articles(category);
CREATE INDEX idx_kb_search   ON kb_articles USING GIN (to_tsvector('english', title || ' ' || content));

-- SLA Policies
CREATE TABLE sla_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id       VARCHAR(30) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  scope           TEXT,
  tiers_json      JSONB NOT NULL DEFAULT '{}',
  business_hours  JSONB NOT NULL DEFAULT '{}',
  active          BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Escalation Rules
CREATE TABLE escalation_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id         VARCHAR(30) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  trigger_event   VARCHAR(100) NOT NULL,
  condition_text  TEXT NOT NULL,
  action_type     VARCHAR(100) NOT NULL,
  notify_users    UUID[],
  priority_scope  VARCHAR(40),
  sla_policy_id   UUID REFERENCES sla_policies(id),
  active          BOOLEAN DEFAULT TRUE,
  fire_count      INTEGER DEFAULT 0,
  last_fired_at   TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SLA Breach log
CREATE TABLE sla_breaches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_type  VARCHAR(30) NOT NULL,  -- incident|sr
  ticket_id    UUID NOT NULL,
  ticket_no    VARCHAR(30),
  breach_type  VARCHAR(40) NOT NULL,  -- Response|Resolution
  sla_policy   VARCHAR(200),
  priority     VARCHAR(10),
  breached_by  INTERVAL,  -- how much over SLA
  agent_id     UUID REFERENCES users(id),
  dept         VARCHAR(80),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PART 7: INTEGRATIONS & WEBHOOKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE integrations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  int_id       VARCHAR(30) NOT NULL UNIQUE,
  name         VARCHAR(200) NOT NULL,
  type         VARCHAR(40) NOT NULL,
  category     VARCHAR(60),
  icon         VARCHAR(10),
  description  TEXT,
  endpoint     VARCHAR(500),
  auth_type    VARCHAR(60),
  credentials  JSONB,  -- encrypted in production
  enabled      BOOLEAN DEFAULT FALSE,
  last_sync    TIMESTAMPTZ,
  sync_count   INTEGER DEFAULT 0,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_registrations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(200),
  target_url VARCHAR(500) NOT NULL,
  events     TEXT[] NOT NULL,
  secret     VARCHAR(200),
  active     BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id    UUID REFERENCES webhook_registrations(id) ON DELETE CASCADE,
  event_type    VARCHAR(80) NOT NULL,
  payload       JSONB,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_ms   INTEGER,
  error_msg     TEXT,
  delivered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type);

-- ────────────────────────────────────────────────────────────
-- AUDIT & NOTIFICATION TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  resource_type VARCHAR(60),
  resource_id  UUID,
  old_data     JSONB,
  new_data     JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user     ON audit_log(user_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created  ON audit_log(created_at DESC);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(40) NOT NULL,
  title        VARCHAR(300) NOT NULL,
  message      TEXT,
  link         VARCHAR(500),
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','imac_requests','incidents','service_requests',
    'problems','changes','configuration_items','kb_articles',
    'sla_policies','escalation_rules','integrations'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- ADD FOREIGN KEY that needs both tables (incidents ↔ problems)
-- ────────────────────────────────────────────────────────────
ALTER TABLE incidents
  ADD CONSTRAINT fk_incident_problem
  FOREIGN KEY (parent_problem) REFERENCES problems(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- TICKET NUMBER SEQUENCES
-- ────────────────────────────────────────────────────────────
CREATE SEQUENCE seq_incident   START 1000 INCREMENT 1;
CREATE SEQUENCE seq_sr         START 1000 INCREMENT 1;
CREATE SEQUENCE seq_imac       START 1000 INCREMENT 1;
CREATE SEQUENCE seq_problem    START 1000 INCREMENT 1;
CREATE SEQUENCE seq_change     START 1000 INCREMENT 1;
CREATE SEQUENCE seq_ci         START 1000 INCREMENT 1;
CREATE SEQUENCE seq_kb         START 1000 INCREMENT 1;
CREATE SEQUENCE seq_kedb       START 1    INCREMENT 1;

-- Helper function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_no(prefix TEXT, seq_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN prefix || '-' || LPAD(nextval(seq_name)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
