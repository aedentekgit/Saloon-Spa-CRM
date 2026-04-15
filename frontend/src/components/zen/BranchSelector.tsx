import React from 'react';
import { GitBranch } from 'lucide-react';
import { useBranches } from '../../context/BranchContext';
import { ZenDropdown } from './ZenInputs';
import { useAuth } from '../../context/AuthContext';

interface BranchSelectorProps {
  className?: string;
  variant?: 'line' | 'pill';
  hideLabel?: boolean;
}

export const BranchSelector = ({ 
  className = "", 
  variant = "pill",
  hideLabel = true 
}: BranchSelectorProps) => {
  const { user } = useAuth();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();

  if (user?.role !== 'Admin') return null;

  const branchOptions = ['All Branches', ...branches.map(b => b.name)];
  const currentBranchName = selectedBranch === 'all' 
    ? 'All Branches' 
    : branches.find(b => b._id === selectedBranch)?.name || 'All Branches';

  const handleBranchChange = (name: string) => {
    if (name === 'All Branches') {
      setSelectedBranch('all');
    } else {
      const branch = branches.find(b => b.name === name);
      if (branch) setSelectedBranch(branch._id);
    }
  };

  return (
    <div className={`min-w-[180px] sm:min-w-[220px] ${className}`}>
      <ZenDropdown
        label="Select Sanctuary"
        hideLabel={hideLabel}
        variant={variant}
        icon={GitBranch}
        options={branchOptions}
        value={currentBranchName}
        onChange={handleBranchChange}
      />
    </div>
  );
};
