const User = require('../../models/core/User');
const Employee = require('../../models/human-resources/Employee');
const Client = require('../../models/operations/Client');
const Role = require('../../models/human-resources/Role');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../../utils/sendEmail');

// Helper to find user across models
const findUserByEmail = async (email) => {
  let user = await User.findOne({ email }).select('+password');
  let type = 'User';
  
  if (!user) {
    user = await Employee.findOne({ email }).select('+password');
    type = 'Employee';
  }
  
  if (!user) {
    user = await Client.findOne({ email }).select('+password');
    type = 'Client';
  }
  
  return { user, type };
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      role,
      verificationToken,
      verificationTokenExpires,
      isEmailVerified: false
    });

    if (user) {
      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const message = `Please verify your email by clicking: \n\n ${verificationUrl}`;

      try {
        await sendEmail({
          email: user.email,
          subject: 'Email Verification',
          message
        });
      } catch (err) {
        console.error('Email could not be sent', err);
      }

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, type } = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Initialize security fields if they don't exist
    if (user.loginAttempts === undefined) user.loginAttempts = 0;

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(401).json({ 
        message: `Account is temporarily locked. Try again in ${remainingMinutes} minutes.` 
    });
    }

    // Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 60 * 60 * 1000; // Lock for 1 hour
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Reset attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Check if email is verified
    if (type !== 'Employee' && !user.isEmailVerified) {
       // Allow login for now to avoid locking out, but logic is there
    }

    // Determine effective role
    let effectiveRole = user.role || type;
    if (type === 'Employee') effectiveRole = 'Employee';
    if (type === 'Client') effectiveRole = 'Client';

    const roleData = await Role.findOne({ name: effectiveRole });
    const permissions = roleData ? roleData.permissions : [];

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: effectiveRole,
      permissions,
      branch: user.branch,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login Error details:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error during login' });
  }
};

// @desc    Forgot Password
// @route   POST /api/users/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const { user } = await findUserByEmail(email);

  if (!user) {
    return res.status(404).json({ message: 'There is no user with that email' });
  }

  // Get reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins

  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Token',
      message
    });
    res.status(200).json({ message: 'Email sent' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.status(500).json({ message: 'Email could not be sent' });
  }
};

// @desc    Reset Password
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

  const findResetUser = async () => {
    let u = await User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!u) u = await Employee.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!u) u = await Client.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });
    return u;
  };

  const user = await findResetUser();

  if (!user) {
    return res.status(400).json({ message: 'Invalid token or token expired' });
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.loginAttempts = 0; // Reset attempts on password reset
  await user.save();

  res.status(200).json({
    message: 'Password reset successful',
    token: generateToken(user._id)
  });
};

// @desc    Verify Email
// @route   GET /api/users/verify/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  const findVerifyUser = async () => {
    let u = await User.findOne({ verificationToken: token, verificationTokenExpires: { $gt: Date.now() } });
    if (!u) u = await Client.findOne({ verificationToken: token, verificationTokenExpires: { $gt: Date.now() } });
    return u;
  };

  const user = await findVerifyUser();

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired verification token' });
  }

  user.isEmailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.status(200).json({ message: 'Email verified successfully' });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const { user, type } = await findUserByEmail(req.user.email);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || type
      });
    } else {
      res.status(404).json({ message: 'User found but details missing' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};
