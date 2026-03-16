'use strict';
const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize(...ROLES.MANAGERS, 'AGENT'));

router.get('/analytics', async (req, res) => {
  const { range='30d' } = req.query;
  const intervalMap = { '7d':'7 days','30d':'30 days','90d':'90 days','ytd':'1 year' };
  const interval = intervalMap[range] || '30 days';

  const [incByPri, incByCat, agentPerf, slaData] = await Promise.all([
    query(`SELECT priority, COUNT(*) AS total,
             COUNT(*) FILTER(WHERE status IN ('Resolved','Closed')) AS resolved,
             AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::NUMERIC(6,1) AS avg_resolve_h
           FROM incidents WHERE created_at > NOW()-INTERVAL '${interval}' GROUP BY priority ORDER BY priority`),
    query(`SELECT category, COUNT(*) AS count FROM incidents WHERE created_at > NOW()-INTERVAL '${interval}' GROUP BY category ORDER BY count DESC LIMIT 10`),
    query(`SELECT u.id, u.name, u.role,
             COUNT(i.id) AS assigned,
             COUNT(i.id) FILTER(WHERE i.status IN ('Resolved','Closed')) AS resolved,
             AVG(EXTRACT(EPOCH FROM (i.resolved_at-i.created_at))/3600)::NUMERIC(6,1) AS avg_resolve_h,
             COUNT(i.id) FILTER(WHERE i.sla_breached) AS breaches
           FROM users u LEFT JOIN incidents i ON i.assigned_to=u.id AND i.created_at > NOW()-INTERVAL '${interval}'
           WHERE u.role IN ('AGENT','HELPDESK','SERVICE_MANAGER')
           GROUP BY u.id,u.name,u.role ORDER BY assigned DESC`),
    query(`SELECT COUNT(*) AS total,
             COUNT(*) FILTER(WHERE sla_breached=false AND status IN ('Resolved','Closed')) AS within_sla,
             COUNT(*) FILTER(WHERE sla_breached=true) AS breached
           FROM incidents WHERE created_at > NOW()-INTERVAL '${interval}'`),
  ]);

  const sla = slaData.rows[0];
  const compliance = sla.total > 0 ? Math.round(parseInt(sla.within_sla)/parseInt(sla.total)*100) : 100;

  res.json({
    incidentByPriority: incByPri.rows,
    incidentByCategory: incByCat.rows,
    agentPerformance:   agentPerf.rows,
    sla: { total:parseInt(sla.total), withinSLA:parseInt(sla.within_sla), breached:parseInt(sla.breached), complianceRate:compliance },
    range,
    generatedAt: new Date().toISOString(),
  });
});

module.exports = router;
