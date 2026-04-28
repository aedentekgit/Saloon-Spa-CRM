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

  const isAdmin = user?.role === 'Admin';
  const userBranchId = typeof user?.branch === 'string' ? user.branch : user?.branch?._id || '';
  const lockedBranchId = isAdmin ? selectedBranch : (userBranchId || selectedBranch);

  if (!user) return null;

  const visibleBranches = isAdmin ? branches : branches.filter(branch => branch._id === lockedBranchId);
  const lockedOptions = visibleBranches.length > 0
    ? visibleBranches.map(b => ({ label: b.name, value: b._id }))
    : (lockedBranchId ? [{ label: 'Assigned Branch', value: lockedBranchId }] : []);
  const branchOptions = isAdmin
    ? [{ label: 'All Branches', value: 'all' }, ...visibleBranches.map(b => ({ label: b.name, value: b._id }))]
    : lockedOptions;
  const currentValue = isAdmin ? selectedBranch : lockedBranchId;

  const handleBranchChange = (value: string) => {
    if (!isAdmin) return;
    setSelectedBranch(value);
  };

  if (!isAdmin && !lockedBranchId) return null;

  return (
    <div className={`w-full min-w-0 sm:min-w-[220px] sm:w-auto ${className}`}>
      <ZenDropdown
        label="Select Branch"
        hideLabel={hideLabel}
        variant={variant}
        icon={GitBranch}
        options={branchOptions}
        value={currentValue || (isAdmin ? 'all' : '')}
        onChange={handleBranchChange}
        disabled={!isAdmin}
      />
    </div>
  );
};
