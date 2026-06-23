const axios = require('axios');
const Settings = require('../models/core/Settings');
const { decrypt } = require('./secretCrypto');

/**
 * Sends a WhatsApp message via UltraMsg or equivalent gateway
 * @param {string} to - Phone number with country code (e.g. 919876543210)
 * @param {string} body - Message text
 */
const sendWhatsApp = async (to, body) => {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.whatsapp || !settings.whatsapp.enabled) {
      console.log('WhatsApp messaging is disabled or not configured.');
      return { success: false, message: 'Messaging disabled' };
    }

    const { instanceId, token, provider } = settings.whatsapp;
    const apiToken = decrypt(token);

    if (!instanceId || !apiToken) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Default to UltraMsg format
    // Documentation: https://docs.ultramsg.com/
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    
    // Ensure phone number has country code but no '+' or spaces
    const cleanTo = to.replace(/[^0-9]/g, '');

    const response = await axios.post(url, {
      token: apiToken,
      to: cleanTo,
      body: body,
      priority: 10
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return { 
      success: true, 
      id: response.data?.id || response.data?.messageId, 
      status: response.data?.status || 'sent' 
    };

  } catch (error) {
    console.error('WhatsApp Gateway Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
};

module.exports = sendWhatsApp;
