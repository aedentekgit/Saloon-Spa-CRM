import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, Clock } from 'lucide-react';

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
    <div className="flex-shrink-0 w-[280px] lg:w-auto bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-zen-stone/60 relative group transition-all duration-700 zen-card-hover overflow-hidden">
      {/* Background Bloom */}
      <div className={`absolute -top-16 -right-16 w-48 h-48 ${glow} rounded-full blur-[60px] -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000 opacity-40`}></div>
      
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-4 pr-12">
            <div className="space-y-1.5">
               <h5 className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em] leading-none mb-1">{label}</h5>
               <p className="text-4xl font-serif font-black text-zen-brown tracking-tighter leading-tight">{value}</p>
            </div>
            
            {(trend !== undefined && trend !== null) && (
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-zen-leaf/10 flex items-center justify-center text-zen-leaf">
                   <Clock size={10} strokeWidth={3} />
                </div>
                <span className="text-[9px] text-zen-brown/40 font-black uppercase tracking-widest">{trend}</span>
              </div>
            )}
          </div>

          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
            className="w-14 h-14 shrink-0 relative"
          >
            {/* Shadow for 3D effect */}
            <div className={`absolute inset-0 rounded-2xl ${glow} blur-xl translate-y-4 group-hover:translate-y-6 transition-all duration-700 opacity-40 group-hover:opacity-80`}></div>
            {/* Icon Container */}
            <div className={`absolute inset-0 rounded-2xl ${bg} backdrop-blur-md border border-white flex items-center justify-center group-hover:-translate-y-2 group-hover:rotate-6 group-hover:scale-110 shadow-lg group-hover:shadow-xl transition-all duration-500`}>
                <Icon className={`${color} drop-shadow-sm transition-transform duration-500 group-hover:scale-110`} size={24} strokeWidth={1.5} />
            </div>
          </motion.div>
        </div>

        {/* Bottom subtle bar */}
        <div className="mt-8 h-1 w-12 bg-zen-gold/20 rounded-full group-hover:w-24 group-hover:bg-zen-gold/40 transition-all duration-700"></div>
      </div>
    </div>
  );
};
