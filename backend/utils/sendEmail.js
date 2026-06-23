const nodemailer = require('nodemailer');
const Settings = require('../models/core/Settings');
const { decrypt } = require('./secretCrypto');

const sendEmail = async (options) => {
  // Fetch settings from database
  const settings = await Settings.findOne();
  
  const smtpConfig = settings && settings.smtp && settings.smtp.host 
    ? {
        host: settings.smtp.host,
        port: settings.smtp.port,
        auth: {
          user: settings.smtp.user,
          pass: decrypt(settings.smtp.password)
        },
        fromName: settings.smtp.fromName,
        fromEmail: settings.smtp.fromEmail,
        encryption: settings.smtp.encryption
      }
    : {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        fromName: process.env.FROM_NAME,
        fromEmail: process.env.FROM_EMAIL,
        encryption: process.env.EMAIL_ENCRYPTION || 'tls'
      };

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.encryption === 'ssl' || smtpConfig.port === 465,
    auth: smtpConfig.auth
  });

  const message = {
    from: `${smtpConfig.fromName || 'SaloonSpaCRM'} <${smtpConfig.fromEmail || 'noreply@saloonspacrm.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
