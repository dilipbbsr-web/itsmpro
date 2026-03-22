const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const changeController = require('../controllers/changeController');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create change (Admins, Managers & Analysts)
router.post('/', 
  roleMiddleware([1, 2, 4]), // Admin (1), Manager (2) & Analyst (4)
  changeController.createChange
);

// Get all changes (Everyone)
router.get('/', changeController.getChanges);

// Get change by ID (Everyone)
router.get('/:id', changeController.getChangeById);

// Update change (Admins, Managers & Analysts)
router.put('/:id', 
  roleMiddleware([1, 2, 4]), // Admin (1), Manager (2) & Analyst (4)
  changeController.updateChange
);

// Approve change (Approvers, Managers & Admins)
router.put('/:id/approve', 
  roleMiddleware([1, 2, 5]), // Admin (1), Manager (2) & Approver (5)
  changeController.approveChange
);

// Implement change (Managers & Technicians)
router.put('/:id/implement', 
  roleMiddleware([2, 3]), // Manager (2) & Technician (3)
  changeController.implementChange
);

// Close change (Managers & Technicians)
router.put('/:id/close', 
  roleMiddleware([2, 3]), // Manager (2) & Technician (3)
  changeController.closeChange
);

module.exports = router;