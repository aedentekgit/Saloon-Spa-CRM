import React from 'react';
import { Search, LayoutGrid, List, Plus, Grid } from 'lucide-react';
import { BranchSelector } from './BranchSelector';
import { ZenButton } from './ZenButtons';

interface ZenLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  viewMode?: 'grid' | 'table';
  onViewModeChange?: (v: 'grid' | 'table') => void;
  addButtonLabel?: string;
  onAddClick?: () => void;
  addButtonIcon?: React.ReactNode;
  hideAddButton?: boolean;
  hideSearch?: boolean;
  hideBranchSelector?: boolean;
  hideViewToggle?: boolean;
  headerActions?: React.ReactNode;
}

export const ZenPageLayout = ({
  children,
  title,
  subtitle,
  searchTerm = '',
  onSearchChange = () => {},
  viewMode = 'grid',
  onViewModeChange = () => {},
  addButtonLabel,
  onAddClick,
  addButtonIcon = <Plus size={18} />,
  hideAddButton = false,
  hideSearch = false,
  hideBranchSelector = false,
  hideViewToggle = false,
  headerActions
}: ZenLayoutProps) => {

  return (
    <div className="page-container min-h-screen p-6 sm:p-10 lg:p-12 pt-8 sm:pt-14 lg:pt-16 animate-in fade-in duration-1000">
      
      {/* Search and Action Bar removed Page Title Section */}
      
      {/* Search and Action Bar */}
      {(!hideSearch || !hideBranchSelector || !hideViewToggle || (!hideAddButton && addButtonLabel) || headerActions) && (
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {!hideSearch && (
            <div className="flex-1 max-w-xl w-full">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder={`Search ${title}...`}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-white pl-6 pr-12 h-[48px] sm:h-[52px] rounded-[1rem] border border-zen-stone shadow-sm shadow-zen-brown/5 focus:border-zen-brown/30 focus:ring-4 focus:ring-zen-brown/5 outline-none transition-all duration-700 font-sans text-sm text-zen-brown placeholder:text-zen-brown/30"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-700 group-focus-within:scale-110">
                  <Search className="text-zen-brown/20 group-focus-within:text-zen-brown/50" size={18} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {!hideBranchSelector && (
              <div className="shrink-0">
                <BranchSelector />
              </div>
            )}

            <div className="flex items-center gap-2">
              {headerActions}

              {!hideViewToggle && onViewModeChange && (
                <div className="flex items-center h-[48px] sm:h-[52px] bg-white p-1 rounded-[1.2rem] sm:rounded-[1rem] border border-zen-stone shadow-sm">
                  <button 
                    onClick={() => onViewModeChange('grid')}
                    className={`h-full aspect-square flex items-center justify-center rounded-[0.8rem] transition-colors duration-300 ${viewMode === 'grid' ? 'bg-zen-brown text-white' : 'text-zen-brown/40 hover:text-zen-brown hover:bg-zen-brown/5'}`}
                  >
                    <Grid size={16} />
                  </button>
                  <button 
                    onClick={() => onViewModeChange('table')}
                    className={`h-full aspect-square flex items-center justify-center rounded-[0.8rem] transition-colors duration-300 ${viewMode === 'table' ? 'bg-zen-primary text-white' : 'text-zen-brown/40 hover:text-zen-brown hover:bg-zen-brown/5'}`}
                  >
                    <List size={16} />
                  </button>
                </div>
              )}
            </div>

            {!hideAddButton && addButtonLabel && onAddClick && (
              <button 
                onClick={onAddClick}
                className="shrink-0 h-[48px] sm:h-[52px] rounded-[1.2rem] sm:rounded-[1rem] px-6 sm:px-8 shadow-sm flex items-center justify-center gap-3 active:scale-95 group transition-all duration-700 bg-zen-brown text-white font-bold text-xs sm:text-sm uppercase tracking-[0.2em] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <span className="hidden sm:inline relative z-10">{addButtonLabel}</span>
                <div className="group-hover:rotate-90 transition-transform duration-700 relative z-10 shrink-0">
                  {addButtonIcon}
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      <main className="pb-8">
        {children}
      </main>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
