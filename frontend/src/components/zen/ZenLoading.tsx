import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export const ZenLoadingBarrier: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#fdfaf7] z-[9999] flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
        className="relative"
      >
        <div className="w-24 h-24 border-2 border-zen-sand/20 rounded-full animate-spin border-t-zen-sand" />
        <div className="absolute inset-0 flex items-center justify-center text-zen-sand">
          <Sparkles size={32} />
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <h2 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Loading workspace</h2>
        <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Syncing system data</p>
      </motion.div>
      
      <div className="absolute bottom-12 flex items-center gap-2 px-6 py-2 bg-white rounded-full border border-zen-brown/5 shadow-sm">
         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
         <span className="text-[9px] font-bold text-zen-brown/50 uppercase tracking-widest">Secure Connection Active</span>
      </div>
    </div>
  );
};
