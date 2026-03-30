const mongoose = require('mongoose');
const { VIDEO_STATUS } = require('../constants');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      default: null,
    },
    resolution: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organisation: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(VIDEO_STATUS),
      default: VIDEO_STATUS.UPLOADED,
    },
    sensitivity: {
      type: String,
      enum: Object.values(VIDEO_STATUS),
      default: VIDEO_STATUS.PROCESSING,
    },
    sensitivityDetails: {
      score: { type: Number, default: 0 },
      categories: [{ type: String }],
      processedAt: { type: Date },
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: [{ type: String, trim: true }],
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    // Viewers who have explicit access (for viewer role)
    allowedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    thumbnailPath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
videoSchema.index({ uploadedBy: 1, status: 1 });
videoSchema.index({ organisation: 1, sensitivity: 1 });
videoSchema.index({ createdAt: -1 });

// Virtual for file URL
videoSchema.virtual('streamUrl').get(function () {
  return `/api/videos/${this._id}/stream`;
});

videoSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Video', videoSchema);
