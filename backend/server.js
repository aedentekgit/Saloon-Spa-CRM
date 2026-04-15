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

// Routes
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

// Root route / Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running...', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Catch-all route to serve the frontend index.html
app.get('*splat', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Frontend build not found. Please run build script.');
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
