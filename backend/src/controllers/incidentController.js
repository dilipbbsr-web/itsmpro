const pool = require('../config/database');

// Generate incident number
const generateIncidentNumber = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM incidents'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `INC-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createIncident = async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description required' });
    }

    // Generate incident number
    const incidentNumber = await generateIncidentNumber();

    // Get SLA based on priority
    const slaResult = await pool.query(
      `SELECT response_time_minutes, resolution_time_minutes 
       FROM sla_definitions 
       WHERE priority_level = $1`,
      [priority || 'high']
    );

    const sla = slaResult.rows[0] || {
      response_time_minutes: 240,
      resolution_time_minutes: 1440,
    };

    // Create incident
    const result = await pool.query(
      `INSERT INTO incidents 
       (incident_number, title, description, priority, status, created_by, 
        sla_response_minutes, sla_resolution_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        incidentNumber,
        title,
        description,
        priority || 'high',
        'open',
        createdBy,
        sla.response_time_minutes,
        sla.resolution_time_minutes,
      ]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'incidents', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'Incident created successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getIncidents = async (req, res) => {
  try {
    const { status, priority, assignedTo, createdBy } = req.query;

    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${params.length + 1}`;
      params.push(priority);
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
      incidents: result.rows,
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM incidents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get incident error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, description, priority } = req.body;
    const userId = req.user.userId;

    // Get old values for audit
    const oldResult = await pool.query(
      'SELECT * FROM incidents WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const oldValues = oldResult.rows[0];

    // Update incident
    let updateQuery = 'UPDATE incidents SET ';
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push(`status = $${updateParams.length + 1}`);
      updateParams.push(status);

      if (status === 'resolved') {
        updateFields.push(`resolved_at = NOW()`);
      }
      if (status === 'assigned' || status === 'in_progress') {
        updateFields.push(`responded_at = NOW()`);
      }
    }
    if (assignedTo) {
      updateFields.push(`assigned_to = $${updateParams.length + 1}`);
      updateParams.push(assignedTo);
    }
    if (description) {
      updateFields.push(`description = $${updateParams.length + 1}`);
      updateParams.push(description);
    }
    if (priority) {
      updateFields.push(`priority = $${updateParams.length + 1}`);
      updateParams.push(priority);
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
      [userId, 'UPDATE', 'incidents', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Incident updated successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Update incident error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.assignIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const userId = req.user.userId;

    if (!assignedTo) {
      return res.status(400).json({ message: 'assignedTo is required' });
    }

    const result = await pool.query(
      `UPDATE incidents 
       SET assigned_to = $1, status = 'assigned', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [assignedTo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'ASSIGN', 'incidents', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Incident assigned successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Assign incident error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.closeIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE incidents 
       SET status = 'resolved', resolved_at = NOW(), description = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [resolution || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CLOSE', 'incidents', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Incident closed successfully',
      incident: result.rows[0],
    });
  } catch (error) {
    console.error('Close incident error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};