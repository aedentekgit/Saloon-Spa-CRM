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
  hideBranchSelector = false
}: ZenLayoutProps) => {

  return (
    <div className="page-container min-h-screen p-4 sm:p-6 lg:p-10 animate-in fade-in duration-1000">
      


      {/* Search and Action Bar */}
      <div className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {!hideSearch && (
          <div className="flex-1 max-w-2xl w-full">
            <div className="relative group">
              <input 
                type="text" 
                placeholder={`Search ${title}...`}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-white/60 backdrop-blur-md px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] border border-zen-brown/15 shadow-xl shadow-zen-brown/15 focus:bg-white focus:border-zen-brown/35 focus:ring-4 focus:ring-zen-brown/5 outline-none transition-all duration-500 font-serif text-base sm:text-lg text-zen-brown placeholder:text-zen-brown/20"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-500 group-focus-within:scale-110">
                <Search className="text-zen-brown/10 group-focus-within:text-zen-brown/30" size={20} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 sm:gap-4 self-end md:self-auto">
          {!hideBranchSelector && (
            <div className="shrink-0">
              <BranchSelector />
            </div>
          )}

          {onViewModeChange && (
            <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-xl sm:rounded-2xl border border-zen-brown/15 shadow-md">
              <button 
                onClick={() => onViewModeChange('grid')}
                className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-500 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => onViewModeChange('table')}
                className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-500 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown'}`}
              >
                <List size={18} />
              </button>
            </div>
          )}

          {!hideAddButton && addButtonLabel && onAddClick && (
            <button 
              onClick={onAddClick}
              className="!rounded-xl sm:!rounded-2xl !py-4 sm:!py-5 px-6 sm:px-8 shadow-xl shadow-zen-brown/10 flex items-center justify-center gap-3 active:scale-95 group transition-all duration-500 bg-zen-brown text-white font-bold text-xs sm:text-sm uppercase tracking-widest min-w-fit"
            >
              <span className="hidden xs:inline">{addButtonLabel}</span>
              <div className="group-hover:rotate-90 transition-transform duration-500">
                {addButtonIcon}
              </div>
            </button>
          )}
        </div>
      </div>

      <main className="pb-20">
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
