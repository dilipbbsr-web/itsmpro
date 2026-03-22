const pool = require('../config/database');

// Generate asset tag
const generateAssetTag = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM assets'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `AST-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createAsset = async (req, res) => {
  try {
    const { name, type, location, ownerId, purchaseDate, warrantyExpiry, cost } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!name || !type) {
      return res.status(400).json({ 
        message: 'Name and type are required' 
      });
    }

    // Generate asset tag
    const assetTag = await generateAssetTag();

    // Create asset
    const result = await pool.query(
      `INSERT INTO assets 
       (asset_tag, name, type, status, owner_id, location, purchase_date, warranty_expiry, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [assetTag, name, type, 'active', ownerId || null, location || null, purchaseDate || null, warrantyExpiry || null, cost || 0]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'assets', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'Asset created successfully',
      asset: result.rows[0],
    });
  } catch (error) {
    console.error('Create asset error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const { type, status, ownerId, location } = req.query;

    let query = 'SELECT * FROM assets WHERE 1=1';
    const params = [];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (ownerId) {
      query += ` AND owner_id = $${params.length + 1}`;
      params.push(ownerId);
    }
    if (location) {
      query += ` AND location = $${params.length + 1}`;
      params.push(location);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.json({
      total: result.rows.length,
      assets: result.rows,
    });
  } catch (error) {
    console.error('Get assets error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM assets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get asset error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ownerId, location, warrantyExpiry, cost } = req.body;
    const userId = req.user.userId;

    // Get old values for audit
    const oldResult = await pool.query(
      'SELECT * FROM assets WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const oldValues = oldResult.rows[0];

    // Update asset
    let updateQuery = 'UPDATE assets SET ';
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push(`status = $${updateParams.length + 1}`);
      updateParams.push(status);
    }
    if (ownerId) {
      updateFields.push(`owner_id = $${updateParams.length + 1}`);
      updateParams.push(ownerId);
    }
    if (location) {
      updateFields.push(`location = $${updateParams.length + 1}`);
      updateParams.push(location);
    }
    if (warrantyExpiry) {
      updateFields.push(`warranty_expiry = $${updateParams.length + 1}`);
      updateParams.push(warrantyExpiry);
    }
    if (cost) {
      updateFields.push(`cost = $${updateParams.length + 1}`);
      updateParams.push(cost);
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
      [userId, 'UPDATE', 'assets', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'Asset updated successfully',
      asset: result.rows[0],
    });
  } catch (error) {
    console.error('Update asset error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

// CMDB Functions
const generateCIId = async () => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM cmdb_items'
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `CI-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
};

exports.createCMDBItem = async (req, res) => {
  try {
    const { name, type, description, ownerId } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!name || !type) {
      return res.status(400).json({ 
        message: 'Name and type are required' 
      });
    }

    // Generate CI ID
    const ciId = await generateCIId();

    // Create CMDB item
    const result = await pool.query(
      `INSERT INTO cmdb_items 
       (ci_id, name, type, status, description, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ciId, name, type, 'active', description || null, ownerId || createdBy]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'cmdb_items', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'CMDB item created successfully',
      cmdbItem: result.rows[0],
    });
  } catch (error) {
    console.error('Create CMDB item error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getCMDBItems = async (req, res) => {
  try {
    const { type, status, ownerId } = req.query;

    let query = 'SELECT * FROM cmdb_items WHERE 1=1';
    const params = [];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (ownerId) {
      query += ` AND owner_id = $${params.length + 1}`;
      params.push(ownerId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.json({
      total: result.rows.length,
      cmdbItems: result.rows,
    });
  } catch (error) {
    console.error('Get CMDB items error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getCMDBItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await pool.query(
      'SELECT * FROM cmdb_items WHERE id = $1',
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: 'CMDB item not found' });
    }

    // Get relationships
    const relationshipsResult = await pool.query(
      `SELECT * FROM ci_relationships 
       WHERE parent_ci_id = $1 OR child_ci_id = $1`,
      [id]
    );

    const item = itemResult.rows[0];
    item.relationships = relationshipsResult.rows;

    return res.json(item);
  } catch (error) {
    console.error('Get CMDB item error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

// License Functions
exports.createLicense = async (req, res) => {
  try {
    const { softwareName, licenseKey, licenseType, quantity, expiryDate, cost } = req.body;
    const createdBy = req.user.userId;

    // Validate
    if (!softwareName || !licenseType) {
      return res.status(400).json({ 
        message: 'Software name and license type are required' 
      });
    }

    // Create license
    const result = await pool.query(
      `INSERT INTO licenses 
       (software_name, license_key, license_type, quantity, expiry_date, cost)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [softwareName, licenseKey || null, licenseType, quantity || 1, expiryDate || null, cost || 0]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdBy, 'CREATE', 'licenses', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    return res.status(201).json({
      message: 'License created successfully',
      license: result.rows[0],
    });
  } catch (error) {
    console.error('Create license error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getLicenses = async (req, res) => {
  try {
    const { licenseType, softwareName } = req.query;

    let query = 'SELECT * FROM licenses WHERE 1=1';
    const params = [];

    if (licenseType) {
      query += ` AND license_type = $${params.length + 1}`;
      params.push(licenseType);
    }
    if (softwareName) {
      query += ` AND software_name ILIKE $${params.length + 1}`;
      params.push(`%${softwareName}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return res.json({
      total: result.rows.length,
      licenses: result.rows,
    });
  } catch (error) {
    console.error('Get licenses error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getLicenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM licenses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'License not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get license error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.updateLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, expiryDate, cost } = req.body;
    const userId = req.user.userId;

    // Get old values for audit
    const oldResult = await pool.query(
      'SELECT * FROM licenses WHERE id = $1',
      [id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'License not found' });
    }

    const oldValues = oldResult.rows[0];

    // Update license
    let updateQuery = 'UPDATE licenses SET ';
    const updateParams = [];
    const updateFields = [];

    if (quantity) {
      updateFields.push(`quantity = $${updateParams.length + 1}`);
      updateParams.push(quantity);
    }
    if (expiryDate) {
      updateFields.push(`expiry_date = $${updateParams.length + 1}`);
      updateParams.push(expiryDate);
    }
    if (cost) {
      updateFields.push(`cost = $${updateParams.length + 1}`);
      updateParams.push(cost);
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
      [userId, 'UPDATE', 'licenses', id, JSON.stringify(oldValues), JSON.stringify(result.rows[0])]
    );

    return res.json({
      message: 'License updated successfully',
      license: result.rows[0],
    });
  } catch (error) {
    console.error('Update license error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};