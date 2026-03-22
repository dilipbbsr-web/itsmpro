const pool = require('../config/database');

// Generate change number
const generateChangeNumber = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM changes'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `CHG-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createChange = async (req, res) => {
  try {
    const { title, description, changeType, impactAssessment, riskLevel } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!title || !description || !changeType) {
      return res.status(400).json({ 
        message: 'Title, description, and changeType are required' 
      });
    }

    // Validate change type
    const validTypes = ['standard', 'normal', 'emergency'];
    if (!validTypes.includes(changeType)) {
      return res.status(400).json({ 
        message: 'Invalid changeType. Must be: standard, normal, or emergency' 
      });
    }

    // Generate change number
    const changeNumber = await generateChangeNumber();

    // Create change
    const result = await pool.query(
      `INSERT INTO changes 
       (change_number, title, description, change_type, status, impact_assessment, risk_level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [changeNumber, title, description, changeType, 'draft', impactAssessment || null, riskLevel || 'medium', createdBy]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'changes', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'Change created successfully',
      change: result.rows[0],
    });
  } catch (error) {
    console.error('Create change error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getChanges = async (req, res) => {
  try {
    const { status, changeType, riskLevel, createdBy, approvedBy } = req.query;

    let query = 'SELECT * FROM changes WHERE 1=1';
    const params = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (changeType) {
      query += ` AND change_type = $${params.length + 1}`;
      params.push(changeType);
    }
    if (riskLevel) {
      query += ` AND risk_level = $${params.length + 1}`;
      params.push(riskLevel);
    }
    if (createdBy) {
      query += ` AND created_by = $${params.length + 1}`;
      params.push(createdBy);
    }
    if (approvedBy) {
      query += ` AND approved_by = $${params.length + 1}`;
      params.push(approvedBy);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.json({
      total: result.rows.length,
      changes: result.rows,
    });
  } catch (error) {
    console.error('Get changes error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getChangeById = async (req, res) => {
  try {
    const { id } = req.params;

    const changeResult = await pool.query(
      'SELECT * FROM changes WHERE id = $1',
      [id]
    );

    if (changeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Change not found' });
    }

    // Get approvals for this change
    const approvalsResult = await pool.query(
      'SELECT * FROM change_approvals WHERE change_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const change = changeResult.rows[0];
    change.approvals = approvalsResult.rows;

    return res.json(change);
  } catch (error) {
    console.error('Get change error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.updateChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, impactAssessment, riskLevel, scheduledStart, scheduledEnd } = req.body;
    const userId = req.user.userId;

    // Get old values for audit
    const oldResult = await pool.query(
      'SELECT * FROM changes WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Change not found' });
    }

    const oldValues = oldResult.rows[0];

    // Update change
    let updateQuery = 'UPDATE changes SET ';
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push(`status = $${updateParams.length + 1}`);
      updateParams.push(status);
    }
    if (title) {
      updateFields.push(`title = $${updateParams.length + 1}`);
      updateParams.push(title);
    }
    if (description) {
      updateFields.push(`description = $${updateParams.length + 1}`);
      updateParams.push(description);
    }
    if (impactAssessment) {
      updateFields.push(`impact_assessment = $${updateParams.length + 1}`);
      updateParams.push(impactAssessment);
    }
    if (riskLevel) {
      updateFields.push(`risk_level = $${updateParams.length + 1}`);
      updateParams.push(riskLevel);
    }
    if (scheduledStart) {
      updateFields.push(`scheduled_start = $${updateParams.length + 1}`);
      updateParams.push(scheduledStart);
    }
    if (scheduledEnd) {
      updateFields.push(`scheduled_end = $${updateParams.length + 1}`);
      updateParams.push(scheduledEnd);
    }

    updateFields.push('updated_at = NOW()');

    updateQuery += updateFields.join(', ');
    updateQuery += ` WHERE id = $${updateParams.length + 1} RETURNING *`;
    updateParams.push(id);

    const result = await pool.query(updateQuery, updateParams);

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'UPDATE', 'changes', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Change updated successfully',
      change: result.rows[0],
    });
  } catch (error) {
    console.error('Update change error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.approveChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = req.user.userId;

    // Check if change exists
    const changeResult = await pool.query(
      'SELECT * FROM changes WHERE id = $1',
      [id]
    );

    if (changeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Change not found' });
    }

    // Add approval
    await pool.query(
      `INSERT INTO change_approvals (change_id, approver_id, status, comments, approved_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, approverId, 'approved', comments || null]
    );

    // Check if all approvals are in place (at least 2 approvals for normal/emergency)
    const approvalsResult = await pool.query(
      'SELECT COUNT(*) as count FROM change_approvals WHERE change_id = $1 AND status = $2',
      [id, 'approved']
    );

    const approvalCount = parseInt(approvalsResult.rows[0].count);
    const change = changeResult.rows[0];

    // Auto-approve for standard changes after 1 approval, or if 2+ approvals for others
    let newStatus = 'pending-approval';
    if (change.change_type === 'standard' && approvalCount >= 1) {
      newStatus = 'approved';
    } else if ((change.change_type === 'normal' || change.change_type === 'emergency') && approvalCount >= 2) {
      newStatus = 'approved';
    }

    // Update change status
    const updatedChange = await pool.query(
      `UPDATE changes 
       SET status = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStatus, approverId, id]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [approverId, 'APPROVE', 'changes', id, JSON.stringify(updatedChange.rows[0])]
    );

    return res.json({
      message: 'Change approved successfully',
      change: updatedChange.rows[0],
    });
  } catch (error) {
    console.error('Approve change error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.implementChange = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if change exists and is approved
    const changeResult = await pool.query(
      'SELECT * FROM changes WHERE id = $1',
      [id]
    );

    if (changeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Change not found' });
    }

    const change = changeResult.rows[0];
    if (change.status !== 'approved') {
      return res.status(400).json({ 
        message: 'Change must be approved before implementation' 
      });
    }

    // Implement change
    const result = await pool.query(
      `UPDATE changes 
       SET status = 'implementing', actual_start = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'IMPLEMENT', 'changes', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Change implementation started',
      change: result.rows[0],
    });
  } catch (error) {
    console.error('Implement change error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.closeChange = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if change exists
    const changeResult = await pool.query(
      'SELECT * FROM changes WHERE id = $1',
      [id]
    );

    if (changeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Change not found' });
    }

    // Close change
    const result = await pool.query(
      `UPDATE changes 
       SET status = 'closed', actual_end = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CLOSE', 'changes', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Change closed successfully',
      change: result.rows[0],
    });
  } catch (error) {
    console.error('Close change error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};