import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Sparkles, Eye, EyeOff, Clock, Check, X } from 'lucide-react';
import dayjs from 'dayjs';

// Helper: returns true if an option label looks like a membership-covered service
const isMembershipLabel = (label: string) => label.includes(' — ');

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
  error?: boolean;
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
        const viewportHeight = window.innerHeight;
        const popupHeight = 350; // Estimated max height of pickers

        const left = Math.min(
          Math.max(12, rect.left),
          Math.max(12, viewportWidth - (maxWidth || rect.width) - 12)
        );

        // Check if there is enough space below
        const spaceBelow = viewportHeight - rect.bottom - offset;
        const shouldShowAbove = spaceBelow < popupHeight && rect.top > popupHeight;

        setStyle({
          width: maxWidth || rect.width,
          left,
          top: shouldShowAbove ? rect.top - offset : rect.bottom + offset,
          transform: shouldShowAbove ? 'translateY(-100%)' : 'none',
          transformOrigin: shouldShowAbove ? 'bottom center' : 'top center'
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
  className = "", icon: Icon, hideLabel, variant = 'pill',
  disabled, fontFamily, error
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

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    const option = safeOptions.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
    if (!option) return value;
    return typeof option === 'string' ? option : option.label;
  }, [safeOptions, value, placeholder]);

  return (
    <div className={`space-y-1 group relative ${isOpen ? 'z-[9999]' : 'z-10'} ${className} ${disabled ? 'cursor-not-allowed pointer-events-none' : ''}`} ref={dropdownRef}>
      {!hideLabel && <label className="text-[10px] font-black text-zen-brown/60 uppercase tracking-[0.22em] ml-1">{label}</label>}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={variant === 'pill'
          ? `h-[46px] sm:h-[50px] px-5 rounded-[1.35rem] border flex items-center justify-between gap-4 transition-all cursor-pointer shadow-sm relative ${
              error
                ? 'bg-rose-50 border-rose-200'
                : disabled
                  ? 'bg-slate-100 border-zen-stone text-zen-brown/55'
                  : 'bg-slate-50 border-zen-stone group-hover:border-zen-sand/40 group-focus-within:border-zen-sand/60 ring-1 ring-zen-brown/[0.03]'
            }`
          : `w-full px-1 pb-4 bg-transparent border-b-[2px] flex items-center justify-between cursor-pointer transition-all relative ${
              error ? 'border-rose-400' : 'border-zen-brown/35 group-hover:border-zen-sand/50 group-focus-within:border-zen-brown'
            }`
        }
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {error ? (
             <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
               <span className="text-[10px] font-bold">!</span>
             </div>
          ) : (
             Icon && <Icon size={16} className={variant === 'pill' ? `${disabled ? 'text-zen-brown/30' : 'text-zen-brown/45 group-hover:text-zen-sand'} flex-shrink-0 transition-colors` : "text-zen-brown/30 flex-shrink-0"} />
          )}
          <span
            className={variant === 'pill'
                ? `font-serif text-sm sm:text-base truncate tracking-tight ${value ? (error ? 'text-rose-600' : 'text-zen-brown font-black') : (disabled ? 'text-zen-brown/45' : 'text-zen-brown/60 font-semibold')}`
              : `font-serif text-sm sm:text-base truncate tracking-tight ${value ? (error ? 'text-rose-600 font-bold' : 'text-zen-brown font-semibold') : 'text-zen-brown/20'}`
            }
            style={fontFamily ? { fontFamily } : {}}
          >
            {displayValue}
          </span>
        </div>
        <ChevronDown size={variant === 'pill' ? 15 : 18} className={`flex-shrink-0 transition-all duration-700 ${isOpen ? 'rotate-180 text-zen-sand' : (error ? 'text-rose-400' : disabled ? 'text-zen-brown/25' : 'text-zen-brown/45')}`} />

        {/* Subtle highlight line for pill variant */}
        {variant === 'pill' && (
          <div className="absolute inset-1 rounded-[1.15rem] border border-white/70 pointer-events-none" />
        )}
      </div>

      {isOpen && createPortal(
        <div
          ref={listRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-none animate-in fade-in slide-in-from-top-2 duration-500 z-[99999] overflow-y-auto rounded-[1.25rem] max-h-64`}
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
                <p className="text-[9px] font-black text-zen-brown/60 uppercase tracking-[0.26em]">{label || 'Select'}</p>
                <h3 className="text-base font-serif font-black text-zen-brown mt-1">Registry Selection</h3>
              </div>
            )}
            {safeOptions.map((opt) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const memLabel = isMembershipLabel(label);
              const [serviceLabel, membershipPlanLabel] = memLabel
                ? label.split(' — ').map(part => part.trim())
                : [label, ''];
              return (
                <div
                  key={optValue}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  className={`px-6 py-4 text-sm font-medium transition-all duration-300 cursor-pointer flex items-center justify-between group/opt ${value === optValue ? 'bg-zen-cream text-zen-brown font-bold' : memLabel ? 'text-zen-brown hover:bg-zen-sand/10 hover:text-zen-brown hover:translate-x-1' : 'text-zen-brown/70 hover:bg-zen-cream hover:text-zen-brown hover:translate-x-1'}`}
                  style={['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Poppins', 'Montserrat'].includes(label) ? { fontFamily: label } : {}}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {memLabel && (
                      <div className="w-7 h-7 rounded-lg bg-zen-sand/15 border border-zen-sand/25 flex items-center justify-center shrink-0">
                        <Sparkles size={13} className="text-zen-sand" />
                      </div>
                    )}
                    {memLabel ? (
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-zen-brown">{serviceLabel}</span>
                          <span className="shrink-0 text-[9px] font-black bg-zen-sand/15 text-zen-sand px-2 py-0.5 rounded-full border border-zen-sand/20 uppercase tracking-widest">MEMBERSHIP</span>
                        </div>
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-zen-sand/80">
                          Membership: {membershipPlanLabel || 'Active plan'}
                        </p>
                      </div>
                    ) : (
                      <span>{label}</span>
                    )}
                  </div>
                  {value === optValue && <div className="w-1.5 h-1.5 rounded-full bg-zen-gold shadow-none" />}
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
    if (!searchTerm) return options.slice(0, 10);
    const term = searchTerm.toLowerCase();
    const isSelectedOption = options.some((opt: any) => opt.id === value || opt.name === value);
    if (value === searchTerm && isSelectedOption) {
      return options.slice(0, 10);
    }
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
      {!hideLabel && <label className="text-[10px] font-black text-zen-brown/60 uppercase tracking-[0.22em] ml-1">{label}</label>}
      <div className="w-full px-4 py-3 bg-slate-50 border border-zen-stone rounded-2xl flex items-center justify-between group-hover:border-zen-sand/40 group-focus-within:border-zen-sand/60 group-focus-within:ring-4 group-focus-within:ring-zen-sand/5 transition-all">
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

import { countries } from '../../utils/countries';

export const ZenInput = ({ label, icon: Icon, prefix, variant = 'professional', type, required, containerClassName, compact, error, hideLabel, ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const isNumber = type === 'number';

  const isPhone = type === 'tel' ||
                  String(label || '').toLowerCase().includes('phone') ||
                  String(label || '').toLowerCase().includes('contact') ||
                  prefix !== undefined;

  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => b.code.length - a.code.length);
  }, []);

  const selectedCountry = useMemo(() => {
    const val = String(props.value || '');
    if (val.startsWith('+')) {
      const match = sortedCountries.find(c => val.startsWith(c.code));
      if (match) return match;
    }
    // Default fallback to Qatar
    return countries.find(c => c.iso === 'QA') || countries[0];
  }, [props.value, sortedCountries]);

  const flags: { [key: string]: string } = {
    QA: '🇶🇦', IN: '🇮🇳', AE: '🇦🇪', SA: '🇸🇦', GB: '🇬🇧',
    US: '🇺🇸', KW: '🇰🇼', OM: '🇴🇲', BH: '🇧🇭', SG: '🇸🇬',
    AU: '🇦🇺', CA: '🇨🇦'
  };

  const localNumber = useMemo(() => {
    const val = String(props.value || '');
    if (val.startsWith('+') && val.startsWith(selectedCountry.code)) {
      return val.slice(selectedCountry.code.length);
    }
    return val;
  }, [props.value, selectedCountry]);

  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(triggerRef, countryDropdownOpen, 8, 96);

  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          countryListRef.current && !countryListRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryDropdownOpen]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const dynamicPlaceholder = useMemo(() => {
    if (!isPhone) return props.placeholder;
    const dashes = '— '.repeat(selectedCountry.phoneLength).trim();
    return `${selectedCountry.code} ${dashes}`;
  }, [isPhone, selectedCountry, props.placeholder]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawVal = e.target.value.replace(/\D/g, ''); // Allow only digits
    if (rawVal.length > selectedCountry.phoneLength) {
      rawVal = rawVal.slice(0, selectedCountry.phoneLength);
    }
    if (props.onChange) {
      props.onChange({
        ...e,
        target: {
          ...e.target,
          name: props.name,
          value: selectedCountry.code + rawVal
        }
      });
    }
  };

  const handleCountrySelect = (country: any) => {
    if (props.onChange) {
      props.onChange({
        target: {
          name: props.name,
          value: country.code + localNumber.replace(/\D/g, '')
        }
      });
    }
    setCountryDropdownOpen(false);
  };



  // For number inputs: show empty when value is 0 so placeholder is visible instead of "0"
  const numberOverrides = isNumber ? {
    value: (props.value === 0 || props.value === '0') ? '' : props.value,
    placeholder: props.placeholder ?? '0',
  } : {};

  if (type === 'date') {
    return (
      <ZenDatePicker
        {...props}
        label={label}
        icon={Icon}
        variant={variant === 'professional' || variant === 'pill' ? 'pill' : 'line'}
        className={containerClassName}
        error={error}
        onChange={(val: string) => {
          if (props.onChange) {
            props.onChange({ target: { value: val, name: props.name } });
          }
        }}
      />
    );
  }

  return (
    <div className={`space-y-2 group ${containerClassName || ''} ${error ? 'animate-in shake duration-500' : ''}`}>
      {!hideLabel && (
        <div className="flex items-center justify-between px-1">
          <label className={`text-[9px] font-black uppercase tracking-[0.22em] flex items-center gap-1 ${error ? 'text-rose-500' : (variant === 'dark' ? 'text-white/70' : 'text-zen-brown/60')}`}>
            {label}
            {required && <span className="text-red-400 text-xs mt-0.5">*</span>}
          </label>
          {error && typeof error === 'string' && (
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
              {error}
            </span>
          )}
        </div>
      )}
      <div className="relative w-full flex items-center">
        {variant === 'professional' ? (
          <div ref={containerRef} className={`w-full relative flex items-stretch transition-all duration-300 rounded-2xl ${
            error 
              ? 'border border-rose-300 bg-rose-50 text-rose-900 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-400/5' 
              : props.disabled 
                ? 'border border-zen-stone bg-slate-100 text-zen-brown/55 cursor-not-allowed' 
                : isPhone && countryDropdownOpen
                  ? 'border border-purple-600 bg-white text-zen-brown ring-4 ring-purple-600/10'
                  : 'border border-zen-stone bg-slate-50 text-zen-brown focus-within:bg-white focus-within:border-zen-sand/60 focus-within:ring-4 focus-within:ring-zen-sand/5 group-hover:border-zen-sand/40 shadow-sm'
          } ${props.disabled ? 'cursor-not-allowed' : ''} ${containerClassName || ''}`}>
            {isPhone ? (
              <div 
                ref={triggerRef}
                className={`w-24 shrink-0 flex items-center relative border-r transition-colors duration-300 ${
                  countryDropdownOpen 
                    ? 'border-purple-600/30' 
                    : error 
                      ? 'border-rose-200' 
                      : 'border-zen-stone/30'
                }`}
              >
                {countryDropdownOpen ? (
                  <div className="flex items-center w-full px-2">
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Select"
                      className="w-full bg-transparent text-sm outline-none font-serif text-zen-brown"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCountrySearch('');
                        setCountryDropdownOpen(false);
                      }}
                      className="text-zen-brown/40 hover:text-zen-brown shrink-0 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCountrySearch('');
                      setCountryDropdownOpen(true);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 cursor-pointer hover:bg-black/[0.02] rounded-l-2xl h-full"
                  >
                    <span className="text-base">{flags[selectedCountry.iso] || '🏳️'}</span>
                    <span className="text-xs font-serif text-zen-brown/80">{selectedCountry.code}</span>
                    <ChevronDown size={12} className="text-zen-brown/30" />
                  </button>
                )}
              </div>
            ) : (
              Icon && (
                <div className="flex items-center pl-4 shrink-0 pr-2">
                  <Icon className={`${error ? 'text-rose-400' : props.disabled ? 'text-zen-brown/35' : 'text-zen-brown/55'}`} size={compact ? 14 : 16} />
                </div>
              )
            )}
            <input
              {...props}
              {...(isPhone ? {
                value: localNumber,
                onChange: handlePhoneChange,
                type: 'tel',
                maxLength: selectedCountry.phoneLength
              } : numberOverrides)}
              type={isPassword ? (showPassword ? 'text' : 'password') : (isPhone ? 'tel' : type)}
              placeholder={dynamicPlaceholder}
              className={`w-full bg-transparent outline-none transition-all font-serif ${compact ? 'text-xs' : 'text-sm sm:text-base'} ${compact ? 'py-2.5' : 'py-3 sm:py-3.5'} pr-12 ${isPhone ? 'pl-3' : (Icon ? 'pl-1' : 'pl-4')} ${props.disabled ? 'cursor-not-allowed' : ''} ${props.className || ''}`}
            />
            {isPassword && !error && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zen-brown/20 hover:text-zen-brown transition-all"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
            {error && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 flex items-center">
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                   <span className="text-[10px] font-black">!</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div ref={containerRef} className={`w-full relative flex items-stretch px-1 border-b-[2px] transition-all duration-300 ${
            error 
              ? 'border-rose-400 text-rose-900' 
              : isPhone && countryDropdownOpen
                ? 'border-purple-600 text-zen-brown'
                : variant === 'dark' 
                  ? 'border-white/20 text-white focus-within:border-white/60' 
                  : 'border-zen-brown/30 text-zen-brown focus-within:border-zen-brown group-hover:border-zen-brown/60'
          }`}>
            {isPhone ? (
              <div 
                ref={triggerRef}
                className={`w-24 shrink-0 flex items-center relative border-r border-b-0 pb-3 transition-colors duration-300 ${
                  countryDropdownOpen 
                    ? 'border-purple-600/30' 
                    : error 
                      ? 'border-rose-400/30' 
                      : variant === 'dark'
                        ? 'border-white/20'
                        : 'border-zen-brown/20'
                }`}
              >
                {countryDropdownOpen ? (
                  <div className="flex items-center w-full px-2">
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Select"
                      className={`w-full bg-transparent text-sm outline-none font-serif ${variant === 'dark' ? 'text-white' : 'text-zen-brown'}`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCountrySearch('');
                        setCountryDropdownOpen(false);
                      }}
                      className={`${variant === 'dark' ? 'text-white/40 hover:text-white' : 'text-zen-brown/40 hover:text-zen-brown'} shrink-0 cursor-pointer`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCountrySearch('');
                      setCountryDropdownOpen(true);
                    }}
                    className="flex items-center justify-between w-full px-2 cursor-pointer h-full"
                  >
                    <span className="text-base">{flags[selectedCountry.iso] || '🏳️'}</span>
                    <span className={`text-xs font-serif ${variant === 'dark' ? 'text-white/80' : 'text-zen-brown/80'}`}>{selectedCountry.code}</span>
                    <ChevronDown size={12} className={variant === 'dark' ? 'text-white/30' : 'text-zen-brown/30'} />
                  </button>
                )}
              </div>
            ) : (
              Icon && (
                <div className="flex items-center shrink-0 pr-2 pb-3">
                  <Icon className={`transition-colors ${error ? 'text-rose-400' : (variant === 'dark' ? 'text-white/40' : 'text-zen-brown/40')}`} size={18} />
                </div>
              )
            )}
            {prefix && !isPhone && (
              <span className={`flex items-center bottom-4 text-sm font-bold border-r border-zen-brown/50 pr-3 mr-2 pb-3 whitespace-nowrap ${variant === 'dark' ? 'text-white/70' : 'text-zen-brown/60'}`}>
                {prefix}
              </span>
            )}
            <input
              {...props}
              {...(isPhone ? {
                value: localNumber,
                onChange: handlePhoneChange,
                type: 'tel',
                maxLength: selectedCountry.phoneLength
              } : numberOverrides)}
              type={isPassword ? (showPassword ? 'text' : 'password') : (isPhone ? 'tel' : type)}
              placeholder={dynamicPlaceholder}
              className={`w-full pb-3 bg-transparent outline-none transition-all font-serif text-sm sm:text-base ${isPhone ? 'pl-3' : 'pl-2'} ${variant === 'dark' ? 'text-white' : 'text-zen-brown'} ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${props.className || ''} ${isPassword ? 'pr-10' : ''}`}
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

      {countryDropdownOpen && createPortal(
        <div
          ref={countryListRef}
          className="fixed bg-white/95 backdrop-blur-md border border-zen-brown/10 shadow-[0_12px_30px_rgba(43,36,64,0.08)] animate-in fade-in slide-in-from-top-2 duration-300 z-[999999] overflow-y-auto rounded-2xl max-h-60"
          style={floatingStyle}
        >
          <div className="py-1.5 px-1.5">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] font-bold text-zen-brown/30 uppercase tracking-wider">
                No results
              </div>
            ) : (
              filteredCountries.map((c) => (
                <div
                  key={c.iso}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCountrySelect(c);
                  }}
                  className={`px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between hover:bg-purple-50/50 group ${selectedCountry.iso === c.iso ? 'bg-purple-50/80 font-bold' : ''}`}
                >
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="text-base shrink-0">{flags[c.iso] || '🏳️'}</span>
                    <span className="text-xs font-bold text-zen-brown/50 uppercase ml-1.5 shrink-0">{c.iso}</span>
                    {selectedCountry.iso === c.iso && <Check size={12} className="text-purple-600 shrink-0 ml-2" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
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
    <label className="text-[10px] font-black uppercase tracking-[0.22em] ml-1.5 text-zen-brown/60">{label}</label>
    <div className="relative flex items-start">
      {Icon && <Icon className="absolute left-5 top-5 text-zen-brown/30 group-focus-within:text-zen-brown transition-colors" size={16} />}
      <textarea
        {...props}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-4 bg-slate-50 border border-zen-stone rounded-2xl outline-none transition-all font-serif text-sm sm:text-base text-zen-brown placeholder:text-zen-brown/45 focus:bg-white focus:border-zen-sand/60 focus:ring-4 focus:ring-zen-sand/5 shadow-sm ring-1 ring-zen-brown/[0.03] group-hover:border-zen-sand/40 h-28 sm:h-32 resize-none ${props.className || ''}`}
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
  variant = 'line',
  minDate
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
  minDate?: string;
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
      if (typeof value === 'string') return value;
      if (!value?.from) return placeholder;
      if (!value?.to) return `${dayjs(value.from).format('DD MMM')} - ...`;
      return `${dayjs(value.from).format('DD MMM')} - ${dayjs(value.to).format('DD MMM')}`;
    }
    return placeholder;
  }, [value, selectionType, placeholder]);

  return (
    <div className={`relative group space-y-1 ${className}`} ref={containerRef}>
      {!hideLabel && <label className="text-[10px] font-black text-zen-brown/60 uppercase tracking-[0.22em] ml-1">{label}</label>}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={variant === 'pill'
          ? "h-[50px] bg-slate-50 px-5 rounded-[1.35rem] border border-zen-stone flex items-center justify-between gap-4 hover:border-zen-sand/40 transition-all cursor-pointer shadow-sm ring-1 ring-zen-brown/[0.03] relative group/trigger"
          : "h-[50px] bg-slate-50 px-5 rounded-[1.35rem] border border-zen-stone hover:border-zen-sand/40 flex items-center justify-between cursor-pointer group/trigger transition-all shadow-sm"
        }
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={variant === 'pill'
            ? "text-zen-brown/45 group-hover/trigger:text-zen-sand transition-colors"
            : "text-zen-brown/55 flex-shrink-0"
          }>
            <Icon size={16} />
          </div>
          <span className={`font-serif tracking-tight truncate ${variant === 'pill' ? 'text-sm font-black text-zen-brown' : 'text-sm sm:text-base font-semibold text-zen-brown'}`}>
            {displayValue}
          </span>
        </div>
        <ChevronDown
          size={variant === 'pill' ? 14 : 18}
          className={`flex-shrink-0 text-zen-brown/45 transition-transform duration-700 ease-in-out ${isOpen ? 'rotate-180 text-zen-sand' : ''}`}
        />
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-none overflow-hidden animate-in zoom-in-95 fade-in duration-500 z-[99999] rounded-[2rem] p-6 w-[340px]`}
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
              onClick={() => {
                if (currentMode === 'days') setViewDate(viewDate.subtract(1, 'month'));
                else if (currentMode === 'months') setViewDate(viewDate.subtract(1, 'year'));
                else setViewDate(viewDate.subtract(12, 'year'));
              }}
              className="w-10 h-10 rounded-xl hover:bg-zen-cream/40 flex items-center justify-center text-zen-brown/40 hover:text-zen-brown transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  if (currentMode === 'days') setCurrentMode('months');
                  else if (currentMode === 'months') setCurrentMode('years');
                  else setCurrentMode('days');
                }}
                className="text-sm font-black uppercase tracking-widest text-zen-brown hover:text-zen-sand transition-colors"
              >
                {currentMode === 'days' ? viewDate.format('MMMM YYYY') :
                 currentMode === 'months' ? viewDate.format('YYYY') :
                 `${Math.floor(viewDate.year() / 12) * 12} - ${Math.floor(viewDate.year() / 12) * 12 + 11}`}
              </button>
            </div>

            <button
              onClick={() => {
                if (currentMode === 'days') setViewDate(viewDate.add(1, 'month'));
                else if (currentMode === 'months') setViewDate(viewDate.add(1, 'year'));
                else setViewDate(viewDate.add(12, 'year'));
              }}
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
                  const isBeforeMin = minDate && date.isBefore(dayjs(minDate), 'day');

                  return (
                    <div key={i} className="relative">
                      <button
                        onClick={() => !isBeforeMin && handleDateClick(date)}
                        disabled={isBeforeMin}
                        className={`
                          w-10 h-10 rounded-xl text-xs font-bold transition-all relative z-10
                          ${!isCurrentMonth || isBeforeMin ? 'text-zen-brown/10' : 'text-zen-brown'}
                          ${selected ? 'bg-zen-brown text-white shadow-lg shadow-zen-brown/20' : isBeforeMin ? 'cursor-not-allowed' : 'hover:bg-zen-cream/40'}
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
                const isSelectedMonth = 
                  (selectionType === 'month' && value === viewDate.month(i).format('YYYY-MM')) ||
                  (selectionType === 'range' && 
                   value?.from === viewDate.month(i).date(9).format('YYYY-MM-DD') && 
                   value?.to === viewDate.month(i).add(1, 'month').date(8).format('YYYY-MM-DD'));
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

          {currentMode === 'years' && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const startYear = Math.floor(viewDate.year() / 12) * 12;
                const year = startYear + i;
                const isSelectedYear = viewDate.year() === year;
                return (
                  <button
                    key={year}
                    onClick={() => {
                      setViewDate(viewDate.year(year));
                      setCurrentMode('months');
                    }}
                    className={`
                      py-4 rounded-2xl text-xs font-black transition-all
                      ${isSelectedYear ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/40 hover:bg-zen-cream/40 hover:text-zen-brown'}
                    `}
                  >
                    {year}
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
              {selectionType === 'range' && currentMode === 'days' && (
                <button
                  onClick={() => {
                    const startOfPeriod = viewDate.date(9).format('YYYY-MM-DD');
                    const endOfPeriod = viewDate.add(1, 'month').date(8).format('YYYY-MM-DD');
                    onChange({ from: startOfPeriod, to: endOfPeriod });
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[10px] font-black uppercase tracking-widest text-purple-700 transition-all cursor-pointer"
                >
                  Select {viewDate.format('MMM')}
                </button>
              )}
              <button
                onClick={() => {
                  const today = dayjs();
                  setViewDate(today);
                  if (selectionType === 'single') {
                    onChange(today.format('YYYY-MM-DD'));
                    setIsOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-zen-cream/40 text-[10px] font-black uppercase tracking-widest text-zen-brown hover:bg-zen-cream/60 transition-all cursor-pointer"
              >
                Today
              </button>
              {selectionType === 'range' && (
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={!value?.from || !value?.to}
                  className="px-4 py-2 rounded-xl bg-zen-brown text-white text-[10px] font-black uppercase tracking-widest hover:bg-zen-brown/90 transition-all shadow-lg shadow-zen-brown/20 disabled:opacity-30 cursor-pointer"
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

export const ZenTimePicker = ({
  label, value, onChange, placeholder = "Select Time", icon: Icon = Clock,
  hideLabel = false, variant = 'line', className = ""
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(containerRef, isOpen, 12, 280);

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

  const parseValue = () => {
    if (!value) return { h: 9, m: 0, p: 'AM' };
    const [time, p] = value.split(' ');
    const [h, m] = time.split(':').map(Number);
    return { h, m: m || 0, p: p || 'AM' };
  };

  const { h, m, p } = parseValue();

  return (
    <div className={`relative group ${className}`} ref={containerRef}>
      {!hideLabel && <label className="text-[10px] font-black text-zen-brown/60 uppercase tracking-[0.22em] block mb-3">{label}</label>}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={variant === 'pill'
          ? "h-[50px] bg-slate-50 px-5 rounded-[1.35rem] border border-zen-stone flex items-center justify-between gap-4 hover:border-zen-sand/40 transition-all cursor-pointer shadow-sm relative group/trigger"
          : "h-[50px] bg-slate-50 px-5 rounded-[1.35rem] border border-zen-stone hover:border-zen-sand/40 flex items-center justify-between cursor-pointer group/trigger shadow-sm"
        }
      >
        <div className="flex items-center gap-4">
          <div className={variant === 'pill'
            ? "text-zen-brown/30 group-hover/trigger:text-zen-brown transition-colors"
            : "w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-zen-brown/55 group-hover/trigger:text-zen-sand transition-all duration-500 border border-zen-stone group-hover/trigger:border-zen-sand/30"
          }>
            <Icon size={18} strokeWidth={1.5} />
          </div>
          <span className={`font-serif tracking-tight ${variant === 'pill' ? 'text-sm font-black text-zen-brown' : 'text-sm sm:text-base font-black text-zen-brown'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown
          size={variant === 'pill' ? 14 : 20}
          className={`text-zen-brown/45 transition-transform duration-700 ease-in-out ${isOpen ? 'rotate-180 text-zen-sand' : ''}`}
        />
      </div>

      {variant === 'line' && <div className="h-px w-full bg-transparent mt-3 mb-1" />}

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed bg-white/95 backdrop-blur-2xl border border-white shadow-none overflow-hidden animate-in zoom-in-95 fade-in duration-500 z-[99999] rounded-[2rem] border-t-white/40 border-l-white/40 w-[240px]`}
          style={window.innerWidth < 640 ? {
            left: 16,
            bottom: 16,
            width: 'calc(100vw - 32px)',
            minWidth: 'unset',
          } : floatingStyle}
        >
          {/* Subtle Header */}
          <div className="px-6 pt-5 pb-2 border-b border-zen-brown/5">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zen-brown/30">Set Time</span>
          </div>

          <div className="relative h-[200px] flex px-4">
            {/* Focal Highlight Area */}
            <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 h-12 bg-zen-brown/[0.04] rounded-2xl border-y border-zen-brown/5 pointer-events-none" />

            {/* Hours Column */}
            <div className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-proximity py-[76px]">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                <button
                  key={hour}
                  onClick={() => {
                    const formattedH = hour.toString().padStart(2, '0');
                    const [_, currentM, currentP] = (value || '09:00 AM').split(/[:\s]/);
                    onChange(`${formattedH}:${currentM} ${currentP}`);
                  }}
                  className={`h-12 w-full flex items-center justify-center snap-center transition-all duration-300 ${h === hour ? 'text-xl font-serif font-black text-zen-brown' : 'text-sm font-serif font-bold text-zen-brown/10'}`}
                >
                  {hour.toString().padStart(2, '0')}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center text-zen-brown/10 font-black text-lg pb-0.5 px-0.5">:</div>

            {/* Minutes Column */}
            <div className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-proximity py-[76px]">
              {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                <button
                  key={minute}
                  onClick={() => {
                    const formattedM = minute.toString().padStart(2, '0');
                    const [currentH, _, currentP] = (value || '09:00 AM').split(/[:\s]/);
                    onChange(`${currentH}:${formattedM} ${currentP}`);
                  }}
                  className={`h-12 w-full flex items-center justify-center snap-center transition-all duration-300 ${m === minute ? 'text-xl font-serif font-black text-zen-brown' : 'text-sm font-serif font-bold text-zen-brown/10'}`}
                >
                  {minute.toString().padStart(2, '0')}
                </button>
              ))}
            </div>

            {/* Period Column */}
            <div className="w-[60px] overflow-y-auto scrollbar-hide snap-y snap-proximity py-[76px]">
              {['AM', 'PM'].map(period => (
                <button
                  key={period}
                  onClick={() => {
                    const [currentH, currentM] = (value || '09:00 AM').split(/[:\s]/);
                    onChange(`${currentH}:${currentM} ${period}`);
                  }}
                  className={`h-12 w-full flex items-center justify-center snap-center transition-all duration-300 ${p === period ? 'text-[10px] font-black tracking-widest text-zen-brown' : 'text-[9px] font-black tracking-widest text-zen-brown/10'}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-4 bg-zen-brown text-white rounded-[1.2rem] text-[9px] font-black uppercase tracking-[0.3em] hover:bg-zen-brown/90 transition-all duration-500 shadow-xl shadow-zen-brown/10 flex items-center justify-center gap-2 group/btn"
            >
              SAVE TIME
              <div className="w-1 h-1 rounded-full bg-zen-sand" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const ZenMultiSelect = ({
  label, options = [], value = [], onChange, placeholder = "Select options",
  className = "", icon: Icon, hideLabel, disabled, error
}: {
  label: string;
  options: (string | { label: string; value: string })[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
  icon?: any;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(dropdownRef, isOpen, 8);

  const safeOptions = useMemo(() => options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  ), [options]);

  useEffect(() => {
    const onResize = () => setIsCompactViewport(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          listRef.current && !listRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optValue: string) => {
    const newValue = value.includes(optValue)
      ? value.filter(v => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };

  const toggleSelectAll = () => {
    if (value.length === safeOptions.length) {
      onChange([]);
    } else {
      onChange(safeOptions.map(opt => opt.value));
    }
  };

  const displayValue = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === safeOptions.length) return "All Selected";
    if (value.length === 1) {
      return safeOptions.find(opt => opt.value === value[0])?.label || value[0];
    }
    return `${value.length} Selected`;
  }, [value, safeOptions, placeholder]);

  return (
    <div className={`space-y-1 group relative ${isOpen ? 'z-[9999]' : 'z-10'} ${className} ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`} ref={dropdownRef}>
      {!hideLabel && (
        <div className="flex items-center justify-between ml-1">
          <label className="text-[10px] font-black text-zen-brown/60 uppercase tracking-[0.22em]">{label}</label>
          {value.length > 0 && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-[50px] px-5 bg-slate-50 rounded-[1.35rem] border flex items-center justify-between cursor-pointer transition-all relative shadow-sm ${
          error ? 'border-rose-400' : 'border-zen-stone group-hover:border-zen-sand/40 group-focus-within:border-zen-sand/60'
        }`}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {error ? (
             <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
               <span className="text-[10px] font-bold">!</span>
             </div>
          ) : (
             Icon && <Icon size={16} className="text-zen-brown/55 flex-shrink-0" />
          )}
          <span className={`font-serif text-sm sm:text-base truncate tracking-tight ${value.length > 0 ? (error ? 'text-rose-600 font-bold' : 'text-zen-brown font-semibold') : 'text-zen-brown/55'}`}>
            {displayValue}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {value.length > 0 && !isCompactViewport && (
            <div className="flex -space-x-2">
              {value.slice(0, 3).map((v, i) => (
                <div key={v} className="w-5 h-5 rounded-full bg-zen-sand border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                  {i === 2 && value.length > 3 ? `+${value.length - 2}` : (safeOptions.find(o => o.value === v)?.label.charAt(0) || '')}
                </div>
              ))}
            </div>
          )}
          <ChevronDown size={18} className={`flex-shrink-0 transition-all duration-700 ${isOpen ? 'rotate-180 text-zen-gold' : (error ? 'text-rose-400' : 'text-zen-brown/20')}`} />
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={listRef}
          className={`fixed bg-white border border-zen-brown/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-500 z-[99999] overflow-y-auto rounded-[1.25rem] max-h-80 w-72 sm:w-80`}
          style={isCompactViewport ? {
            left: 16,
            top: '50%',
            width: 'calc(100vw - 32px)',
            transform: 'translateY(-50%)',
            maxHeight: '70vh'
          } : floatingStyle}
        >
          <div className="sticky top-0 bg-white border-b border-zen-brown/5 p-4 z-20 flex items-center justify-between">
            <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.3em]">Multi-Select</span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[9px] font-black text-zen-sand uppercase tracking-[0.2em] hover:text-zen-primary transition-colors bg-zen-sand/5 px-3 py-1.5 rounded-full border border-zen-sand/10"
            >
              {value.length === safeOptions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="py-2">
            {safeOptions.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`px-6 py-3.5 text-sm font-medium transition-all duration-300 cursor-pointer flex items-center gap-4 group/opt ${isSelected ? 'bg-zen-cream/40 text-zen-brown' : 'text-zen-brown/40 hover:bg-zen-cream/20 hover:text-zen-brown'}`}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-zen-brown border-zen-brown scale-110' : 'border-zen-brown/10 group-hover/opt:border-zen-brown/30'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={isSelected ? 'font-black' : ''}>{opt.label}</span>
                </div>
              );
            })}
          </div>
          
          {isCompactViewport && (
            <div className="sticky bottom-0 bg-white p-4 border-t border-zen-brown/5">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3.5 bg-zen-brown text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Done ({value.length})
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
