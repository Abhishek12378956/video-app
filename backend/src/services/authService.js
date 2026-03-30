const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config');
const userRepository = require('../repositories/userRepository');
const { USER_ROLES, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants');

class AuthService {
  // Generate JWT token
  generateToken(userId, role, organisation) {
    return jwt.sign(
      { 
        userId, 
        role, 
        organisation 
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, jwtConfig.secret);
  }

  // Register new user
  async register(userData) {
    const { name, email, password, organisation } = userData;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error(ERROR_MESSAGES.DUPLICATE_EMAIL);
    }

    // Create new user
    const newUser = await userRepository.create({
      name,
      email,
      password,
      organisation,
      role: USER_ROLES.EDITOR // Default role for new users
    });

    // Generate token
    const token = this.generateToken(newUser._id, newUser.role, newUser.organisation);

    return {
      user: newUser.toJSON(),
      token
    };
  }

  // Login user
  async login(email, password) {
    // Find user with password
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Update last login
    await userRepository.updateLastLogin(user._id);

    // Generate token
    const token = this.generateToken(user._id, user.role, user.organisation);

    return {
      user: user.toJSON(),
      token
    };
  }

  // Get current user profile
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }
    return user;
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const allowedFields = ['name', 'organisation'];
    const filteredData = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    const user = await userRepository.update(userId, filteredData);
    if (!user) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    return user;
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: SUCCESS_MESSAGES.PASSWORD_CHANGED };
  }

  // Validate user permissions
  hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
      [USER_ROLES.VIEWER]: 1,
      [USER_ROLES.EDITOR]: 2,
      [USER_ROLES.ADMIN]: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  // Check if user can access resource
  canAccessResource(user, resource) {
    // Admin can access everything
    if (user.role === USER_ROLES.ADMIN) {
      return true;
    }

    // Users can access their own resources
    if (resource.uploadedBy && resource.uploadedBy.toString() === user.userId) {
      return true;
    }

    // Users can access resources from same organisation
    if (resource.organisation === user.organisation) {
      // Editors can access all org resources
      if (user.role === USER_ROLES.EDITOR) {
        return true;
      }
      
      // Viewers can only access explicitly shared resources
      if (user.role === USER_ROLES.VIEWER) {
        return resource.allowedViewers && 
               resource.allowedViewers.includes(user.userId);
      }
    }

    return false;
  }
}

module.exports = new AuthService();
