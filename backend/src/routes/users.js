'use strict';
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize(...ROLES.STAFF), async (req, res) => {
  const { role, dept, status, search, page=1, limit=50 } = req.query;
  let where=[], params=[], p=1;
  if (role)   { where.push(`role=$${p++}`);   params.push(role); }
  if (dept)   { where.push(`dept=$${p++}`);   params.push(dept); }
  if (status) { where.push(`status=$${p++}`); params.push(status); }
  if (search) { where.push(`(name ILIKE $${p} OR email ILIKE $${p} OR emp_id ILIKE $${p})`); params.push('%'+search+'%'); p++; }
  const wc  = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT id,emp_id,name,email,role,dept,title,phone,location,manager_id,status,doj,on_probation,contract_type,last_login,created_at
     FROM users ${wc} ORDER BY name LIMIT $${p} OFFSET $${p+1}`,
    [...params, parseInt(limit), off]
  );
  const { rows:ct } = await query(`SELECT COUNT(*) FROM users ${wc}`, params);
  res.json({ data:rows, total:parseInt(ct[0].count), page:parseInt(page), limit:parseInt(limit) });
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT u.id,u.emp_id,u.name,u.email,u.role,u.dept,u.title,u.phone,u.location,
            u.manager_id,m.name AS manager_name,u.status,u.doj,u.dob,u.blood_group,
            u.emergency_contact,u.skills,u.certifications,u.bio,u.contract_type,
            u.on_probation,u.last_login,u.created_at
     FROM users u LEFT JOIN users m ON u.manager_id=m.id
     WHERE u.id=$1 OR u.emp_id=$1`, [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error:'User not found' });
  res.json(rows[0]);
});

router.post('/', authorize(...ROLES.ADMINS),
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({min:6}).matches(/(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['SUPER_ADMIN','ADMIN','EMPLOYEE','HELPDESK','AGENT','SERVICE_MANAGER']),
  async (req, res) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
    const { name,email,password,role,dept,title,phone,location,managerId,contractType='Permanent',doj } = req.body;
    if (role==='SUPER_ADMIN' && req.user.role!=='SUPER_ADMIN')
      return res.status(403).json({ error:'Only Super Admin can create Super Admin users' });
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
    const { rows:cnt } = await query('SELECT COUNT(*)+1 AS n FROM users');
    const empId = 'EMP-'+String(cnt[0].n).padStart(3,'0');
    const { rows } = await query(
      `INSERT INTO users (emp_id,name,email,password_hash,role,dept,title,phone,location,manager_id,contract_type,doj)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id,emp_id,name,email,role,dept,title,status,created_at`,
      [empId,name,email,hash,role,dept,title,phone,location,managerId||null,contractType,doj||null]
    );
    res.status(201).json(rows[0]);
  }
);

router.patch('/:id', async (req, res) => {
  if (req.user.id!==req.params.id && !ROLES.ADMINS.includes(req.user.role))
    return res.status(403).json({ error:'Insufficient permissions' });
  const allowed=['name','dept','title','phone','location','manager_id','status',
                 'contract_type','on_probation','dob','blood_group','emergency_contact',
                 'skills','certifications','bio','doj'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (req.body.role && ROLES.ADMINS.includes(req.user.role)) updates.role=req.body.role;
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set=Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE users SET ${set} WHERE id=$1 RETURNING id,name,email,role,dept,title,status`, [req.params.id,...Object.values(updates)]);
  if (!rows.length) return res.status(404).json({ error:'User not found' });
  res.json(rows[0]);
});

router.delete('/:id', authorize('SUPER_ADMIN'), async (req, res) => {
  if (req.user.id===req.params.id) return res.status(400).json({ error:'Cannot delete yourself' });
  const { rowCount } = await query('DELETE FROM users WHERE id=$1',[req.params.id]);
  if (!rowCount) return res.status(404).json({ error:'User not found' });
  res.json({ message:'User deleted' });
});

router.post('/delete-request', authorize('ADMIN'), async (req, res) => {
  const { targetUserId, reason } = req.body;
  if (!targetUserId) return res.status(400).json({ error:'targetUserId required' });
  const { rows } = await query(
    'INSERT INTO user_delete_requests (target_user,requested_by,reason) VALUES ($1,$2,$3) RETURNING *',
    [targetUserId, req.user.id, reason||'']
  );
  res.status(201).json({ message:'Delete request submitted to Super Admin', request:rows[0] });
});

router.get('/delete-requests/pending', authorize('SUPER_ADMIN'), async (req, res) => {
  const { rows } = await query(
    `SELECT dr.*,u.name AS target_name,u.email AS target_email,r.name AS requester_name
     FROM user_delete_requests dr
     JOIN users u ON dr.target_user=u.id
     JOIN users r ON dr.requested_by=r.id
     WHERE dr.status='pending' ORDER BY dr.created_at DESC`
  );
  res.json(rows);
});

module.exports = router;
