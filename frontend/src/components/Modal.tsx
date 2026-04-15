import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  hideHeader?: boolean;
  subtitle?: React.ReactNode;
  headerIcon?: React.ElementType;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = 'max-w-lg',
  hideHeader = false,
  subtitle,
  headerIcon: HeaderIcon = Sparkles
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-10">
          {/* Immersive Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zen-brown/30 backdrop-blur-sm"
          />
          
          {/* Zen Terminal / Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full ${maxWidth} bg-white/95 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[3rem] shadow-[-10px_20px_60px_-15px_rgba(74,55,40,0.15)] overflow-hidden border border-white flex flex-col max-h-[95vh] sm:max-h-[90vh]`}
          >
            {/* Glossy Top Edge */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {!hideHeader && (
              <div className="flex items-center justify-between px-5 sm:px-10 py-5 sm:py-8 border-b border-zen-brown/15 shrink-0 bg-white/50 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                   <div className="p-2 bg-zen-cream/40 rounded-xl text-zen-sand">
                      <HeaderIcon size={16} />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-zen-brown tracking-tight truncate">{title}</h3>
                      {subtitle && (
                        <p className="mt-1 text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] truncate">
                          {subtitle}
                        </p>
                      )}
                   </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center hover:bg-zen-cream rounded-full transition-all duration-300 text-zen-brown/30 hover:text-zen-brown group"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-none relative z-20">
              {children}
            </div>

            {footer && (
              <div className="px-5 sm:px-10 py-5 sm:py-8 border-t border-zen-brown/15 bg-white/50 backdrop-blur-md shrink-0 relative z-10">
                {footer}
              </div>
            )}
            
            {/* Ambient Background Glow */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-zen-sand/5 rounded-full blur-[80px] pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
