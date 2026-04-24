import React from 'react';
import { motion } from 'motion/react';

export const ZenButton = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const base = "flex items-center justify-center gap-3 py-3.5 px-8 rounded-2xl font-bold transition-all duration-300 text-xs uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-sand/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
  const variants: any = {
    primary: "bg-zen-sand text-white hover:bg-zen-primary shadow-sm shadow-zen-sand/20 hover:zen-soft-glow",
    secondary: "bg-zen-stone text-zen-brown hover:bg-zen-stone/80",
    outline: "bg-white text-zen-brown border border-zen-brown/15 hover:bg-zen-sand hover:text-white"
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`${base} ${variants[variant] || variants.primary} ${className}`} 
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const ZenIconButton = ({ icon: Icon, variant = 'outline', className = '', type = 'button', size = 'md', ...props }: any) => {
  const variants: any = {
    outline: "bg-white text-zen-brown border border-zen-brown/15 hover:bg-zen-sand hover:text-white",
    cream: "bg-zen-cream text-zen-brown hover:bg-zen-sand hover:text-white",
    danger: "bg-white text-red-500 border border-zen-brown/15 hover:bg-red-500 hover:text-white",
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
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      type={type}
      className={`zen-icon-button ${sizes[size]} rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-sand/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${variants[variant] || variants.outline} ${className}`}
      {...props}
    >
      <Icon size={iconSizes[size]} />
    </motion.button>
  );
};

export const ZenBadge = ({ children, variant = 'leaf', className = '', ...props }: any) => {
  const variants: any = {
    leaf: "bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20",
    sand: "bg-zen-sand/10 text-zen-brown border-zen-sand/20",
    danger: "bg-red-50 text-red-500 border-red-100",
    inactive: "bg-slate-50 text-slate-400 border-slate-100",
    secondary: "bg-slate-100 text-slate-600 border-slate-200",
    default: "bg-zen-cream text-zen-brown border-zen-brown/10",
    ocean: "bg-sky-50 text-sky-600 border-sky-100"
  };

  return (
    <motion.span 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`zen-badge inline-flex items-center justify-center whitespace-nowrap text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${variants[variant] || variants.default} ${className}`} 
      {...props}
    >
      {children}
    </motion.span>
  );
};
