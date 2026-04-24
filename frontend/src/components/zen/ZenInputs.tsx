import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
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
  fontFamily?: string;
}

export const useFloatingAnchor = (
  anchorRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
  offset = 8,
  maxWidth?: number
) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!isOpen) return;

    let rafId = 0;
    const updatePosition = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const anchor = anchorRef.current;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const left = Math.min(
          Math.max(12, rect.left),
          Math.max(12, viewportWidth - (maxWidth || rect.width) - 12)
        );

        setStyle({
          width: maxWidth || rect.width,
          left,
          top: rect.bottom + offset
        });
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, isOpen, offset, maxWidth]);

  return style;
};

export const ZenDropdown = ({ 
  label, options = [], value, onChange, placeholder, 
  className = "", icon: Icon, hideLabel, variant = 'line',
  disabled, fontFamily
}: DropdownProps) => {
  const safeOptions = Array.isArray(options) ? options : [];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(dropdownRef, isOpen, 8);

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
          ? "h-[46px] sm:h-[50px] bg-white px-5 rounded-[1.35rem] border-[1.5px] border-zen-brown/30 flex items-center justify-between gap-4 group-hover:border-zen-brown/60 transition-all cursor-pointer shadow-md"
          : "w-full px-1 pb-4 bg-transparent border-b-[2px] border-zen-brown/30 flex items-center justify-between cursor-pointer group-hover:border-zen-brown/60 group-focus-within:border-zen-brown transition-all"
        }
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {Icon && <Icon size={16} className={variant === 'pill' ? "text-zen-brown/50 group-hover:text-zen-brown flex-shrink-0" : "text-zen-brown/40 flex-shrink-0"} />}
          <span 
            className={variant === 'pill' 
              ? `font-serif text-sm sm:text-base truncate ${value ? 'text-zen-brown font-black' : 'text-zen-brown/40'}`
              : `font-serif text-sm sm:text-base truncate ${value ? 'text-zen-brown font-semibold' : 'text-zen-brown/30'}`
            }
            style={fontFamily ? { fontFamily } : {}}
          >
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={variant === 'pill' ? 13 : 18} className={`text-zen-brown/20 flex-shrink-0 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && createPortal(
        <div 
          ref={listRef}
          className={`fixed bg-white border border-zen-brown/15 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 z-[99999] overflow-y-auto rounded-[1rem] max-h-60`}
          style={window.innerWidth < 640 ? {
            left: 16,
            top: '50%',
            width: 'calc(100vw - 32px)',
            transform: 'translateY(-50%)',
            maxHeight: '70vh'
          } : floatingStyle}
        >
          <div className="py-2">
            {window.innerWidth < 640 && (
              <div className="px-8 pt-6 pb-2 border-b border-zen-brown/15 mb-2">
                <p className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">{label || 'Select'}</p>
                <h3 className="text-base font-serif font-bold text-zen-brown mt-1">Registry Selection</h3>
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
                className={`px-5 py-3 text-sm font-medium transition-all cursor-pointer hover:bg-zen-cream underline-offset-4 ${value === opt ? 'bg-zen-cream/50 text-zen-brown font-bold' : 'text-zen-brown/60'}`}
                style={['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Poppins', 'Montserrat'].includes(opt) ? { fontFamily: opt } : {}}
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
  subtextKey = 'subtext', disabled, allowCustom = false, hideLabel = false
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(containerRef, isOpen, 8);

  // Synchronize search term with external value if needed
  useEffect(() => {
    if (value) {
      const selected = options.find((o: any) => o.id === value || o.name === value);
      if (selected) {
        setSearchTerm(selected.name);
      } else if (allowCustom) {
        setSearchTerm(value);
      }
    } else {
      setSearchTerm('');
    }
  }, [value, options, allowCustom]);

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
      {!hideLabel && <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">{label}</label>}
      <div className="w-full px-1 pb-3 bg-transparent border-b border-zen-brown/25 flex items-center justify-between group-hover:border-zen-brown/40 group-focus-within:border-zen-brown transition-all">
        <div className="flex items-center gap-3 flex-1">
          {Icon && <Icon size={16} className="text-zen-brown/20 group-focus-within:text-zen-brown" />}
          <input 
            type="text"
            className="w-full bg-transparent outline-none font-serif text-sm sm:text-base text-zen-brown placeholder:text-zen-brown/20"
            placeholder={placeholder || `Search ${label}...`}
            value={searchTerm}
            onChange={(e) => {
              const newVal = e.target.value;
              setSearchTerm(newVal);
              setIsOpen(true);
              if (allowCustom) {
                onChange(newVal);
              } else if (!newVal) {
                onChange('');
              }
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && createPortal(
        <div 
          ref={listRef}
          className={`fixed bg-white border border-zen-brown/15 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-500 z-[99999] overflow-y-auto rounded-[1rem] max-h-[320px] border border-zen-brown/15`}
          style={window.innerWidth < 640 ? {
            left: 16,
            top: '50%',
            width: 'calc(100vw - 32px)',
            transform: 'translateY(-50%)',
            maxHeight: '60vh'
          } : floatingStyle}
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

export const ZenInput = ({ label, icon: Icon, prefix, variant = 'professional', type, required, ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  return (
    <div className={`space-y-3 group ${props.containerClassName || ''}`}>
      <label className={`text-[10px] font-black uppercase tracking-[0.4em] ml-1.5 flex items-center gap-1 ${variant === 'dark' ? 'text-white/60' : 'text-zen-brown/40'}`}>
        {label}
        {required && <span className="text-red-400 text-xs mt-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {variant === 'professional' ? (
          <div className={`w-full relative flex items-center transition-all duration-300 ${props.disabled ? 'opacity-40' : ''}`}>
            {Icon && <Icon className="absolute left-5 text-zen-brown/30 group-focus-within:text-zen-brown transition-colors" size={16} />}
            <input 
              {...props}
              type={isPassword ? (showPassword ? 'text' : 'password') : type}
              className={`w-full py-3 sm:py-3.5 ${Icon ? 'pl-12' : 'pl-4'} pr-4 bg-white border border-zen-brown/10 rounded-2xl outline-none transition-all font-serif text-sm sm:text-base text-zen-brown placeholder:text-zen-brown/20 focus:border-zen-sand/40 focus:ring-4 focus:ring-zen-sand/5 shadow-sm group-hover:border-zen-brown/20 ${props.className || ''}`}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 text-zen-brown/20 hover:text-zen-brown transition-all"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        ) : (
          <div className="w-full relative flex items-center px-1">
            {Icon && <Icon className={`absolute left-1 bottom-4 transition-colors ${variant === 'dark' ? 'text-white/40' : 'text-zen-brown/40'} group-focus-within:text-zen-brown`} size={18} />}
            {prefix && (
              <span className={`absolute ${Icon ? 'left-8' : 'left-2'} bottom-4 text-sm font-bold border-r border-zen-brown/50 pr-3 mr-2 whitespace-nowrap ${variant === 'dark' ? 'text-white/70' : 'text-zen-brown/60'}`}>
                {prefix}
              </span>
            )}
            <input 
              {...props}
              type={isPassword ? (showPassword ? 'text' : 'password') : type}
              className={`w-full pb-3 ${Icon ? 'pl-9' : 'pl-2'} bg-transparent border-b-[2px] border-zen-brown/30 outline-none transition-all font-serif text-sm sm:text-base text-zen-brown placeholder:text-zen-brown/40 ${prefix ? (Icon ? 'pl-20' : 'pl-16') : ''} ${variant === 'dark' ? 'text-white border-white/20 focus:border-white/60' : 'text-zen-brown focus:border-zen-brown'} ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${props.className || ''} ${isPassword ? 'pr-10' : ''} group-hover:border-zen-brown/60`}
              style={prefix ? { paddingLeft: Icon ? `calc(2rem + ${prefix.length * 0.7}rem + 1rem)` : `calc(0.5rem + ${prefix.length * 0.7}rem + 1rem)` } : {}}
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
  hideLabel?: boolean;
}

export const ZenDatePicker = ({ 
  label, value, onChange, className = "", 
  icon: Icon = Calendar, hideLabel 
}: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(dayjs(value || undefined));
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(containerRef, isOpen, 12, 350);

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
    <div className={`space-y-3 relative group ${className}`} ref={containerRef}>
      <label className={`text-[10px] font-black uppercase tracking-[0.4em] text-zen-brown/40 ml-1.5 ${hideLabel ? 'sr-only' : ''}`}>{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-1 pb-4 bg-transparent border-b-[2px] border-zen-brown/30 flex items-center justify-between cursor-pointer group-hover:border-zen-brown/60 group-focus-within:border-zen-brown transition-all group/input"
      >
        <div className="flex items-center gap-4">
          <Icon size={18} className="text-zen-brown/40 group-hover/input:text-zen-brown/60 transition-colors" />
          <span className={`font-serif text-xl ${value ? 'text-zen-brown font-black' : 'text-zen-brown/40'}`}>
            {value ? dayjs(value).format('DD / MM / YYYY') : 'Select Date'}
          </span>
        </div>
        <ChevronDown size={20} className={`text-zen-brown/40 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </div>



      {isOpen && createPortal(
        <div 
          ref={calendarRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-[0_30px_100px_-20px_rgba(45,45,45,0.15)] animate-in zoom-in-95 fade-in duration-300 z-[99999] min-w-[320px] rounded-[1rem] p-6`}
          style={window.innerWidth < 640 ? {
            left: 16,
            top: '50%',
            width: 'calc(100vw - 32px)',
            transform: 'translateY(-50%)',
            minWidth: 'unset',
            maxHeight: '70vh'
          } : floatingStyle}
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
              className={`w-full p-3.5 sm:p-4 bg-white border border-zen-brown/15 rounded-[1.25rem] outline-none focus:border-zen-brown/30 transition-all font-serif text-sm sm:text-base text-zen-brown h-24 sm:h-28 resize-none shadow-sm ${props.className || ''}`}
    />

  </div>
);

export const ZenMonthPicker = ({ label, value, onChange, className = "", hideLabel }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(containerRef, isOpen, 12, 300);

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
          <span className="text-sm sm:text-base font-serif font-bold text-zen-brown tracking-tight">
            {selectedMonth.label}
          </span>
        </div>
        <ChevronDown 
          size={20} 
          className={`text-zen-brown/20 transition-transform duration-700 ease-in-out ${isOpen ? 'rotate-180 text-zen-brown' : ''}`} 
        />
      </div>

       <div className="h-px w-full bg-zen-brown/5 mt-3 mb-1" />

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-3xl overflow-hidden animate-in zoom-in-95 fade-in duration-500 z-[99999] p-4 min-w-[280px] rounded-[1rem]`}
          style={window.innerWidth < 640 ? {
            left: 16,
            top: '50%',
            width: 'calc(100vw - 32px)',
            transform: 'translateY(-50%)',
            minWidth: 'unset',
            maxHeight: '70vh'
          } : floatingStyle}
        >
          <div className="max-h-[320px] overflow-y-auto scrollbar-hide space-y-1">
            {months.map((m) => (
              <div 
                key={m.value}
                onClick={() => {
                  onChange(m.value);
                  setIsOpen(false);
                }}
                className={`px-6 py-4 rounded-[1rem] text-sm font-serif transition-all duration-300 cursor-pointer flex items-center justify-between group/item
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
