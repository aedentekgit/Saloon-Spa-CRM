import React from 'react';
import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { BranchSelector } from './BranchSelector';
import { ZenButton } from './ZenButtons';

interface ZenLayoutProps {
  children: React.ReactNode;
  title?: string;
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
    <div className="page-container min-h-screen p-4 sm:p-6 lg:p-8 animate-in fade-in duration-1000">
      
      {/* Search and Action Bar */}
      {(!hideSearch || !hideBranchSelector || !hideViewToggle || (!hideAddButton && addButtonLabel) || headerActions) && (
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {!hideSearch && (
            <div className="flex-1 max-w-2xl w-full">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder={`Search ${title}...`}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-white/80 backdrop-blur-xl px-7 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2.5rem] border border-zen-brown/15 shadow-2xl shadow-zen-brown/5 focus:bg-white focus:border-zen-brown/30 focus:ring-8 focus:ring-zen-brown/5 outline-none transition-all duration-700 font-serif text-lg text-zen-brown placeholder:text-zen-brown/20"
                />
                <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-700 group-focus-within:scale-110">
                  <Search className="text-zen-brown/10 group-focus-within:text-zen-brown/40" size={22} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-5 w-full lg:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {!hideBranchSelector && (
              <div className="shrink-0">
                <BranchSelector />
              </div>
            )}

            {headerActions}

            {!hideViewToggle && onViewModeChange && (
              <div className="flex bg-white/80 backdrop-blur-xl p-1.5 rounded-[1.2rem] sm:rounded-[1.8rem] border border-stone-200/50 shadow-xl shadow-zen-brown/5">
                <button 
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2.5 sm:p-3 rounded-[0.8rem] sm:rounded-[1.2rem] transition-all duration-700 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20 scale-105' : 'text-zen-brown/30 hover:text-zen-brown'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => onViewModeChange('table')}
                  className={`p-2.5 sm:p-3 rounded-[0.8rem] sm:rounded-[1.2rem] transition-all duration-700 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20 scale-105' : 'text-zen-brown/30 hover:text-zen-brown'}`}
                >
                  <List size={18} />
                </button>
              </div>
            )}

            {!hideAddButton && addButtonLabel && onAddClick && (
              <button 
                onClick={onAddClick}
                className="shrink-0 h-[52px] sm:h-[64px] rounded-[1.2rem] sm:rounded-[1.8rem] px-6 sm:px-10 shadow-2xl shadow-zen-brown/20 flex items-center justify-center gap-3 active:scale-95 group transition-all duration-700 bg-zen-brown text-white font-bold text-xs sm:text-sm uppercase tracking-[0.2em] relative overflow-hidden"
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
