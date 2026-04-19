const nodemailer = require('nodemailer');

async function test() {
  const host = 'smtp-relay.brevo.com';
  const port = 587;
  const user = '81cf02003@smtp-brevo.com';
  const pass = 'vdNYqKaR1sETUwz8'; // From user screenshot
  const target = 'contact@ungalsulthan.com'; // From user screenshot

  console.log('Starting SMTP test...');
  
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // Port 587 should be false
    auth: {
      user,
      pass
    },
    debug: true,
    logger: true
  });

  try {
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('Connection verified successfully.');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"Sanctuary Test" <${user}>`,
      to: target,
      subject: 'Sanctuary SMTP Diagnostic',
      text: 'Final verification of the SMTP gateway.'
    });

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('SMTP Error:', error);
  }
}

test();
