const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const { check } = require('express-validator');
const authenticateJWT = require('../middleware/authenticate');
const allowedRoles = require('../middleware/rolemiddleware');

// Public routes
router.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  userController.registerUser
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  userController.loginUser
);

// Protected routes
router.post('/logout', authenticateJWT,allowedRoles(['admin','user']),userController.logoutUser);
router.get('/', authenticateJWT,allowedRoles(['admin',]),  userController.getAllUsers);
router.get('/:id',authenticateJWT,allowedRoles(['admin','user']),  userController.getUserById);
router.delete('/:id', authenticateJWT,allowedRoles(['admin',]) ,userController.deleteUser);
router.post("/refresh-token", userController.refreshToken);
router.put(
  '/:id',
  authenticateJWT,
  allowedRoles(['admin', 'user']),
  [
    check('email', 'Please include a valid email').optional().isEmail(),
    check('phone', 'Please include a valid phone number').optional().isMobilePhone(),
    check('displayName', 'Display name is required').optional().notEmpty()
  ],
  userController.updateUser
);
router.put(
  '/:id/block-unblock',
  authenticateJWT,
  allowedRoles(['admin']),
  [
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 })
  ],
  userController.blockOrUnblockUser
);
router.delete(
  '/:id/delete',
  authenticateJWT,
  allowedRoles(['admin']),
    userController.deleteUser
);
module.exports = router;