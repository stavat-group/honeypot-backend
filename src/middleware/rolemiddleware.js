
const allowedRoles = (roles = []) => {
 
  if (!roles.length) return (req, res, next) => next();
  
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Insufficient permissions' 
    });
  };
};

module.exports = allowedRoles;