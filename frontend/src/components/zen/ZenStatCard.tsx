import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, Clock, Sparkles } from 'lucide-react';

export interface ZenStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: React.ReactNode;
  color?: string;
  bg?: string;
  glow?: string;
  delay?: number;
}

export const ZenStatCard: React.FC<ZenStatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  color = 'text-blue-500',
  bg = 'bg-blue-500/10',
  glow = 'bg-blue-500/20',
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-white p-6 sm:p-8 rounded-[1.75rem] border border-zen-stone shadow-sm relative group transition-all duration-500 hover:shadow-[0_18px_44px_-22px_rgba(43,36,64,0.28)] hover:border-zen-sand/35 overflow-hidden"
    >
      {/* Premium Glassmorphic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Majestic Decorative Spark */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-zen-sand/5 rounded-full blur-[60px] group-hover:bg-zen-sand/10 transition-colors duration-1000" />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <h5 className="text-[10px] sm:text-[11px] font-black text-zen-brown/45 uppercase tracking-[0.24em] leading-tight">
              {label}
            </h5>
            <p className="text-3xl sm:text-4xl font-serif font-black text-zen-brown tracking-tight leading-none truncate group-hover:translate-x-1 transition-transform duration-500 origin-left">
              {value}
            </p>
          </div>

          <div className="relative shrink-0 pt-1">
            {/* 3D Glass Icon Case */}
            <div className={`absolute inset-0 rounded-2xl ${glow} blur-xl opacity-30 group-hover:opacity-60 transition-all duration-700 animate-pulse`} />
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${bg} border border-white/80 backdrop-blur-md flex items-center justify-center relative z-10 group-hover:-translate-y-2 group-hover:rotate-12 transition-all duration-500 shadow-sm shadow-black/5`}>
              <Icon className={`${color} transition-transform duration-500 group-hover:scale-125`} size={24} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {trend ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-zen-stone/80 transition-all duration-500">
               <Clock size={12} className="text-zen-sand/60" />
               <span className="text-[10px] text-zen-brown/65 font-black uppercase tracking-widest">{trend}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zen-gold/5 border border-zen-gold/10 backdrop-blur-sm">
               <Sparkles size={12} className="text-zen-gold/40" />
               <span className="text-[10px] text-zen-gold/60 font-black uppercase tracking-widest">Premium Data</span>
            </div>
          )}

          {/* Majestic accent progress bar */}
          <div className="flex-1 ml-6 h-1.5 bg-zen-brown/5 rounded-full overflow-hidden relative">
             <motion.div
               initial={{ width: 0 }}
               animate={{ width: '60%' }}
               transition={{ duration: 2, delay: delay + 0.5, ease: "easeOut" }}
               className={`h-full ${color.replace('text-', 'bg-')} opacity-30 relative`}
             >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
             </motion.div>
          </div>
        </div>
      </div>

      {/* Sleek bottom border highlight */}
      <div className={`absolute bottom-0 left-0 h-1.5 w-0 group-hover:w-full transition-all duration-1000 ${color.replace('text-', 'bg-')} opacity-40`} />
    </motion.div>
  );
};
