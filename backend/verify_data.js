require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/core/User');
const Room = require('./models/operations/Room');
const Branch = require('./models/operations/Branch');

const verifyDataForUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ email: 'admin@gmail.com' });
        console.log('Admin Branch:', admin.branch);

        const rooms = await Room.find().populate('branch');
        console.log('Total Rooms in DB:', rooms.length);
        
        rooms.forEach((r, i) => {
            console.log(`Room ${i+1}: ${r.name} | Branch: ${r.branch?._id || r.branch} | Active: ${r.isActive}`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

verifyDataForUser();
