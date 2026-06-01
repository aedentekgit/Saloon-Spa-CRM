require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/core/User');

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const email = 'employee@gmail.com';
    const user = await User.findOne({ email }).select('+password');
    if (user) {
      console.log('Found in User, testing passwords:');
      const passwords = ['employee', 'password', '12345678', 'employee123'];
      for (const p of passwords) {
         if (await user.matchPassword(p)) {
             console.log(`Password is: ${p}`);
         }
      }
    }
    mongoose.connection.close();
  } catch (error) {
    console.error(error);
  }
};
checkUser();
