require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/human-resources/Employee');

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const email = 'employee@gmail.com';
    const employee = await Employee.findOne({ email }).select('+password').populate('branch');
    if (employee) {
      console.log('Found in Employee:', employee);
      // Let's test their password too
      const p = '12345678'; // 8 dots in screenshot
      if (employee.password) {
         console.log('Password match 12345678:', await employee.matchPassword('12345678'));
         console.log('Password match employee:', await employee.matchPassword('employee'));
         console.log('Password match password:', await employee.matchPassword('password'));
      } else {
         console.log('Password field is missing or empty on Employee record');
      }
    } else {
      console.log('Not found in Employee collection');
    }
    mongoose.connection.close();
  } catch (error) {
    console.error(error);
  }
};
checkUser();
