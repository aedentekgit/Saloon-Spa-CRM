import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Trash2, AlertTriangle, Info } from 'lucide-react';

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
          icon: confirmText.toLowerCase().includes('logout') ? LogOut : Trash2,
          color: 'text-rose-500',
          bg: 'bg-rose-50',
          border: 'border-rose-100',
          buttonBg: 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/20',
          eyebrow: 'Security check'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bg: 'bg-amber-50',
          border: 'border-amber-100',
          buttonBg: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/20',
          eyebrow: 'Please confirm'
        };
      default:
        return {
          icon: Info,
          color: 'text-zen-sand',
          bg: 'bg-zen-sand/10',
          border: 'border-zen-sand/15',
          buttonBg: 'bg-zen-brown hover:bg-zen-brown/90 focus:ring-zen-brown/20',
          eyebrow: 'Confirmation'
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zen-brown/55 backdrop-blur-md transition-all duration-300"
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 18 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="relative w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_28px_90px_-32px_rgba(45,35,30,0.55)]"
          >
            <div className="relative">
               <div className="flex items-start justify-between gap-5 border-b border-zen-brown/5 px-6 py-5 sm:px-7">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${theme.border} ${theme.bg}`}>
                      <Icon size={24} className={theme.color} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${theme.color}`}>
                        {theme.eyebrow}
                      </p>
                      <h3 id="confirm-dialog-title" className="mt-1 text-xl font-serif font-black leading-tight text-zen-brown">
                        {title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="rounded-xl p-2 text-zen-brown/45 transition-colors hover:bg-zen-brown/5 hover:text-zen-brown focus:outline-none focus:ring-4 focus:ring-zen-brown/10"
                  >
                    <X size={20} />
                  </button>
               </div>

               <div className="px-6 py-6 sm:px-7">
                  <p className="text-sm font-semibold leading-6 text-zen-brown/55">
                    {message}
                  </p>
               </div>

               <div className="flex flex-col-reverse gap-3 border-t border-zen-brown/5 bg-zen-cream/35 px-6 py-5 sm:flex-row sm:px-7">
                  <button
                    onClick={onClose}
                    className="min-h-[48px] flex-1 rounded-2xl border border-zen-brown/20 bg-white px-5 text-[11px] font-black uppercase tracking-[0.18em] text-zen-brown shadow-sm transition-all hover:border-zen-brown/35 hover:bg-zen-brown/5 focus:outline-none focus:ring-4 focus:ring-zen-brown/10"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                       onConfirm();
                       onClose();
                    }}
                    className={`min-h-[48px] flex-[1.25] rounded-2xl px-5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] focus:outline-none focus:ring-4 ${theme.buttonBg}`}
                  >
                    {confirmText}
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
