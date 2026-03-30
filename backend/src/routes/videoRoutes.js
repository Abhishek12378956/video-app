const express = require('express');
const router = express.Router();
const {
  uploadVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  streamVideo,
  getVideoStatus,
  getStats,
} = require('../controllers/videoController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Public streaming route (must come before the global protect middleware)
router.get('/:id/stream', streamVideo);

// All other routes require authentication
router.use(protect);

// Stats (admin only)
router.get('/stats', authorize('admin'), getStats);

// Video listing and upload
router.get('/', getVideos);
router.post('/upload', authorize('editor', 'admin'), uploadLimiter, upload.single('video'), uploadVideo);

// Single video operations
router.get('/:id', getVideo);
router.put('/:id', authorize('editor', 'admin'), updateVideo);
router.delete('/:id', authorize('editor', 'admin'), deleteVideo);

// Status endpoint
router.get('/:id/status', getVideoStatus);

module.exports = router;
