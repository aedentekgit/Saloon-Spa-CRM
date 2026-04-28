import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  maxWidth?: string;
  hideHeader?: boolean;
  subtitle?: React.ReactNode;
  headerIcon?: React.ElementType;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  header,
  maxWidth = 'max-w-lg',
  hideHeader = false,
  subtitle,
  headerIcon: HeaderIcon = Sparkles,
  className = ""
}) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-1.5 sm:p-6 lg:p-10">
          {/* Immersive Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zen-brown/40 backdrop-blur-md"
          />

          {/* Zen Terminal / Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className={`relative w-full ${maxWidth} bg-white/95 backdrop-blur-3xl rounded-[1.2rem] sm:rounded-[2rem] shadow-none overflow-hidden border border-white flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] ${className}`}
          >
            {/* Glossy Top Edge */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent z-[60]" />

            {header ? (
              <div className="shrink-0 relative z-50 border-b border-zen-brown/10 bg-white/40 backdrop-blur-3xl">
                {header}
              </div>
            ) : !hideHeader && (
              <div className="flex items-center justify-between px-4 sm:px-8 lg:px-14 py-3 sm:py-6 lg:py-7 border-b border-zen-brown/10 shrink-0 bg-white/40 backdrop-blur-3xl relative z-50">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                   <div className="w-11 h-11 sm:w-16 sm:h-16 bg-zen-sand/10 rounded-[0.9rem] sm:rounded-[1rem] text-zen-sand flex items-center justify-center shadow-inner border border-zen-sand/5">
                      <HeaderIcon size={22} strokeWidth={1} />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-base sm:text-2xl font-serif font-bold text-zen-brown tracking-tighter truncate leading-tight">{title}</h3>
                      {subtitle && (
                        <p className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-zen-brown/20 uppercase tracking-[0.4em] truncate font-sans">
                          {subtitle}
                        </p>
                      )}
                   </div>
                </div>
                <button
                   onClick={onClose}
                   className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/80 hover:bg-white rounded-full transition-all duration-700 text-zen-brown/35 hover:text-zen-brown group border border-zen-brown/10 shadow-sm"
                >
                   <X size={18} strokeWidth={1.8} className="group-hover:rotate-90 transition-transform duration-700" />
                </button>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto relative z-10 ${header || !hideHeader ? 'py-4 sm:py-8 lg:py-12' : 'pt-4 sm:pt-8 lg:pt-12 pb-6 sm:pb-10 lg:pb-16'} px-4 sm:px-8 lg:px-14 [scrollbar-width:thin!important] [scrollbar-color:theme(colors.zen-sand/30)_transparent!important]`}>
              {children}
            </div>

            {footer && (
              <div className="px-4 sm:px-8 lg:px-14 py-3 sm:py-4 lg:py-5 border-t border-zen-brown/10 bg-white/40 backdrop-blur-3xl shrink-0 relative z-50">
                {footer}
              </div>
            )}

            {/* Ambient Background Glow */}
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-zen-sand/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-zen-leaf/5 rounded-full blur-[120px] pointer-events-none opacity-30" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
