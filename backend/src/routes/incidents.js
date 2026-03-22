const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const incidentController = require('../controllers/incidentController');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create incident (Users, Technicians, Managers, Admins)
router.post('/', incidentController.createIncident);

// Get all incidents (Everyone)
router.get('/', incidentController.getIncidents);

// Get incident by ID (Everyone)
router.get('/:id', incidentController.getIncidentById);

// Update incident (Technicians & Managers)
router.put('/:id', 
  roleMiddleware([2, 3]), // Manager (2) & Technician (3)
  incidentController.updateIncident
);

// Assign incident (Managers & Admins)
router.put('/:id/assign', 
  roleMiddleware([1, 2]), // Admin (1) & Manager (2)
  incidentController.assignIncident
);

// Close incident (Admins, Managers & Technicians)
router.put('/:id/close', 
  roleMiddleware([1, 2, 3]), // Admin (1), Manager (2) & Technician (3)
  incidentController.closeIncident
);

module.exports = router;