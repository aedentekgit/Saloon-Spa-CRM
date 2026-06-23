const express = require('express');
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} = require('../../controllers/finance/invoiceController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('billing', 'finance', 'transactions', 'history'), getInvoices)
  .post(protect, requirePermission('billing'), createInvoice);

router.route('/:id')
  .get(protect, requirePermission('billing', 'finance', 'transactions', 'history'), getInvoiceById)
  .patch(protect, requirePermission('billing', 'finance'), updateInvoice)
  .delete(protect, requirePermission('billing', 'finance'), deleteInvoice);

module.exports = router;
