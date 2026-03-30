const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { asyncHandler } = require('../middleware/errorHandler');
const { processVideo } = require('../services/videoProcessingService');

/**
 * Build query filter based on user role and organisation (multi-tenant)
 */
const buildAccessFilter = (user) => {
  if (user.role === 'admin') return {}; // Admin sees everything
  if (user.role === 'editor') {
    return { $or: [{ uploadedBy: user._id }, { organisation: user.organisation }] };
  }
  // Viewer: only explicitly allowed videos or own org
  return {
    $or: [{ allowedViewers: user._id }, { uploadedBy: user._id }],
  };
};

/**
 * @desc    Upload a video
 * @route   POST /api/videos/upload
 * @access  Private (editor, admin)
 */
const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No video file provided.' });
  }

  const { title, description, tags, category } = req.body;

  if (!title) {
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Video title is required.' });
  }

  const video = await Video.create({
    title,
    description: description || '',
    filename: req.file.filename,
    originalName: req.file.originalname,
    filepath: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
    organisation: req.user.organisation,
    status: 'uploaded',
    sensitivity: 'processing',
    tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    category: category || 'Uncategorised',
  });

  // Trigger async processing (non-blocking)
  setImmediate(() => processVideo(video._id.toString(), req.user._id.toString()));

  await Video.findByIdAndUpdate(video._id, { status: 'processing' });

  const populated = await Video.findById(video._id).populate('uploadedBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Video uploaded successfully. Processing has started.',
    video: populated,
  });
});

/**
 * @desc    Get all videos (with filtering)
 * @route   GET /api/videos
 * @access  Private
 */
const getVideos = asyncHandler(async (req, res) => {
  const {
    status,
    sensitivity,
    category,
    search,
    minDuration,
    maxDuration,
    minSize,
    maxSize,
    startDate,
    endDate,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = buildAccessFilter(req.user);

  // Additional filters
  if (status) filter.status = status;
  if (sensitivity) filter.sensitivity = sensitivity;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  if (minDuration || maxDuration) {
    filter.duration = {};
    if (minDuration) filter.duration.$gte = Number(minDuration);
    if (maxDuration) filter.duration.$lte = Number(maxDuration);
  }

  if (minSize || maxSize) {
    filter.size = {};
    if (minSize) filter.size.$gte = Number(minSize);
    if (maxSize) filter.size.$lte = Number(maxSize);
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(parseInt(limit)),
    Video.countDocuments(filter),
  ]);

  res.json({
    success: true,
    videos,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single video
 * @route   GET /api/videos/:id
 * @access  Private
 */
const getVideo = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...buildAccessFilter(req.user) };
  const video = await Video.findOne(filter).populate('uploadedBy', 'name email');

  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found or access denied.' });
  }

  res.json({ success: true, video });
});

/**
 * @desc    Update video metadata
 * @route   PUT /api/videos/:id
 * @access  Private (editor, admin)
 */
const updateVideo = asyncHandler(async (req, res) => {
  const { title, description, tags, category } = req.body;

  let filter = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    filter.uploadedBy = req.user._id;
  }

  const video = await Video.findOne(filter);
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found or access denied.' });
  }

  const updates = {};
  if (title) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (tags) updates.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
  if (category) updates.category = category;

  const updated = await Video.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('uploadedBy', 'name email');

  res.json({ success: true, message: 'Video updated.', video: updated });
});

/**
 * @desc    Delete video
 * @route   DELETE /api/videos/:id
 * @access  Private (editor, admin)
 */
const deleteVideo = asyncHandler(async (req, res) => {
  let filter = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    filter.uploadedBy = req.user._id;
  }

  const video = await Video.findOne(filter);
  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found or access denied.' });
  }

  // Delete file from disk
  if (fs.existsSync(video.filepath)) {
    fs.unlinkSync(video.filepath);
  }

  await Video.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: 'Video deleted successfully.' });
});

/**
 * @desc    Stream video with HTTP range requests
 * @route   GET /api/videos/:id/stream
 * @access  Public (but with access validation)
 */
const streamVideo = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...buildAccessFilter(req.user || {}) };
  const video = await Video.findOne(filter);

  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found or access denied.' });
  }

  if (!['safe', 'flagged', 'completed'].includes(video.status)) {
    return res.status(400).json({ success: false, message: 'Video is not yet ready for streaming.' });
  }

  if (!fs.existsSync(video.filepath)) {
    return res.status(404).json({ success: false, message: 'Video file not found on server.' });
  }

  const stat = fs.statSync(video.filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Increment view count
  Video.findByIdAndUpdate(video._id, { $inc: { viewCount: 1 } }).catch(() => {});

  if (range) {
    // Parse range header: "bytes=start-end"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const fileStream = fs.createReadStream(video.filepath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': video.mimetype || 'video/mp4',
      'Cache-Control': 'public, max-age=31536000',
    });

    fileStream.pipe(res);
  } else {
    // Full file stream
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': video.mimetype || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000',
    });
    fs.createReadStream(video.filepath).pipe(res);
  }
});

/**
 * @desc    Get video processing status
 * @route   GET /api/videos/:id/status
 * @access  Private
 */
const getVideoStatus = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...buildAccessFilter(req.user) };
  const video = await Video.findOne(filter).select('status sensitivity processingProgress sensitivityDetails duration resolution');

  if (!video) {
    return res.status(404).json({ success: false, message: 'Video not found.' });
  }

  res.json({ success: true, ...video.toObject() });
});

/**
 * @desc    Get video statistics (admin)
 * @route   GET /api/videos/stats
 * @access  Private (admin)
 */
const getStats = asyncHandler(async (req, res) => {
  const [total, byStatus, bySensitivity, recentUploads] = await Promise.all([
    Video.countDocuments(),
    Video.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Video.aggregate([{ $group: { _id: '$sensitivity', count: { $sum: 1 } } }]),
    Video.find().sort({ createdAt: -1 }).limit(5).populate('uploadedBy', 'name'),
  ]);

  res.json({
    success: true,
    stats: {
      total,
      byStatus: byStatus.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
      bySensitivity: bySensitivity.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
      recentUploads,
    },
  });
});

module.exports = {
  uploadVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  streamVideo,
  getVideoStatus,
  getStats,
};
