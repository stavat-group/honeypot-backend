const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project_controller');
const authenticateJWT = require('../middleware/authenticate');
const allowedRoles = require('../middleware/rolemiddleware');

// Project routes
router.post('/', authenticateJWT,allowedRoles(['admin','user']), projectController.createProject);
router.get('/', authenticateJWT,allowedRoles(['admin','user']), projectController.getAllProjects);
router.get('/:id', authenticateJWT,allowedRoles(['admin','user']), projectController.getProjectById);
router.put('/:id', authenticateJWT,allowedRoles(['admin','user']), projectController.updateProject);
router.delete('/:id', authenticateJWT,allowedRoles(['admin','user']), projectController.deleteProject);
router.post('/:id/generate-api-key', authenticateJWT, allowedRoles(['admin','user']), projectController.generateApiKey);
router.put('/:id/change-status', authenticateJWT, allowedRoles(['admin','user']), projectController.activeOrInactiveProject);
router.put('/:id/change-block-status', authenticateJWT, allowedRoles(['admin']), projectController.blockOrUnblockProject);
router.post('/validate/apiKey',  projectController.validateApiKey);
// API Key management


module.exports = router;