import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getPollIntervalMs, shouldPollNow } from '../utils/polling';
import { getCachedJson, setCachedJson } from '../utils/localCache';

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
  const isAdmin = user?.role === 'Admin';
  const userBranchId = typeof user?.branch === 'string' ? user.branch : user?.branch?._id || '';
  const scopeBranches = (list: Branch[]) => {
    if (isAdmin) return list;
    return userBranchId ? list.filter(branch => branch._id === userBranchId) : [];
  };
  const [branches, setBranches] = useState<Branch[]>(() => scopeBranches(getCachedJson('zen_branch_context_list', [])));
  const [selectedBranch, setSelectedBranchState] = useState<string>(() => {
    const saved = localStorage.getItem('zen_selected_branch');
    if (user && !isAdmin && userBranchId) return userBranchId;
    return isAdmin ? (saved || 'all') : '';
  });
  const [loading, setLoading] = useState(() => getCachedJson<Branch[]>('zen_branch_context_list', []).length === 0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const fetchBranches = async (silent: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      if (!silent && branches.length === 0) setLoading(true);
      const response = await fetch(`${API_URL}/branches`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!response.ok) {
        if (response.status === 403 && !isAdmin) {
          setBranches([]);
          if (userBranchId) setSelectedBranchState(userBranchId);
        }
        return;
      }
      const data = await response.json();
      const branchList = Array.isArray(data) ? data : (data?.data || []);
      const scoped = Array.isArray(branchList) ? scopeBranches(branchList) : [];
      setBranches(scoped);
      if (!isAdmin && userBranchId) {
        setSelectedBranchState(userBranchId);
        localStorage.setItem('zen_selected_branch', userBranchId);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isAdmin && userBranchId) {
      setSelectedBranchState(userBranchId);
      localStorage.setItem('zen_selected_branch', userBranchId);
      setBranches(prev => scopeBranches(prev));
    } else if (isAdmin && !selectedBranch) {
      setSelectedBranchState(localStorage.getItem('zen_selected_branch') || 'all');
    }
    fetchBranches();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchBranches(true);
    }, getPollIntervalMs(60000)); // default 60s

    return () => clearInterval(interval);
  }, [user?.token, user?.role, userBranchId, selectedBranch]);

  useEffect(() => {
    setCachedJson('zen_branch_context_list', branches);
  }, [branches]);

  // Validation: If selected branch is not 'all' and not found in branches, reset to 'all'
  useEffect(() => {
    if (!isAdmin && userBranchId && selectedBranch !== userBranchId) {
      setSelectedBranchState(userBranchId);
      localStorage.setItem('zen_selected_branch', userBranchId);
      return;
    }

    if (isAdmin && branches.length > 0 && selectedBranch !== 'all') {
      const exists = branches.some(b => b._id === selectedBranch);
      if (!exists) {
        setSelectedBranchState('all');
        localStorage.setItem('zen_selected_branch', 'all');
      }
    }
  }, [branches, selectedBranch, isAdmin, userBranchId]);

  const setSelectedBranch = (id: string) => {
    const next = isAdmin ? id : userBranchId;
    if (!next) return;
    setSelectedBranchState(next);
    localStorage.setItem('zen_selected_branch', next);
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
