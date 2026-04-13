import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
    return localStorage.getItem('zen_selected_branch') || 'all';
  });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  const fetchBranches = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/branches`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [user]);

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
