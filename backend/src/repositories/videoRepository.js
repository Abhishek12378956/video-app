const Video = require('../models/Video');
const { VIDEO_STATUS } = require('../constants');

class VideoRepository {
  // Create new video
  async create(videoData) {
    const video = new Video(videoData);
    return await video.save();
  }

  // Find video by ID
  async findById(id) {
    return await Video.findById(id).populate('uploadedBy', 'name email');
  }

  // Update video
  async update(id, updateData) {
    return await Video.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  // Delete video
  async delete(id) {
    return await Video.findByIdAndDelete(id);
  }

  // Get videos with filters and pagination
  async findAll(filters = {}, options = {}) {
    const {
      userId,
      organisation,
      status,
      sensitivity,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = filters;

    // Build query
    let query = {};

    // Multi-tenant filtering
    if (userId) {
      query.uploadedBy = userId;
    } else if (organisation) {
      query.organisation = organisation;
    }

    // Status filtering
    if (status) {
      query.status = status;
    }

    // Sensitivity filtering
    if (sensitivity) {
      query.sensitivity = sensitivity;
    }

    // Category filtering
    if (category) {
      query.category = category;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const videos = await Video.find(query)
      .populate('uploadedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(query);

    return {
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get videos by user
  async findByUser(userId, options = {}) {
    return await this.findAll({ userId, ...options });
  }

  // Get videos by organisation
  async findByOrganisation(organisation, options = {}) {
    return await this.findAll({ organisation, ...options });
  }

  // Update video status
  async updateStatus(id, status, additionalData = {}) {
    return await Video.findByIdAndUpdate(
      id,
      { 
        status, 
        ...additionalData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
  }

  // Update processing progress
  async updateProgress(id, progress) {
    return await Video.findByIdAndUpdate(
      id,
      { 
        processingProgress: Math.min(100, Math.max(0, progress)),
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  // Update sensitivity analysis
  async updateSensitivity(id, sensitivity, details = {}) {
    return await Video.findByIdAndUpdate(
      id,
      {
        sensitivity,
        sensitivityDetails: {
          score: details.score || 0,
          categories: details.categories || [],
          processedAt: new Date()
        },
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  // Increment view count
  async incrementViewCount(id) {
    return await Video.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
  }

  // Get video statistics
  async getStats(organisation) {
    const matchStage = organisation ? { organisation } : {};

    const stats = await Video.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          uploaded: { $sum: { $cond: [{ $eq: ['$status', VIDEO_STATUS.UPLOADED] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', VIDEO_STATUS.PROCESSING] }, 1, 0] } },
          safe: { $sum: { $cond: [{ $eq: ['$sensitivity', VIDEO_STATUS.SAFE] }, 1, 0] } },
          flagged: { $sum: { $cond: [{ $eq: ['$sensitivity', VIDEO_STATUS.FLAGGED] }, 1, 0] } },
          totalViews: { $sum: '$viewCount' },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      uploaded: 0,
      processing: 0,
      safe: 0,
      flagged: 0,
      totalViews: 0,
      totalSize: 0
    };
  }

  // Get video for streaming
  async getForStreaming(id) {
    return await Video.findById(id).select('filepath mimetype status');
  }
}

module.exports = new VideoRepository();
