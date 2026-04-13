import React from 'react';

export const ZenButton = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const base = "flex items-center justify-center gap-3 py-3.5 px-8 rounded-2xl font-bold transition-all duration-300 text-xs uppercase tracking-widest";
  const variants: any = {
    primary: "bg-zen-brown text-zen-cream hover:bg-black hover:shadow-2xl",
    secondary: "bg-zen-cream text-zen-brown hover:bg-zen-sand/30",
    outline: "bg-white text-zen-brown border border-zen-brown/5 hover:bg-zen-brown hover:text-white shadow-sm"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const ZenIconButton = ({ icon: Icon, variant = 'outline', className = '', type = 'button', size = 'md', ...props }: any) => {
  const variants: any = {
    outline: "bg-white text-zen-brown border border-zen-brown/5 hover:bg-zen-brown hover:text-white",
    cream: "bg-zen-cream text-zen-brown hover:bg-zen-brown hover:text-white",
    danger: "bg-white text-red-500 border border-zen-brown/5 hover:bg-red-500 hover:text-white",
    leaf: "bg-zen-leaf/10 text-zen-leaf border border-zen-leaf/20 hover:bg-zen-leaf hover:text-white",
    sand: "bg-zen-sand/10 text-zen-brown border border-zen-sand/20 hover:bg-zen-sand hover:text-white"
  };

  const sizes: any = {
    sm: "p-1.5",
    md: "p-3",
    lg: "p-4"
  };

  const iconSizes: any = {
    sm: 12,
    md: 14,
    lg: 18
  };

  return (
    <button type={type} className={`${sizes[size]} rounded-full shadow-sm transition-all duration-300 ${variants[variant]} ${className}`} {...props}>
      <Icon size={iconSizes[size]} />
    </button>
  );
};

export const ZenBadge = ({ children, variant = 'leaf', className = '', ...props }: any) => {
  const variants: any = {
    leaf: "bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20 shadow-sm",
    sand: "bg-zen-sand/10 text-zen-brown border-zen-sand/20",
    danger: "bg-red-50 text-red-400 border-red-100",
    inactive: "bg-slate-50 text-slate-400 border-slate-100"
  };

  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
