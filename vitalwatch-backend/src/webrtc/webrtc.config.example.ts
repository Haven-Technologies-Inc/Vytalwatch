/**
 * WebRTC Configuration Example
 *
 * Add this configuration to your config/configuration.ts file
 */

export const webrtcConfig = {
  webrtc: {
    // STUN servers for NAT traversal
    // Google's public STUN servers (free, but consider using your own for production)
    stunServers: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
    ],

    // TURN servers for relay (when P2P connection fails)
    // You MUST configure your own TURN servers for production
    // Popular options:
    // - coturn (open source): https://github.com/coturn/coturn
    // - Twilio Network Traversal Service
    // - Xirsys (commercial)
    turnServers: [
      // Example configuration (replace with your actual TURN server)
      // 'turn:your-turn-server.com:3478',
      // 'turns:your-turn-server.com:5349', // TLS version
    ],

    // TURN server credentials (if required)
    turnUsername: process.env.WEBRTC_TURN_USERNAME,
    turnPassword: process.env.WEBRTC_TURN_PASSWORD,

    // ICE transport policy
    // - 'all': Use both STUN and TURN
    // - 'relay': Force all connections through TURN (more secure, higher latency)
    iceTransportPolicy: 'all',

    // Connection timeout (ms)
    connectionTimeout: 30000,

    // Reconnection attempts
    maxReconnectionAttempts: 3,

    // Quality monitoring interval (ms)
    qualityMonitoringInterval: 10000,
  },

  // Recording configuration
  recording: {
    // Storage provider: 'aws-s3', 'azure-blob', 'gcp-storage', 'local'
    provider: process.env.STORAGE_PROVIDER || 'aws-s3',

    // S3 configuration
    aws: {
      bucket: process.env.AWS_S3_BUCKET || 'vytalwatch-call-recordings',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },

    // Azure Blob configuration
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      containerName: process.env.AZURE_CONTAINER_NAME || 'call-recordings',
    },

    // GCP Storage configuration
    gcp: {
      projectId: process.env.GCP_PROJECT_ID,
      bucketName: process.env.GCP_BUCKET_NAME || 'vytalwatch-call-recordings',
      keyFilename: process.env.GCP_KEY_FILE,
    },

    // Local storage (for development only)
    local: {
      path: process.env.LOCAL_STORAGE_PATH || './uploads/recordings',
    },

    // Recording settings
    retentionDays: parseInt(process.env.RECORDING_RETENTION_DAYS) || 365,
    maxFileSize: parseInt(process.env.RECORDING_MAX_FILE_SIZE) || 5368709120, // 5GB
    enableTranscription: process.env.RECORDING_ENABLE_TRANSCRIPTION === 'true',

    // Encryption
    encryption: {
      algorithm: 'AES-256-GCM',
      keyRotationDays: 90,
    },
  },

  // Media constraints
  media: {
    // Video constraints
    video: {
      default: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      hd: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      low: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 },
      },
    },

    // Audio constraints
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },

    // Screen share constraints
    screen: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 15 },
    },
  },

  // Quality thresholds
  quality: {
    // When to show warnings
    warnings: {
      highLatency: 300, // ms
      highPacketLoss: 10, // percentage
      lowBandwidth: 500, // kbps
    },

    // When to trigger automatic fallback
    fallback: {
      criticalLatency: 500, // ms
      criticalPacketLoss: 20, // percentage
      criticalBandwidth: 300, // kbps
    },
  },
};

/**
 * Environment Variables Required
 *
 * Add these to your .env file:
 *
 * # WebRTC
 * WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
 * WEBRTC_TURN_SERVERS=turn:your-turn-server.com:3478
 * WEBRTC_TURN_USERNAME=your-turn-username
 * WEBRTC_TURN_PASSWORD=your-turn-password
 *
 * # Storage (AWS S3 example)
 * STORAGE_PROVIDER=aws-s3
 * AWS_S3_BUCKET=vytalwatch-call-recordings
 * AWS_REGION=us-east-1
 * AWS_ACCESS_KEY_ID=your-access-key
 * AWS_SECRET_ACCESS_KEY=your-secret-key
 *
 * # Recording
 * RECORDING_RETENTION_DAYS=365
 * RECORDING_MAX_FILE_SIZE=5368709120
 * RECORDING_ENABLE_TRANSCRIPTION=false
 *
 * # Frontend URL for CORS
 * FRONTEND_URL=https://your-frontend-url.com
 */
