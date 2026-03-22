const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const serviceRequestController = require('../controllers/serviceRequestController');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create service request (Everyone)
router.post('/', serviceRequestController.createServiceRequest);

// Get all service requests (Everyone)
router.get('/', serviceRequestController.getServiceRequests);

// Get service request by ID (Everyone)
router.get('/:id', serviceRequestController.getServiceRequestById);

// Update service request (Admins, Managers & Technicians)
router.put('/:id', 
  roleMiddleware([1, 2, 3]), // Admin (1), Manager (2) & Technician (3)
  serviceRequestController.updateServiceRequest
);

// Fulfill service request (Admins, Managers & Technicians)
router.put('/:id/fulfill', 
  roleMiddleware([1, 2, 3]), // Admin (1), Manager (2) & Technician (3)
  serviceRequestController.fulfillServiceRequest
);

module.exports = router;