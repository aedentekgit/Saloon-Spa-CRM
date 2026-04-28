import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sparkles, LogOut, Trash2, AlertTriangle, Info } from 'lucide-react';
import { ZenButton, ZenIconButton } from '../zen/ZenButtons';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Discard',
  type = 'danger'
}) => {
  const getTheme = () => {
    switch (type) {
      case 'danger':
        return {
          icon: LogOut,
          color: 'text-rose-500',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          glow: 'shadow-rose-500/20',
          buttonBg: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30',
          accent: 'bg-rose-500/5'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          glow: 'shadow-amber-500/20',
          buttonBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30',
          accent: 'bg-amber-500/5'
        };
      default:
        return {
          icon: Info,
          color: 'text-zen-sand',
          bg: 'bg-zen-sand/10',
          border: 'border-zen-sand/20',
          glow: 'shadow-zen-sand/20',
          buttonBg: 'bg-zen-sand hover:bg-zen-primary shadow-zen-sand/30',
          accent: 'bg-zen-sand/5'
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zen-brown/60 backdrop-blur-xl transition-all duration-500"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[480px] bg-white/95 backdrop-blur-3xl rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(45,35,30,0.4)] overflow-hidden border border-white p-1"
          >
            {/* Artistic Background Decor */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-zen-sand/10 rounded-full blur-[80px] -z-0 pointer-events-none translate-x-1/2 -translate-y-1/2" />
            <div className={`absolute bottom-0 left-0 w-64 h-64 ${theme.accent} rounded-full blur-[60px] -z-0 pointer-events-none -translate-x-1/2 translate-y-1/2`} />

            <div className="relative z-10">
               {/* Close Button */}
               <div className="absolute top-8 right-8">
                  <button onClick={onClose} className="p-2 text-zen-brown/20 hover:text-zen-brown transition-colors">
                     <X size={24} />
                  </button>
               </div>

               <div className="p-10 pb-4 flex flex-col items-center text-center">
                  {/* Status Label */}
                  <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.color} mb-8 opacity-80`}>
                     Security Protocol
                  </span>

                  {/* Icon Container */}
                  <div className={`relative mb-10 group`}>
                    <div className={`absolute inset-0 ${theme.bg} rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-700`} />
                    <div className={`w-28 h-28 rounded-[2.2rem] bg-white border ${theme.border} flex items-center justify-center relative shadow-2xl ${theme.glow} transition-transform duration-700 group-hover:scale-105 group-hover:rotate-3`}>
                      <Icon size={44} className={theme.color} strokeWidth={1.5} />
                    </div>
                    {/* Decorative Ring */}
                    <div className="absolute -inset-2 border border-white/50 rounded-[2.5rem] pointer-events-none" />
                  </div>

                  <h3 className="text-4xl font-serif font-black text-zen-brown mb-5 tracking-tight px-4 leading-tight">
                    {title}
                  </h3>

                  <div className="max-w-[280px] space-y-4">
                    <p className="text-zen-brown/40 text-[13px] font-medium leading-relaxed italic">
                      {message}
                    </p>
                  </div>
               </div>

               {/* Action Section */}
               <div className="px-10 pb-12 pt-8 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-zen-brown/40 hover:text-zen-brown hover:bg-zen-brown/5 transition-all border border-zen-brown/5 order-2 sm:order-1"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                       onConfirm();
                       onClose();
                    }}
                    className={`flex-[1.5] py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 group order-1 sm:order-2 ${theme.buttonBg}`}
                  >
                    <span>{confirmText}</span>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <Sparkles size={16} className="opacity-60" />
                    </motion.div>
                  </button>
               </div>

               {/* Footer Subtle Note */}
               <div className="pb-8 text-center px-10">
                  <p className="text-[9px] font-bold text-zen-brown/15 uppercase tracking-[0.2em]">
                    Synchronized with identity hub v2.4
                  </p>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
