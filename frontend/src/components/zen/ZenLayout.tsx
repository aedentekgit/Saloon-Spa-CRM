import React from 'react';
import { Search, LayoutGrid, List, Plus, Grid } from 'lucide-react';
import { BranchSelector } from './BranchSelector';
import { ZenButton } from './ZenButtons';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'motion/react';

interface ZenLayoutProps {
  children: React.ReactNode;
  topContent?: React.ReactNode;
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
  topContent,
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
  const { loading } = useData();

  return (
    <div className="page-container min-h-screen p-3 sm:p-6 lg:p-10 pt-2 sm:pt-6 lg:pt-10 relative">
      
      {/* Top Loading Progress Bar */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-zen-sand via-zen-primary to-zen-sand z-[1000]"
          />
        )}
      </AnimatePresence>
      
      {/* Spacer for removed title */}
      <div className="h-0" />
      
      {topContent && (
        <div className="mb-6">
          {topContent}
        </div>
      )}
      
      {(!hideSearch || !hideBranchSelector || !hideViewToggle || (!hideAddButton && addButtonLabel) || headerActions) && (
        <div className="zen-pointed-surface border border-zen-stone bg-white shadow-[0_16px_40px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-8">
            {!hideSearch && (
              <div className="flex-1 w-full flex flex-col gap-2.5">
                <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">{title || 'Records'} Search</label>
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder={`Search ${title?.toLowerCase() || 'records'}...`}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-[52px] pl-[52px] pr-6 bg-white/70 border border-zen-brown/10 rounded-[1.15rem] focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row w-full lg:w-auto flex-wrap items-stretch sm:items-end justify-end gap-5 lg:gap-8 lg:ml-auto">
              {!hideBranchSelector && (
                <div className="flex flex-col gap-2.5 min-w-0 w-full sm:w-auto shrink-0">
                  <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Location</label>
                  <BranchSelector />
                </div>
              )}

              {headerActions && headerActions}

              {!hideViewToggle && onViewModeChange && (
                <div className="flex flex-col gap-2.5">
                  <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Perspective</label>
                  <div className="flex items-center h-[52px] bg-zen-cream/50 p-1 rounded-[1.15rem] border border-zen-stone shadow-inner shrink-0">
                    <button 
                      onClick={() => onViewModeChange('grid')}
                      className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all duration-500 ${viewMode === 'grid' ? 'bg-white text-zen-sand shadow-sm' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white/50'}`}
                    >
                      <Grid size={16} />
                    </button>
                    <button 
                      onClick={() => onViewModeChange('table')}
                      className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all duration-500 ${viewMode === 'table' ? 'bg-white text-zen-sand shadow-sm' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white/50'}`}
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
              )}

              {!hideAddButton && addButtonLabel && onAddClick && (
                <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                  <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Management</label>
                  <button 
                    onClick={onAddClick}
                    className="w-full sm:w-auto shrink-0 h-[52px] rounded-[1.15rem] px-8 shadow-sm flex items-center justify-center gap-2 active:scale-95 group transition-all duration-700 bg-zen-brown text-white font-black text-[10px] uppercase tracking-[0.2em] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-zen-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <span className="relative z-10">{addButtonLabel}</span>
                    <div className="group-hover:rotate-180 transition-transform duration-700 relative z-10 shrink-0">
                      {addButtonIcon}
                    </div>
                  </button>
                </div>
              )}
            </div>
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
