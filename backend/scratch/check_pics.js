const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const employeeSchema = new mongoose.Schema({
  name: String,
  profilePic: String
});

const Employee = mongoose.model('Employee', employeeSchema);

const apiUrl = process.env.PUBLIC_API_URL || process.env.VITE_API_URL || 'https://saloonandspacrm.aedentek.com/staging_saloon_spa_crm/api';
const apiBaseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
const uploadDirName = path.basename(process.env.UPLOAD_DIR || '');

const getPublicUploadUrl = (value = '') => {
  const original = String(value || '').trim();
  if (!original || /^(https?:|data:|blob:)/i.test(original)) return original;

  let clean = original.replace(/\\/g, '/').replace(/^file:\/+/i, '').replace(/^\.?\//, '');
  const uploadsIndex = clean.toLowerCase().lastIndexOf('/uploads/');
  if (uploadsIndex !== -1) {
    clean = clean.slice(uploadsIndex + '/uploads/'.length);
  }

  clean = clean.replace(/^uploads\//i, '');
  if (uploadDirName && clean.toLowerCase().startsWith(`${uploadDirName.toLowerCase()}/`)) {
    clean = clean.slice(uploadDirName.length + 1);
  }

  return clean ? `${apiBaseUrl}/uploads/${clean}` : '';
};

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const employees = await Employee.find({ profilePic: { $exists: true, $ne: '' } });
  console.log('Employees with profile pictures:');
  employees.forEach(emp => {
    console.log(`- ${emp.name}: ${emp.profilePic} -> ${getPublicUploadUrl(emp.profilePic)}`);
  });
  await mongoose.disconnect();
}

check();
