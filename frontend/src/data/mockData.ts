import { withBase } from '../utils/assetPath';

export const clients = [
  { id: 1, name: 'Fatima Al-Sayed', phone: '+974 4412 3456', dob: '1992-05-15', anniversary: '2018-11-20', notes: 'Prefers light pressure', preferences: 'Aromatherapy', totalSpending: 1500, visits: 12 },
  { id: 2, name: 'Mohammed Rashid', phone: '+974 5587 6543', dob: '1985-08-22', anniversary: '2012-02-14', notes: 'Back pain issues', preferences: 'Deep Tissue', totalSpending: 850, visits: 5 },
  { id: 3, name: 'Sara Hamad', phone: '+974 6698 1234', dob: '1995-12-01', anniversary: '2022-06-10', notes: 'Allergic to lavender', preferences: 'Swedish', totalSpending: 420, visits: 3 },
  { id: 4, name: 'Khalid Abdullah', phone: '+974 7743 2109', dob: '1980-03-10', anniversary: '2005-09-25', notes: 'Regular customer', preferences: 'Thai Massage', totalSpending: 2500, visits: 20 },
];

export const employees = [
  { id: 1, name: 'Ahmed Hassan', role: 'Therapist', phone: '+974 3300 1111', dept: 'Massage', commission: 15, services: ['Thai', 'Swedish'], attendance: 95, earnings: 4500 },
  { id: 2, name: 'Lia Santos', role: 'Therapist', phone: '+974 3300 2222', dept: 'Spa', commission: 12, services: ['Aromatherapy', 'Facial'], attendance: 98, earnings: 3800 },
  { id: 3, name: 'Karthik Raja', role: 'Manager', phone: '+974 3300 3333', dept: 'Management', commission: 5, services: [], attendance: 100, earnings: 6500 },
  { id: 4, name: 'Elena Petrova', role: 'Therapist', phone: '+974 3300 4444', dept: 'Massage', commission: 15, services: ['Deep Tissue', 'Reflexology'], attendance: 92, earnings: 4200 },
];

export const services = [
  { id: 1, name: 'Swedish Massage', duration: 60, price: 180, staff: ['Ahmed', 'Elena'], image: withBase('/images/swedish_massage.png') },
  { id: 2, name: 'Deep Tissue Massage', duration: 90, price: 250, staff: ['Elena'], image: withBase('/images/deep_tissue_massage.png') },
  { id: 3, name: 'Aromatherapy Massage', duration: 60, price: 220, staff: ['Lia'], image: withBase('/images/aromatherapy_massage.png') },
  { id: 4, name: 'Thai Massage', duration: 120, price: 300, staff: ['Ahmed'], image: withBase('/images/thai_massage.png') },
  { id: 5, name: 'Foot Reflexology', duration: 45, price: 120, staff: ['Elena', 'Lia'], image: withBase('/images/foot_reflexology.png') },
];

export const appointments = [
  { id: 1, client: 'Fatima Al-Sayed', service: 'Swedish Massage', employee: 'Ahmed Hassan', room: 'Room 1', time: '10:00 AM', duration: 60, status: 'Completed', date: '2026-03-17' },
  { id: 2, client: 'Mohammed Rashid', service: 'Deep Tissue', employee: 'Elena Petrova', room: 'Room 2', time: '11:30 AM', duration: 90, status: 'In Service', date: '2026-03-17' },
  { id: 3, client: 'Sara Hamad', service: 'Aromatherapy', employee: 'Lia Santos', room: 'Room 3', time: '02:00 PM', duration: 60, status: 'Booked', date: '2026-03-17' },
];

export const inventory = [
  { id: 1, name: 'Massage Oil (Lavender)', category: 'Oils', stock: 5, vendor: 'NaturePure', lowStock: 10 },
  { id: 2, name: 'Aroma Oil (Eucalyptus)', category: 'Oils', stock: 15, vendor: 'NaturePure', lowStock: 5 },
  { id: 3, name: 'White Towels (Large)', category: 'Linen', stock: 40, vendor: 'LinenWorld', lowStock: 20 },
  { id: 4, name: 'Face Creams', category: 'Skincare', stock: 2, vendor: 'GlowUp', lowStock: 5 },
];

export const rooms = [
  { id: 1, name: 'Room 1', type: 'Thai Massage', status: 'Occupied', timer: '45:00' },
  { id: 2, name: 'Room 2', type: 'Oil Therapy', status: 'Cleaning', timer: '00:00' },
  { id: 3, name: 'Room 3', type: 'Couple Spa', status: 'Free', timer: '00:00' },
  { id: 4, name: 'Room 4', type: 'Standard', status: 'Free', timer: '00:00' },
];

export const invoices = [
  { _id: '1', clientName: 'Fatima Al-Sayed', total: 450, date: '2026-04-12', items: [], paymentMode: 'Cash', invoiceNumber: 'INV-101' },
  { _id: '2', clientName: 'Mohammed Rashid', total: 1200, date: '2026-04-13', items: [], paymentMode: 'Card', invoiceNumber: 'INV-102' },
  { _id: '3', clientName: 'Sara Hamad', total: 850, date: '2026-04-14', items: [], paymentMode: 'Transfer', invoiceNumber: 'INV-103' },
  { _id: '4', clientName: 'Khalid Abdullah', total: 2100, date: '2026-04-15', items: [], paymentMode: 'Card', invoiceNumber: 'INV-104' },
];

export const expenses = [
  { _id: '1', title: 'Rent', category: 'Fixed', amount: 5000, date: '2026-04-01' },
  { _id: '2', title: 'Utilities', category: 'Variable', amount: 800, date: '2026-04-05' },
  { _id: '3', title: 'Marketing', category: 'Variable', amount: 1200, date: '2026-04-10' },
];
