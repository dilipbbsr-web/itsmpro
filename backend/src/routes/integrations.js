'use strict';
const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.ADMINS));

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT id,int_id,name,type,category,icon,description,endpoint,auth_type,enabled,last_sync,sync_count,created_at FROM integrations ORDER BY enabled DESC,name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name,type,category,icon,description,endpoint,authType,enabled=false } = req.body;
  if (!name||!endpoint) return res.status(400).json({ error:'name and endpoint required' });
  const intId='INT-'+String(Date.now()).slice(-6);
  const { rows } = await query(
    `INSERT INTO integrations (int_id,name,type,category,icon,description,endpoint,auth_type,enabled,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,int_id,name,type,enabled`,
    [intId,name,type,category,icon,description,endpoint,authType,enabled,req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const allowed=['name','description','endpoint','auth_type','enabled'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE integrations SET ${set} WHERE id=$1 OR int_id=$1 RETURNING id,int_id,name,enabled`,[req.params.id,...Object.values(updates)]);
  if (!rows.length) return res.status(404).json({ error:'Integration not found' });
  res.json(rows[0]);
});

router.post('/:id/test', async (req, res) => {
  // In production: actually test the connection to the endpoint
  // Here we simulate it
  const { rows } = await query('SELECT endpoint,auth_type FROM integrations WHERE id=$1 OR int_id=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error:'Not found' });
  const success = rows[0].endpoint.startsWith('http');
  res.json({ success, message: success ? 'Connection test successful (simulated)' : 'Endpoint invalid', responseMs: Math.floor(Math.random()*200)+50 });
});

module.exports = router;
