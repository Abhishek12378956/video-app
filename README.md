# 🎬 VideoVault - Production-Ready Video Platform

A **production-ready full-stack application** for uploading, processing, and streaming videos with real-time content sensitivity analysis and multi-tenant architecture.

## 🚀 Key Features

- ✅ **Zero Hardcoded Values** - All configurations environment-driven
- ✅ **Multi-Tenant Architecture** - Organisation-based data isolation
- ✅ **Role-Based Access Control** - Dynamic permission system
- ✅ **Real-Time Processing** - Socket.io progress updates
- ✅ **Video Streaming** - HTTP range request support
- ✅ **Content Sensitivity Analysis** - Configurable detection system
- ✅ **Clean Architecture** - Services, repositories, and separation of concerns

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Environment Configuration](#environment-configuration)
4. [Installation & Setup](#installation--setup)
5. [API Documentation](#api-documentation)
6. [Database Design](#database-design)
7. [Security Features](#security-features)
8. [Deployment Guide](#deployment-guide)
9. [Development Guidelines](#development-guidelines)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│   Context API │ Constants │ Services │ Hooks │ Utils    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                   BACKEND (Node.js + Express)             │
│                                                          │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Controllers│  │  Services    │  │  Repositories    │  │
│  │ /api/*    │  │  Business    │  │  Data Access     │  │
│  │           │  │  Logic       │  │  Layer           │  │
│  └─────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│        │               │                    │            │
│  ┌─────▼───────────────▼────────────────────▼─────────┐  │
│  │              Middleware Layer                       │  │
│  │   Auth │ RBAC │ Validation │ Upload │ Error       │  │
│  └─────────────────────────────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼─────────────┐                  │
│  │         MongoDB (Mongoose)          │                  │
│  │   Users Collection │ Videos Collection               │
│  └─────────────────────────────────────┘                  │
│                                                          │
│  ┌──────────────────┐                                    │
│  │  File Storage    │  (Dynamic path from env)          │
│  │  /uploads/**     │                                    │
│  └──────────────────┘                                    │
└──────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js (LTS) | Runtime |
| Express.js | REST API framework |
| MongoDB + Mongoose | Database & ODM |
| Socket.io | Real-time WebSocket events |
| JWT | Authentication tokens |
| Multer | File upload handling |
| bcryptjs | Password hashing |
| FFmpeg | Video processing |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| React Router v6 | Client-side routing |
| Axios | HTTP client with interceptors |
| Context API | State management |
| Socket.io-client | Real-time events |

## ⚙️ Environment Configuration

### Backend (.env)

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/videovault
DB_TIMEOUT_MS=5000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production_please
JWT_EXPIRES_IN=7d

# File Storage Configuration
FILE_STORAGE_PATH=uploads
MAX_FILE_SIZE=524288000
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/avi,video/mov,video/mkv,video/mpeg,video/3gpp

# Socket.io Configuration
SOCKET_CORS_ORIGIN=http://localhost:5173

# Sensitivity Analysis Configuration
SENSITIVITY_ANALYSIS_ENABLED=true
SENSITIVITY_THRESHOLD=0.5

# FFmpeg Configuration
FFMPEG_ENABLED=true
FFMPEG_OUTPUT_PATH=processed
FFMPEG_QUALITY=medium

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_UPLOAD_MAX=3

# Security Configuration
BCRYPT_ROUNDS=12
HELMET_ENABLED=true
```

### Frontend (.env)

```bash
# Frontend Configuration
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Application Configuration
VITE_APP_NAME=VideoVault
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_UPLOAD=true
VITE_ENABLE_LIVE_STREAMING=false
VITE_ENABLE_ANALYTICS=true

# UI Configuration
VITE_DEFAULT_PAGE_SIZE=12
VITE_MAX_FILE_SIZE_MB=500
VITE_SUPPORTED_VIDEO_FORMATS=mp4,webm,avi,mov,mkv,mpeg,3gp
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ (LTS)
- MongoDB 6+ (local) or MongoDB Atlas account
- FFmpeg (for video processing)

### 1. Clone and Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Socket.io**: http://localhost:5000

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Video Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/videos` | List videos with filters |
| POST | `/api/videos/upload` | Upload video |
| GET | `/api/videos/:id` | Get video details |
| PUT | `/api/videos/:id` | Update video metadata |
| DELETE | `/api/videos/:id` | Delete video |
| GET | `/api/videos/:id/stream` | Stream video |
| GET | `/api/videos/stats` | Get video statistics |

### User Management (Admin Only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user details |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

## 🗄️ Database Design

### User Schema

```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hidden),
  role: Enum [viewer, editor, admin],
  organisation: String (required),
  isActive: Boolean (default: true),
  lastLogin: Date,
  timestamps: true
}
```

### Video Schema

```javascript
{
  title: String (required),
  description: String,
  filename: String (required),
  originalName: String (required),
  filepath: String (required),
  mimetype: String (required),
  size: Number (required),
  duration: Number,
  resolution: { width, height },
  uploadedBy: ObjectId (ref: User),
  organisation: String (required),
  status: Enum [uploaded, processing, safe, flagged],
  sensitivity: Enum [uploaded, processing, safe, flagged],
  sensitivityDetails: {
    score: Number,
    categories: [String],
    processedAt: Date
  },
  processingProgress: Number (0-100),
  tags: [String],
  category: String,
  viewCount: Number (default: 0),
  allowedViewers: [ObjectId] (ref: User),
  timestamps: true
}
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with configurable expiration
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Password hashing with bcrypt

### Input Validation
- File type validation (configurable allowed types)
- File size limits (configurable)
- Metadata validation
- SQL injection prevention (via Mongoose)

### Rate Limiting
- General API rate limiting
- Authentication endpoint limiting
- Upload endpoint limiting

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Content Security Policy

## 🚀 Deployment Guide

### Backend Deployment (Render/Railway/AWS)

1. **Environment Variables**: Set all required environment variables
2. **Database**: Configure MongoDB Atlas connection
3. **File Storage**: Use cloud storage (S3/GCS) in production
4. **Process**: Run with `npm start`

### Frontend Deployment (Vercel/Netlify)

1. **Environment Variables**: Set frontend environment variables
2. **Build**: Run `npm run build`
3. **Deploy**: Deploy the `dist/` directory

### Production Considerations

- Use HTTPS in production
- Configure CDN for video streaming
- Set up monitoring and logging
- Implement backup strategy
- Use managed database service

## 📋 Development Guidelines

### Code Organization

```
backend/
├── src/
│   ├── config/          # Environment configuration
│   ├── constants/       # Enums and constants
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── utils/           # Helper functions

frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── services/        # API calls
│   ├── context/         # Context providers
│   ├── hooks/           # Custom hooks
│   ├── constants/       # Constants and enums
│   └── utils/           # Helper functions
```

### Best Practices

1. **No Hardcoded Values**: Always use environment variables or constants
2. **Separation of Concerns**: Keep business logic in services
3. **Error Handling**: Use centralized error handling
4. **Validation**: Validate all inputs
5. **Security**: Follow security best practices
6. **Testing**: Write unit and integration tests

### Contributing

1. Follow the existing code structure
2. Use TypeScript for new code (if applicable)
3. Write tests for new features
4. Update documentation
5. Follow git commit conventions

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

## 🎯 Key Achievements

✅ **Zero Hardcoded Values** - All configurations are environment-driven  
✅ **Production-Ready** - Complete error handling, validation, and security  
✅ **Scalable Architecture** - Clean separation of concerns  
✅ **Multi-Tenant** - Organisation-based data isolation  
✅ **Real-Time Features** - Socket.io integration  
✅ **Comprehensive Documentation** - Complete setup and deployment guides  

This application is now **production-ready** with **zero hardcoded values** and follows **industry best practices** for scalability, security, and maintainability.
