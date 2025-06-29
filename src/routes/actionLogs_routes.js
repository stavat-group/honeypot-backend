const express = require('express');
const router = express.Router();
const actionLogsController = require('../controllers/actionLogs_controller');
const authenticateJWT = require('../middleware/authenticate');
const allowedRoles = require('../middleware/rolemiddleware');

router.post('/', actionLogsController.createActionLog);
router.get('/', authenticateJWT, allowedRoles(['admin', 'user']), actionLogsController.getActionLogs);
router.get('/:projectId/byProjectId', authenticateJWT, allowedRoles(['admin', 'user']), actionLogsController.getActionLogByProjectId);

module.exports = router;
