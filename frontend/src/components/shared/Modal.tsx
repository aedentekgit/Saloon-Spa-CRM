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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 lg:p-10">
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
            className={`relative w-full ${maxWidth} bg-white/95 backdrop-blur-3xl rounded-[1rem] sm:rounded-[1.5rem] shadow-[0_30px_100px_-20px_rgba(74,55,40,0.3)] overflow-hidden border border-white flex flex-col max-h-[90vh] ${className}`}
          >
            {/* Glossy Top Edge */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent z-[60]" />

            {header ? (
              <div className="shrink-0 relative z-50 border-b border-zen-brown/10 bg-white/40 backdrop-blur-3xl">
                {header}
              </div>
            ) : !hideHeader && (
              <div className="flex items-center justify-between px-8 sm:px-16 py-8 sm:py-10 border-b border-zen-brown/10 shrink-0 bg-white/40 backdrop-blur-3xl relative z-50">
                <div className="flex items-center gap-6 sm:gap-10 min-w-0">
                   <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zen-sand/10 rounded-[1rem] text-zen-sand flex items-center justify-center shadow-inner border border-zen-sand/5">
                      <HeaderIcon size={32} strokeWidth={1} />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-2xl sm:text-4xl font-serif font-bold text-zen-brown tracking-tighter truncate leading-tight">{title}</h3>
                      {subtitle && (
                        <p className="mt-2 text-[10px] sm:text-[11px] font-bold text-zen-brown/20 uppercase tracking-[0.5em] truncate font-sans">
                          {subtitle}
                        </p>
                      )}
                   </div>
                </div>
                <button 
                   onClick={onClose}
                   className="w-14 h-14 flex items-center justify-center bg-zen-cream/30 hover:bg-zen-cream rounded-full transition-all duration-700 text-zen-brown/10 hover:text-zen-brown group border border-white/50"
                >
                   <X size={24} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-700" />
                </button>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${header || !hideHeader ? 'py-10 sm:py-16' : 'pt-10 sm:pt-16 pb-12 sm:pb-20'} px-8 sm:px-16`}>
              {children}
            </div>

            {footer && (
              <div className="px-8 sm:px-16 py-8 sm:py-12 border-t border-zen-brown/10 bg-white/40 backdrop-blur-3xl shrink-0 relative z-50">
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
