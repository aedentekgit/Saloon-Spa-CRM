import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, CheckCircle2 } from 'lucide-react';

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
    <div className="flex-shrink-0 w-[260px] lg:w-auto bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-white relative group hover:-translate-y-2 hover:z-50 hover:shadow-xl transition-all duration-700 overflow-hidden">
      {/* 3D Icon Effect on Right */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 ${glow} rounded-full blur-3xl -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000 opacity-50`}></div>
      
      <motion.div 
        initial={{ y: 0 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}
        className="absolute top-8 right-8 w-14 h-14 z-10 pointer-events-none"
      >
        {/* Shadow for 3D effect */}
        <div className={`absolute inset-0 rounded-2xl ${glow} blur-xl translate-y-4 group-hover:translate-y-6 transition-all duration-700 opacity-50 group-hover:opacity-100`}></div>
        {/* Icon Container */}
        <div className={`absolute inset-0 rounded-2xl ${bg} border border-white/60 shadow-lg flex items-center justify-center group-hover:-translate-y-2 group-hover:rotate-12 group-hover:scale-110 group-hover:shadow-2xl transition-all duration-500`}>
            <Icon className={`${color} drop-shadow-md transition-transform duration-500 group-hover:scale-110`} size={26} />
        </div>
      </motion.div>

      <div className="relative z-10">
        <h5 className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em] mb-1.5">{label}</h5>
        <p className="text-4xl font-serif font-black text-zen-brown tracking-tighter">{value}</p>
        {(trend !== undefined && trend !== null) && (
          <p className="text-[9px] text-zen-leaf/60 font-black uppercase tracking-widest mt-10 hover:text-zen-leaf transition-colors flex items-center gap-2">
            <CheckCircle2 size={12} strokeWidth={2.5} />
            {trend}
          </p>
        )}
      </div>
    </div>
  );
};
