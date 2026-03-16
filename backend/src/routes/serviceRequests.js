'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/catalog', async (req, res) => {
  const { rows } = await query('SELECT id,name,category,icon,description,sla_hours,needs_approval,fields_json,display_order FROM sr_catalog WHERE active=true ORDER BY display_order,name');
  res.json(rows);
});

router.get('/', async (req, res) => {
  const { status, page=1, limit=20 } = req.query;
  let where=[], params=[], p=1;
  if (req.user.role==='EMPLOYEE') { where.push(`requested_by=$${p++}`); params.push(req.user.id); }
  if (status) { where.push(`s.status=$${p++}`); params.push(status); }
  const wc = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT s.*,u.name AS requester_name,c.name AS catalog_name FROM service_requests s
     LEFT JOIN users u ON s.requested_by=u.id LEFT JOIN sr_catalog c ON s.catalog_id=c.id
     ${wc} ORDER BY s.created_at DESC LIMIT $${p} OFFSET $${p+1}`,
    [...params, parseInt(limit), off]
  );
  const { rows:ct } = await query(`SELECT COUNT(*) FROM service_requests s ${wc}`, params);
  res.json({ data:rows, total:parseInt(ct[0].count) });
});

router.post('/', body('catalogId').notEmpty(), body('title').notEmpty(), async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
  const { catalogId,title,description,fieldsData={},priority='Medium' } = req.body;
  const { rows:cat } = await query('SELECT * FROM sr_catalog WHERE id=$1',[catalogId]);
  if (!cat.length) return res.status(404).json({ error:'Catalog item not found' });
  const c = cat[0];
  const slaDue = new Date(Date.now()+c.sla_hours*3600000);
  // Approval chain
  let l1=null,l2=null,l3=null;
  if (c.needs_approval) {
    const { rows:usr } = await query('SELECT manager_id FROM users WHERE id=$1',[req.user.id]);
    l1 = usr[0]?.manager_id || null;
    if (l1) { const { rows:mgr } = await query('SELECT manager_id FROM users WHERE id=$1',[l1]); l2=mgr[0]?.manager_id||l1; }
    const { rows:sm } = await query("SELECT id FROM users WHERE role='SERVICE_MANAGER' LIMIT 1");
    l3=sm[0]?.id||null;
  }
  const initStatus = c.needs_approval ? 'Pending Approval' : 'Submitted';
  const tn = (await query("SELECT generate_ticket_no('SR','seq_sr') AS no")).rows[0].no;
  const { rows } = await withTransaction(async(cl) => {
    const r = await cl.query(
      `INSERT INTO service_requests (ticket_no,catalog_id,title,description,fields_data,priority,status,sla_hours,sla_due,requested_by,l1_approver,l2_approver,l3_approver)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [tn,catalogId,title,description,JSON.stringify(fieldsData),priority,initStatus,c.sla_hours,slaDue,req.user.id,l1,l2,l3]
    );
    await cl.query(`INSERT INTO sr_history (sr_id,action,performed_by,note) VALUES ($1,'Submitted',$2,$3)`,[r.rows[0].id,req.user.id,c.needs_approval?'Submitted for 3-level approval':'No approval required']);
    return r.rows;
  });
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT s.*,u.name AS requester_name,c.name AS catalog_name FROM service_requests s LEFT JOIN users u ON s.requested_by=u.id LEFT JOIN sr_catalog c ON s.catalog_id=c.id WHERE s.id=$1 OR s.ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const sr = rows[0];
  const [notes,hist] = await Promise.all([
    query('SELECT n.*,u.name AS author_name FROM sr_notes n LEFT JOIN users u ON n.author=u.id WHERE n.sr_id=$1 ORDER BY n.created_at',[sr.id]),
    query('SELECT h.*,u.name AS actor FROM sr_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.sr_id=$1 ORDER BY h.created_at DESC',[sr.id]),
  ]);
  res.json({ ...sr, notes:notes.rows, history:hist.rows });
});

router.post('/:id/approve', async (req, res) => {
  const { approve, comment='' } = req.body;
  const { rows } = await query('SELECT * FROM service_requests WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const sr = rows[0];
  let level = null;
  if (sr.l1_approver===req.user.id && sr.l1_status==='Pending') level=1;
  else if (sr.l2_approver===req.user.id && sr.l2_status==='Pending') level=2;
  else if (sr.l3_approver===req.user.id && sr.l3_status==='Pending') level=3;
  else if (['SERVICE_MANAGER','SUPER_ADMIN','ADMIN'].includes(req.user.role)) {
    if (sr.l1_status==='Pending') level=1;
    else if (sr.l2_status==='Pending') level=2;
    else if (sr.l3_status==='Pending') level=3;
  }
  if (!level) return res.status(400).json({ error:'Not your approval' });
  const newStatus = !approve ? 'Rejected' : level===3 ? 'Approved' : 'Pending Approval';
  const upd = { [`l${level}_status`]:approve?'Approved':'Rejected', [`l${level}_comment`]:comment, [`l${level}_date`]:new Date(), status:newStatus };
  const set = Object.keys(upd).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows:updated } = await query(`UPDATE service_requests SET ${set} WHERE id=$1 RETURNING *`,[sr.id,...Object.values(upd)]);
  await query(`INSERT INTO sr_history (sr_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[sr.id,(approve?`L${level} Approved`:`L${level} Rejected`),req.user.id,comment]);
  res.json(updated[0]);
});

router.patch('/:id', async (req, res) => {
  const { rows:ex } = await query('SELECT id,status FROM service_requests WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!ex.length) return res.status(404).json({ error:'Not found' });
  const allowed=['status','assigned_to'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (updates.status==='Fulfilled') updates.fulfilled_at=new Date();
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE service_requests SET ${set} WHERE id=$1 RETURNING *`,[ex[0].id,...Object.values(updates)]);
  await query(`INSERT INTO sr_history (sr_id,action,performed_by,note) VALUES ($1,'Updated',$2,$3)`,[ex[0].id,req.user.id,req.body.note||'']);
  res.json(rows[0]);
});

module.exports = router;
