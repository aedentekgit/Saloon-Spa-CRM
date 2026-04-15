import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ZenPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ZenPagination: React.FC<ZenPaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-10 py-6 border-t border-zen-brown/15 bg-white/50 backdrop-blur-sm rounded-b-[2rem] sm:rounded-b-[3.5rem] mt-10">
      <div className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em]">
        Registry Position <span className="text-zen-brown ml-2">{currentPage} / {totalPages}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 scale-90 sm:scale-100">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-3 rounded-2xl border border-zen-brown/25 text-zen-brown/50 hover:text-zen-brown hover:bg-zen-cream disabled:opacity-30 transition-all active:scale-90"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                    currentPage === page
                      ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20 scale-110'
                      : 'text-zen-brown/40 hover:bg-zen-cream/60'
                  }`}
                >
                  {page}
                </button>
              );
            } else if (
              page === currentPage - 2 ||
              page === currentPage + 2
            ) {
              return <span key={page} className="text-zen-brown/20 text-[10px] items-center flex px-1">···</span>;
            }
            return null;
          })}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-3 rounded-2xl border border-zen-brown/25 text-zen-brown/50 hover:text-zen-brown hover:bg-zen-cream disabled:opacity-30 transition-all active:scale-90"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
