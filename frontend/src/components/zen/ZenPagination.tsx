import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ZenPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PaginationItem = number | 'ellipsis';

const buildPaginationItems = (currentPage: number, totalPages: number): PaginationItem[] => {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (index > 0 && previous !== undefined && page - previous > 1) {
      items.push('ellipsis');
    }
    items.push(page);
  });

  return items;
};

export const ZenPagination: React.FC<ZenPaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginationItems = buildPaginationItems(safeCurrentPage, totalPages);
  const progress = (safeCurrentPage / totalPages) * 100;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <nav
      aria-label="Pagination"
      className="w-full rounded-[1.5rem] border border-zen-brown/10 bg-white/90 backdrop-blur-xl px-4 sm:px-6 py-4 shadow-[0_20px_60px_-35px_rgba(74,55,40,0.45)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zen-brown/5 text-zen-brown/40 ring-1 ring-zen-brown/10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Pg</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zen-brown/30">Pagination</p>
            <p className="text-sm sm:text-base font-semibold text-zen-brown">
              Page {safeCurrentPage} of {totalPages}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zen-brown/10 bg-white px-4 text-sm font-bold text-zen-brown/70 transition-all duration-300 hover:border-zen-brown/20 hover:bg-zen-cream/50 hover:text-zen-brown active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} strokeWidth={2.25} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {paginationItems.map((item, index) => {
              if (item === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-11 w-10 items-center justify-center text-sm font-black tracking-[0.3em] text-zen-brown/25"
                  >
                    ...
                  </span>
                );
              }

              const isActive = item === safeCurrentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => goToPage(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-3 text-sm font-bold transition-all duration-300 active:scale-95 ${
                    isActive
                      ? 'border-zen-brown bg-zen-brown text-white shadow-[0_12px_24px_-16px_rgba(74,55,40,0.7)]'
                      : 'border-zen-brown/10 bg-white text-zen-brown/60 hover:border-zen-brown/20 hover:bg-zen-cream/50 hover:text-zen-brown'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zen-brown/10 bg-white px-4 text-sm font-bold text-zen-brown/70 transition-all duration-300 hover:border-zen-brown/20 hover:bg-zen-cream/50 hover:text-zen-brown active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} strokeWidth={2.25} />
          </button>
        </div>

        <div className="hidden xl:flex min-w-[180px] flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zen-brown/30">Progress</span>
          <div className="mt-3 h-2 w-44 overflow-hidden rounded-full bg-zen-brown/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-zen-brown to-zen-sand transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] font-medium text-zen-brown/35">Use the arrows or page numbers</p>
        </div>
      </div>
    </nav>
  );
};
