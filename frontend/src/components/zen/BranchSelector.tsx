import React from 'react';
import { GitBranch } from 'lucide-react';
import { useBranches } from '../../context/BranchContext';
import { ZenDropdown } from './ZenInputs';

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
  const { branches, selectedBranch, setSelectedBranch } = useBranches();

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
