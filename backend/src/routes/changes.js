'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.STAFF));

router.get('/', async (req, res) => {
  const { status, type, search, page=1, limit=20 } = req.query;
  let where=[], params=[], p=1;
  if (status) { where.push(`c.status=$${p++}`); params.push(status); }
  if (type)   { where.push(`c.type=$${p++}`);   params.push(type); }
  if (search) { where.push(`(c.title ILIKE $${p} OR c.ticket_no ILIKE $${p})`); params.push('%'+search+'%'); p++; }
  const wc = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT c.*,u1.name AS requester_name,u2.name AS owner_name FROM changes c
     LEFT JOIN users u1 ON c.requested_by=u1.id LEFT JOIN users u2 ON c.owner_id=u2.id
     ${wc} ORDER BY c.created_at DESC LIMIT $${p} OFFSET $${p+1}`,
    [...params, parseInt(limit), off]
  );
  res.json({ data:rows, total:rows.length });
});

router.post('/',
  body('title').notEmpty(), body('description').notEmpty(),
  body('rollbackPlan').notEmpty(), body('testPlan').notEmpty(),
  async (req, res) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
    const { title,description,type='Normal',category,riskLevel='Medium',businessImpact,
            justification,rollbackPlan,testPlan,impactedSystems=[],linkedProblems=[],
            scheduledStart,scheduledEnd } = req.body;
    const initStatus = type==='Standard' ? 'Scheduled' : type==='Emergency' ? 'In Progress' : 'Submitted';
    const tn = (await query("SELECT generate_ticket_no('CHG','seq_change') AS no")).rows[0].no;
    const { rows } = await withTransaction(async(cl) => {
      const r = await cl.query(
        `INSERT INTO changes (ticket_no,type,title,description,category,risk_level,business_impact,status,requested_by,owner_id,justification,rollback_plan,test_plan,impacted_systems,linked_problems,scheduled_start,scheduled_end)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [tn,type,title,description,category,riskLevel,businessImpact,initStatus,req.user.id,justification,rollbackPlan,testPlan,impactedSystems,linkedProblems,scheduledStart||null,scheduledEnd||null]
      );
      await cl.query(`INSERT INTO change_history (change_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[r.rows[0].id,'Change Record Created',req.user.id,type+' change — '+initStatus]);
      return r.rows;
    });
    res.status(201).json(rows[0]);
  }
);

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT c.*,u1.name AS requester_name,u2.name AS owner_name FROM changes c LEFT JOIN users u1 ON c.requested_by=u1.id LEFT JOIN users u2 ON c.owner_id=u2.id WHERE c.id=$1 OR c.ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const { rows:hist } = await query('SELECT h.*,u.name AS actor FROM change_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.change_id=$1 ORDER BY h.created_at DESC',[rows[0].id]);
  res.json({ ...rows[0], history:hist });
});

router.patch('/:id', async (req, res) => {
  const { rows:ex } = await query('SELECT * FROM changes WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!ex.length) return res.status(404).json({ error:'Not found' });
  const allowed=['status','risk_level','business_impact','scheduled_start','scheduled_end','actual_start','actual_end','implementation_notes'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE changes SET ${set} WHERE id=$1 RETURNING *`,[ex[0].id,...Object.values(updates)]);
  await query(`INSERT INTO change_history (change_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[ex[0].id,'Updated',req.user.id,req.body.note||'']);
  res.json(rows[0]);
});

router.post('/:id/cab-vote', authorize(...ROLES.MANAGERS), async (req, res) => {
  const { vote, comment='' } = req.body;
  if (!['Approve','Reject'].includes(vote)) return res.status(400).json({ error:'vote must be Approve or Reject' });
  const { rows } = await query('SELECT * FROM changes WHERE id=$1 OR ticket_no=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const chg = rows[0];
  if (chg.status !== 'CAB Review') return res.status(400).json({ error:'Change is not in CAB Review' });
  const votes = Array.isArray(chg.cab_votes) ? chg.cab_votes : [];
  if (votes.some(v=>v.voter===req.user.id)) return res.status(400).json({ error:'Already voted' });
  const newVotes = [...votes, { voter:req.user.id, voterName:req.user.name, vote, comment, at:new Date().toISOString() }];
  const approvals = newVotes.filter(v=>v.vote==='Approve').length;
  const rejections = newVotes.filter(v=>v.vote==='Reject').length;
  const { rows:cabMembers } = await query("SELECT COUNT(*) AS n FROM users WHERE role IN ('SERVICE_MANAGER','ADMIN','SUPER_ADMIN')");
  const total = parseInt(cabMembers[0].n);
  let newStatus = chg.status;
  if (rejections > 0)                           newStatus = 'Cancelled';
  else if (approvals >= Math.ceil(total/2))     newStatus = 'CAB Approved';
  const { rows:updated } = await query('UPDATE changes SET cab_votes=$2,status=$3 WHERE id=$1 RETURNING *',[chg.id, JSON.stringify(newVotes), newStatus]);
  await query(`INSERT INTO change_history (change_id,action,performed_by,note) VALUES ($1,$2,$3,$4)`,[chg.id,`CAB Vote: ${vote}`,req.user.id,comment]);
  res.json(updated[0]);
});

module.exports = router;
