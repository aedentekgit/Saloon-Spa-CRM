const admin = require('firebase-admin');
const Settings = require('../models/Settings');

let firebaseApp = null;

const initializeFirebase = async () => {
  try {
    if (firebaseApp) return firebaseApp;

    const settings = await Settings.findOne();
    if (!settings || !settings.notifications.pushEnabled) {
      return null;
    }

    const { 
      firebaseProjectId, 
      firebaseClientEmail, 
      firebasePrivateKey,
      firebaseServiceAccount 
    } = settings.notifications;

    let serviceAccount;

    if (firebaseServiceAccount) {
      try {
        serviceAccount = JSON.parse(firebaseServiceAccount);
      } catch (e) {
        console.error('Invalid Firebase Service Account JSON');
      }
    }

    if (!serviceAccount && firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
      serviceAccount = {
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
      };
    }

    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
      return firebaseApp;
    }

    return null;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    return null;
  }
};

const sendNotification = async (token, title, body, data = {}) => {
  try {
    const app = await initializeFirebase();
    if (!app) {
      console.log('Firebase not initialized, skipping notification');
      return;
    }

    const message = {
      notification: { title, body },
      data: data,
      token: token
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

module.exports = { initializeFirebase, sendNotification };
