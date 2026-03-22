-- PART 1: FOUNDATION & AUTH
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

-- PART 2: EMPLOYEE & IMAC
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

-- PART 3: INCIDENTS & SERVICE REQUESTS
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

-- PART 4: PROBLEM & CHANGE
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

-- PART 5: ASSET & CMDB
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

-- PART 6: KNOWLEDGE BASE & SLA
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

-- PART 7: REPORTS & INTEGRATIONS
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

-- AUDIT & COMPLIANCE
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

-- INSERT DEFAULT DATA
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

-- CREATE INDEXES
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);