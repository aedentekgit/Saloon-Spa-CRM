const User = require('../../models/core/User');
const Employee = require('../../models/human-resources/Employee');
const Role = require('../../models/human-resources/Role');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../../utils/sendEmail');
const { getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { hasAssignedBranch } = require('../../utils/branch');
const { DEFAULT_ROLE_PERMISSIONS } = require('../../utils/permissions');

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

const getEffectiveRole = (user, type) => {
  let effectiveRole = user.role || type;
  if (type === 'Employee') effectiveRole = 'Employee';
  if (type === 'Client') effectiveRole = 'Client';
  return effectiveRole;
};

const resolvePermissionsForRole = async (role) => {
  const roleData = await Role.findOne({ name: role });
  const isInactive = roleData && (roleData.status === 'Inactive' || roleData.isActive === false);

  return {
    roleData,
    isActive: !isInactive,
    permissions: role === 'Admin'
      ? ['*']
      : (roleData ? (roleData.permissions || []) : (DEFAULT_ROLE_PERMISSIONS[role] || []))
  };
};

// Helper to find user across models
const findUserByEmail = async (email) => {
  let user = await User.findOne({ email }).select('+password');
  let type = 'User';

  if (user && user.role === 'Client') {
    type = 'Client';
  }

  if (!user) {
    user = await Employee.findOne({ email }).select('+password');
    type = 'Employee';
  }

  return { user, type };
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

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
      phone,
      role: 'Client', // Public registration is always for Clients
      verificationToken,
      verificationTokenExpires,
      isEmailVerified: false
    });

    if (user) {
      // Send verification email
      const verificationUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;
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

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid login payload' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { user, type } = await findUserByEmail(normalizedEmail);

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

    const effectiveRole = getEffectiveRole(user, type);
    user.role = effectiveRole;

    if (!hasAssignedBranch(user)) {
      return res.status(403).json({ message: 'Access Denied: Branch assignment required for this role.' });
    }

    const { isActive: roleIsActive, permissions } = await resolvePermissionsForRole(effectiveRole);
    if (!roleIsActive && effectiveRole !== 'Admin') {
      return res.status(403).json({ message: 'Role is inactive' });
    }

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

  const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
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
    if (!u) u = await Employee.findOne({ verificationToken: token, verificationTokenExpires: { $gt: Date.now() } });
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
      const effectiveRole = getEffectiveRole(user, type);
      const { permissions } = await resolvePermissionsForRole(effectiveRole);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        permissions,
        branch: user.branch,
        phone: user.phone,
        dob: user.dob,
        address: user.address,
        profilePic: user.profilePic
      });
    } else {
      res.status(404).json({ message: 'User found but details missing' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { user } = await findUserByEmail(req.user.email);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.dob = req.body.dob || user.dob;
      user.address = req.body.address || user.address;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        dob: updatedUser.dob,
        address: updatedUser.address,
        profilePic: updatedUser.profilePic
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { user } = await findUserByEmail(req.user.email);

    if (user) {
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      user.password = req.body.newPassword;
      await user.save();

      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/upload-profile-pic
// @access  Private
exports.uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const { user } = await findUserByEmail(req.user.email);

    if (user) {
      user.profilePic = getStoredFilePath(req.file);
      await user.save();

      res.json({
        message: 'Profile picture uploaded successfully',
        profilePic: user.profilePic
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update FCM Token
// @route   POST /api/users/fcm-token
// @access  Private
exports.updateFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.sendStatus(404);

    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }

    res.json({ success: true });
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
