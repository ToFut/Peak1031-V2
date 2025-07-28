module.exports = {
  // PracticePanther API Configuration
  practicePanther: {
    baseUrl: process.env.PP_BASE_URL || 'https://api.practicepanther.com',
    apiKey: process.env.PP_API_KEY,
    clientId: process.env.PP_CLIENT_ID,
    clientSecret: process.env.PP_CLIENT_SECRET,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    }
  },

  // SendGrid Email Configuration
  sendGrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@peak1031.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'Peak 1031 Platform',
    templates: {
      welcome: process.env.SENDGRID_WELCOME_TEMPLATE,
      passwordReset: process.env.SENDGRID_PASSWORD_RESET_TEMPLATE,
      twoFactor: process.env.SENDGRID_2FA_TEMPLATE,
      notification: process.env.SENDGRID_NOTIFICATION_TEMPLATE
    }
  },

  // Twilio SMS Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID
  },

  // AWS S3 Configuration for file storage
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'peak1031-documents',
      region: process.env.AWS_S3_REGION || 'us-east-1'
    }
  },

  // Redis Configuration for session storage
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  }
}; 