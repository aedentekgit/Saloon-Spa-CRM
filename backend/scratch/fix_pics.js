const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const employeeSchema = new mongoose.Schema({
  name: String,
  profilePic: String
});

const Employee = mongoose.model('Employee', employeeSchema);

const uploadDirName = path.basename(process.env.UPLOAD_DIR || '');

const normalizeUploadPath = (value = '') => {
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

  return clean ? `uploads/${clean}` : '';
};

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const employees = await Employee.find({ profilePic: { $exists: true, $ne: '' } });
  
  for (const emp of employees) {
    const normalized = normalizeUploadPath(emp.profilePic);
    if (normalized && normalized !== emp.profilePic) {
      console.log(`Fixing ${emp.name}: ${emp.profilePic} -> ${normalized}`);
      emp.profilePic = normalized;
      await emp.save();
    }
  }
  
  await mongoose.disconnect();
}

fix();
