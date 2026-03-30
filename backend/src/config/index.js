require('dotenv').config();

// Validation helper
const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is missing`);
  }
  return value;
};

const getOptionalEnv = (key, defaultValue) => {
  return process.env[key] || defaultValue;
};

// Database Configuration
const database = {
  uri: getRequiredEnv('MONGO_URI'),
  timeout: parseInt(getOptionalEnv('DB_TIMEOUT_MS', '5000'))
};

// Server Configuration
const server = {
  port: parseInt(getOptionalEnv('PORT', '5000')),
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  corsOrigin: getRequiredEnv('SOCKET_CORS_ORIGIN')
};

// JWT Configuration
const jwt = {
  secret: getRequiredEnv('JWT_SECRET'),
  expiresIn: getOptionalEnv('JWT_EXPIRES_IN', '7d')
};

// File Storage Configuration
const storage = {
  path: getRequiredEnv('FILE_STORAGE_PATH'),
  maxFileSize: parseInt(getRequiredEnv('MAX_FILE_SIZE')),
  allowedTypes: getRequiredEnv('ALLOWED_VIDEO_TYPES').split(',').map(type => type.trim())
};

// Sensitivity Analysis Configuration
const sensitivity = {
  enabled: getOptionalEnv('SENSITIVITY_ANALYSIS_ENABLED', 'true') === 'true',
  threshold: parseFloat(getOptionalEnv('SENSITIVITY_THRESHOLD', '0.5'))
};

// FFmpeg Configuration
const ffmpeg = {
  enabled: getOptionalEnv('FFMPEG_ENABLED', 'true') === 'true',
  outputPath: getOptionalEnv('FFMPEG_OUTPUT_PATH', 'processed'),
  quality: getOptionalEnv('FFMPEG_QUALITY', 'medium')
};

// Rate Limiting Configuration
const rateLimit = {
  windowMs: parseInt(getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000')), // 15 minutes
  max: parseInt(getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100')),
  authMax: parseInt(getOptionalEnv('RATE_LIMIT_AUTH_MAX', '5')),
  uploadMax: parseInt(getOptionalEnv('RATE_LIMIT_UPLOAD_MAX', '3'))
};

// Logging Configuration
const logging = {
  level: getOptionalEnv('LOG_LEVEL', 'info'),
  format: getOptionalEnv('LOG_FORMAT', 'combined')
};

// Cache Configuration
const cache = {
  enabled: getOptionalEnv('CACHE_ENABLED', 'false') === 'true',
  ttl: parseInt(getOptionalEnv('CACHE_TTL', '3600')) // 1 hour
};

// Security Configuration
const security = {
  bcryptRounds: parseInt(getOptionalEnv('BCRYPT_ROUNDS', '12')),
  sessionSecret: getRequiredEnv('JWT_SECRET'),
  helmetEnabled: getOptionalEnv('HELMET_ENABLED', 'true') === 'true'
};

module.exports = {
  database,
  server,
  jwt,
  storage,
  sensitivity,
  ffmpeg,
  rateLimit,
  logging,
  cache,
  security
};
