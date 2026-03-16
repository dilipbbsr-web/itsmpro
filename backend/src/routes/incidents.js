'use strict';
const express = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/v1/incidents ────────────────────────
router.get('/', async (req, res) => {
  const { status, priority, category, assignedTo, mine, search, page = 1, limit = 20 } = req.query;

  let where = [];
  let params = [];
  let p = 1;

  // Employees see only their own
  if (req.user.role === 'EMPLOYEE') {
    where.push(`i.requested_by = $${p++}`);
    params.push(req.user.id);
  } else if (mine === 'true') {
    where.push(`i.assigned_to = $${p++}`);
    params.push(req.user.id);
  }

  if (status)    { where.push(`i.status = $${p++}`);   params.push(status); }
  if (priority)  { where.push(`i.priority = $${p++}`); params.push(priority); }
  if (category)  { where.push(`i.category = $${p++}`); params.push(category); }
  if (assignedTo){ where.push(`i.assigned_to = $${p++}`); params.push(assignedTo); }
  if (search) {
    where.push(`(i.title ILIKE $${p} OR i.ticket_no ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows } = await query(`
    SELECT i.*,
           u1.name AS reporter_name,
           u2.name AS assignee_name
    FROM incidents i
    LEFT JOIN users u1 ON i.requested_by = u1.id
    LEFT JOIN users u2 ON i.assigned_to  = u2.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT $${p} OFFSET $${p+1}
  `, [...params, parseInt(limit), offset]);

  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM incidents i ${whereClause}`, params
  );

  res.json({
    data:  rows,
    total: parseInt(countRows[0].count),
    page:  parseInt(page),
    limit: parseInt(limit),
  });
});

// ── POST /api/v1/incidents ───────────────────────
router.post('/',
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('priority').isIn(['P1','P2','P3','P4']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const {
      title, description, category = 'Other',
      priority = 'P3', dept, location, tags = []
    } = req.body;

    // Calculate SLA due time based on priority
    const slaHours = { P1:4, P2:8, P3:24, P4:72 };
    const slaDue = new Date(Date.now() + (slaHours[priority] || 24) * 3600000);

    const ticketNo = await query(
      "SELECT generate_ticket_no('INC', 'seq_incident') AS no"
    ).then(r => r.rows[0].no);

    const { rows } = await withTransaction(async (client) => {
      const res = await client.query(`
        INSERT INTO incidents
          (ticket_no, title, description, category, priority, dept, location,
           requested_by, sla_due, tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `, [ticketNo, title, description, category, priority, dept, location,
          req.user.id, slaDue, tags]);

      await client.query(`
        INSERT INTO incident_history (incident_id, action, performed_by, note)
        VALUES ($1,'Created',$2,'Incident logged by user')
      `, [res.rows[0].id, req.user.id]);

      return res.rows;
    });

    res.status(201).json(rows[0]);
  }
);

// ── GET /api/v1/incidents/:id ────────────────────
router.get('/:id', async (req, res) => {
  const { rows } = await query(`
    SELECT i.*,
           u1.name AS reporter_name, u1.email AS reporter_email,
           u2.name AS assignee_name
    FROM incidents i
    LEFT JOIN users u1 ON i.requested_by = u1.id
    LEFT JOIN users u2 ON i.assigned_to  = u2.id
    WHERE i.id = $1 OR i.ticket_no = $1
  `, [req.params.id]);

  if (!rows.length) return res.status(404).json({ error: 'Incident not found' });

  // Check access for employees
  if (req.user.role === 'EMPLOYEE' && rows[0].requested_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Load notes and history
  const [notes, history] = await Promise.all([
    query('SELECT n.*, u.name AS author_name FROM incident_notes n LEFT JOIN users u ON n.author = u.id WHERE n.incident_id = $1 ORDER BY n.created_at', [rows[0].id]),
    query('SELECT h.*, u.name AS actor_name FROM incident_history h LEFT JOIN users u ON h.performed_by = u.id WHERE h.incident_id = $1 ORDER BY h.created_at DESC', [rows[0].id]),
  ]);

  res.json({ ...rows[0], notes: notes.rows, history: history.rows });
});

// ── PATCH /api/v1/incidents/:id ──────────────────
router.patch('/:id', async (req, res) => {
  const { rows: existing } = await query(
    'SELECT * FROM incidents WHERE id = $1 OR ticket_no = $1', [req.params.id]
  );
  if (!existing.length) return res.status(404).json({ error: 'Incident not found' });

  const inc = existing[0];

  // Agents can only update their own assigned tickets
  if (req.user.role === 'AGENT' && inc.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Can only update tickets assigned to you' });
  }

  const allowed = ['status','assigned_to','assigned_group','priority','category','tags'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Set timestamps for status changes
  if (updates.status === 'Resolved') updates.resolved_at = new Date();
  if (updates.status === 'Closed')   updates.closed_at   = new Date();

  const setClauses = Object.keys(updates).map((k,i) => `${k} = $${i+2}`).join(', ');
  const vals = [inc.id, ...Object.values(updates)];

  const { rows } = await query(
    `UPDATE incidents SET ${setClauses} WHERE id = $1 RETURNING *`, vals
  );

  // Log history
  await query(`
    INSERT INTO incident_history (incident_id, action, performed_by, note)
    VALUES ($1,$2,$3,$4)
  `, [inc.id, `Updated: ${Object.keys(updates).join(', ')}`, req.user.id, req.body.note || '']);

  res.json(rows[0]);
});

// ── POST /api/v1/incidents/:id/notes ────────────
router.post('/:id/notes', body('content').notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { rows: inc } = await query(
    'SELECT id FROM incidents WHERE id = $1 OR ticket_no = $1', [req.params.id]
  );
  if (!inc.length) return res.status(404).json({ error: 'Incident not found' });

  const { content, noteType = 'work', isInternal = true } = req.body;

  const { rows } = await query(`
    INSERT INTO incident_notes (incident_id, note_type, content, is_internal, author)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [inc[0].id, noteType, content, isInternal, req.user.id]);

  await query(`
    UPDATE incidents SET updated_at = NOW() WHERE id = $1
  `, [inc[0].id]);

  res.status(201).json(rows[0]);
});

// ── DELETE /api/v1/incidents/:id ─────────────────
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM incidents WHERE id = $1 OR ticket_no = $1', [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Incident not found' });
  res.json({ message: 'Incident deleted' });
});

module.exports = router;
