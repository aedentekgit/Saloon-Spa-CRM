const express = require('express');
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} = require('../../controllers/finance/invoiceController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, getInvoices)
  .post(protect, createInvoice);

router.route('/:id')
  .get(protect, getInvoiceById)
  .patch(protect, updateInvoice)
  .delete(protect, deleteInvoice);

module.exports = router;
