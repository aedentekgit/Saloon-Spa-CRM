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
      className="w-full sm:w-[280px] lg:w-full shrink-0 bg-white p-5 sm:p-7 rounded-[1.5rem] border border-zen-stone shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative group transition-all duration-700 hover:shadow-[0_20px_50px_-15px_rgba(43,36,64,0.1)] hover:border-zen-sand/30 overflow-hidden"
    >
      {/* Premium Grainy Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-zen-cream/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      {/* Decorative 'Spark' background element */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-zen-gold/5 rounded-full blur-3xl group-hover:bg-zen-gold/10 transition-colors duration-1000" />
      
      <div className="relative z-10 flex flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0 flex-1">
            <h5 className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em] leading-none truncate shrink-0">{label}</h5>
            <p className="text-lg sm:text-xl font-serif font-black text-zen-brown tracking-tight leading-none truncate group-hover:scale-[1.05] transition-transform duration-500 origin-left">
              {value}
            </p>
          </div>

          <div className="relative scale-75 origin-right shrink-0">
            {/* 3D Glass Icon Case */}
            <div className={`absolute inset-0 rounded-[1.25rem] ${glow} blur-lg opacity-40 group-hover:opacity-60 transition-all duration-700`} />
            <div className={`w-12 h-12 rounded-[1.25rem] ${bg} border border-white/50 backdrop-blur-md flex items-center justify-center relative z-10 group-hover:-translate-y-1 group-hover:rotate-6 transition-all duration-500 shadow-sm`}>
              <Icon className={`${color} transition-transform duration-500 group-hover:scale-110`} size={22} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          {trend ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zen-cream/40 border border-zen-brown/5 shadow-inner">
               <Clock size={10} className="text-zen-brown/30" />
               <span className="text-[9px] text-zen-brown/50 font-bold uppercase tracking-widest">{trend}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zen-gold/5 border border-zen-gold/10">
               <Sparkles size={10} className="text-zen-gold/40" />
               <span className="text-[9px] text-zen-gold/60 font-black uppercase tracking-widest">Premium Data</span>
            </div>
          )}
          
          {/* Accent progress bar */}
          <div className="flex-1 ml-4 h-1 bg-zen-brown/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: '40%' }}
               transition={{ duration: 1.5, delay: delay + 0.5 }}
               className={`h-full ${color.replace('text-', 'bg-')} opacity-20`}
             />
          </div>
        </div>
      </div>
      
      {/* Sleek bottom border highlight */}
      <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-1000 ${color.replace('text-', 'bg-')} opacity-30`} />
    </motion.div>
  );
};
