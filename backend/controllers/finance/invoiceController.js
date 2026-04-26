const Invoice = require('../../models/finance/Invoice');
const User = require('../../models/core/User');
const Employee = require('../../models/human-resources/Employee');
const Service = require('../../models/operations/Service');
const Branch = require('../../models/operations/Branch');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    
    // IDOR Prevention
    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = requestedBranch;
      }
    } else if (req.user.role === 'Manager' || req.user.role === 'Employee') {
      if (userBranchId) {
        query.branch = userBranchId;
      }
    } else if (req.user.role === 'Client') {
      // Clients only see their own invoices
      query.$or = [
        { user: req.user._id },
        { clientId: req.user._id }
      ];
    }

    const { search, paymentMode, startDate, endDate } = req.query;

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = String(startDate);
      if (endDate) query.date.$lte = String(endDate);
    }

    if (search) {
      const rx = new RegExp(escapeRegex(String(search)), 'i');
      const matchingBranches = await Branch.find({ name: rx }).select('_id').lean();
      const branchIds = matchingBranches.map(branch => branch._id);

      const searchOr = [
        { invoiceNumber: rx },
        { clientName: rx },
        { paymentMode: rx },
        { 'items.name': rx },
        { 'payments.mode': rx },
        { date: rx }
      ];

      if (branchIds.length > 0) {
        searchOr.push({ branch: { $in: branchIds } });
      }

      const numericSearch = Number(search);
      if (Number.isFinite(numericSearch)) {
        searchOr.push(
          { subtotal: numericSearch },
          { gst: numericSearch },
          { discount: numericSearch },
          { total: numericSearch },
          { 'items.price': numericSearch },
          { 'payments.amount': numericSearch }
        );
      }

      if (query.$or) {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: existingOr }, { $or: searchOr }];
      } else {
        query.$or = searchOr;
      }
    }

    const { data, pagination } = await paginateModelQuery(Invoice, query, req, {
      populate: 'branch',
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  const { 
    invoiceNumber,
    clientId,
    clientName, 
    items, 
    subtotal, 
    gst, 
    discount, 
    total, 
    paymentMode, 
    payments,
    date,
    branch 
  } = req.body;

  try {
    const userBranchId = getBranchId(req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    const isClient = req.user.role === 'Client';
    const requestedBranch = getBranchId(branch) || userBranchId;

    if (isClient) {
      return res.status(403).json({ message: 'Access Denied: Clients cannot create invoices.' });
    }

    if (!requestedBranch) {
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    if (!isAdmin && !sameBranch(requestedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot create invoices for another branch.' });
    }

    let targetClientId = clientId || undefined;
    if (targetClientId) {
      const targetClient = await User.findById(targetClientId).select('_id role branch');
      if (!targetClient || targetClient.role !== 'Client') {
        return res.status(400).json({ message: 'Invalid client selection for invoice.' });
      }
      if (!isAdmin && targetClient.branch && !sameBranch(targetClient.branch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Selected client belongs to another branch.' });
      }
    }

    // Generate Invoice Number (Prefix + 0001 format)
    const branchDoc = await Branch.findById(requestedBranch);
    if (!branchDoc) return res.status(400).json({ message: 'Invalid branch' });
    
    const prefix = branchDoc.name.substring(0, 2).toUpperCase();
    const lastInvoice = await Invoice.findOne({ branch: requestedBranch, invoiceNumber: new RegExp(`^${prefix}`) })
      .sort({ createdAt: -1 });
    
    let nextInvoiceNumber;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastIdMatch = lastInvoice.invoiceNumber.match(/\d+/);
      if (lastIdMatch) {
        const nextNumber = parseInt(lastIdMatch[0], 10) + 1;
        nextInvoiceNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
      } else {
        nextInvoiceNumber = `${prefix}0001`;
      }
    } else {
      nextInvoiceNumber = `${prefix}0001`;
    }

    const invoice = await Invoice.create({
      user: targetClientId || req.user._id,
      clientId: targetClientId,
      invoiceNumber: nextInvoiceNumber,
      clientName,
      items,
      subtotal,
      gst,
      discount,
      total,
      paymentMode,
      payments,
      date,
      branch: requestedBranch
    });
    
    // Auto-update Employee Earnings and Inventory Stock
    if (items && Array.isArray(items)) {
      const Inventory = require('../../models/inventory/Inventory');
      for (const item of items) {
        const service = await Service.findOne({ name: item.name }).populate('inventoryUsage.inventoryItem');
        
        // 1. Commission Logic
        if (item.specialist) {
           const employee = await Employee.findById(item.specialist);
           if (employee) {
              let commission = 0;
              const itemTotal = item.price * (item.quantity || 1);
              
              if (item.commission) {
                 commission = item.commission;
              } else if (service) {
                 if (service.commissionType === 'Percentage') {
                    commission = (itemTotal * service.commissionValue) / 100;
                 } else {
                    commission = service.commissionValue || 0;
                 }
              }
              
              employee.earnings = (employee.earnings || 0) + commission;
              await employee.save();
           }
        }

        // 2. Inventory Depletion Logic
        if (service && service.inventoryUsage && service.inventoryUsage.length > 0) {
           for (const usage of service.inventoryUsage) {
              const consumptionQty = (usage.quantity || 0) * (item.quantity || 1);
              if (consumptionQty > 0) {
                 await Inventory.findByIdAndUpdate(
                    usage.inventoryItem._id || usage.inventoryItem,
                    { $inc: { stock: -consumptionQty } }
                 );
              }
           }
        }
      }
    }

    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
       return res.status(404).json({ message: 'Invoice not found' });
    }

    // IDOR Check
    const isOwner = invoice.user?.toString() === req.user._id.toString() || invoice.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = sameBranch(invoice.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to view this invoice' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update invoice (partial)
// @route   PATCH /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // IDOR Check
    const isOwner = invoice.user?.toString() === req.user._id.toString() || invoice.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = sameBranch(invoice.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this invoice' });
    }

    const { paymentMode, date, clientName } = req.body || {};
    // Note: We intentionally do NOT allow updating totals/items here; that requires a full recalculation workflow.
    if (paymentMode !== undefined) invoice.paymentMode = paymentMode;
    if (date !== undefined) invoice.date = date;
    if (clientName !== undefined) invoice.clientName = clientName;

    const updated = await invoice.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
    }

    // IDOR Check
    const isOwner = invoice.user?.toString() === req.user._id.toString() || invoice.clientId?.toString() === req.user._id.toString();
    const isBranchManager = req.user.role === 'Manager' && sameBranch(invoice.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager && !isOwner) {
       return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this invoice record.' });
    }

    await invoice.deleteOne();
    res.json({ message: 'Invoice removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
};
