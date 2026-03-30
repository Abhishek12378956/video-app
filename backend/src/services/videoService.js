const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const videoRepository = require('../repositories/videoRepository');
const { storage, sensitivity } = require('../config');
const { VIDEO_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants');

class VideoService {
  // Upload video file
  async uploadVideo(file, metadata, user) {
    const { title, description, category, tags } = metadata;
    
    // Validate file type
    const allowedTypes = storage.allowedTypes;
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }

    // Validate file size
    if (file.size > storage.maxFileSize) {
      throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    // Generate unique filename
    const filename = `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`;
    const organisationDir = path.join(storage.path, user.organisation);
    const filepath = path.join(organisationDir, filename);

    // Ensure directory exists
    await fs.mkdir(organisationDir, { recursive: true });

    // Move file to storage
    await fs.rename(file.path, filepath);

    // Create video record
    const videoData = {
      title,
      description: description || '',
      filename,
      originalName: file.originalname,
      filepath,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: user.userId,
      organisation: user.organisation,
      category: category || 'General',
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      status: VIDEO_STATUS.UPLOADED
    };

    const video = await videoRepository.create(videoData);

    // Start processing (async)
    this.processVideo(video._id);

    return video;
  }

  // Process video (async pipeline)
  async processVideo(videoId) {
    try {
      // Update status to processing
      await videoRepository.updateStatus(videoId, VIDEO_STATUS.PROCESSING);
      this.emitProgress(videoId, 10, 'Starting video processing...');

      // Step 1: Validate file exists
      const video = await videoRepository.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      try {
        await fs.access(video.filepath);
      } catch (error) {
        throw new Error('Video file not found');
      }

      this.emitProgress(videoId, 20, 'File validated successfully');

      // Step 2: Extract metadata (using FFmpeg if enabled)
      if (this.isFFmpegEnabled()) {
        const metadata = await this.extractMetadata(video.filepath);
        await videoRepository.update(videoId, {
          duration: metadata.duration,
          resolution: metadata.resolution
        });
        this.emitProgress(videoId, 40, 'Metadata extracted successfully');
      }

      // Step 3: Sensitivity analysis
      if (sensitivity.enabled) {
        this.emitProgress(videoId, 60, 'Analyzing content sensitivity...');
        
        const sensitivityResult = await this.analyzeSensitivity(video.filepath);
        
        await videoRepository.updateSensitivity(
          videoId, 
          sensitivityResult.isSensitive ? VIDEO_STATUS.FLAGGED : VIDEO_STATUS.SAFE,
          sensitivityResult
        );
        
        this.emitProgress(videoId, 80, 'Sensitivity analysis completed');
      } else {
        // Default to safe if analysis is disabled
        await videoRepository.updateSensitivity(videoId, VIDEO_STATUS.SAFE, {
          score: 0,
          categories: []
        });
      }

      // Step 4: Complete processing
      await videoRepository.updateStatus(videoId, VIDEO_STATUS.SAFE, {
        processingProgress: 100
      });

      this.emitComplete(videoId);

    } catch (error) {
      console.error(`Video processing failed for ${videoId}:`, error);
      await videoRepository.updateStatus(videoId, VIDEO_STATUS.PROCESSING);
      this.emitError(videoId, error.message);
    }
  }

  // Extract video metadata using FFmpeg
  async extractMetadata(filepath) {
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: metadata.format.duration,
          resolution: videoStream ? {
            width: videoStream.width,
            height: videoStream.height
          } : { width: null, height: null }
        });
      });
    });
  }

  // Simulate sensitivity analysis (replace with real AI service)
  async analyzeSensitivity(filepath) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate random sensitivity detection
    const score = Math.random();
    const isSensitive = score > sensitivity.threshold;

    const categories = isSensitive ? 
      (Math.random() > 0.5 ? ['violence'] : ['adult_content']) : 
      [];

    return {
      score,
      isSensitive,
      categories
    };
  }

  // Get video for streaming
  async getVideoForStreaming(videoId, user) {
    const video = await videoRepository.getForStreaming(videoId);
    
    if (!video) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    // Check access permissions
    const fullVideo = await videoRepository.findById(videoId);
    if (!this.authService.canAccessResource(user, fullVideo)) {
      throw new Error(ERROR_MESSAGES.FORBIDDEN);
    }

    return video;
  }

  // Get video list with filters
  async getVideoList(filters, user) {
    // Apply user-specific filters
    const userFilters = { ...filters };

    if (user.role !== 'admin') {
      userFilters.organisation = user.organisation;
      
      if (user.role === 'viewer') {
        userFilters.userId = user.userId;
      }
    }

    return await videoRepository.findAll(userFilters);
  }

  // Update video metadata
  async updateVideo(videoId, updateData, user) {
    const video = await videoRepository.findById(videoId);
    
    if (!video) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    // Check permissions
    if (!this.authService.canAccessResource(user, video)) {
      throw new Error(ERROR_MESSAGES.FORBIDDEN);
    }

    const allowedFields = ['title', 'description', 'category', 'tags'];
    const filteredData = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    return await videoRepository.update(videoId, filteredData);
  }

  // Delete video
  async deleteVideo(videoId, user) {
    const video = await videoRepository.findById(videoId);
    
    if (!video) {
      throw new Error(ERROR_MESSAGES.NOT_FOUND);
    }

    // Check permissions
    if (!this.authService.canAccessResource(user, video)) {
      throw new Error(ERROR_MESSAGES.FORBIDDEN);
    }

    // Delete file from storage
    try {
      await fs.unlink(video.filepath);
    } catch (error) {
      console.error('Failed to delete video file:', error);
    }

    // Delete from database
    await videoRepository.delete(videoId);

    return { message: SUCCESS_MESSAGES.VIDEO_DELETED };
  }

  // Increment view count
  async incrementViews(videoId) {
    return await videoRepository.incrementViewCount(videoId);
  }

  // Get video statistics
  async getVideoStats(user) {
    if (user.role === 'admin') {
      return await videoRepository.getStats();
    } else {
      return await videoRepository.getStats(user.organisation);
    }
  }

  // Helper methods
  isFFmpegEnabled() {
    try {
      require('fluent-ffmpeg');
      return true;
    } catch (error) {
      return false;
    }
  }

  emitProgress(videoId, progress, message) {
    // This will be connected to socket service
    if (global.socketService) {
      global.socketService.emitVideoProgress(videoId, progress, message);
    }
  }

  emitComplete(videoId) {
    if (global.socketService) {
      global.socketService.emitVideoComplete(videoId);
    }
  }

  emitError(videoId, error) {
    if (global.socketService) {
      global.socketService.emitVideoError(videoId, error);
    }
  }

  // Set auth service reference
  setAuthService(authService) {
    this.authService = authService;
  }
}

module.exports = new VideoService();
