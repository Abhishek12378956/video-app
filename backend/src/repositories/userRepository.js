const User = require('../models/User');
const { USER_ROLES } = require('../constants');

class UserRepository {
  // Find user by email
  async findByEmail(email) {
    return await User.findOne({ email, isActive: true });
  }

  // Find user by ID
  async findById(id) {
    return await User.findById(id).select('-password');
  }

  // Find user by ID with password
  async findByIdWithPassword(id) {
    return await User.findById(id);
  }

  // Create new user
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  // Update user
  async update(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  // Delete user (soft delete)
  async delete(id) {
    return await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  // Get all users (admin only)
  async findAll(filters = {}) {
    const query = { ...filters };
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.organisation) {
      query.organisation = filters.organisation;
    }

    return await User.find(query).select('-password').sort({ createdAt: -1 });
  }

  // Get users by organisation
  async findByOrganisation(organisation) {
    return await User.find({ organisation, isActive: true }).select('-password');
  }

  // Update last login
  async updateLastLogin(id) {
    return await User.findByIdAndUpdate(id, { lastLogin: new Date() }, { new: true });
  }

  // Check if user exists by email
  async existsByEmail(email) {
    return await User.exists({ email });
  }

  // Get user statistics
  async getStats() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }
}

module.exports = new UserRepository();
