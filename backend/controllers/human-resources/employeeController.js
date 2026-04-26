const Employee = require('../../models/human-resources/Employee');
const Branch = require('../../models/operations/Branch');
const path = require('path');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');
const mongoose = require('mongoose');

const toObjectIdIfValid = (value) => {
  if (!value) return value;
  const id = getBranchId(value);
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyEmployeeSearch = async (query, search, { includePayrollFields = false } = {}) => {
  const searchTerm = String(search || '').trim();
  if (!searchTerm) return query;

  const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
  const matchingBranches = await Branch.find({ name: searchRegex }).select('_id').lean();
  const branchIds = matchingBranches.map(branch => branch._id);

  query.$or = [
    { name: searchRegex },
    { role: searchRegex },
    { email: searchRegex },
    { phone: searchRegex },
    { address: searchRegex },
    { status: searchRegex },
    { shift: searchRegex },
    { shiftType: searchRegex },
    { services: searchRegex },
    { 'documents.name': searchRegex },
    { 'documents.fileType': searchRegex },
    { 'documents.url': searchRegex }
  ];

  if (includePayrollFields) {
    query.$or.push({ 'payroll.type': searchRegex });
  }

  const normalizedSearch = searchTerm.toLowerCase();
  if (['verified', 'email verified', 'true', 'yes'].includes(normalizedSearch)) {
    query.$or.push({ isEmailVerified: true });
  } else if (['unverified', 'not verified', 'false', 'no'].includes(normalizedSearch)) {
    query.$or.push({ isEmailVerified: false });
  } else if (['locked', 'blocked'].includes(normalizedSearch)) {
    query.$or.push({ lockUntil: { $gt: new Date() } });
  }

  if (branchIds.length > 0) {
    query.$or.push({ branch: { $in: branchIds } });
  }

  const numericSearch = Number(searchTerm);
  if (Number.isFinite(numericSearch)) {
    query.$or.push(
      { earnings: numericSearch },
      { attendance: numericSearch }
    );

    if (includePayrollFields) {
      query.$or.push(
        { salary: numericSearch },
        { 'payroll.baseAmount': numericSearch },
        { 'payroll.otRate': numericSearch },
        { 'payroll.shiftHours': numericSearch }
      );
    }
  }

  const dateSearch = new Date(searchTerm);
  if (!Number.isNaN(dateSearch.getTime())) {
    const startOfDay = new Date(dateSearch);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateSearch);
    endOfDay.setHours(23, 59, 59, 999);

    query.$or.push(
      { dob: { $gte: startOfDay, $lte: endOfDay } },
      { joiningDate: { $gte: startOfDay, $lte: endOfDay } },
      { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      { lockUntil: { $gte: startOfDay, $lte: endOfDay } },
      { 'documents.uploadedAt': { $gte: startOfDay, $lte: endOfDay } }
    );
  }

  return query;
};

// @desc    Get public employee list (for guest booking — no auth required)
// @route   GET /api/employees/public
// @access  Public
exports.getPublicEmployees = async (req, res) => {
  try {
    const query = { status: 'Active' };
    if (req.query.branch) query.branch = toObjectIdIfValid(req.query.branch);
    const employees = await Employee.find(query)
      .select('name role shift branch services status')
      .populate('branch', 'name _id')
      .sort({ name: 1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
exports.getEmployees = async (req, res) => {
  try {
    let query = {};
    let select;
    const userBranchId = getBranchId(req.user?.branch);

    // Filters
    if (req.query.branch && req.query.branch !== 'all') {
      query.branch = toObjectIdIfValid(req.query.branch);
    }
    
    await applyEmployeeSearch(query, req.query.search, {
      includePayrollFields: req.user?.role === 'Admin' || req.user?.role === 'Manager'
    });
    
    // IDOR Prevention (Overrides query filter if not Admin)
    if (req.user) {
      if (req.user.role === 'Admin') {
        // Global Admin can filter by any branch provided in req.query
      } else if (req.user.role === 'Manager' || req.user.role === 'Employee') {
        // Managers and Employees are locked to their branch
        if (userBranchId) {
          query.branch = toObjectIdIfValid(userBranchId);
        }
      } else if (req.user.role === 'Client') {
        query.status = 'Active';
        if (userBranchId) {
          query.branch = toObjectIdIfValid(userBranchId);
        }
      }
    } else {
        query.status = 'Active';
    }

    // Non-admin roles should not receive payroll/salary fields.
    if (!req.user || req.user.role === 'Employee' || req.user.role === 'Client') {
      select = 'name role phone email profilePic services attendance earnings status shift shiftType branch joiningDate createdAt';
    }

    const { data, pagination } = await paginateModelQuery(Employee, query, req, {
      select,
      populate: 'branch',
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an employee
// @route   POST /api/employees
// @access  Private/Manager
exports.createEmployee = async (req, res) => {
  try {
    const { name, role, email, phone, address, salary, services, password, joiningDate, branch } = req.body;
    
    // IDOR Check: Manager can only create employees for their OWN branch
    const userBranchId = getBranchId(req.user.branch);
    const selectedBranch = getBranchId(branch) || userBranchId;
    if (req.user.role !== 'Admin' && !sameBranch(selectedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: You can only create employees for your own branch.' });
    }


    let profilePic = '';
    if (req.files && req.files.profilePic) {
      profilePic = req.files.profilePic[0].path || req.files.profilePic[0].url;
    }

    // Generate Employee ID (EMP0001 format)
    const lastEmployee = await Employee.findOne({ employeeId: { $exists: true } })
      .sort({ employeeId: -1 });
    
    let nextEmployeeId = 'EMP0001';
    if (lastEmployee && lastEmployee.employeeId) {
      const lastIdMatch = lastEmployee.employeeId.match(/\d+/);
      if (lastIdMatch) {
        const nextNumber = parseInt(lastIdMatch[0], 10) + 1;
        nextEmployeeId = `EMP${nextNumber.toString().padStart(4, '0')}`;
      }
    }

    const employee = await Employee.create({
      name,
      role,
      email,
      phone,
      address,
      salary,
      joiningDate,
      services: services ? (typeof services === 'string' ? JSON.parse(services) : services) : [],
      profilePic,
      password,
      branch: selectedBranch,
      employeeId: nextEmployeeId,
      payroll: req.body.payroll ? (typeof req.body.payroll === 'string' ? JSON.parse(req.body.payroll) : req.body.payroll) : {
        type: 'Monthly',
        baseAmount: 0,
        otRate: 0,
        shiftHours: 8
      },
      shift: req.body.shift || '',
      shiftType: req.body.shiftType || 'Day'
    });

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an employee
// @route   PUT /api/employees/:id
// @access  Private/Manager
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // IDOR Check
    const isSelf = employee.email === req.user.email;
    const isBranchManager = req.user.role === 'Manager' && sameBranch(employee.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager && !isSelf) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this employee record.' });
    }

    const { name, role, email, phone, address, salary, services, status, password, joiningDate, branch } = req.body;

    employee.name = name || employee.name;
    employee.role = role || employee.role;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.address = address || employee.address;
    
    // Restricted fields for non-admin/managers
    if (isAdmin || isBranchManager) {
      employee.salary = salary !== undefined ? salary : employee.salary;
      employee.status = status || employee.status;
      employee.joiningDate = joiningDate || employee.joiningDate;
      employee.branch = (isAdmin && branch) ? branch : employee.branch;
      employee.payroll = req.body.payroll ? (typeof req.body.payroll === 'string' ? JSON.parse(req.body.payroll) : req.body.payroll) : employee.payroll;
    }

    employee.shift = req.body.shift !== undefined ? req.body.shift : employee.shift;
    employee.shiftType = req.body.shiftType || employee.shiftType;

    if (password) {
      employee.password = password;
    }
    
    if (services) {
      employee.services = typeof services === 'string' ? JSON.parse(services) : services;
    }

    if (req.files && req.files.profilePic) {
      if (employee.profilePic) {
        await deleteFile(employee.profilePic);
      }
      employee.profilePic = req.files.profilePic[0].path || req.files.profilePic[0].url;
    }

    const updatedEmployee = await employee.save();
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // IDOR Check
    const isBranchManager = req.user.role === 'Manager' && sameBranch(employee.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this employee record.' });
    }

    if (employee.profilePic) {
      await deleteFile(employee.profilePic);
    }
    
    if (employee.documents && employee.documents.length > 0) {
      for (const doc of employee.documents) {
        await deleteFile(doc.url);
      }
    }

    await employee.deleteOne();
    res.json({ message: 'Employee removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload document
// @route   POST /api/employees/:id/documents
// @access  Private/Manager
exports.uploadDocument = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // IDOR Check
    const isSelf = employee.email === req.user.email;
    const isBranchManager = req.user.role === 'Manager' && sameBranch(employee.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager && !isSelf) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { name, fileType } = req.body;
    const documentUrl = req.file.path || req.file.url;

    const newDocument = {
      name: name || req.file.originalname,
      url: req.file.filename ? `uploads/${req.file.filename}` : (req.file.path || req.file.url),
      fileType: fileType || path.extname(req.file.originalname).substring(1),
      uploadedAt: new Date()
    };

    employee.documents.push(newDocument);
    await employee.save();

    res.status(201).json(employee.documents[employee.documents.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete document
// @route   DELETE /api/employees/:id/documents/:docId
// @access  Private/Manager
exports.deleteDocument = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // IDOR Check
    const isSelf = employee.email === req.user.email;
    const isBranchManager = req.user.role === 'Manager' && sameBranch(employee.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager && !isSelf) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const doc = employee.documents.find(d => d._id.toString() === req.params.docId);
    if (doc) {
      await deleteFile(doc.url);
    }

    employee.documents = employee.documents.filter(doc => doc._id.toString() !== req.params.docId);
    await employee.save();

    res.json({ message: 'Document removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
