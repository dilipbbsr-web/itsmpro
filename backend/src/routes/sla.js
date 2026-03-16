'use strict';
const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.MANAGERS, 'HELPDESK', 'AGENT'));

router.get('/policies', async (req, res) => {
  const { rows } = await query('SELECT p.*,u.name AS updated_by_name FROM sla_policies p LEFT JOIN users u ON p.updated_by=u.id ORDER BY p.active DESC, p.name');
  res.json(rows);
});

router.post('/policies', authorize(...ROLES.MANAGERS), async (req, res) => {
  const { name,description,scope,tiersJson,businessHours,active=true } = req.body;
  if (!name) return res.status(400).json({ error:'name required' });
  const policyId = 'SLA-'+String(Date.now()).slice(-6);
  const { rows } = await query(
    `INSERT INTO sla_policies (policy_id,name,description,scope,tiers_json,business_hours,active,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
    [policyId,name,description,scope,JSON.stringify(tiersJson||{}),JSON.stringify(businessHours||{}),active,req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.patch('/policies/:id', authorize(...ROLES.MANAGERS), async (req, res) => {
  const allowed=['name','description','scope','tiers_json','business_hours','active'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  updates.updated_by=req.user.id;
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE sla_policies SET ${set} WHERE id=$1 OR policy_id=$1 RETURNING *`,[req.params.id,...Object.values(updates)]);
  if (!rows.length) return res.status(404).json({ error:'Policy not found' });
  res.json(rows[0]);
});

router.get('/escalation-rules', async (req, res) => {
  const { rows } = await query('SELECT r.*,p.name AS policy_name FROM escalation_rules r LEFT JOIN sla_policies p ON r.sla_policy_id=p.id ORDER BY r.active DESC,r.name');
  res.json(rows);
});

router.post('/escalation-rules', authorize(...ROLES.MANAGERS), async (req, res) => {
  const { name,triggerEvent,conditionText,actionType,notifyUsers=[],priorityScope,slaPolicyId } = req.body;
  if (!name||!triggerEvent||!conditionText||!actionType) return res.status(400).json({ error:'Missing required fields' });
  const ruleId='ESC-'+String(Date.now()).slice(-6);
  const { rows } = await query(
    `INSERT INTO escalation_rules (rule_id,name,trigger_event,condition_text,action_type,notify_users,priority_scope,sla_policy_id,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [ruleId,name,triggerEvent,conditionText,actionType,notifyUsers,priorityScope,slaPolicyId,req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.patch('/escalation-rules/:id', authorize(...ROLES.MANAGERS), async (req, res) => {
  const allowed=['name','trigger_event','condition_text','action_type','notify_users','priority_scope','active'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE escalation_rules SET ${set} WHERE id=$1 OR rule_id=$1 RETURNING *`,[req.params.id,...Object.values(updates)]);
  if (!rows.length) return res.status(404).json({ error:'Rule not found' });
  res.json(rows[0]);
});

router.get('/breaches', async (req, res) => {
  const { rows } = await query('SELECT b.*,u.name AS agent_name FROM sla_breaches b LEFT JOIN users u ON b.agent_id=u.id ORDER BY b.occurred_at DESC LIMIT 100');
  res.json(rows);
});

module.exports = router;
