const Invoice = require('../models/Invoice');
const { paginateModelQuery } = require('../utils/pagination');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    let query = {};
    
    // IDOR Prevention
    if (req.user.role === 'Admin') {
      // Sees all
    } else if (req.user.role === 'Manager' || req.user.role === 'Employee') {
      if (req.user.branch) {
        query.branch = req.user.branch;
      }
    } else if (req.user.role === 'Client') {
      // Clients only see their own invoices
      // Note: Invoices should probably have a clientId field, checking model
      query.user = req.user._id; 
    }

    const { data, pagination } = await paginateModelQuery(Invoice, query, req, {
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
    const invoice = await Invoice.create({
      user: req.user._id,
      invoiceNumber,
      clientName,
      items,
      subtotal,
      gst,
      discount,
      total,
      paymentMode,
      payments,
      date,
      branch: branch || req.user.branch || undefined
    });

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
    const isOwner = invoice.user?.toString() === req.user._id.toString();
    const isBranchStaff = req.user.branch && invoice.branch?.toString() === req.user.branch.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to view this invoice' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  getInvoiceById
};
