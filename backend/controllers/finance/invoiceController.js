const Invoice = require('../../models/finance/Invoice');
const Employee = require('../../models/human-resources/Employee');
const Service = require('../../models/operations/Service');
const { paginateModelQuery } = require('../../utils/pagination');

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
