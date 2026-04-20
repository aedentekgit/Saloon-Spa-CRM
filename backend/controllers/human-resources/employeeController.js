const Employee = require('../../models/human-resources/Employee');
const path = require('path');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// @desc    Get public employee list (for guest booking — no auth required)
// @route   GET /api/employees/public
// @access  Public
exports.getPublicEmployees = async (req, res) => {
  try {
    const query = { status: 'Active' };
    if (req.query.branch) query.branch = req.query.branch;
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
      query.branch = req.query.branch;
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { role: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // IDOR Prevention (Overrides query filter if not Admin)
    if (req.user) {
      if (req.user.role === 'Admin') {
        // Global Admin can filter by any branch provided in req.query
      } else if (req.user.role === 'Manager' || req.user.role === 'Employee') {
        // Managers and Employees are locked to their branch
        if (userBranchId) {
          query.branch = userBranchId;
        }
      } else if (req.user.role === 'Client') {
        query.status = 'Active';
        if (userBranchId) {
          query.branch = userBranchId;
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
      url: documentUrl,
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
