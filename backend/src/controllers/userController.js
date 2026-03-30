const User = require('../models/User');
const Video = require('../models/Video');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private (admin)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { organisation: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    users,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  });
});

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private (admin)
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const videoCount = await Video.countDocuments({ uploadedBy: req.params.id });
  res.json({ success: true, user: { ...user.toJSON(), videoCount } });
});

/**
 * @desc    Update user role or status (admin)
 * @route   PUT /api/users/:id
 * @access  Private (admin)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive, name, organisation } = req.body;
  const updates = {};

  if (role && ['viewer', 'editor', 'admin'].includes(role)) updates.role = role;
  if (typeof isActive === 'boolean') updates.isActive = isActive;
  if (name) updates.name = name;
  if (organisation) updates.organisation = organisation;

  // Prevent self-demotion
  if (req.params.id === req.user._id.toString() && role && role !== 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot change your own admin role.' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  res.json({ success: true, message: 'User updated.', user });
});

/**
 * @desc    Delete user (admin)
 * @route   DELETE /api/users/:id
 * @access  Private (admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  res.json({ success: true, message: 'User deleted successfully.' });
});

/**
 * @desc    Create a user (admin)
 * @route   POST /api/users
 * @access  Private (admin)
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, organisation } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const user = await User.create({ name, email, password, role: role || 'editor', organisation: organisation || 'Default' });

  res.status(201).json({ success: true, message: 'User created.', user });
});

module.exports = { getUsers, getUser, updateUser, deleteUser, createUser };
