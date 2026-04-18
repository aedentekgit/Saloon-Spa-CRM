import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Sparkles, Eye, EyeOff } from 'lucide-react';
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
  label, options = [], value, onChange, placeholder, 
  className = "", icon: Icon, hideLabel, variant = 'line',
  disabled
}: DropdownProps) => {
  const safeOptions = Array.isArray(options) ? options : [];
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
          ? "h-[48px] sm:h-[52px] bg-white/95 backdrop-blur-md px-5 rounded-[1rem] border border-zen-brown/15 flex items-center justify-between gap-3 group-hover:border-zen-brown/30 transition-all cursor-pointer"
          : "w-full px-1 pb-3 bg-transparent border-b border-zen-brown/25 flex items-center justify-between cursor-pointer group-hover:border-zen-brown/40 group-focus-within:border-zen-brown transition-all"
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
          className={`fixed bg-white border border-zen-brown/15 animate-in fade-in slide-in-from-top-2 duration-300 z-[99999] overflow-y-auto
            ${window.innerWidth < 640 ? 'inset-x-4 top-1/2 -translate-y-1/2 rounded-[1rem] max-h-[70vh]' : 'rounded-[1rem] max-h-60'}
          `}
          style={window.innerWidth >= 640 ? {
            minWidth: Math.max(160, dropdownRef.current?.getBoundingClientRect().width || 0),
            left: dropdownRef.current?.getBoundingClientRect().left,
            top: (dropdownRef.current?.getBoundingClientRect().bottom || 0) + 8
          } : {}}
        >
          <div className="py-2">
            {window.innerWidth < 640 && (
              <div className="px-8 pt-6 pb-2 border-b border-zen-brown/15 mb-2">
                <p className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">{label || 'Select'}</p>
                <h3 className="text-lg font-serif font-bold text-zen-brown mt-1">Registry Selection</h3>
              </div>
            )}
            {safeOptions.map((opt) => (
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

export const ZenAutocomplete = ({ 
  label, options, value, onChange, placeholder, icon: Icon, className = "", 
  subtextKey = 'subtext', disabled
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Synchronize search term with external value if needed
  useEffect(() => {
    if (value) {
      const selected = options.find((o: any) => o.id === value || o.name === value);
      if (selected) setSearchTerm(selected.name);
    } else {
      setSearchTerm('');
    }
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm || value === searchTerm) return options.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return options.filter((opt: any) => 
      opt.name.toLowerCase().includes(term) || 
      (opt[subtextKey] && opt[subtextKey].toLowerCase().includes(term))
    ).slice(0, 15);
  }, [options, searchTerm, value, subtextKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) &&
          listRef.current && !listRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1 relative group ${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`} ref={containerRef}>
      <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">{label}</label>
      <div className="w-full px-1 pb-3 bg-transparent border-b border-zen-brown/25 flex items-center justify-between group-hover:border-zen-brown/40 group-focus-within:border-zen-brown transition-all">
        <div className="flex items-center gap-3 flex-1">
          {Icon && <Icon size={16} className="text-zen-brown/20 group-focus-within:text-zen-brown" />}
          <input 
            type="text"
            className="w-full bg-transparent outline-none font-serif text-lg text-zen-brown placeholder:text-zen-brown/20"
            placeholder={placeholder || `Search ${label}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              if (!e.target.value) onChange('');
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && createPortal(
        <div 
          ref={listRef}
          className={`fixed bg-white/95 backdrop-blur-xl border border-zen-brown/15 animate-in fade-in slide-in-from-top-2 duration-500 z-[99999] overflow-y-auto
            ${window.innerWidth < 640 ? 'inset-x-4 top-1/2 -translate-y-1/2 rounded-[1.5rem] max-h-[60vh]' : 'rounded-[1rem] max-h-[320px] border border-zen-brown/15'}
          `}
          style={window.innerWidth >= 640 ? {
            width: containerRef.current?.getBoundingClientRect().width,
            left: containerRef.current?.getBoundingClientRect().left,
            top: (containerRef.current?.getBoundingClientRect().bottom || 0) + 8
          } : {}}
        >
          <div className="py-4 px-2">
            {filteredOptions.map((opt: any) => (
              <div 
                key={opt.id || opt.name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.id || opt.name);
                  setSearchTerm(opt.name);
                  setIsOpen(false);
                }}
                className="px-6 py-4 rounded-[1rem] transition-all cursor-pointer hover:bg-zen-cream group/item flex flex-col"
              >
                <span className="text-sm font-serif font-black text-zen-brown group-hover/item:text-zen-sand transition-colors">{opt.name}</span>
                {opt[subtextKey] && (
                  <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5">{opt[subtextKey]}</span>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const ZenInput = ({ label, icon: Icon, prefix, variant = 'light', type, ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  return (
    <div className={`space-y-2 group ${props.containerClassName || ''}`}>
      <label className={`text-[9px] font-bold uppercase tracking-widest ml-1 ${variant === 'dark' ? 'text-white/40' : 'text-zen-brown/30'}`}>{label}</label>
      <div className="relative flex items-center px-1">
        {Icon && <Icon className={`absolute left-1 bottom-3 transition-colors ${variant === 'dark' ? 'text-white/20' : 'text-zen-brown/10'} group-focus-within:text-zen-brown`} size={16} />}
        {prefix && (
          <span className={`absolute ${Icon ? 'left-8' : 'left-2'} bottom-3 text-sm font-bold border-r border-zen-brown/25 pr-2 mr-2 whitespace-nowrap ${variant === 'dark' ? 'text-white/60' : 'text-zen-brown/40'}`}>
            {prefix}
          </span>
        )}
        <input 
          {...props}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`w-full pb-2 ${Icon ? 'pl-8' : 'pl-1'} bg-transparent border-b border-zen-brown/25 outline-none transition-all font-medium text-sm sm:text-base placeholder:text-zen-brown/30 ${prefix ? (Icon ? 'pl-16' : 'pl-12') : ''} ${variant === 'dark' ? 'text-white focus:border-white/40' : 'text-zen-brown focus:border-zen-brown'} ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${props.className || ''} ${isPassword ? 'pr-8' : ''} group-hover:border-zen-brown/40`}
          style={prefix ? { paddingLeft: Icon ? `calc(1.75rem + ${prefix.length * 0.6}rem + 1rem)` : `calc(0.25rem + ${prefix.length * 0.6}rem + 1rem)` } : {}}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 bottom-2 p-1 text-zen-brown/20 hover:text-zen-brown transition-all hover:scale-110 active:scale-90"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

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
            isToday ? 'bg-zen-cream/40 text-zen-brown border border-zen-brown/35' : 
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
        className="w-full px-1 pb-3 bg-transparent border-b border-zen-brown/25 flex items-center justify-between cursor-pointer group-hover:border-zen-brown/40 group-focus-within:border-zen-brown transition-all group/input"
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
          className={`fixed bg-white/95 backdrop-blur-xl border border-white/80 animate-in zoom-in-95 fade-in duration-300 z-[99999] min-w-[320px]
            ${window.innerWidth < 640 ? 'inset-x-4 top-1/2 -translate-y-1/2 rounded-[1.5rem] p-8' : 'rounded-[1rem] p-6'}
          `}
          style={window.innerWidth >= 640 ? {
            left: Math.min(window.innerWidth - 350, containerRef.current?.getBoundingClientRect().left || 0),
            top: (containerRef.current?.getBoundingClientRect().bottom || 0) + 12
          } : {}}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-8 px-1">
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
          <div className="mt-6 pt-4 border-t border-zen-brown/15 flex justify-between items-center px-1">
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
      className={`w-full p-4 sm:p-6 bg-zen-cream/5 border border-zen-brown/15 rounded-[1.5rem] sm:rounded-[1rem] outline-none focus:bg-white focus:border-zen-brown/30 transition-all font-serif text-base sm:text-lg text-zen-brown h-28 sm:h-32 resize-none shadow-inner ${props.className || ''}`}
    />
  </div>
);

export const ZenMonthPicker = ({ label, value, onChange, className = "", hideLabel }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = useMemo(() => {
    const res = [];
    let curr = dayjs().startOf('month');
    for (let i = 0; i < 12; i++) {
      res.push({
        label: curr.format('MMMM YYYY'),
        value: curr.format('YYYY-MM')
      });
      curr = curr.subtract(1, 'month');
    }
    return res;
  }, []);

  const selectedMonth = months.find(m => m.value === value) || months[0];

  return (
    <div className={`relative group ${className}`} ref={containerRef}>
      {!hideLabel && <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] block mb-4">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer group/trigger"
      >
         <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-zen-cream/30 flex items-center justify-center text-zen-brown/30 group-hover/trigger:text-zen-brown transition-all duration-500">
            <Calendar size={16} strokeWidth={1.5} />
          </div>
          <span className="text-lg font-serif font-bold text-zen-brown tracking-tight">
            {selectedMonth.label}
          </span>
        </div>
        <ChevronDown 
          size={20} 
          className={`text-zen-brown/20 transition-transform duration-700 ease-in-out ${isOpen ? 'rotate-180 text-zen-brown' : ''}`} 
        />
      </div>

       <div className="h-px w-full bg-zen-brown/5 mt-4 mb-1" />

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed bg-white/95 backdrop-blur-2xl border border-white/80 overflow-hidden animate-in zoom-in-95 fade-in duration-500 z-[99999] p-4 min-w-[280px]
            ${window.innerWidth < 640 ? 'inset-x-4 top-1/2 -translate-y-1/2 rounded-[1.5rem]' : 'rounded-[1rem]'}
          `}
          style={window.innerWidth >= 640 ? {
            left: Math.min(window.innerWidth - 300, containerRef.current?.getBoundingClientRect().left || 0),
            top: (containerRef.current?.getBoundingClientRect().bottom || 0) + 12
          } : {}}
        >
          <div className="max-h-[320px] overflow-y-auto scrollbar-hide space-y-1">
            {months.map((m) => (
              <div 
                key={m.value}
                onClick={() => {
                  onChange(m.value);
                  setIsOpen(false);
                }}
                className={`px-8 py-5 rounded-[1rem] text-sm font-serif transition-all duration-300 cursor-pointer flex items-center justify-between group/item
                  ${value === m.value 
                    ? 'bg-zen-brown text-white shadow-xl scale-[1.02]' 
                    : 'text-zen-brown/40 hover:bg-zen-cream/40 hover:text-zen-brown hover:translate-x-1'
                  }
                `}
              >
                <span className={`font-bold ${value === m.value ? 'text-white' : ''}`}>{m.label}</span>
                {value === m.value && <Sparkles size={14} className="text-white/40 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
