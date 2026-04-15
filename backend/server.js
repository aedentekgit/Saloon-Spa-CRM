require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const path = require('path');
const paginationMiddleware = require('./middleware/paginationMiddleware');

// Route files
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const roleRoutes = require('./routes/roleRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const clientRoutes = require('./routes/clientRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const roomRoutes = require('./routes/roomRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const whatsAppRoutes = require('./routes/whatsAppRoutes');
const branchRoutes = require('./routes/branchRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const shiftRoutes = require('./routes/shiftRoutes');

// Connect to database
connectDB();

const app = express();

// Standard Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
})); 
// app.use(mongoSanitize()); // Prevent NoSQL injection

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased from 100 to 1000 for SPA robustness
  message: 'Too many requests from this IP, please try again after 15 minutes'
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
app.use(paginationMiddleware);

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend in Production
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// API Routes (Preferred with /api prefix)
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admins', require('./routes/adminRoutes'));
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
app.use('/api/memberships', require('./routes/membershipRoutes'));
app.use('/api/categories', categoryRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/gst', require('./routes/gstRoutes'));

// Fallback legacy routes (Handles cases where /api prefix is missing in Frontend URL)
app.use('/users', userRoutes);
app.use('/settings', settingsRoutes);
app.use('/roles', roleRoutes);
app.use('/admins', require('./routes/adminRoutes'));
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
app.use('/memberships', require('./routes/membershipRoutes'));
app.use('/categories', categoryRoutes);
app.use('/shifts', shiftRoutes);
app.use('/gst', require('./routes/gstRoutes'));

// Root route / Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running...', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Final Catch-all fallback (Pure API focus)
app.use((req, res) => {
  // If request is for an API route that doesn't exist
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint not found' });
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
