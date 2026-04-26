import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Sparkles, Eye, EyeOff } from 'lucide-react';
import dayjs from 'dayjs';

interface DropdownProps {
  label: string;
  options: string[] | { label: string; value: string }[];
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
          top: rect.bottom + offset,
          transformOrigin: 'top center'
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
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(dropdownRef, isOpen, 8);

  useEffect(() => {
    const onResize = () => setIsCompactViewport(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
          ? "h-[46px] sm:h-[50px] bg-white px-5 rounded-[1.35rem] border border-zen-brown/10 flex items-center justify-between gap-4 group-hover:border-zen-gold/40 transition-all cursor-pointer shadow-sm relative"
          : "w-full px-1 pb-4 bg-transparent border-b-[2px] border-zen-brown/15 flex items-center justify-between cursor-pointer group-hover:border-zen-gold/40 group-focus-within:border-zen-brown transition-all relative"
        }
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {Icon && <Icon size={16} className={variant === 'pill' ? "text-zen-brown/30 group-hover:text-zen-gold flex-shrink-0 transition-colors" : "text-zen-brown/30 flex-shrink-0"} />}
          <span 
            className={variant === 'pill' 
              ? `font-serif text-sm sm:text-base truncate tracking-tight ${value ? 'text-zen-brown font-black' : 'text-zen-brown/30'}`
              : `font-serif text-sm sm:text-base truncate tracking-tight ${value ? 'text-zen-brown font-semibold' : 'text-zen-brown/20'}`
            }
            style={fontFamily ? { fontFamily } : {}}
          >
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={variant === 'pill' ? 14 : 18} className={`text-zen-brown/20 flex-shrink-0 transition-all duration-700 ${isOpen ? 'rotate-180 text-zen-gold' : ''}`} />
        
        {/* Subtle highlight line for pill variant */}
        {variant === 'pill' && (
          <div className="absolute inset-1 rounded-[1.15rem] border border-zen-gold/5 pointer-events-none" />
        )}
      </div>
      
      {isOpen && createPortal(
        <div 
          ref={listRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-[0_30px_70px_-15px_rgba(43,36,64,0.15)] animate-in fade-in slide-in-from-top-2 duration-500 z-[99999] overflow-y-auto rounded-[1.25rem] max-h-64`}
          style={isCompactViewport ? {
            left: 16,
            top: '50%',
            width: 'calc(100vw - 32px)',
            transform: 'translateY(-50%)',
            maxHeight: '70vh'
          } : floatingStyle}
        >
          <div className="py-2.5">
            {isCompactViewport && (
              <div className="px-8 pt-8 pb-4 border-b border-zen-brown/5 mb-3">
                <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.4em]">{label || 'Select'}</p>
                <h3 className="text-base font-serif font-black text-zen-brown mt-1">Registry Selection</h3>
              </div>
            )}
            {safeOptions.map((opt) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              const optValue = typeof opt === 'string' ? opt : opt.value;
              return (
                <div 
                  key={optValue}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  className={`px-6 py-4 text-sm font-medium transition-all duration-300 cursor-pointer flex items-center justify-between group/opt ${value === optValue ? 'bg-zen-cream/60 text-zen-brown font-bold' : 'text-zen-brown/50 hover:bg-zen-cream/30 hover:text-zen-brown hover:translate-x-1'}`}
                  style={['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Poppins', 'Montserrat'].includes(label) ? { fontFamily: label } : {}}
                >
                  <span>{label}</span>
                  {value === optValue && <div className="w-1.5 h-1.5 rounded-full bg-zen-gold shadow-[0_0_8px_rgba(197,163,88,0.5)]" />}
                </div>
              );
            })}
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
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
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

  useEffect(() => {
    const onResize = () => setIsCompactViewport(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
          style={isCompactViewport ? {
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

export const ZenInput = ({ label, icon: Icon, prefix, variant = 'professional', type, required, containerClassName, compact, ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  return (
    <div className={`space-y-2 group ${containerClassName || ''}`}>
      <label className={`text-[9px] font-bold uppercase tracking-[0.3em] ml-1 flex items-center gap-1 ${variant === 'dark' ? 'text-white/60' : 'text-zen-brown/40'}`}>
        {label}
        {required && <span className="text-red-400 text-xs mt-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {variant === 'professional' ? (
          <div className={`w-full relative flex items-center transition-all duration-300 ${props.disabled ? 'opacity-40' : ''}`}>
            {Icon && <Icon className={`absolute ${compact ? 'left-3' : 'left-4'} text-zen-brown/30 group-focus-within:text-zen-brown transition-colors`} size={compact ? 14 : 16} />}
            <input 
              {...props}
              type={isPassword ? (showPassword ? 'text' : 'password') : type}
              className={`w-full ${compact ? 'py-2.5' : 'py-3 sm:py-3.5'} ${Icon ? (compact ? 'pl-9' : 'pl-10') : 'pl-4'} pr-4 bg-white border border-zen-brown/10 rounded-2xl outline-none transition-all font-serif ${compact ? 'text-xs' : 'text-sm sm:text-base'} text-zen-brown placeholder:text-zen-brown/20 focus:border-zen-sand/40 focus:ring-4 focus:ring-zen-sand/5 shadow-sm group-hover:border-zen-brown/20 ${props.className || ''}`}
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

export const ZenDatePicker = (props: any) => (
  <ZenMasterCalendar {...props} selectionType="single" />
);

export const ZenMonthPicker = (props: any) => (
  <ZenMasterCalendar {...props} selectionType="month" />
);

export const ZenTextarea = ({ label, icon: Icon, ...props }: any) => (
  <div className="space-y-3 group mt-4">
    <label className="text-[10px] font-black uppercase tracking-[0.4em] ml-1.5 text-zen-brown/40">{label}</label>
    <div className="relative flex items-start">
      {Icon && <Icon className="absolute left-5 top-5 text-zen-brown/30 group-focus-within:text-zen-brown transition-colors" size={16} />}
      <textarea 
        {...props}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-4 bg-white border border-zen-brown/10 rounded-2xl outline-none transition-all font-serif text-sm sm:text-base text-zen-brown placeholder:text-zen-brown/20 focus:border-zen-sand/40 focus:ring-4 focus:ring-zen-sand/5 shadow-sm group-hover:border-zen-brown/20 h-28 sm:h-32 resize-none ${props.className || ''}`}
      />
    </div>
  </div>
);


export const ZenMasterCalendar = ({ 
  label, 
  selectionType = 'single', 
  value, 
  onChange, 
  className = "", 
  hideLabel = false,
  icon: Icon = Calendar,
  placeholder = "Select Date",
  variant = 'line'
}: {
  label: string;
  selectionType?: 'single' | 'range' | 'month';
  value: any;
  onChange: (val: any) => void;
  className?: string;
  hideLabel?: boolean;
  icon?: any;
  placeholder?: string;
  variant?: 'line' | 'pill';
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(containerRef, isOpen, 12, 340);

  const [viewDate, setViewDate] = useState(dayjs(
    selectionType === 'range' ? (value?.from || dayjs()) : 
    selectionType === 'month' ? (value ? value + '-01' : dayjs()) :
    (value || dayjs())
  ));
  const [currentMode, setCurrentMode] = useState<'days' | 'months' | 'years'>(selectionType === 'month' ? 'months' : 'days');

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

  const daysInMonth = useMemo(() => {
    const start = viewDate.startOf('month').startOf('week');
    const end = viewDate.endOf('month').endOf('week');
    const days = [];
    let curr = start;
    while (curr.isBefore(end) || curr.isSame(end, 'day')) {
      days.push(curr);
      curr = curr.add(1, 'day');
    }
    return days;
  }, [viewDate]);

  const isSelected = (date: dayjs.Dayjs) => {
    if (selectionType === 'single') return dayjs(value).isSame(date, 'day');
    if (selectionType === 'range') {
      return (value?.from && date.isSame(dayjs(value.from), 'day')) || 
             (value?.to && date.isSame(dayjs(value.to), 'day'));
    }
    return false;
  };

  const isInRange = (date: dayjs.Dayjs) => {
    if (selectionType !== 'range' || !value?.from || !value?.to) return false;
    return date.isAfter(dayjs(value.from), 'day') && date.isBefore(dayjs(value.to), 'day');
  };

  const handleDateClick = (date: dayjs.Dayjs) => {
    if (selectionType === 'single') {
      onChange(date.format('YYYY-MM-DD'));
      setIsOpen(false);
    } else if (selectionType === 'range') {
      if (!value?.from || (value.from && value.to)) {
        onChange({ from: date.format('YYYY-MM-DD'), to: null });
      } else {
        const from = dayjs(value.from);
        if (date.isBefore(from)) {
          onChange({ from: date.format('YYYY-MM-DD'), to: value.from });
        } else {
          onChange({ ...value, to: date.format('YYYY-MM-DD') });
        }
      }
    }
  };

  const displayValue = useMemo(() => {
    if (selectionType === 'single') return value ? dayjs(value).format('DD MMM, YYYY') : placeholder;
    if (selectionType === 'month') return value ? dayjs(value + '-01').format('MMMM YYYY') : placeholder;
    if (selectionType === 'range') {
      if (!value?.from) return placeholder;
      if (!value?.to) return `${dayjs(value.from).format('DD MMM')} - ...`;
      return `${dayjs(value.from).format('DD MMM')} - ${dayjs(value.to).format('DD MMM')}`;
    }
    return placeholder;
  }, [value, selectionType, placeholder]);

  return (
    <div className={`relative group ${className}`} ref={containerRef}>
      {!hideLabel && <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] block mb-4">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={variant === 'pill'
          ? "h-[50px] bg-white px-5 rounded-[1.35rem] border border-zen-brown/10 flex items-center justify-between gap-4 hover:border-zen-brown/20 transition-all cursor-pointer shadow-sm relative group/trigger"
          : "flex items-center justify-between cursor-pointer group/trigger"
        }
      >
        <div className="flex items-center gap-4">
          <div className={variant === 'pill' 
            ? "text-zen-brown/30 group-hover/trigger:text-zen-brown transition-colors" 
            : "w-10 h-10 rounded-2xl bg-zen-cream/40 flex items-center justify-center text-zen-brown/30 group-hover/trigger:text-zen-brown transition-all duration-500 border border-zen-brown/5 group-hover/trigger:border-zen-brown/20"
          }>
            <Icon size={18} strokeWidth={1.5} />
          </div>
          <span className={`font-serif tracking-tight ${variant === 'pill' ? 'text-sm font-black text-zen-brown' : 'text-sm sm:text-base font-black text-zen-brown'}`}>
            {displayValue}
          </span>
        </div>
        <ChevronDown 
          size={variant === 'pill' ? 14 : 20} 
          className={`text-zen-brown/20 transition-transform duration-700 ease-in-out ${isOpen ? 'rotate-180 text-zen-brown' : ''}`} 
        />
      </div>

      {variant === 'line' && <div className="h-px w-full bg-zen-brown/5 mt-3 mb-1" />}

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 fade-in duration-500 z-[99999] rounded-[2rem] p-6 w-[340px]`}
          style={window.innerWidth < 640 ? {
            left: 16,
            bottom: 16,
            width: 'calc(100vw - 32px)',
            minWidth: 'unset',
          } : floatingStyle}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setViewDate(viewDate.subtract(1, currentMode === 'days' ? 'month' : 'year'))}
              className="w-10 h-10 rounded-xl hover:bg-zen-cream/40 flex items-center justify-center text-zen-brown/40 hover:text-zen-brown transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setCurrentMode(currentMode === 'days' ? 'months' : 'days')}
                className="text-sm font-black uppercase tracking-widest text-zen-brown hover:text-zen-sand transition-colors"
              >
                {viewDate.format(currentMode === 'days' ? 'MMMM YYYY' : 'YYYY')}
              </button>
            </div>

            <button 
              onClick={() => setViewDate(viewDate.add(1, currentMode === 'days' ? 'month' : 'year'))}
              className="w-10 h-10 rounded-xl hover:bg-zen-cream/40 flex items-center justify-center text-zen-brown/40 hover:text-zen-brown transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {currentMode === 'days' && (
            <>
              {/* Weekdays */}
              <div className="grid grid-cols-7 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-zen-brown/20">{d}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((date, i) => {
                  const selected = isSelected(date);
                  const ranged = isInRange(date);
                  const isCurrentMonth = date.isSame(viewDate, 'month');
                  
                  return (
                    <div key={i} className="relative">
                      <button
                        onClick={() => handleDateClick(date)}
                        className={`
                          w-10 h-10 rounded-xl text-xs font-bold transition-all relative z-10
                          ${!isCurrentMonth ? 'text-zen-brown/10' : 'text-zen-brown'}
                          ${selected ? 'bg-zen-brown text-white shadow-lg shadow-zen-brown/20' : 'hover:bg-zen-cream/40'}
                        `}
                      >
                        {date.date()}
                      </button>
                      {ranged && (
                        <div className="absolute inset-0 bg-zen-brown/5 z-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {currentMode === 'months' && (
            <div className="grid grid-cols-3 gap-2">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
                const isSelectedMonth = selectionType === 'month' && value === viewDate.month(i).format('YYYY-MM');
                return (
                  <button
                    key={m}
                    onClick={() => {
                      if (selectionType === 'month') {
                        onChange(viewDate.month(i).format('YYYY-MM'));
                        setIsOpen(false);
                      } else {
                        setViewDate(viewDate.month(i));
                        setCurrentMode('days');
                      }
                    }}
                    className={`
                      py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all
                      ${isSelectedMonth ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/40 hover:bg-zen-cream/40 hover:text-zen-brown'}
                    `}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 pt-6 border-t border-zen-brown/5 flex items-center justify-between">
            <button 
              onClick={() => {
                if (selectionType === 'range') onChange({ from: null, to: null });
                else onChange(null);
                setIsOpen(false);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const today = dayjs();
                  setViewDate(today);
                  if (selectionType === 'single') {
                    onChange(today.format('YYYY-MM-DD'));
                    setIsOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-zen-cream/40 text-[10px] font-black uppercase tracking-widest text-zen-brown hover:bg-zen-cream/60 transition-all"
              >
                Today
              </button>
              {selectionType === 'range' && (
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={!value?.from || !value?.to}
                  className="px-4 py-2 rounded-xl bg-zen-brown text-white text-[10px] font-black uppercase tracking-widest hover:bg-zen-brown/90 transition-all shadow-lg shadow-zen-brown/20 disabled:opacity-30"
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

