const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');
const {
  emitProgress,
  emitStatusChange,
  emitProcessingComplete,
  emitProcessingError,
} = require('./socketService');

/**
 * Simulated sensitivity analysis categories
 * In production, integrate with a real CV/AI API (Google Video Intelligence, AWS Rekognition, etc.)
 */
const SENSITIVITY_CATEGORIES = [
  'adult_content',
  'violence',
  'hate_speech',
  'self_harm',
  'graphic_content',
  'spam',
];

/**
 * Extract actual video metadata using FFprobe
 */
const extractMetadata = async (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err);
        // Fallback or reject, we will return some nulls so processing doesn't completely fail
        const stats = fs.statSync(filepath);
        return resolve({
          duration: 0,
          resolution: { width: null, height: null },
          size: stats.size,
        });
      }
      
      const stats = fs.statSync(filepath);
      
      // Find video stream to get resolution
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      resolve({
        duration: metadata.format.duration || 0,
        resolution: {
          width: videoStream ? videoStream.width : null,
          height: videoStream ? videoStream.height : null,
        },
        size: stats.size,
      });
    });
  });
};

/**
 * Simulate sensitivity analysis
 * In production: send video frames to ML model or external API
 */
const analyseSensitivity = async (filepath, onProgress) => {
  return new Promise((resolve) => {
    let currentStep = 0;
    const totalSteps = 5;

    const steps = [
      { progress: 20, message: 'Extracting video frames...' },
      { progress: 40, message: 'Analysing visual content...' },
      { progress: 60, message: 'Processing audio track...' },
      { progress: 80, message: 'Running sensitivity classifiers...' },
      { progress: 95, message: 'Compiling analysis results...' },
    ];

    const processStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        onProgress(step.progress, step.message);
        currentStep++;
        setTimeout(processStep, 1200 + Math.random() * 800);
      } else {
        // Generate analysis result
        const sensitivityScore = Math.random();
        const flagged = sensitivityScore > 0.65;
        const detectedCategories = flagged
          ? SENSITIVITY_CATEGORIES.filter(() => Math.random() > 0.7)
          : [];

        resolve({
          score: Math.round(sensitivityScore * 100) / 100,
          isFlagged: flagged,
          categories: detectedCategories.length > 0 ? detectedCategories : [],
          processedAt: new Date(),
        });
      }
    };

    setTimeout(processStep, 800);
  });
};

/**
 * Compress and optimize video using FFmpeg
 */
const compressVideo = async (inputPath, outputPath, onProgress) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-preset ultrafast', // Fast encoding for assignment purposes
        '-crf 28',           // Constant Rate Factor (compression amount)
        '-movflags +faststart' // Web streaming optimisation
      ])
      .on('progress', (progress) => {
        if (progress.percent) {
          onProgress(progress.percent);
        }
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

/**
 * Main video processing pipeline
 */
const processVideo = async (videoId, userId) => {
  let video;
  try {
    video = await Video.findById(videoId);
    if (!video) throw new Error('Video not found');

    // Step 1: Start processing
    video.status = 'processing';
    video.processingProgress = 5;
    await video.save();

    emitProgress(userId, videoId, 5, 'Starting video processing pipeline...');
    emitStatusChange(userId, videoId, 'processing', 'pending');

    // Step 2: Validate file exists
    if (!fs.existsSync(video.filepath)) {
      throw new Error('Video file not found on disk');
    }

    emitProgress(userId, videoId, 10, 'Validating video file integrity...');
    await delay(800);

    // Step 3: Extract metadata
    emitProgress(userId, videoId, 15, 'Extracting video metadata...');
    const metadata = await extractMetadata(video.filepath);

    video.duration = metadata.duration;
    video.resolution = metadata.resolution;
    video.processingProgress = 20;
    await video.save();

    // Step 4: Video Compression (Optimisation)
    const compressedPath = path.join(path.dirname(video.filepath), `opt_${video.filename}`);
    
    emitProgress(userId, videoId, 20, 'Starting video compression...');
    
    try {
      await compressVideo(video.filepath, compressedPath, (percent) => {
        const p = 20 + (percent * 0.4); // Scale 0-100 to 20-60
        Video.findByIdAndUpdate(videoId, { processingProgress: Math.round(p) }).catch(() => {});
        emitProgress(userId, videoId, Math.round(p), `Compressing and optimizing video... ${Math.round(percent)}%`);
      });

      // Replace original file with compressed file
      if (fs.existsSync(compressedPath)) {
        fs.unlinkSync(video.filepath);
        fs.renameSync(compressedPath, video.filepath);
        const newStats = fs.statSync(video.filepath);
        video.size = newStats.size;
      }
    } catch (err) {
      console.error('Compression optional step failed, continuing...', err);
      // Clean up failed compression file
      if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
    }

    // Step 5: Sensitivity analysis
    const analysisResult = await analyseSensitivity(
      video.filepath,
      async (progress, message) => {
        video.processingProgress = progress;
        await Video.findByIdAndUpdate(videoId, { processingProgress: progress });
        emitProgress(userId, videoId, progress, message);
      }
    );

    // Step 5: Finalise results
    emitProgress(userId, videoId, 100, 'Processing complete!');

    video.status = 'completed';
    video.sensitivity = analysisResult.isFlagged ? 'flagged' : 'safe';
    video.sensitivityDetails = {
      score: analysisResult.score,
      categories: analysisResult.categories,
      processedAt: analysisResult.processedAt,
    };
    video.processingProgress = 100;
    await video.save();

    emitStatusChange(userId, videoId, 'completed', video.sensitivity);
    emitProcessingComplete(userId, {
      videoId,
      title: video.title,
      status: 'completed',
      sensitivity: video.sensitivity,
      sensitivityScore: analysisResult.score,
      sensitivityCategories: analysisResult.categories,
      duration: metadata.duration,
      resolution: metadata.resolution,
    });

    console.log(
      `✅ Video processed: ${video.title} | Sensitivity: ${video.sensitivity} | Score: ${analysisResult.score}`
    );
  } catch (error) {
    console.error(`❌ Video processing failed for ${videoId}:`, error.message);

    if (video) {
      video.status = 'failed';
      video.processingProgress = 0;
      await video.save().catch(() => {});
    }

    emitStatusChange(userId, videoId, 'failed', 'pending');
    emitProcessingError(userId, videoId, error.message);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { processVideo };
