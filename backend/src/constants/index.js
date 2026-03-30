// User Roles Enum
const USER_ROLES = {
  VIEWER: 'viewer',
  EDITOR: 'editor',
  ADMIN: 'admin'
};

const VIDEO_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  SAFE: 'safe',
  FLAGGED: 'flagged',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// File Extensions
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.mpeg', '.3gp'];

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Socket Events
const SOCKET_EVENTS = {
  // Client emits
  JOIN_USER_ROOM: 'join:user',
  JOIN_ORG_ROOM: 'join:org',
  
  // Server emits
  VIDEO_UPLOAD_PROGRESS: 'video:upload:progress',
  VIDEO_PROCESSING_PROGRESS: 'video:processing:progress',
  VIDEO_STATUS_CHANGE: 'video:status:change',
  VIDEO_COMPLETE: 'video:complete',
  VIDEO_ERROR: 'video:error'
};

// Database Collections
const COLLECTIONS = {
  USERS: 'users',
  VIDEOS: 'videos'
};

// Error Messages
const ERROR_MESSAGES = {
  VALIDATION: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  DUPLICATE_EMAIL: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  UPLOAD_FAILED: 'File upload failed',
  PROCESSING_FAILED: 'Video processing failed'
};

// Success Messages
const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_LOGGED_IN: 'Login successful',
  VIDEO_UPLOADED: 'Video uploaded successfully',
  VIDEO_UPDATED: 'Video updated successfully',
  VIDEO_DELETED: 'Video deleted successfully'
};

module.exports = {
  USER_ROLES,
  VIDEO_STATUS,
  ALLOWED_VIDEO_EXTENSIONS,
  HTTP_STATUS,
  SOCKET_EVENTS,
  COLLECTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
