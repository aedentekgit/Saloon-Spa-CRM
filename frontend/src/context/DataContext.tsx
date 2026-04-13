import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  clients as initialClients, 
  employees as initialEmployees, 
  services as initialServices, 
  appointments as initialAppointments, 
  inventory as initialInventory, 
  rooms as initialRooms 
} from '../data/mockData';

export interface Client { id: number; name: string; phone: string; dob?: string; anniversary?: string; notes?: string; preferences?: string; totalSpending: number; visits: number; }
export interface Employee { id: number; name: string; role: string; phone: string; dept: string; commission: number; services: string[]; attendance: number; earnings: number; }
export interface Service { id: number; name: string; duration: number; price: number; staff: string[]; image?: string; }
export interface Appointment { id: number; client: string; service: string; employee: string; room: string; time: string; duration: number; status: string; date: string; }
export interface InventoryItem { id: number; name: string; category: string; stock: number; vendor: string; lowStock: number; }
export interface Room { id: number; name: string; type: string; status: string; timer: string; }
export interface Invoice { id: number; clientName: string; items: Service[]; subtotal: number; gst: number; discount: number; total: number; paymentMode: string; date: string; invoiceNumber: string; }
export interface Expense { id: number; title: string; category: string; amount: number; date: string; }
export interface AttendanceRecord { id: number; date: string; checkIn: string; checkOut: string; status: string; employeeName: string; }

interface DataContextType {
  clients: Client[];
  employees: Employee[];
  services: Service[];
  appointments: Appointment[];
  inventory: InventoryItem[];
  rooms: Room[];
  invoices: Invoice[];
  expenses: Expense[];
  attendance: AttendanceRecord[];
  addClient: (client: Partial<Client>) => void;
  updateClient: (id: number, client: Partial<Client>) => void;
  deleteClient: (id: number) => void;
  addAppointment: (appointment: Partial<Appointment>) => void;
  updateAppointment: (id: number, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: number) => void;
  updateRoom: (id: number, status: string) => void;
  addInventoryItem: (item: Partial<InventoryItem>) => void;
  updateInventoryItem: (id: number, updated: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: number) => void;
  adjustStock: (id: number, amount: number) => void;
  addEmployee: (employee: Partial<Employee>) => void;
  updateEmployee: (id: number, employee: Partial<Employee>) => void;
  deleteEmployee: (id: number) => void;
  addService: (service: Partial<Service>) => void;
  updateService: (id: number, service: Partial<Service>) => void;
  deleteService: (id: number) => void;
  addInvoice: (invoice: Partial<Invoice>) => void;
  addExpense: (expense: Partial<Expense>) => void;
  markAttendance: (record: Partial<AttendanceRecord>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('zen_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('zen_employees');
    return saved ? JSON.parse(saved) : initialEmployees;
  });

  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('zen_services');
    const parsed = saved ? JSON.parse(saved) : initialServices;
    return parsed.map((s: Service) => {
      const match = initialServices.find(is => is.name === s.name);
      return match ? { ...s, image: match.image } : s;
    });
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('zen_appointments');
    return saved ? JSON.parse(saved) : initialAppointments;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('zen_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('zen_rooms');
    return saved ? JSON.parse(saved) : initialRooms;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('zen_invoices');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('zen_expenses');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Massage Oils Purchase', category: 'Inventory', amount: 450, date: '2026-03-15' },
      { id: 2, title: 'Electricity Bill', category: 'Utilities', amount: 1280, date: '2026-03-12' },
    ];
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('zen_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => localStorage.setItem('zen_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('zen_employees', JSON.stringify(employees)), [employees]);
  useEffect(() => localStorage.setItem('zen_services', JSON.stringify(services)), [services]);
  useEffect(() => localStorage.setItem('zen_appointments', JSON.stringify(appointments)), [appointments]);
  useEffect(() => localStorage.setItem('zen_inventory', JSON.stringify(inventory)), [inventory]);
  useEffect(() => localStorage.setItem('zen_rooms', JSON.stringify(rooms)), [rooms]);
  useEffect(() => localStorage.setItem('zen_invoices', JSON.stringify(invoices)), [invoices]);
  useEffect(() => localStorage.setItem('zen_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('zen_attendance', JSON.stringify(attendance)), [attendance]);

  // Client Actions
  const addClient = (client: Partial<Client>) => {
    setClients(prev => [...prev, { ...client, id: Date.now(), totalSpending: 0, visits: 0 } as Client]);
  };

  const updateClient = (id: number, updatedClient: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updatedClient } : c));
  };

  const deleteClient = (id: number) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // Appointment Actions
  const addAppointment = (appointment: Partial<Appointment>) => {
    setAppointments(prev => [...prev, { ...appointment, id: Date.now() } as Appointment]);
    const client = clients.find(c => c.name === appointment.client);
    if (client) {
      const service = services.find(s => s.name === appointment.service);
      updateClient(client.id, { 
        visits: (client.visits || 0) + 1,
        totalSpending: (client.totalSpending || 0) + (service ? service.price : 0)
      });
    }
  };

  const updateAppointment = (id: number, updated: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
  };

  const deleteAppointment = (id: number) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  // Room Actions
  const updateRoom = (id: number, status: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  // Inventory Actions
  const addInventoryItem = (item: Partial<InventoryItem>) => {
    setInventory(prev => [...prev, { ...item, id: Date.now() } as InventoryItem]);
  };

  const updateInventoryItem = (id: number, updated: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
  };

  const deleteInventoryItem = (id: number) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  const adjustStock = (id: number, amount: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + amount) } : i));
  };

  // Employee Actions
  const addEmployee = (employee: Partial<Employee>) => {
    setEmployees(prev => [...prev, { ...employee, id: Date.now() } as Employee]);
  };

  const updateEmployee = (id: number, updated: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
  };

  const deleteEmployee = (id: number) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  // Service Actions
  const addService = (service: Partial<Service>) => {
    setServices(prev => [...prev, { ...service, id: Date.now() } as Service]);
  };

  const updateService = (id: number, updated: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const deleteService = (id: number) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const addInvoice = (invoice: Partial<Invoice>) => {
    setInvoices(prev => [{ ...invoice, id: Date.now() } as Invoice, ...prev]);
  };

  const addExpense = (expense: Partial<Expense>) => {
    setExpenses(prev => [{ ...expense, id: Date.now() } as Expense, ...prev]);
  };

  const markAttendance = (record: Partial<AttendanceRecord>) => {
    setAttendance(prev => {
      const exists = prev.find(a => a.date === record.date && a.employeeName === record.employeeName);
      if (exists) {
        return prev.map(a => a.id === exists.id ? { ...a, ...record } : a);
      }
      return [{ ...record, id: Date.now() } as AttendanceRecord, ...prev];
    });
  };

  return (
    <DataContext.Provider value={{ 
      clients, employees, services, appointments, inventory, rooms, invoices, expenses, attendance,
      addClient, updateClient, deleteClient,
      addAppointment, updateAppointment, deleteAppointment,
      updateRoom, addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustStock,
      addEmployee, updateEmployee, deleteEmployee,
      addService, updateService, deleteService,
      addInvoice, addExpense, markAttendance
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
