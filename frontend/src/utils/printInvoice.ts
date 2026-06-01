import dayjs from 'dayjs';
import { getImageUrl } from './imageUrl';

export const printInvoice = (transaction: any, settings: any) => {
  if (!transaction || !settings) return;

  const logoUrl = settings?.general?.logo ? getImageUrl(settings.general.logo) : '';
  const currency = settings?.general?.currencySymbol || 'QR';
  const paymentMode = transaction.paymentMode || transaction.method || '-';
  const paymentDetails = Array.isArray(transaction.payments) && transaction.payments.length > 0
    ? transaction.payments
        .filter((payment: any) => Number(payment?.amount) > 0)
        .map((payment: any) => `${payment.mode}: ${currency} ${Number(payment.amount || 0).toLocaleString()}`)
        .join(', ')
    : transaction.paymentsSummary && transaction.paymentsSummary !== '-'
      ? transaction.paymentsSummary
      : '';

  const windowUrl = 'about:blank';
  const uniqueName = new Date().getTime();
  const windowName = 'Print' + uniqueName;
  const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${transaction.invoiceNumber || transaction.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');
          
          * { box-sizing: border-box; }
          body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            color: #2D2424; 
            margin: 0;
            padding: 0;
            background: #FDFBF7;
          }
          .invoice-wrapper {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #FDFBF7;
            position: relative;
            overflow: hidden;
          }
          
          /* Organic Header Design */
          .header-bg {
            position: absolute;
            top: -100px;
            right: -50px;
            width: 500px;
            height: 400px;
            background: #3D3B33;
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
            transform: rotate(-15deg);
            z-index: 1;
          }
          .accent-shape-1 {
            position: absolute;
            top: 50px;
            left: -50px;
            width: 200px;
            height: 200px;
            background: #C4C1A4;
            border-radius: 50%;
            opacity: 0.4;
            z-index: 1;
          }
          
          .content {
            position: relative;
            z-index: 10;
            padding: 60px 80px;
          }
          
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 80px;
          }
          
          .company-info {
            font-size: 13px;
            line-height: 1.6;
            color: #5C5B56;
          }
          .company-info p { margin: 0; }
          
          .logo-section {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            color: #FDFBF7;
          }
          .logo-container {
            width: 100px;
            height: 100px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            padding: 15px;
          }
          .logo-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: brightness(0) invert(1);
          }
          .logo-text {
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            font-weight: 700;
          }
          
          .invoice-title {
            font-family: 'Playfair Display', serif;
            font-size: 48px;
            margin-bottom: 40px;
            color: #3D3B33;
          }
          
          .billing-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 60px;
            font-size: 14px;
          }
          .detail-group { margin-bottom: 15px; display: flex; gap: 10px; }
          .detail-label { font-weight: 700; color: #3D3B33; min-width: 100px; }
          .detail-value { color: #5C5B56; }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .items-table th {
            text-align: left;
            padding: 15px 0;
            border-top: 2px solid #3D3B33;
            border-bottom: 2px solid #3D3B33;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #3D3B33;
          }
          .items-table td {
            padding: 20px 0;
            border-bottom: 1px solid #E5E4E0;
            font-size: 15px;
          }
          .item-description { font-weight: 600; color: #3D3B33; }
          .item-meta { font-size: 12px; color: #8C8B86; margin-top: 4px; }
          
          .summary-section {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 80px;
            margin-top: 40px;
          }
          
          .terms-section h4 {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            margin-bottom: 15px;
            color: #3D3B33;
          }
          .terms-text {
            font-size: 12px;
            color: #8C8B86;
            line-height: 1.6;
            max-width: 400px;
          }
          
          .totals-table {
            width: 100%;
            font-size: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .total-row.grand-total {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #3D3B33;
            font-weight: 800;
            font-size: 18px;
            color: #3D3B33;
          }
          
          .footer-info {
            margin-top: 100px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            border-top: 1px solid #E5E4E0;
            padding-top: 30px;
            font-size: 12px;
          }
          .footer-col h5 { font-weight: 700; margin-bottom: 8px; color: #3D3B33; }
          .footer-col p { margin: 0; color: #8C8B86; }
          
          .more-info {
            text-align: center;
            margin-top: 60px;
            font-size: 13px;
            font-weight: 700;
            color: #3D3B33;
          }
          
          @media print {
            body { background: #FDFBF7; }
            .invoice-wrapper { width: 100%; margin: 0; border: none; }
            @page { size: A4; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="header-bg"></div>
          <div class="accent-shape-1"></div>
          
          <div class="content">
            <div class="header-top">
              <div class="company-info">
                <p>${settings?.general?.address || 'Street Name, State, Country'}</p>
                <p>${settings?.general?.email || 'relaxspa@domain.com'}</p>
                <p>${settings?.general?.contactNumber || '+0012 3456 789'}</p>
                <p>www.${(settings?.general?.siteName || 'relaxspa').toLowerCase().replace(/\s+/g, '')}.com</p>
              </div>
              <div class="logo-section">
                ${logoUrl ? `
                  <div class="logo-container">
                    <img src="${logoUrl}" class="logo-img" alt="Logo" />
                  </div>
                ` : `
                  <div class="logo-container" style="background: rgba(255,255,255,0.2);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v19M5 8h14M15 21l-3-3-3 3"/></svg>
                  </div>
                `}
                <div class="logo-text">${settings?.general?.siteName || 'Relax'}</div>
              </div>
            </div>
            
            <h1 class="invoice-title">Invoice</h1>
            
            <div class="billing-details">
              <div class="billing-left">
                <div class="detail-group">
                  <span class="detail-label">Bill To:</span>
                  <span class="detail-value">${transaction.clientName || 'Walk-in Client'}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${dayjs(transaction.date).format('DD/MM/YYYY')}</span>
                </div>
              </div>
              <div class="billing-right">
                <div class="detail-group">
                  <span class="detail-label">Account Nº:</span>
                  <span class="detail-value">${transaction.clientId?.slice(-8) || '00000000'}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Invoice Nº:</span>
                  <span class="detail-value">${transaction.invoiceNumber || transaction.id}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Payment Mode:</span>
                  <span class="detail-value">${paymentMode}${paymentDetails ? `<br><small>${paymentDetails}</small>` : ''}</span>
                </div>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 55%">Description</th>
                  <th style="text-align: center; width: 15%">Qty</th>
                  <th style="text-align: right; width: 15%">Price</th>
                  <th style="text-align: right; width: 15%">Total</th>
                </tr>
              </thead>
              <tbody>
                ${transaction.items && transaction.items.length > 0 
                  ? transaction.items.map((item: any) => `
                    <tr>
                      <td>
                        <div class="item-description">${item.name}</div>
                        ${item.specialistName ? `<div class="item-meta">By ${item.specialistName}</div>` : ''}
                      </td>
                      <td style="text-align: center;">${item.quantity || 1}</td>
                      <td style="text-align: right;">${currency} ${item.price?.toLocaleString()}</td>
                      <td style="text-align: right;">${currency} ${(item.price * (item.quantity || 1)).toLocaleString()}</td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <td>
                        <div class="item-description">${transaction.title}</div>
                      </td>
                      <td style="text-align: center;">1</td>
                      <td style="text-align: right;">${currency} ${transaction.amount?.toLocaleString()}</td>
                      <td style="text-align: right;">${currency} ${transaction.amount?.toLocaleString()}</td>
                    </tr>
                  `
                }
              </tbody>
            </table>
            
            <div class="summary-section">
              <div class="terms-section">
                <h4>Terms & Conditions:</h4>
                <p class="terms-text">
                  This invoice is generated electronically. Please verify all details upon receipt. 
                  Standard service terms apply. For any discrepancies, please reach out within 24 hours 
                  of the session completion.
                </p>
              </div>
              <div class="totals-section">
                <div class="totals-table">
                  <div class="total-row">
                    <span>Sub-total:</span>
                    <span>${currency} ${(transaction.subtotal || transaction.amount).toLocaleString()}</span>
                  </div>
                  ${transaction.gst > 0 ? `
                    <div class="total-row">
                      <span>Tax (VAT):</span>
                      <span>${currency} ${transaction.gst.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  ${transaction.discount > 0 ? `
                    <div class="total-row">
                      <span>Discount:</span>
                      <span style="color: #C4C1A4;">-${currency} ${transaction.discount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  <div class="total-row grand-total">
                    <span>Total:</span>
                    <span>${currency} ${transaction.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="footer-info">
              <div class="footer-col">
                <h5>Account Nº:</h5>
                <p>0123 456 789 1234</p>
              </div>
              <div class="footer-col">
                <h5>Account Name:</h5>
                <p>${settings?.general?.siteName || 'Relax Spa'}</p>
              </div>
              <div class="footer-col">
                <h5>Bank Name:</h5>
                <p>International Wellness Bank</p>
              </div>
            </div>
            
            <div class="more-info">
              More Info: www.${(settings?.general?.siteName || 'relaxspa').toLowerCase().replace(/\s+/g, '')}.com
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
