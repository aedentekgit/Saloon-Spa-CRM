const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updateFcmToken,
  updateUserProfile,
  changePassword,
  uploadProfilePic
} = require('../../controllers/core/userController');
const { protect } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.post('/upload-profile-pic', protect, upload.single('image'), uploadProfilePic);
router.post('/fcm-token', protect, updateFcmToken);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/verify/:token', verifyEmail);

module.exports = router;
