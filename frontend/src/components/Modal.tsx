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
            className={`relative w-full ${maxWidth} bg-white/95 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(74,55,40,0.3)] overflow-hidden border border-white flex flex-col max-h-[90vh] ${className}`}
          >
            {/* Glossy Top Edge */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent z-[60]" />

            {header ? (
              <div className="shrink-0 relative z-50">
                {header}
              </div>
            ) : !hideHeader && (
              <div className="flex items-center justify-between px-6 sm:px-12 py-6 sm:py-10 border-b border-zen-brown/10 shrink-0 bg-white/40 backdrop-blur-md relative z-50">
                <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                   <div className="p-3 bg-zen-sand/10 rounded-2xl text-zen-sand shadow-inner">
                      <HeaderIcon size={20} strokeWidth={1.5} />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-xl sm:text-3xl font-serif font-bold text-zen-brown tracking-tight truncate">{title}</h3>
                      {subtitle && (
                        <p className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] truncate font-sans">
                          {subtitle}
                        </p>
                      )}
                   </div>
                </div>
                <button 
                   onClick={onClose}
                   className="w-12 h-12 flex items-center justify-center hover:bg-zen-cream rounded-full transition-all duration-500 text-zen-brown/20 hover:text-zen-brown group bg-zen-cream/30 border border-white"
                >
                   <X size={20} className="group-hover:rotate-90 transition-transform duration-700" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-6 sm:px-12 py-8 sm:py-12">
              {children}
            </div>

            {footer && (
              <div className="px-6 sm:px-12 py-6 sm:py-10 border-t border-zen-brown/10 bg-white/60 backdrop-blur-xl shrink-0 relative z-50">
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
