'use strict';
/**
 * ITSM Pro — Database Seeder
 * Usage: node src/utils/seed.js
 * Seeds all demo users and sample data matching the prototype.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, withTransaction, testConnection } = require('../config/db');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const USERS = [
  { name:'Alex Morgan',    email:'superadmin@itsm.com',      password:'Admin@123',     role:'SUPER_ADMIN',    dept:'IT',          title:'CIO / System Administrator', emp_id:'EMP-001' },
  { name:'Sarah Chen',     email:'admin@itsm.com',           password:'Admin@123',     role:'ADMIN',          dept:'IT',          title:'IT Manager',                 emp_id:'EMP-002' },
  { name:'James Wilson',   email:'employee@company.com',     password:'Employee@123',  role:'EMPLOYEE',       dept:'Finance',     title:'Finance Analyst',            emp_id:'EMP-003' },
  { name:'Priya Sharma',   email:'helpdesk@company.com',     password:'Helpdesk@123',  role:'HELPDESK',       dept:'IT',          title:'Help Desk Analyst',          emp_id:'EMP-004' },
  { name:'David Lee',      email:'agent@company.com',        password:'Agent@123',     role:'AGENT',          dept:'IT',          title:'IT Support Specialist',      emp_id:'EMP-005' },
  { name:'Maria Garcia',   email:'manager@company.com',      password:'Manager@123',   role:'SERVICE_MANAGER',dept:'IT',          title:'IT Service Manager',         emp_id:'EMP-006' },
  { name:'Robert Kim',     email:'rkim@company.com',         password:'Pass@123',      role:'EMPLOYEE',       dept:'Finance',     title:'Finance Manager',            emp_id:'EMP-007' },
  { name:'Emily Brown',    email:'ebrown@company.com',       password:'Pass@123',      role:'AGENT',          dept:'IT',          title:'Network Engineer',           emp_id:'EMP-008' },
  { name:'Kevin Patel',    email:'kpatel@company.com',       password:'Pass@123',      role:'EMPLOYEE',       dept:'HR',          title:'HR Specialist',              emp_id:'EMP-009' },
  { name:'Lisa Zhang',     email:'lzhang@company.com',       password:'Pass@123',      role:'EMPLOYEE',       dept:'Engineering', title:'Software Engineer',          emp_id:'EMP-010' },
  { name:'Mark Turner',    email:'mturner@company.com',      password:'Pass@123',      role:'AGENT',          dept:'IT',          title:'Systems Engineer',           emp_id:'EMP-011' },
];

const SR_CATALOG = [
  { name:'New Software Installation', category:'Software', icon:'💻', description:'Request installation of new software on your device', sla_hours:48, needs_approval:true,  fields_json:['Software Name','Version','Business Justification'] },
  { name:'Hardware Request',           category:'Hardware', icon:'🖥️', description:'Request new hardware equipment', sla_hours:72, needs_approval:true,  fields_json:['Hardware Type','Specification','Business Justification'] },
  { name:'VPN / Remote Access',        category:'Access',   icon:'🔐', description:'Request VPN or remote access setup', sla_hours:24, needs_approval:true,  fields_json:['Access Type','Duration','Manager Approval Reference'] },
  { name:'New User Account',           category:'Access',   icon:'👤', description:'Create a new user account', sla_hours:24, needs_approval:true,  fields_json:['System/App Name','Access Level','Manager Name'] },
  { name:'Password Reset',             category:'Access',   icon:'🔑', description:'Reset password for an account', sla_hours:4,  needs_approval:false, fields_json:['System Name','Username'] },
  { name:'Email Group / Distribution', category:'Email',    icon:'📧', description:'Create or modify an email distribution list', sla_hours:8,  needs_approval:false, fields_json:['Group Name','Members','Purpose'] },
  { name:'Printer Setup',              category:'Hardware', icon:'🖨️', description:'Configure or troubleshoot printer', sla_hours:8,  needs_approval:false, fields_json:['Printer Name/Location','Issue Description'] },
  { name:'Data Backup Request',        category:'Data',     icon:'💾', description:'Request scheduled or one-time data backup', sla_hours:24, needs_approval:true,  fields_json:['Data Location','Backup Frequency','Retention Period'] },
  { name:'Mobile Device Setup',        category:'Hardware', icon:'📱', description:'Configure a new mobile device', sla_hours:24, needs_approval:true,  fields_json:['Device Type','Model','IMEI/Serial'] },
  { name:'Conference Room AV',         category:'Facilities',icon:'📽️',description:'Setup or troubleshoot conference room AV', sla_hours:4,  needs_approval:false, fields_json:['Room Number','Date & Time','Issue Description'] },
  { name:'Database Access',            category:'Data',     icon:'🗄️', description:'Request access to a database', sla_hours:48, needs_approval:true,  fields_json:['Database Name','Access Level','Business Justification'] },
  { name:'Shared Drive Access',        category:'Access',   icon:'📁', description:'Request access to a shared drive', sla_hours:8,  needs_approval:true,  fields_json:['Drive/Folder Path','Access Level','Manager Name'] },
];

const SLA_POLICIES = [
  {
    policy_id:'SLA-001', name:'Standard IT Support',
    description:'Default SLA for all IT incidents and service requests',
    scope:'All Incidents & Service Requests', active:true,
    tiers_json: { P1:{responseH:1,resolveH:4,escalateAfterH:2}, P2:{responseH:2,resolveH:8,escalateAfterH:5}, P3:{responseH:4,resolveH:24,escalateAfterH:16}, P4:{responseH:8,resolveH:72,escalateAfterH:48} },
    business_hours: { enabled:true, start:'08:00', end:'18:00', timezone:'EST', excludeWeekends:true },
  },
  {
    policy_id:'SLA-002', name:'VIP Executive Support',
    description:'Premium SLA for C-suite and VP-level users',
    scope:'Incidents raised by VIP users', active:true,
    tiers_json: { P1:{responseH:0.5,resolveH:2,escalateAfterH:1}, P2:{responseH:1,resolveH:4,escalateAfterH:2}, P3:{responseH:2,resolveH:8,escalateAfterH:6}, P4:{responseH:4,resolveH:24,escalateAfterH:20} },
    business_hours: { enabled:false, start:'00:00', end:'23:59', timezone:'EST', excludeWeekends:false },
  },
  {
    policy_id:'SLA-003', name:'24x7 Critical Infrastructure',
    description:'Around-the-clock SLA for production servers and network',
    scope:'Production infrastructure CIs only', active:true,
    tiers_json: { P1:{responseH:0.25,resolveH:2,escalateAfterH:1}, P2:{responseH:1,resolveH:4,escalateAfterH:2}, P3:{responseH:2,resolveH:12,escalateAfterH:8}, P4:{responseH:4,resolveH:48,escalateAfterH:36} },
    business_hours: { enabled:false, start:'00:00', end:'23:59', timezone:'EST', excludeWeekends:false },
  },
];

async function seed() {
  console.log('🌱 Seeding ITSM Pro database...\n');
  await testConnection();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Users ──────────────────────────────────
    console.log('👥 Seeding users...');
    const userIds = {};
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, ROUNDS);
      const { rows } = await client.query(`
        INSERT INTO users (emp_id, name, email, password_hash, role, dept, title)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role
        RETURNING id, email
      `, [u.emp_id, u.name, u.email, hash, u.role, u.dept, u.title]);
      userIds[u.email] = rows[0].id;
      process.stdout.write(`  ✓ ${u.name} (${u.role})\n`);
    }

    // Set manager relationships
    await client.query('UPDATE users SET manager_id=$1 WHERE email=$2', [userIds['superadmin@itsm.com'], 'admin@itsm.com']);
    await client.query('UPDATE users SET manager_id=$1 WHERE email=$2', [userIds['admin@itsm.com'], 'helpdesk@company.com']);
    await client.query('UPDATE users SET manager_id=$1 WHERE email=$2', [userIds['admin@itsm.com'], 'agent@company.com']);
    await client.query('UPDATE users SET manager_id=$1 WHERE email=$2', [userIds['superadmin@itsm.com'], 'manager@company.com']);
    await client.query('UPDATE users SET manager_id=$1 WHERE email=$2', [userIds['rkim@company.com'], 'employee@company.com']);
    await client.query('UPDATE users SET manager_id=$1 WHERE email=$2', [userIds['admin@itsm.com'], 'rkim@company.com']);

    // ── SR Catalog ─────────────────────────────
    console.log('\n📋 Seeding service catalog...');
    for (const [i, cat] of SR_CATALOG.entries()) {
      await client.query(`
        INSERT INTO sr_catalog (name, category, icon, description, sla_hours, needs_approval, fields_json, display_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT DO NOTHING
      `, [cat.name, cat.category, cat.icon, cat.description, cat.sla_hours, cat.needs_approval, JSON.stringify(cat.fields_json), i]);
    }
    console.log(`  ✓ ${SR_CATALOG.length} catalog items`);

    // ── SLA Policies ───────────────────────────
    console.log('\n⏱️  Seeding SLA policies...');
    for (const pol of SLA_POLICIES) {
      await client.query(`
        INSERT INTO sla_policies (policy_id, name, description, scope, tiers_json, business_hours, active, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (policy_id) DO NOTHING
      `, [pol.policy_id, pol.name, pol.description, pol.scope,
          JSON.stringify(pol.tiers_json), JSON.stringify(pol.business_hours),
          pol.active, userIds['admin@itsm.com']]);
    }
    console.log(`  ✓ ${SLA_POLICIES.length} SLA policies`);

    // ── Sample Incidents ───────────────────────
    console.log('\n🚨 Seeding sample incidents...');
    const sampleIncidents = [
      { title:'Email server not responding', desc:'Exchange server completely down. All users affected.', category:'Email & Communication', priority:'P1', requestedBy:'employee@company.com', assignedTo:'agent@company.com' },
      { title:'VPN drops intermittently',    desc:'Remote users report VPN disconnections every 20-30 mins.', category:'Network', priority:'P2', requestedBy:'lzhang@company.com', assignedTo:'ebrown@company.com' },
      { title:'Unable to access HR portal',  desc:'Getting Authentication failed error in HR self-service portal.', category:'Access / Identity', priority:'P3', requestedBy:'kpatel@company.com', assignedTo:'agent@company.com' },
    ];
    for (const inc of sampleIncidents) {
      const { rows: tn } = await client.query("SELECT generate_ticket_no('INC','seq_incident') AS no");
      const slaDue = new Date(Date.now() + ({P1:4,P2:8,P3:24,P4:72}[inc.priority] || 24) * 3600000);
      await client.query(`
        INSERT INTO incidents (ticket_no, title, description, category, priority, requested_by, assigned_to, sla_due)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING
      `, [tn.no, inc.title, inc.desc, inc.category, inc.priority,
          userIds[inc.requestedBy], userIds[inc.assignedTo], slaDue]);
    }
    console.log(`  ✓ ${sampleIncidents.length} sample incidents`);

    await client.query('COMMIT');
    console.log('\n🎉 Seed complete!\n');
    console.log('── Demo Credentials ──────────────────────────');
    USERS.forEach(u => console.log(`  ${u.role.padEnd(16)} ${u.email.padEnd(30)} ${u.password}`));
    console.log('──────────────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
