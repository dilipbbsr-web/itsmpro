const pool = require('../config/database');

// Generate service request number
const generateRequestNumber = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM service_requests'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `SR-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createServiceRequest = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!title || !description || !category) {
      return res.status(400).json({ 
        message: 'Title, description, and category are required' 
      });
    }

    // Generate request number
    const requestNumber = await generateRequestNumber();

    // Create service request
    const result = await pool.query(
      `INSERT INTO service_requests 
       (request_number, title, description, category, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [requestNumber, title, description, category, 'pending', createdBy]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'service_requests', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'Service request created successfully',
      serviceRequest: result.rows[0],
    });
  } catch (error) {
    console.error('Create service request error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getServiceRequests = async (req, res) => {
  try {
    const { status, category, assignedTo, createdBy } = req.query;

    let query = 'SELECT * FROM service_requests WHERE 1=1';
    const params = [];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
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
      serviceRequests: result.rows,
    });
  } catch (error) {
    console.error('Get service requests error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getServiceRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM service_requests WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get service request error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.updateServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, description, category } = req.body;
    const userId = req.user.userId;

    // Get old values for audit
    const oldResult = await pool.query(
      'SELECT * FROM service_requests WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    const oldValues = oldResult.rows[0];

    // Update service request
    let updateQuery = 'UPDATE service_requests SET ';
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
    if (category) {
      updateFields.push(`category = $${updateParams.length + 1}`);
      updateParams.push(category);
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
      [userId, 'UPDATE', 'service_requests', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Service request updated successfully',
      serviceRequest: result.rows[0],
    });
  } catch (error) {
    console.error('Update service request error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.fulfillServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE service_requests 
       SET status = 'fulfilled', fulfilled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'FULFILL', 'service_requests', id, JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Service request fulfilled successfully',
      serviceRequest: result.rows[0],
    });
  } catch (error) {
    console.error('Fulfill service request error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};