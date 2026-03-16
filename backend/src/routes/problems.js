'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.STAFF));

router.get('/', async (req, res) => {
  const { status, impact, search, page=1, limit=20 } = req.query;
  let where=[], params=[], p=1;
  if (status) { where.push(`p.status=$${p++}`); params.push(status); }
  if (impact) { where.push(`p.impact=$${p++}`); params.push(impact); }
  if (search) { where.push(`(p.title ILIKE $${p} OR p.ticket_no ILIKE $${p})`); params.push('%'+search+'%'); p++; }
  const wc = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT p.*,u.name AS owner_name FROM problems p LEFT JOIN users u ON p.owner_id=u.id ${wc} ORDER BY p.created_at DESC LIMIT $${p} OFFSET $${p+1}`,
    [...params, parseInt(limit), off]
  );
  res.json({ data:rows, total:rows.length });
});

router.post('/', body('title').notEmpty(), body('description').notEmpty(), async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
  const { title, description, category, impact='High', ownerId } = req.body;
  const tn = (await query("SELECT generate_ticket_no('PRB','seq_problem') AS no")).rows[0].no;
  const { rows } = await withTransaction(async(cl) => {
    const r = await cl.query(
      `INSERT INTO problems (ticket_no,title,description,category,impact,owner_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tn,title,description,category,impact,ownerId||req.user.id]
    );
    await cl.query(`INSERT INTO problem_history (problem_id,action,performed_by,note) VALUES ($1,'Problem Opened',$2,'Problem record created')`,[r.rows[0].id,req.user.id]);
    return r.rows;
  });
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT p.*,u.name AS owner_name FROM problems p LEFT JOIN users u ON p.owner_id=u.id WHERE p.id=$1 OR p.ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const { rows:hist } = await query('SELECT h.*,u.name AS actor FROM problem_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.problem_id=$1 ORDER BY h.created_at DESC',[rows[0].id]);
  res.json({ ...rows[0], history:hist });
});

router.patch('/:id', async (req, res) => {
  const { rows:ex } = await query('SELECT id FROM problems WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!ex.length) return res.status(404).json({ error:'Not found' });
  const allowed=['status','impact','owner_id','root_cause','workaround','fix_plan','is_known_error','linked_incidents'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (updates.is_known_error && !updates.kedb_id) {
    const n = (await query("SELECT nextval('seq_kedb') AS n")).rows[0].n;
    updates.kedb_id = 'KEDB-'+String(n).padStart(5,'0');
    if (!updates.status) updates.status='Known Error';
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE problems SET ${set} WHERE id=$1 RETURNING *`,[ex[0].id,...Object.values(updates)]);
  await query(`INSERT INTO problem_history (problem_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[ex[0].id,'Updated',req.user.id,req.body.note||'']);
  res.json(rows[0]);
});

module.exports = router;
