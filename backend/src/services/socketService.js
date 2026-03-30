let io;

/**
 * Initialize Socket.io instance
 */
const initSocketIO = (socketIO) => {
  io = socketIO;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join user-specific room for targeted updates
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    });

    // Join organisation room
    socket.on('join:org', (orgName) => {
      socket.join(`org:${orgName}`);
      console.log(`🏢 Client joined org room: ${orgName}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit processing progress update for a video
 */
const emitProgress = (userId, videoId, progress, message) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('video:progress', {
    videoId,
    progress,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit video status change
 */
const emitStatusChange = (userId, videoId, status, sensitivity) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('video:statusChange', {
    videoId,
    status,
    sensitivity,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit processing complete
 */
const emitProcessingComplete = (userId, videoData) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('video:complete', {
    ...videoData,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit processing error
 */
const emitProcessingError = (userId, videoId, error) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('video:error', {
    videoId,
    error,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get io instance
 */
const getIO = () => io;

module.exports = {
  initSocketIO,
  emitProgress,
  emitStatusChange,
  emitProcessingComplete,
  emitProcessingError,
  getIO,
};
