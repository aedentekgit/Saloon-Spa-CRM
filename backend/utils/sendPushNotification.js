const admin = require('firebase-admin');
const Settings = require('../models/core/Settings');

/**
 * Sends a push notification to a list of tokens or a specific user's registered tokens
 * @param {Object} options - { title, body, tokens, data }
 */
const sendPushNotification = async ({ title, body, tokens, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) return { success: false, message: 'No tokens provided' };

    const settings = await Settings.findOne();
    if (!settings || !settings.notifications.pushEnabled) {
      return { success: false, message: 'Push notifications disabled in settings' };
    }

    // Initialize Firebase Admin if not already initialized
    if (admin.apps.length === 0) {
      if (!settings.notifications.firebaseProjectId || !settings.notifications.firebasePrivateKey || !settings.notifications.firebaseClientEmail) {
        return { success: false, message: 'Firebase Admin not configured' };
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: settings.notifications.firebaseProjectId,
          privateKey: settings.notifications.firebasePrivateKey.replace(/\\n/g, '\n'),
          clientEmail: settings.notifications.firebaseClientEmail,
        }),
      });
    }

    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // for mobile
      },
      tokens: Array.isArray(tokens) ? tokens : [tokens],
    };

    const response = await admin.messaging().sendMulticast(message);
    
    // Clean up failed tokens if needed (optional)
    if (response.failureCount > 0) {
      console.log(`${response.failureCount} push notifications failed.`);
    }

    return { success: true, response };
  } catch (error) {
    console.error('Push Notification Error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = sendPushNotification;
