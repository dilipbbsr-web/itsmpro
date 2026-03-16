'use strict';
const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  const userId = req.user.id;
  const role   = req.user.role;

  const [incRows, srRows, probRows, chgRows, ciRows, kbRows, userRows, breachRows] = await Promise.all([
    query(`SELECT
             COUNT(*)                                     AS total,
             COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed','Cancelled')) AS open,
             COUNT(*) FILTER (WHERE status='Resolved' AND resolved_at > NOW()-INTERVAL '30d') AS resolved_month,
             COUNT(*) FILTER (WHERE sla_breached=true)   AS sla_breached,
             COUNT(*) FILTER (WHERE priority='P1' AND status NOT IN ('Resolved','Closed')) AS p1_open
           FROM incidents ${role==='EMPLOYEE' ? "WHERE requested_by='"+userId+"'" : ''}`),
    query(`SELECT
             COUNT(*)                                     AS total,
             COUNT(*) FILTER (WHERE status NOT IN ('Fulfilled','Closed','Rejected')) AS open,
             COUNT(*) FILTER (WHERE status='Pending Approval' AND (l1_approver=$1 OR l2_approver=$1 OR l3_approver=$1) AND (l1_status='Pending' OR l2_status='Pending' OR l3_status='Pending')) AS my_approvals
           FROM service_requests`, [userId]),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed')) AS open, COUNT(*) FILTER (WHERE is_known_error) AS kedb FROM problems`),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='CAB Review') AS cab_pending FROM changes`),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='Active') AS active FROM configuration_items`),
    query(`SELECT COUNT(*) AS total, SUM(views) AS total_views FROM kb_articles WHERE status='Published'`),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM users`),
    query(`SELECT COUNT(*) AS total FROM sla_breaches WHERE occurred_at > NOW()-INTERVAL '30d'`),
  ]);

  const inc    = incRows.rows[0];
  const sr     = srRows.rows[0];
  const prob   = probRows.rows[0];
  const chg    = chgRows.rows[0];
  const ci     = ciRows.rows[0];
  const kb     = kbRows.rows[0];
  const users  = userRows.rows[0];
  const breach = breachRows.rows[0];

  res.json({
    incidents:      { total:parseInt(inc.total), open:parseInt(inc.open), resolvedMonth:parseInt(inc.resolved_month), slaBreached:parseInt(inc.sla_breached), p1Open:parseInt(inc.p1_open) },
    serviceRequests:{ total:parseInt(sr.total),  open:parseInt(sr.open),  myPendingApprovals:parseInt(sr.my_approvals) },
    problems:       { total:parseInt(prob.total), open:parseInt(prob.open), kedb:parseInt(prob.kedb) },
    changes:        { total:parseInt(chg.total), cabPending:parseInt(chg.cab_pending) },
    assets:         { total:parseInt(ci.total),  active:parseInt(ci.active) },
    knowledge:      { articles:parseInt(kb.total), totalViews:parseInt(kb.total_views||0) },
    users:          { total:parseInt(users.total), active:parseInt(users.active) },
    slaBreaches30d: parseInt(breach.total),
    generatedAt:    new Date().toISOString(),
  });
});

module.exports = router;
