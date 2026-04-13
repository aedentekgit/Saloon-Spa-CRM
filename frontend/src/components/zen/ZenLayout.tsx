import React from 'react';
import { Search, LayoutGrid, List, ChevronDown } from 'lucide-react';

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

import { BranchSelector } from './BranchSelector';

export const ZenPageLayout = ({
  children,
  title,
  searchTerm = '',
  onSearchChange = () => {},
  viewMode = 'grid',
  onViewModeChange = () => {},
  addButtonLabel,
  onAddClick,
  addButtonIcon,
  hideAddButton = false,
  hideSearch = false,
  hideBranchSelector = false
}: ZenLayoutProps) => {

  return (
    <div className="page-container min-h-screen p-4 sm:p-6 lg:p-10 animate-in fade-in duration-1000">
      
      {/* Global Zen Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-8 lg:mb-12">
        <div className="flex items-center gap-4 flex-1 w-full max-w-xl">
          {!hideSearch && (
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-brown transition-colors" size={18} />
               <input 
                 type="text"
                 placeholder="Search registry..."
                 className="w-full pl-12 pr-6 py-3.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-brown/5 shadow-inner outline-none focus:ring-4 focus:ring-zen-brown/5 transition-all font-serif italic text-zen-brown/60 text-sm"
                 value={searchTerm}
                 onChange={(e) => onSearchChange(e.target.value)}
               />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
          {/* Branch Selector */}
          {!hideBranchSelector && (
             <BranchSelector />
          )}

          {!hideSearch && (
            <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-zen-brown/5 flex shadow-sm">
              <button 
                onClick={() => onViewModeChange('grid')} 
                className={`p-2 rounded-xl transition-all duration-500 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-xl' : 'text-zen-brown/30 hover:text-zen-brown'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => onViewModeChange('table')} 
                className={`p-2 rounded-xl transition-all duration-500 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-xl' : 'text-zen-brown/30 hover:text-zen-brown'}`}
              >
                <List size={18} />
              </button>
            </div>
          )}
          {!hideAddButton && onAddClick && (
            <button 
              onClick={onAddClick} 
              className="flex-1 lg:flex-none flex items-center justify-center space-x-3 bg-zen-brown text-zen-cream px-6 lg:px-8 py-3.5 rounded-2xl font-bold hover:shadow-2xl hover:bg-black transition-all duration-300 text-xs uppercase tracking-widest"
            >
              {addButtonIcon}
              <span className="whitespace-nowrap">{addButtonLabel}</span>
            </button>
          )}
        </div>
      </div>


      <main>
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
