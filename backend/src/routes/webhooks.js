'use strict';
const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT id,name,target_url,events,active,created_at FROM webhook_registrations ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/', authorize(...ROLES.ADMINS), async (req, res) => {
  const { name, targetUrl, events=[], secret } = req.body;
  if (!targetUrl||!events.length) return res.status(400).json({ error:'targetUrl and events required' });
  const { rows } = await query(
    'INSERT INTO webhook_registrations (name,target_url,events,secret,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,target_url,events,active',
    [name,targetUrl,events,secret,req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.get('/deliveries', async (req, res) => {
  const { rows } = await query('SELECT d.*,w.name AS webhook_name FROM webhook_deliveries d LEFT JOIN webhook_registrations w ON d.webhook_id=w.id ORDER BY d.delivered_at DESC LIMIT 100');
  res.json(rows);
});

module.exports = router;
