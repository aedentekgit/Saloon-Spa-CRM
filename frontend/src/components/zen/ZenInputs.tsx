import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

interface DropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  icon?: any;
  hideLabel?: boolean;
  variant?: 'line' | 'pill';
  disabled?: boolean;
}

export const ZenDropdown = ({ 
  label, options, value, onChange, placeholder, 
  className = "", icon: Icon, hideLabel, variant = 'line',
  disabled
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current && dropdownRef.current.contains(target);
      const inList = listRef.current && listRef.current.contains(target);
      if (!inTrigger && !inList) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1 group relative ${isOpen ? 'z-[9999]' : 'z-10'} ${className} ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`} ref={dropdownRef}>
      {!hideLabel && <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">{label}</label>}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={variant === 'pill' 
          ? "bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-zen-brown/5 flex items-center justify-between gap-3 shadow-sm group-hover:border-zen-brown/20 transition-all cursor-pointer hover:shadow-md"
          : "w-full pb-3 bg-transparent border-b border-zen-brown/10 flex items-center justify-between cursor-pointer group-focus-within:border-zen-brown transition-all"
        }
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={16} className={variant === 'pill' ? "text-zen-brown/30 group-hover:text-zen-brown" : "text-zen-brown/20"} />}
          <span className={variant === 'pill' 
            ? `font-serif text-sm ${value ? 'text-zen-brown font-bold' : 'text-zen-brown/30'}`
            : `font-serif text-lg ${value ? 'text-zen-brown' : 'text-zen-brown/20'}`
          }>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={variant === 'pill' ? 14 : 18} className={`text-zen-brown/20 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && createPortal(
        <div 
          ref={listRef}
          className="fixed bg-white rounded-[2rem] shadow-[-10px_20px_60px_-15px_rgba(74,55,40,0.15)] border border-zen-brown/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-[99999]"
          style={{
            width: dropdownRef.current?.getBoundingClientRect().width,
            left: dropdownRef.current?.getBoundingClientRect().left,
            top: (dropdownRef.current?.getBoundingClientRect().bottom || 0) + 8
          }}
        >
          <div className="max-h-60 overflow-y-auto scrollbar-hide">
            {options.map((opt) => (
              <div 
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent outside-click from firing first
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`px-6 py-4 text-sm font-medium transition-all cursor-pointer hover:bg-zen-cream underline-offset-4 ${value === opt ? 'bg-zen-cream/50 text-zen-brown font-bold' : 'text-zen-brown/60'}`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const ZenInput = ({ label, icon: Icon, prefix, variant = 'light', ...props }: any) => (
  <div className={`space-y-2 group ${props.containerClassName || ''}`}>
    <label className={`text-[9px] font-bold uppercase tracking-widest ml-1 ${variant === 'dark' ? 'text-white/40' : 'text-zen-brown/30'}`}>{label}</label>
    <div className="relative flex items-center">
      {Icon && <Icon className={`absolute left-0 bottom-3 ${variant === 'dark' ? 'text-white/20' : 'text-zen-brown/10'}`} size={16} />}
      {prefix && (
        <span className={`absolute ${Icon ? 'left-7' : 'left-1'} bottom-3 text-sm font-bold border-r border-zen-brown/10 pr-2 mr-2 whitespace-nowrap ${variant === 'dark' ? 'text-white/60' : 'text-zen-brown/40'}`}>
          {prefix}
        </span>
      )}
      <input 
        {...props}
        className={`w-full pb-2 ${Icon ? 'pl-7' : 'pl-1'} bg-transparent border-b border-zen-brown/10 outline-none transition-all font-medium text-sm sm:text-base placeholder:text-zen-brown/30 ${prefix ? (Icon ? 'pl-16' : 'pl-12') : ''} ${variant === 'dark' ? 'text-white focus:border-white/40' : 'text-zen-brown focus:border-zen-brown'} ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${props.className || ''}`}
        style={prefix ? { paddingLeft: Icon ? `calc(1.75rem + ${prefix.length * 0.6}rem + 1rem)` : `calc(0.25rem + ${prefix.length * 0.6}rem + 1rem)` } : {}}
      />
    </div>
  </div>
);

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  icon?: any;
}

export const ZenDatePicker = ({ label, value, onChange, className = "", icon: Icon = Calendar }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(dayjs(value || undefined));
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) &&
          calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = viewDate.daysInMonth();
  const startDay = viewDate.startOf('month').day();
  const days = [];

  // Padding days from previous month
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8 opacity-0" />);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = viewDate.date(d).format('YYYY-MM-DD');
    const isSelected = value === date;
    const isToday = dayjs().format('YYYY-MM-DD') === date;

    days.push(
      <button
        key={d}
        type="button"
        onClick={() => {
          onChange(date);
          setIsOpen(false);
        }}
        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all duration-300 flex items-center justify-center
          ${isSelected ? 'bg-zen-brown text-white shadow-lg scale-110 z-10' : 
            isToday ? 'bg-zen-cream/40 text-zen-brown border border-zen-brown/20' : 
            'text-zen-brown/60 hover:bg-zen-cream/50 hover:text-zen-brown'}
        `}
      >
        {d}
      </button>
    );
  }

  return (
    <div className={`space-y-1 relative group ${className}`} ref={containerRef}>
      <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pb-3 bg-transparent border-b border-zen-brown/10 flex items-center justify-between cursor-pointer group-focus-within:border-zen-brown transition-all group/input"
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className="text-zen-brown/20 group-hover/input:text-zen-brown/40 transition-colors" />
          <span className={`font-serif text-lg ${value ? 'text-zen-brown font-bold' : 'text-zen-brown/20'}`}>
            {value ? dayjs(value).format('DD / MM / YYYY') : 'Select Date'}
          </span>
        </div>
        <ChevronDown size={18} className={`text-zen-brown/20 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div 
          ref={calendarRef}
          className="fixed bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[-20px_40px_80px_-20px_rgba(74,55,40,0.2)] border border-white/50 animate-in zoom-in-95 fade-in duration-300 z-[99999] min-w-[320px]"
          style={{
            left: containerRef.current?.getBoundingClientRect().left,
            top: (containerRef.current?.getBoundingClientRect().bottom || 0) + 12
          }}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6 px-1">
            <button type="button" onClick={() => setViewDate(viewDate.subtract(1, 'month'))} className="p-2 hover:bg-zen-cream rounded-full transition-colors text-zen-brown/40 hover:text-zen-brown">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h4 className="font-serif font-black text-zen-brown text-sm tracking-tight capitalize">{viewDate.format('MMMM')}</h4>
              <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-[0.2em]">{viewDate.format('YYYY')}</p>
            </div>
            <button type="button" onClick={() => setViewDate(viewDate.add(1, 'month'))} className="p-2 hover:bg-zen-cream rounded-full transition-colors text-zen-brown/40 hover:text-zen-brown">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 mb-2">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-[8px] font-black text-zen-brown/20 uppercase py-2">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-zen-brown/5 flex justify-between items-center px-1">
            <button 
              type="button"
              onClick={() => {
                const today = dayjs().format('YYYY-MM-DD');
                onChange(today);
                setViewDate(dayjs());
                setIsOpen(false);
              }}
              className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              Today
            </button>
            <button 
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-[9px] font-black text-zen-brown/30 uppercase tracking-widest hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const ZenTextarea = ({ label, ...props }: any) => (
  <div className="space-y-3 group mt-4">
    <label className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">{label}</label>
    <textarea 
      {...props}
      className={`w-full p-4 sm:p-6 bg-zen-cream/5 border border-zen-brown/5 rounded-[1.5rem] sm:rounded-[2rem] outline-none focus:bg-white focus:border-zen-brown/20 transition-all font-serif text-base sm:text-lg text-zen-brown h-28 sm:h-32 resize-none shadow-inner ${props.className || ''}`}
    />
  </div>
);
