const pool = require('../config/database');

// Generate problem number
const generateProblemNumber = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM problems'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `PRB-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createProblem = async (req, res) => {
  try {
    const { title, description, relatedIncidentIds } = req.body;
    const createdBy = req.user.userId;

    if (!title || !description) {
      return res.status(400).json({ 
        message: 'Title and description are required' 
      });
    }

    const problemNumber = await generateProblemNumber();

    const result = await pool.query(
      `INSERT INTO problems 
       (problem_number, title, description, status, created_by, related_incident_ids)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [problemNumber, title, description, 'open', createdBy, JSON.stringify(relatedIncidentIds || [])]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'problems', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'Problem created successfully',
      problem: result.rows[0],
    });
  } catch (error) {
    console.error('Create problem error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getProblems = async (req, res) => {
  try {
    const { status, assignedTo, createdBy } = req.query;

    let query = 'SELECT * FROM problems WHERE 1=1';
    const params = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (assignedTo) {
      query += ` AND assigned_to = $${params.length + 1}`;
      params.push(assignedTo);
    }
    if (createdBy) {
      query += ` AND created_by = $${params.length + 1}`;
      params.push(createdBy);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.json({
      total: result.rows.length,
      problems: result.rows,
    });
  } catch (error) {
    console.error('Get problems error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM problems WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get problem error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, description, title } = req.body;
    const userId = req.user.userId;

    const oldResult = await pool.query(
      'SELECT * FROM problems WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const oldValues = oldResult.rows[0];

    let updateQuery = 'UPDATE problems SET ';
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push(`status = $${updateParams.length + 1}`);
      updateParams.push(status);
    }
    if (assignedTo) {
      updateFields.push(`assigned_to = $${updateParams.length + 1}`);
      updateParams.push(assignedTo);
    }
    if (description) {
      updateFields.push(`description = $${updateParams.length + 1}`);
      updateParams.push(description);
    }
    if (title) {
      updateFields.push(`title = $${updateParams.length + 1}`);
      updateParams.push(title);
    }

    updateFields.push('updated_at = NOW()');

    updateQuery += updateFields.join(', ');
    updateQuery += ` WHERE id = $${updateParams.length + 1} RETURNING *`;
    updateParams.push(id);

    const result = await pool.query(updateQuery, updateParams);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'UPDATE', 'problems', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Problem updated successfully',
      problem: result.rows[0],
    });
  } catch (error) {
    console.error('Update problem error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.analyzeProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { rootCause } = req.body;
    const userId = req.user.userId;

    if (!rootCause) {
      return res.status(400).json({ message: 'rootCause is required' });
    }

    const result = await pool.query(
      `UPDATE problems 
       SET root_cause = $1, status = 'analyzed', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [rootCause, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'ANALYZE', 'problems', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Problem analyzed successfully',
      problem: result.rows[0],
    });
  } catch (error) {
    console.error('Analyze problem error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.resolveProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE problems 
       SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'RESOLVE', 'problems', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Problem resolved successfully',
      problem: result.rows[0],
    });
  } catch (error) {
    console.error('Resolve problem error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};
