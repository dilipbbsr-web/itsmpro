const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const problemController = require('../controllers/problemController');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create problem (Analysts & Managers)
router.post('/', 
  roleMiddleware([2, 4]), // Manager (2) & Analyst (4)
  problemController.createProblem
);

// Get all problems (Everyone)
router.get('/', problemController.getProblems);

// Get problem by ID (Everyone)
router.get('/:id', problemController.getProblemById);

// Update problem (Analysts & Managers)
router.put('/:id', 
  roleMiddleware([2, 4]), // Manager (2) & Analyst (4)
  problemController.updateProblem
);

// Analyze problem - Add root cause (Analysts)
router.put('/:id/analyze', 
  roleMiddleware([4]), // Analyst (4)
  problemController.analyzeProblem
);

// Resolve problem (Managers & Analysts)
router.put('/:id/resolve', 
  roleMiddleware([1, 2, 4]), // Admin (1), Manager (2) & Analyst (4)
  problemController.resolveProblem
);

module.exports = router;