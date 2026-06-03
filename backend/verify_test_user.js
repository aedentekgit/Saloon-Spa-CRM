require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/core/User');
const Employee = require('./models/human-resources/Employee');
const { resolveRoleAccess, normalizeAuthRole, ACCOUNT_SOURCES } = require('./utils/authIdentity');

const findTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully connected to MongoDB Staging.\n');
        
        let found = null;
        let source = '';

        // Search Users
        const user = await User.findOne({ name: new RegExp('^Test From', 'i') });
        if (user) {
            found = user;
            source = user.role === 'Client' ? ACCOUNT_SOURCES.CLIENT : ACCOUNT_SOURCES.USER;
        }

        // Search Employees if not found in User
        if (!found) {
            const emp = await Employee.findOne({ name: new RegExp('^Test From', 'i') });
            if (emp) {
                found = emp;
                source = ACCOUNT_SOURCES.EMPLOYEE;
            }
        }

        if (!found) {
            console.log('No user or employee starting with "Test From" was found.');
            console.log('Listing all employees to see if there is a match:');
            const allEmps = await Employee.find().select('name email role');
            console.log(allEmps);
            
            console.log('Listing all users:');
            const allUsers = await User.find().select('name email role');
            console.log(allUsers);
            
            process.exit();
        }

        console.log('=== FOUND USER/EMPLOYEE DETAILS ===');
        console.log(`ID: ${found._id}`);
        console.log(`Name: ${found.name}`);
        console.log(`Email: ${found.email}`);
        console.log(`Stored Role: ${found.role}`);
        console.log(`Collection/Source: ${source}`);
        console.log(`Is Active: ${found.isActive}`);
        
        const effectiveRole = normalizeAuthRole(found.role, source);
        console.log(`Normalized/Effective Role: ${effectiveRole}`);

        const roleAccess = await resolveRoleAccess(effectiveRole);
        console.log(`Role is Active: ${roleAccess.isActive}`);
        console.log(`Assigned Permissions: ${JSON.stringify(roleAccess.permissions)}`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

findTestUser();
