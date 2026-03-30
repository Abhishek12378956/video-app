const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { storage } = require('../config');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');

// Ensure upload directory exists
const ensureUploadDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Storage configuration
const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const userDir = path.join(storage.path, req.user.organisation.replace(/\s+/g, '_'));
      await ensureUploadDir(userDir);
      cb(null, userDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

// File filter - use config for allowed types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = storage.allowedTypes;

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `${ERROR_MESSAGES.INVALID_FILE_TYPE}: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Upload middleware
const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: storage.maxFileSize,
  },
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.FILE_TOO_LARGE,
        maxSize: storage.maxFileSize
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Validation middleware for video metadata
const validateVideoMetadata = (req, res, next) => {
  const { title, description, category, tags } = req.body;

  // Title is required
  if (!title || title.trim().length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Title is required'
    });
  }

  // Title length validation
  if (title.length > 200) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Title cannot exceed 200 characters'
    });
  }

  // Description length validation
  if (description && description.length > 1000) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Description cannot exceed 1000 characters'
    });
  }

  // Category validation
  if (category && category.length > 50) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Category cannot exceed 50 characters'
    });
  }

  // Tags validation
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagArray.length > 10) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Maximum 10 tags allowed'
      });
    }
    
    // Check individual tag length
    const longTag = tagArray.find(tag => tag.length > 30);
    if (longTag) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Each tag cannot exceed 30 characters'
      });
    }
  }

  next();
};

module.exports = { 
  upload, 
  handleUploadError, 
  validateVideoMetadata 
};
