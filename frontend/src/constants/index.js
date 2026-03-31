// User Roles
export const USER_ROLES = {
  VIEWER: 'viewer',
  EDITOR: 'editor',
  ADMIN: 'admin'
};

// Video Status
export const VIDEO_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  SAFE: 'safe',
  FLAGGED: 'flagged'
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password'
  },
  VIDEOS: {
    LIST: '/videos',
    UPLOAD: '/videos/upload',
    GET: '/videos/:id',
    UPDATE: '/videos/:id',
    DELETE: '/videos/:id',
    STREAM: '/videos/:id/stream',
    STATS: '/videos/stats'
  },
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: '/users/:id',
    UPDATE: '/users/:id',
    DELETE: '/users/:id'
  }
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Socket Events
export const SOCKET_EVENTS = {
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

// Error Messages
export const ERROR_MESSAGES = {
  VALIDATION: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  DUPLICATE_EMAIL: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  UPLOAD_FAILED: 'File upload failed',
  PROCESSING_FAILED: 'Video processing failed',
  NETWORK_ERROR: 'Network error occurred',
  SERVER_ERROR: 'Server error occurred'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_LOGGED_IN: 'Login successful',
  VIDEO_UPLOADED: 'Video uploaded successfully',
  VIDEO_UPDATED: 'Video updated successfully',
  VIDEO_DELETED: 'Video deleted successfully',
  PASSWORD_CHANGED: 'Password changed successfully'
};

// File Configuration
export const FILE_CONFIG = {
  MAX_SIZE_MB: parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 500,
  SUPPORTED_FORMATS: (import.meta.env.VITE_SUPPORTED_VIDEO_FORMATS || 'mp4,webm,avi,mov,mkv,mpeg,3gp').split(','),
  DEFAULT_PAGE_SIZE: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 12
};

// UI Configuration
export const UI_CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'VideoVault',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  DEFAULT_THEME: import.meta.env.VITE_DEFAULT_THEME || 'light',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
  ENABLE_UPLOAD: import.meta.env.VITE_ENABLE_UPLOAD !== 'false',
  ENABLE_LIVE_STREAMING: import.meta.env.VITE_ENABLE_LIVE_STREAMING === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
};

// Route Paths
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '',
  LIBRARY: '/library',
  UPLOAD: '/upload',
  VIDEO: '/video/:id',
  ADMIN: '/admin',
  PROFILE: '/profile',
  SETTINGS: '/settings'
};

// Permission Levels
export const PERMISSIONS = {
  [USER_ROLES.VIEWER]: {
    canViewVideos: true,
    canUploadVideos: false,
    canEditVideos: false,
    canDeleteVideos: false,
    canManageUsers: false,
    canViewStats: false
  },
  [USER_ROLES.EDITOR]: {
    canViewVideos: true,
    canUploadVideos: true,
    canEditVideos: true,
    canDeleteVideos: true,
    canManageUsers: false,
    canViewStats: false
  },
  [USER_ROLES.ADMIN]: {
    canViewVideos: true,
    canUploadVideos: true,
    canEditVideos: true,
    canDeleteVideos: true,
    canManageUsers: true,
    canViewStats: true
  }
};

// Video Filters
export const VIDEO_FILTERS = {
  STATUS: [
    { value: '', label: 'All Status' },
    { value: VIDEO_STATUS.UPLOADED, label: 'Uploaded' },
    { value: VIDEO_STATUS.PROCESSING, label: 'Processing' },
    { value: VIDEO_STATUS.SAFE, label: 'Safe' },
    { value: VIDEO_STATUS.FLAGGED, label: 'Flagged' }
  ],
  SENSITIVITY: [
    { value: '', label: 'All Sensitivity' },
    { value: VIDEO_STATUS.SAFE, label: 'Safe' },
    { value: VIDEO_STATUS.FLAGGED, label: 'Flagged' }
  ],
  SORT_BY: [
    { value: 'createdAt', label: 'Upload Date' },
    { value: 'title', label: 'Title' },
    { value: 'size', label: 'File Size' },
    { value: 'viewCount', label: 'View Count' }
  ],
  SORT_ORDER: [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' }
  ]
};
