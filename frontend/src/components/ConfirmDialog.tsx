import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sparkles } from 'lucide-react';
import { ZenButton, ZenIconButton } from './zen/ZenButtons';

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
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zen-brown/40 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[4rem] shadow-2xl overflow-hidden border border-white"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-zen-sand/5 rounded-full blur-3xl -z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-zen-leaf/5 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className={`relative z-10 p-12 flex flex-col items-center text-center ${
              type === 'danger' ? 'bg-red-50/20' : 
              type === 'warning' ? 'bg-orange-50/20' : 'bg-zen-cream/10'
            }`}>
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl border border-white ${
                type === 'danger' ? 'bg-white text-red-500 shadow-red-500/10' : 
                type === 'warning' ? 'bg-white text-orange-500 shadow-orange-500/10' : 'bg-white text-zen-brown shadow-zen-brown/10'
              }`}>
                <AlertCircle size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-3xl font-serif font-black text-zen-brown mb-4 tracking-tight">{title}</h3>
              <p className="text-zen-brown/50 text-base font-medium max-w-xs leading-relaxed">{message}</p>
            </div>

            <div className="relative z-10 px-12 pb-12 pt-4 flex gap-6">
              <ZenButton
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                {cancelText}
              </ZenButton>
              <button
                onClick={() => {
                   onConfirm();
                   onClose();
                }}
                className={`flex-[2] py-4 rounded-[2.5rem] font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-2 ${
                   type === 'danger' ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' : 
                   type === 'warning' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20' : 
                   'bg-zen-brown text-white hover:bg-zen-brown/90 shadow-zen-brown/20'
                }`}
              >
                <span>{confirmText}</span>
                {type !== 'danger' && <Sparkles size={18} />}
              </button>
            </div>
            
            <div className="absolute top-8 right-8 z-20">
              <ZenIconButton 
                icon={X}
                onClick={onClose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
