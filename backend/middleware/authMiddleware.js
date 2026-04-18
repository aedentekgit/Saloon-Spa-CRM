const jwt = require('jsonwebtoken');
const User = require('../models/core/User');
const Employee = require('../models/human-resources/Employee');
const Client = require('../models/operations/Client');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token, populate branch for filtering
      req.user = await User.findById(decoded.id).select('-password').populate('branch');
      
      if (!req.user) {
        req.user = await Employee.findById(decoded.id).select('-password');
        if (req.user) req.user.role = 'Employee'; // Set role for middleware
      }
      
      if (!req.user) {
        req.user = await Client.findById(decoded.id).select('-password');
        if (req.user) req.user.role = 'Client'; // Set role for middleware
      }

      // Check if email is verified (skip for Employees as they are often added by admin)
      if (req.user && req.user.role !== 'Employee' && req.user.role !== 'Admin' && !req.user.isEmailVerified) {
        // Uncomment the line below to strictly enforce email verification
        // return res.status(401).json({ message: 'Please verify your email to access this resource' });
      }

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError' || error.message === 'jwt expired') {
        console.warn('Auth Warning: Session expired (JWT)');
      } else {
        console.error(`Auth Error: ${error.message}`);
      }
      return res.status(401).json({ message: 'Not authorized' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

const manager = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized: Manager access required' });
  }
};

module.exports = { protect, admin, manager };
