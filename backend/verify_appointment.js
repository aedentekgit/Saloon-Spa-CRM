require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/core/User');

const inspectReferrer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const referrer = await User.findById('6a2a5040f54fa2ab1f17749a');
    if (referrer) {
      console.log('Referrer ID:', referrer._id);
      console.log('Referrer Name:', referrer.name);
      console.log('Referrer Code:', referrer.referralCode);
    } else {
      console.log('Referrer not found!');
    }
    process.exit();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

inspectReferrer();
