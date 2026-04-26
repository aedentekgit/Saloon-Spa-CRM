require('dotenv').config();
console.log('Zen CRM Sanctuary: Orchestration layer initiating...');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const paginationMiddleware = require('./middleware/paginationMiddleware');

const assertSecurityEnv = () => {
  const secret = String(process.env.JWT_SECRET || '');
  const isProd = process.env.NODE_ENV === 'production';
  const isWeak = !secret || secret.length < 32 || secret === 'your_super_secret_key_123';

  if (isProd && isWeak) {
    throw new Error('Security Misconfiguration: JWT_SECRET must be a strong secret (>=32 chars) in production.');
  }
};

assertSecurityEnv();

// Route files
const userRoutes = require('./routes/core/userRoutes');
const settingsRoutes = require('./routes/core/settingsRoutes');
const roleRoutes = require('./routes/human-resources/roleRoutes');
const employeeRoutes = require('./routes/human-resources/employeeRoutes');
const clientRoutes = require('./routes/operations/clientRoutes');
const serviceRoutes = require('./routes/operations/serviceRoutes');
const roomRoutes = require('./routes/operations/roomRoutes');
const appointmentRoutes = require('./routes/operations/appointmentRoutes');
const attendanceRoutes = require('./routes/human-resources/attendanceRoutes');
const leaveRoutes = require('./routes/human-resources/leaveRoutes');
const invoiceRoutes = require('./routes/finance/invoiceRoutes');
const expenseRoutes = require('./routes/finance/expenseRoutes');
const inventoryRoutes = require('./routes/inventory/inventoryRoutes');
const whatsAppRoutes = require('./routes/operations/whatsAppRoutes');
const branchRoutes = require('./routes/operations/branchRoutes');
const categoryRoutes = require('./routes/operations/categoryRoutes');
const shiftRoutes = require('./routes/human-resources/shiftRoutes');
const notificationRoutes = require('./routes/core/notificationRoutes');

// Connect to database
connectDB();

const app = express();
const isDev = process.env.NODE_ENV !== 'production';
const enforceHttps = process.env.ENFORCE_HTTPS === 'true';
const uploadDirConfig = (process.env.UPLOAD_DIR || 'uploads').trim();
const uploadDir = path.isAbsolute(uploadDirConfig)
  ? uploadDirConfig
  : path.join(__dirname, uploadDirConfig);

// Required behind Nginx so client IP/rate-limit behaves correctly.
app.set('trust proxy', 1);

// Standard Middleware
app.use(compression());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https:'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https:'],
  scriptSrc: ["'self'"],
  connectSrc: ["'self'", 'https:', 'http:']
};

if (enforceHttps) {
  cspDirectives.upgradeInsecureRequests = [];
} else {
  // Explicitly disable Helmet's default upgrade directive on plain HTTP deployments.
  cspDirectives.upgradeInsecureRequests = null;
}

// Security Middleware
app.use(helmet({
  crossOriginOpenerPolicy: enforceHttps ? { policy: 'same-origin' } : false,
  originAgentCluster: enforceHttps,
  crossOriginResourcePolicy: false,
  hsts: enforceHttps ? undefined : false,
  contentSecurityPolicy: isDev ? false : {
    directives: cspDirectives
  }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: isDev ? 10000 : 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Specific rate limiter for login and password reset
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 auth requests per hour
  message: 'Too many authentication attempts, please try again after an hour'
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/forgotpassword', authLimiter);

app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DOS
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
// Custom middleware to sanitize NoSQL injections without overwriting search properties (fix for Express 5)
app.use('/api', (req, res, next) => {
  const options = { replaceWith: '_' };
  if (req.body) mongoSanitize.sanitize(req.body, options);
  if (req.params) mongoSanitize.sanitize(req.params, options);
  if (req.query) mongoSanitize.sanitize(req.query, options);
  if (req.headers) mongoSanitize.sanitize(req.headers, options);
  next();
});
app.use(paginationMiddleware);

// Static folder for uploads
app.use('/uploads', express.static(uploadDir));

// Serve Frontend in Production
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// API Routes (Preferred with /api prefix)
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admins', require('./routes/core/adminRoutes'));
app.use('/api/employees', employeeRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/whatsapp', whatsAppRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/memberships', require('./routes/operations/membershipRoutes'));
app.use('/api/categories', categoryRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/gst', require('./routes/finance/gstRoutes'));
app.use('/api/stats', require('./routes/finance/statsRoutes'));
app.use('/api/payroll', require('./routes/finance/payrollRoutes'));
app.use('/api/notifications', notificationRoutes);

// Fallback legacy routes (Handles cases where /api prefix is missing in Frontend URL)
app.use('/users', userRoutes);
app.use('/settings', settingsRoutes);
app.use('/roles', roleRoutes);
app.use('/admins', require('./routes/core/adminRoutes'));
app.use('/employees', employeeRoutes);
app.use('/clients', clientRoutes);
app.use('/services', serviceRoutes);
app.use('/rooms', roomRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leaves', leaveRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/expenses', expenseRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/whatsapp', whatsAppRoutes);
app.use('/branches', branchRoutes);
app.use('/memberships', require('./routes/operations/membershipRoutes'));
app.use('/categories', categoryRoutes);
app.use('/shifts', shiftRoutes);
app.use('/gst', require('./routes/finance/gstRoutes'));
app.use('/notifications', notificationRoutes);

// Root route / Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running...', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Central error handler (e.g. uploads / validation)
app.use((err, req, res, next) => {
  if (!err) return next();

  // Multer errors come through with a code
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Upload too large' });
  }

  // uploadMiddleware fileFilter errors
  if (typeof err.message === 'string' && err.message.startsWith('Unsupported upload type')) {
    return res.status(415).json({ message: err.message });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Internal Server Error' });
});

// Final Catch-all fallback (Pure API focus)
app.use((req, res) => {
  // If request is for an API route that doesn't exist
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint not found' });
  }

  // SPA fallback when frontend build exists.
  const indexFilePath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexFilePath)) {
    return res.sendFile(indexFilePath);
  }

  // Otherwise, show the clean API Sanctuary Status Page
  res.send(`
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
      body { margin: 0; padding: 0; background: #fdfaf7; color: #4a3728; font-family: 'Playfair Display', serif; }
      .container { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
      h1 { font-size: 3rem; margin-bottom: 0.5rem; font-weight: 700; }
      .tag { text-transform: uppercase; letter-spacing: 0.3em; font-size: 0.8rem; font-weight: 800; opacity: 0.5; }
      .status { margin-top: 2rem; padding: 1rem 2rem; border: 1px solid rgba(74, 55, 40, 0.1); border-radius: 1rem; background: white; box-shadow: 0 10px 30px rgba(74, 55, 40, 0.05); }
      .status p { margin: 0; font-style: italic; }
    </style>
    <div class="container">
      <h1>Zen CRM Sanctuary</h1>
      <p class="tag">API Portal is Active & Secure</p>
      <div class="status">
        <p>Status: Handshaking with Hostinger Frontend...</p>
      </div>
    </div>
  `);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections cleanly without cryptic timeouts
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Don't crash immediately in dev, let nodemon or subsequent requests handle it
  // This prevents cryptic 'Timeout._onTimeout' from hanging the terminal
});
