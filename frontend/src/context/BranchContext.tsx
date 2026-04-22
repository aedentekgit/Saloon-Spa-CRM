import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getPollIntervalMs, shouldPollNow } from '../utils/polling';

export interface Branch {
  _id: string;
  name: string;
  contactNumber: string;
  email: string;
  address: string;
  logo?: string;
  isActive: boolean;
}

interface BranchContextType {
  branches: Branch[];
  selectedBranch: string; // 'all' or branch ID
  setSelectedBranch: (id: string) => void;
  loading: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranchState] = useState<string>(() => {
    const saved = localStorage.getItem('zen_selected_branch');
    if (user && user.role !== 'Admin' && user.branch) return user.branch;
    return saved || 'all';
  });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const fetchBranches = async (silent: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`${API_URL}/branches`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'Admin' && user.branch) {
      setSelectedBranchState(user.branch);
    }
    fetchBranches();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchBranches(true);
    }, getPollIntervalMs(60000)); // default 60s

    return () => clearInterval(interval);
  }, [user]);

  // Validation: If selected branch is not 'all' and not found in branches, reset to 'all'
  useEffect(() => {
    if (branches.length > 0 && selectedBranch !== 'all') {
      const exists = branches.some(b => b._id === selectedBranch);
      if (!exists && user?.role === 'Admin') {
        setSelectedBranchState('all');
        localStorage.setItem('zen_selected_branch', 'all');
      }
    }
  }, [branches, selectedBranch, user]);

  const setSelectedBranch = (id: string) => {
    setSelectedBranchState(id);
    localStorage.setItem('zen_selected_branch', id);
  };

  return (
    <BranchContext.Provider value={{ 
      branches, 
      selectedBranch, 
      setSelectedBranch, 
      loading, 
      refreshBranches: fetchBranches 
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranches = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranches must be used within a BranchProvider');
  }
  return context;
};
