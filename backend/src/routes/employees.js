'use strict';
const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.STAFF));

// Full org tree
router.get('/org-tree', async (req, res) => {
  const { rows } = await query(
    'SELECT id,emp_id,name,title,role,dept,manager_id,status FROM users WHERE status=$1 ORDER BY name',
    ['active']
  );
  // Build tree in memory
  const map = {};
  rows.forEach(u => { map[u.id]={ ...u, children:[] }; });
  const roots = [];
  rows.forEach(u => {
    if (u.manager_id && map[u.manager_id]) map[u.manager_id].children.push(map[u.id]);
    else roots.push(map[u.id]);
  });
  res.json(roots);
});

// Reporting chain for user
router.get('/:id/chain', async (req, res) => {
  const chain = [];
  let currentId = req.params.id;
  for (let i=0; i<10; i++) {
    const { rows } = await query('SELECT id,name,title,role,manager_id FROM users WHERE id=$1',[currentId]);
    if (!rows.length) break;
    chain.push(rows[0]);
    if (!rows[0].manager_id) break;
    currentId = rows[0].manager_id;
  }
  res.json(chain);
});

// Direct reports
router.get('/:id/direct-reports', async (req, res) => {
  const { rows } = await query('SELECT id,emp_id,name,title,role,dept,status FROM users WHERE manager_id=$1',[req.params.id]);
  res.json(rows);
});

// Dept summary
router.get('/departments/summary', async (req, res) => {
  const { rows } = await query(
    `SELECT dept, COUNT(*) AS total, COUNT(*) FILTER(WHERE status='active') AS active,
            array_agg(DISTINCT role) AS roles
     FROM users GROUP BY dept ORDER BY total DESC`
  );
  res.json(rows);
});

module.exports = router;
