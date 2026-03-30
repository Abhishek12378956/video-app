const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { USER_ROLES, HTTP_STATUS, ERROR_MESSAGES } = require('../constants');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Verify token using auth service
    const decoded = authService.verifyToken(token);
    const user = await userRepository.findById(decoded.id || decoded.userId);

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false, 
        message: ERROR_MESSAGES.NOT_FOUND 
      });
    }

    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Account is deactivated.' 
      });
    }

    // Attach user info to request
    req.user = {
      _id: user._id,
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      organisation: user.organisation
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false, 
        message: ERROR_MESSAGES.UNAUTHORIZED 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    next(error);
  }
};

/**
 * Role-based access control
 * @param  {...string} roles - allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!authService.hasPermission(req.user.role, roles[0])) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN,
      });
    }
    next();
  };
};

/**
 * Check if user can access resource based on role and organisation
 */
const canAccess = (resourceType) => {
  return (req, res, next) => {
    const user = req.user;
    
    // Admin can access everything
    if (user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // For video resources, check ownership/organisation
    if (resourceType === 'video') {
      // This will be checked in the service layer with full resource data
      return next();
    }

    // For user management, only admins can access
    if (resourceType === 'user') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN,
      });
    }

    next();
  };
};

/**
 * Multi-tenant filter middleware
 */
const addTenantFilter = (req, res, next) => {
  const user = req.user;
  
  // Admin bypasses tenant filtering
  if (user.role === USER_ROLES.ADMIN) {
    return next();
  }

  // Add organisation filter for non-admin users
  req.tenantFilter = { organisation: user.organisation };
  
  // Add user filter for viewers
  if (user.role === USER_ROLES.VIEWER) {
    req.tenantFilter.uploadedBy = user.userId;
  }

  next();
};

module.exports = { 
  protect, 
  authorize, 
  canAccess, 
  addTenantFilter 
};
