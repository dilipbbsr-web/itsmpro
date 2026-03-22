const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const assetController = require('../controllers/assetController');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ===== ASSETS =====

// Create asset (Managers & Admins)
router.post('/', 
  roleMiddleware([1, 2]), // Admin (1) & Manager (2)
  assetController.createAsset
);

// Get all assets (Everyone)
router.get('/', assetController.getAssets);

// Get asset by ID (Everyone)
router.get('/:id', assetController.getAssetById);

// Update asset (Managers & Admins)
router.put('/:id', 
  roleMiddleware([1, 2]), // Admin (1) & Manager (2)
  assetController.updateAsset
);

// ===== CMDB (Configuration Management Database) =====

// Create CMDB item (Managers & Analysts)
router.post('/cmdb', 
  roleMiddleware([2, 4]), // Manager (2) & Analyst (4)
  assetController.createCMDBItem
);

// Get all CMDB items (Everyone)
router.get('/cmdb', assetController.getCMDBItems);

// Get CMDB item by ID (Everyone)
router.get('/cmdb/:id', assetController.getCMDBItemById);

// ===== LICENSES =====

// Create license (Managers & Admins)
router.post('/licenses', 
  roleMiddleware([1, 2]), // Admin (1) & Manager (2)
  assetController.createLicense
);

// Get all licenses (Everyone)
router.get('/licenses', assetController.getLicenses);

// Get license by ID (Everyone)
router.get('/licenses/:id', assetController.getLicenseById);

// Update license (Managers & Admins)
router.put('/licenses/:id', 
  roleMiddleware([1, 2]), // Admin (1) & Manager (2)
  assetController.updateLicense
);

module.exports = router;