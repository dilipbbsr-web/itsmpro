'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { status, type, priority, page=1, limit=20 } = req.query;
  let where=[], params=[], p=1;
  if (req.user.role==='EMPLOYEE') { where.push(`requested_by=$${p++}`); params.push(req.user.id); }
  if (status)   { where.push(`status=$${p++}`);   params.push(status); }
  if (type)     { where.push(`type=$${p++}`);     params.push(type); }
  if (priority) { where.push(`priority=$${p++}`); params.push(priority); }
  const wc = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT i.*,u1.name AS requester_name,u2.name AS assignee_name
     FROM imac_requests i LEFT JOIN users u1 ON i.requested_by=u1.id LEFT JOIN users u2 ON i.assigned_to=u2.id
     ${wc} ORDER BY i.created_at DESC LIMIT $${p} OFFSET $${p+1}`,
    [...params, parseInt(limit), off]
  );
  const { rows:ct } = await query(`SELECT COUNT(*) FROM imac_requests ${wc}`, params);
  res.json({ data:rows, total:parseInt(ct[0].count) });
});

router.post('/', body('title').notEmpty(), body('type').isIn(['Install','Move','Add','Change']), async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
  const { title, type, category, description, justification, priority='Medium', assetItem, targetDate, tags=[] } = req.body;

  // Auto-compute approval chain from requester's org hierarchy
  const { rows:usr } = await query('SELECT manager_id FROM users WHERE id=$1',[req.user.id]);
  const l1 = usr[0]?.manager_id || null;
  const { rows:mgr } = l1 ? await query('SELECT manager_id FROM users WHERE id=$1',[l1]) : { rows:[{}] };
  const l2 = mgr[0]?.manager_id || l1;
  const { rows:sm } = await query("SELECT id FROM users WHERE role='SERVICE_MANAGER' LIMIT 1");
  const l3 = sm[0]?.id || null;

  const tn = (await query("SELECT generate_ticket_no('IMAC','seq_imac') AS no")).rows[0].no;
  const { rows } = await withTransaction(async(cl) => {
    const r = await cl.query(
      `INSERT INTO imac_requests (ticket_no,type,category,title,description,justification,priority,requested_by,l1_approver,l2_approver,l3_approver,asset_item,target_date,tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [tn,type,category,title,description,justification,priority,req.user.id,l1,l2,l3,assetItem,targetDate||null,tags]
    );
    await cl.query(`INSERT INTO imac_history (imac_id,action,performed_by,note) VALUES ($1,'Submitted',$2,'Request submitted for approval')`,
      [r.rows[0].id, req.user.id]);
    return r.rows;
  });
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM imac_requests WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const { rows:hist } = await query('SELECT h.*,u.name AS actor FROM imac_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.imac_id=$1 ORDER BY h.created_at DESC',[rows[0].id]);
  res.json({ ...rows[0], history:hist });
});

router.post('/:id/approve', async (req, res) => {
  const { approve, comment='' } = req.body;
  const { rows } = await query('SELECT * FROM imac_requests WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const req2 = rows[0];
  // Determine which level this user is approving
  let level = null;
  if (req2.l1_approver===req.user.id && req2.l1_status==='Pending') level=1;
  else if (req2.l2_approver===req.user.id && req2.l2_status==='Pending') level=2;
  else if (req2.l3_approver===req.user.id && req2.l3_status==='Pending') level=3;
  else if (['SERVICE_MANAGER','SUPER_ADMIN','ADMIN'].includes(req.user.role)) {
    if (req2.status==='L1 Pending') level=1;
    else if (req2.status==='L2 Pending') level=2;
    else if (req2.status==='L3 Pending') level=3;
  }
  if (!level) return res.status(400).json({ error:'Not your approval or already processed' });
  const newStatus = !approve ? 'Rejected' : level===1 ? 'L2 Pending' : level===2 ? 'L3 Pending' : 'Approved';
  const action    = approve ? `L${level} Approved` : `L${level} Rejected`;
  const upd = { [`l${level}_status`]: approve?'Approved':'Rejected', [`l${level}_comment`]: comment, [`l${level}_date`]: new Date(), status: newStatus };
  const set = Object.keys(upd).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows:updated } = await query(`UPDATE imac_requests SET ${set} WHERE id=$1 RETURNING *`,[req2.id,...Object.values(upd)]);
  await query(`INSERT INTO imac_history (imac_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[req2.id,action,req.user.id,comment]);
  res.json(updated[0]);
});

module.exports = router;
