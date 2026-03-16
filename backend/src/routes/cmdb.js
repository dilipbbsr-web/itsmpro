'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.STAFF));

router.get('/cis', async (req, res) => {
  const { type, status, env, search, page=1, limit=20 } = req.query;
  let where=[], params=[], p=1;
  if (type)   { where.push(`ci_type=$${p++}`);   params.push(type); }
  if (status) { where.push(`status=$${p++}`);    params.push(status); }
  if (env)    { where.push(`environment=$${p++}`);params.push(env); }
  if (search) { where.push(`(name ILIKE $${p} OR ci_id ILIKE $${p} OR fields_data::text ILIKE $${p})`); params.push('%'+search+'%'); p++; }
  const wc = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT c.*,u1.name AS assigned_name,u2.name AS managed_name FROM configuration_items c
     LEFT JOIN users u1 ON c.assigned_to=u1.id LEFT JOIN users u2 ON c.managed_by=u2.id
     ${wc} ORDER BY c.name LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(limit), off]
  );
  const { rows:ct } = await query(`SELECT COUNT(*) FROM configuration_items ${wc}`, params);
  res.json({ data:rows, total:parseInt(ct[0].count) });
});

router.post('/cis', body('name').notEmpty(), body('ciType').notEmpty(), async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
  const { name,ciType,status='Active',environment='Production',location,dept,
          assignedTo,managedBy,purchaseDate,warrantyExpiry,tags=[],fieldsData={} } = req.body;
  const ciId = (await query("SELECT generate_ticket_no('CI','seq_ci') AS no")).rows[0].no;
  const { rows } = await withTransaction(async(cl) => {
    const r = await cl.query(
      `INSERT INTO configuration_items (ci_id,name,ci_type,status,environment,location,dept,assigned_to,managed_by,purchase_date,warranty_expiry,tags,fields_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [ciId,name,ciType,status,environment,location,dept,assignedTo||null,managedBy||req.user.id,purchaseDate||null,warrantyExpiry||null,tags,JSON.stringify(fieldsData)]
    );
    await cl.query(`INSERT INTO ci_history (ci_id,action,performed_by,note) VALUES ($1,'Registered in CMDB',$2,$3)`,[r.rows[0].id,req.user.id,'CI type: '+ciType]);
    return r.rows;
  });
  res.status(201).json(rows[0]);
});

router.get('/cis/:id', async (req, res) => {
  const { rows } = await query('SELECT c.*,u1.name AS assigned_name,u2.name AS managed_name FROM configuration_items c LEFT JOIN users u1 ON c.assigned_to=u1.id LEFT JOIN users u2 ON c.managed_by=u2.id WHERE c.id=$1 OR c.ci_id=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'CI not found' });
  const ci = rows[0];
  const [rels, hist, notes] = await Promise.all([
    query(`SELECT r.*,tc.name AS target_name,tc.ci_type AS target_type,tc.ci_id AS target_ci_id,tc.status AS target_status
           FROM ci_relationships r JOIN configuration_items tc ON r.to_ci=tc.id WHERE r.from_ci=$1`,[ci.id]),
    query('SELECT h.*,u.name AS actor FROM ci_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.ci_id=$1 ORDER BY h.created_at DESC',[ci.id]),
    query('SELECT n.*,u.name AS author_name FROM ci_notes n LEFT JOIN users u ON n.author=u.id WHERE n.ci_id=$1 ORDER BY n.created_at',[ci.id]),
  ]);
  res.json({ ...ci, relationships:rels.rows, history:hist.rows, notes:notes.rows });
});

router.patch('/cis/:id', async (req, res) => {
  const { rows:ex } = await query('SELECT id FROM configuration_items WHERE id=$1 OR ci_id=$1',[req.params.id]);
  if (!ex.length) return res.status(404).json({ error:'CI not found' });
  const allowed=['name','status','environment','location','dept','assigned_to','managed_by','warranty_expiry','purchase_date','tags','fields_data','last_seen'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE configuration_items SET ${set} WHERE id=$1 RETURNING *`,[ex[0].id,...Object.values(updates)]);
  await query(`INSERT INTO ci_history (ci_id,action,performed_by,note) VALUES ($1,'Updated',$2,$3)`,[ex[0].id,req.user.id,req.body.note||'']);
  res.json(rows[0]);
});

router.post('/cis/:id/relationships', async (req, res) => {
  const { targetId, relationship } = req.body;
  if (!targetId || !relationship) return res.status(400).json({ error:'targetId and relationship required' });
  const { rows:ci } = await query('SELECT id FROM configuration_items WHERE id=$1 OR ci_id=$1',[req.params.id]);
  if (!ci.length) return res.status(404).json({ error:'CI not found' });
  const { rows } = await query(
    'INSERT INTO ci_relationships (from_ci,to_ci,relationship,created_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *',
    [ci[0].id, targetId, relationship, req.user.id]
  );
  await query(`INSERT INTO ci_history (ci_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[ci[0].id,'Relationship Added',req.user.id,relationship+' → '+targetId]);
  res.status(201).json(rows[0] || { message:'Already exists' });
});

module.exports = router;
