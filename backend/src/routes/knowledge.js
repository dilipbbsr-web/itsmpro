'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { category, productArea, status, search, internal, page=1, limit=20 } = req.query;
  let where=[], params=[], p=1;
  if (req.user.role==='EMPLOYEE') { where.push("status='Published' AND is_internal=false"); }
  else {
    if (status) { where.push(`status=$${p++}`); params.push(status); }
    if (internal==='true') { where.push('is_internal=true'); }
    else if (internal==='false') { where.push('is_internal=false'); }
  }
  if (category)    { where.push(`category=$${p++}`);     params.push(category); }
  if (productArea) { where.push(`product_area=$${p++}`); params.push(productArea); }
  if (search)      { where.push(`(title ILIKE $${p} OR to_tsvector('english',title||' '||content) @@ plainto_tsquery($${p}))`); params.push('%'+search+'%'); p++; }
  const wc  = where.length ? 'WHERE '+where.join(' AND ') : '';
  const off = (parseInt(page)-1)*parseInt(limit);
  const { rows } = await query(
    `SELECT a.id,a.article_id,a.title,a.category,a.product_area,a.status,a.is_internal,a.is_featured,
            a.views,a.helpful_votes,a.not_helpful_votes,a.tags,a.created_at,a.updated_at,
            u.name AS author_name
     FROM kb_articles a LEFT JOIN users u ON a.author_id=u.id
     ${wc} ORDER BY a.views DESC, a.helpful_votes DESC LIMIT $${p} OFFSET $${p+1}`,
    [...params, parseInt(limit), off]
  );
  const { rows:ct } = await query(`SELECT COUNT(*) FROM kb_articles a ${wc}`, params);
  res.json({ data:rows, total:parseInt(ct[0].count) });
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(
    'SELECT a.*,u.name AS author_name FROM kb_articles a LEFT JOIN users u ON a.author_id=u.id WHERE a.id=$1 OR a.article_id=$1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error:'Article not found' });
  if (rows[0].is_internal && req.user.role==='EMPLOYEE') return res.status(403).json({ error:'Access denied' });
  await query('UPDATE kb_articles SET views=views+1 WHERE id=$1',[rows[0].id]);
  rows[0].views++;
  res.json(rows[0]);
});

router.post('/', authorize(...ROLES.STAFF), body('title').notEmpty(), body('content').notEmpty(), async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(422).json({ errors:err.array() });
  const { title,content,category,productArea,status='Draft',isInternal=false,isFeatured=false,tags=[],linkedIncidents=[],relatedArticles=[] } = req.body;
  const articleId = (await query("SELECT generate_ticket_no('KB','seq_kb') AS no")).rows[0].no;
  const { rows } = await query(
    `INSERT INTO kb_articles (article_id,title,content,category,product_area,status,author_id,is_internal,is_featured,tags,linked_incidents,related_articles,published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [articleId,title,content,category,productArea,status,req.user.id,isInternal,isFeatured,tags,linkedIncidents,relatedArticles,status==='Published'?new Date():null]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', authorize(...ROLES.STAFF), async (req, res) => {
  const { rows:ex } = await query('SELECT id FROM kb_articles WHERE id=$1 OR article_id=$1',[req.params.id]);
  if (!ex.length) return res.status(404).json({ error:'Not found' });
  const allowed=['title','content','category','product_area','status','is_internal','is_featured','tags'];
  const updates={};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) updates[k]=req.body[k]; });
  if (updates.status==='Published') updates.published_at=new Date();
  if (!Object.keys(updates).length) return res.status(400).json({ error:'Nothing to update' });
  const set = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const { rows } = await query(`UPDATE kb_articles SET ${set} WHERE id=$1 RETURNING *`,[ex[0].id,...Object.values(updates)]);
  res.json(rows[0]);
});

router.post('/:id/feedback', async (req, res) => {
  const { isHelpful } = req.body;
  const { rows:ex } = await query('SELECT id FROM kb_articles WHERE id=$1 OR article_id=$1',[req.params.id]);
  if (!ex.length) return res.status(404).json({ error:'Not found' });
  await query('INSERT INTO kb_feedback (article_id,user_id,is_helpful) VALUES ($1,$2,$3) ON CONFLICT (article_id,user_id) DO UPDATE SET is_helpful=$3',[ex[0].id,req.user.id,isHelpful]);
  const field = isHelpful ? 'helpful_votes' : 'not_helpful_votes';
  await query(`UPDATE kb_articles SET ${field}=${field}+1 WHERE id=$1`,[ex[0].id]);
  res.json({ message:'Feedback recorded' });
});

module.exports = router;
