import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  clients as initialClients, 
  employees as initialEmployees, 
  services as initialServices, 
  appointments as initialAppointments, 
  inventory as initialInventory, 
  rooms as initialRooms,
  invoices as initialInvoices,
  expenses as initialExpenses
} from '../data/mockData';
import { useAuth } from './AuthContext';

export interface Client { id?: number; _id?: string; name: string; phone: string; dob?: string; anniversary?: string; notes?: string; preferences?: string; totalSpending: number; visits: number; status?: string; }
export interface Employee { id?: number; _id?: string; name: string; role: string; phone: string; dept: string; commission: number; services: string[]; attendance: number; earnings: number; status?: string; }
export interface Service { id?: number; _id?: string; name: string; duration: number; price: number; staff: string[]; image?: string; status?: string; commissionValue?: number; commissionType?: string; }
export interface Appointment { id?: number; _id?: string; client: string; service: string; employee: string; room: string; time: string; duration: number; status: string; date: string; branch?: string; }
export interface InventoryItem { id?: number; _id?: string; name: string; category: string; stock: number; vendor: string; lowStock: number; }
export interface Room { id?: number; _id?: string; name: string; type: string; status: string; timer?: string; branch?: string; }
export interface Invoice { id?: number; _id?: string; clientName: string; items: any[]; subtotal: number; gst: number; discount: number; total: number; paymentMode: string; date: string; invoiceNumber: string; branch?: string; }
export interface Expense { id?: number; _id?: string; title: string; category: string; amount: number; date: string; branch?: string; }
export interface AttendanceRecord { id?: number; _id?: string; date: string; checkIn: string; checkOut: string; status: string; employeeName: string; }
export interface LeaveRequest { _id: string; employeeName: string; type: string; reason: string; startDate: string; endDate: string; daysCount: number; status: string; user: string; }
export interface Role { _id: string; name: string; permissions: string[]; status?: 'Active' | 'Inactive'; }
export interface Branch { _id: string; name: string; location: string; phone: string; status?: string; }

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
  leaves: LeaveRequest[];
  roles: Role[];
  branches: Branch[];
  refreshData: (silent?: boolean) => Promise<void>;
  loading: boolean;
  addClient: (client: Partial<Client>) => void;
  updateClient: (id: string | number, client: Partial<Client>) => void;
  deleteClient: (id: string | number) => void;
  addAppointment: (appointment: Partial<Appointment>) => void;
  updateAppointment: (id: string | number, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string | number) => void;
  updateRoom: (id: string | number, status: string) => void;
  addInventoryItem: (item: Partial<InventoryItem>) => void;
  updateInventoryItem: (id: string | number, updated: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string | number) => void;
  adjustStock: (id: string | number, amount: number) => void;
  addEmployee: (employee: Partial<Employee>) => void;
  updateEmployee: (id: string | number, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string | number) => void;
  addService: (service: Partial<Service>) => void;
  updateService: (id: string | number, service: Partial<Service>) => void;
  deleteService: (id: string | number) => void;
  addInvoice: (invoice: Partial<Invoice>) => void;
  addExpense: (expense: Partial<Expense>) => void;
  markAttendance: (record: Partial<AttendanceRecord>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('zen_expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('zen_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Global Sync Logic (Real-time polling)
  const refreshData = async (silent: boolean = false) => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    
    try {
      if (!silent) setLoading(true);
      const headers = { 'Authorization': `Bearer ${user.token}` };
      
      const [cliRes, empRes, serRes, invenRes, invCountRes, appCountRes, leavesRes, rolesRes, branchesRes] = await Promise.all([
        fetch(`${API_URL}/clients?limit=50`, { headers }), 
        fetch(`${API_URL}/employees`, { headers }),
        fetch(`${API_URL}/services`, { headers }),
        fetch(`${API_URL}/inventory?limit=50`, { headers }),
        fetch(`${API_URL}/invoices?limit=1`, { headers }),
        fetch(`${API_URL}/appointments?limit=1`, { headers }),
        fetch(`${API_URL}/leaves`, { headers }),
        fetch(`${API_URL}/roles`, { headers }),
        fetch(`${API_URL}/branches`, { headers })
      ]);

      if ([cliRes, empRes, serRes, invenRes, invCountRes, appCountRes, leavesRes, rolesRes, branchesRes].some(res => res.status === 401)) {
        logout();
        return;
      }

      const [cliData, empData, serData, invenData, invCountData, appCountData, leavesData, rolesData, branchesData] = await Promise.all([
        cliRes.json(), empRes.json(), serRes.json(), invenRes.json(), invCountRes.json(), appCountRes.json(),
        leavesRes.json(), rolesRes.json(), branchesRes.json()
      ]);

      if (Array.isArray(cliData)) setClients(cliData);
      else if (cliData.data) setClients(cliData.data);

      if (Array.isArray(empData)) setEmployees(empData);
      if (Array.isArray(serData)) setServices(serData);
      if (Array.isArray(invenData)) setInventory(invenData);
      else if (invenData.data) setInventory(invenData.data);

      const leavesList = leavesData.data || leavesData;
      if (Array.isArray(leavesList)) setLeaves(leavesList);

      const rolesList = rolesData.data || rolesData;
      if (Array.isArray(rolesList)) setRoles(rolesList);

      const branchesList = branchesData.data || branchesData;
      if (Array.isArray(branchesList)) setBranches(branchesList);

      if (invCountData.pagination) setInvoices(new Array(invCountData.pagination.total).fill({}));
      if (appCountData.pagination) setAppointments(new Array(appCountData.pagination.total).fill({}));
      
    } catch (error) {
      console.error('Core Synchronization Failure:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      refreshData();
      
      // Implement Polling for real-time updates without page refresh
      const interval = setInterval(() => {
        refreshData(true); // silent refresh in background
      }, 10000); // Pulse every 10 seconds

      return () => clearInterval(interval);
    }
  }, [user?.token]);

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
    refreshData(true);
  };
  const updateClient = (id: string | number, updatedClient: Partial<Client>) => {
    setClients(prev => prev.map(c => (c.id === id || c._id === id) ? { ...c, ...updatedClient } : c));
    refreshData(true);
  };
  const deleteClient = (id: string | number) => {
    setClients(prev => prev.filter(c => c.id !== id && c._id !== id));
    refreshData(true);
  };
  // Appointment Actions
  const addAppointment = (appointment: Partial<Appointment>) => {
    setAppointments(prev => [...prev, { ...appointment, id: Date.now() } as Appointment]);
    refreshData(true);
  };
  const updateAppointment = (id: string | number, updated: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => (a.id === id || a._id === id) ? { ...a, ...updated } : a));
    refreshData(true);
  };
  const deleteAppointment = (id: string | number) => {
    setAppointments(prev => prev.filter(a => a.id !== id && a._id !== id));
    refreshData(true);
  };
  const updateRoom = (id: string | number, status: string) => {
    setRooms(prev => prev.map(r => (r.id === id || r._id === id) ? { ...r, status } : r));
  };
  const addInventoryItem = (item: Partial<InventoryItem>) => {
    setInventory(prev => [...prev, { ...item, id: Date.now() } as InventoryItem]);
    refreshData(true);
  };
  const updateInventoryItem = (id: string | number, updated: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => (i.id === id || i._id === id) ? { ...i, ...updated } : i));
    refreshData(true);
  };
  const deleteInventoryItem = (id: string | number) => {
    setInventory(prev => prev.filter(i => i.id !== id && i._id !== id));
    refreshData(true);
  };
  const adjustStock = (id: string | number, amount: number) => {
    setInventory(prev => prev.map(i => (i.id === id || i._id === id) ? { ...i, stock: Math.max(0, i.stock + amount) } : i));
    refreshData(true);
  };
  const addEmployee = (employee: Partial<Employee>) => {
    setEmployees(prev => [...prev, { ...employee, id: Date.now() } as Employee]);
    refreshData(true);
  };
  const updateEmployee = (id: string | number, updated: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => (e.id === id || e._id === id) ? { ...e, ...updated } : e));
    refreshData(true);
  };
  const deleteEmployee = (id: string | number) => {
    setEmployees(prev => prev.filter(e => e.id !== id && e._id !== id));
    refreshData(true);
  };
  const addService = (service: Partial<Service>) => {
    setServices(prev => [...prev, { ...service, id: Date.now() } as Service]);
    refreshData(true);
  };
  const updateService = (id: string | number, updated: Partial<Service>) => {
    setServices(prev => prev.map(s => (s.id === id || s._id === id) ? { ...s, ...updated } : s));
    refreshData(true);
  };
  const deleteService = (id: string | number) => {
    setServices(prev => prev.filter(s => s.id !== id && s._id !== id));
    refreshData(true);
  };
  const addInvoice = (invoice: Partial<Invoice>) => {
    setInvoices(prev => [{ ...invoice, _id: Date.now().toString() }, ...prev] as Invoice[]);
    refreshData(true);
  };
  const addExpense = (expense: Partial<Expense>) => {
    setExpenses(prev => [{ ...expense, _id: Date.now().toString() }, ...prev] as Expense[]);
    refreshData(true);
  };
  const markAttendance = (record: Partial<AttendanceRecord>) => {
    setAttendance(prev => {
      const exists = prev.find(a => a.date === record.date && a.employeeName === record.employeeName);
      if (exists) {
        return prev.map(a => a.id === exists.id ? { ...a, ...record } : a);
      }
      return [{ ...record, id: Date.now() } as AttendanceRecord, ...prev];
    });
    refreshData(true);
  };

  return (
    <DataContext.Provider value={{ 
      clients, employees, services, appointments, inventory, rooms, invoices, expenses, attendance, 
      leaves, roles, branches, refreshData, loading,
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
