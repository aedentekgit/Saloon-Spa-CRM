import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  onClose: (id: number) => void;
}

const ZenNotification: React.FC<NotificationProps> = ({ id, type, title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const config = {
    success: { icon: CheckCircle2, color: 'text-zen-leaf', bg: 'bg-zen-leaf/10' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    info: { icon: Info, color: 'text-zen-sand', bg: 'bg-zen-sand/10' },
    warning: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  };

  const { icon: Icon, color, bg } = config[type];

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.9, rotate: 2 }}
      animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
      exit={{ x: 100, opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`relative w-80 sm:w-96 flex items-start gap-5 p-6 rounded-[2.5rem] shadow-2xl bg-white/80 backdrop-blur-xl border border-white overflow-hidden group`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${bg.replace('/10', '')}`} />
      
      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={24} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2 mb-1">
           <h4 className="text-sm font-black text-zen-brown tracking-tight truncate">{title}</h4>
           {type === 'success' && <Sparkles size={12} className="text-zen-sand animate-pulse" />}
        </div>
        <p className="text-[10px] sm:text-[11px] text-zen-brown/50 leading-relaxed font-bold uppercase tracking-wider">{message}</p>
      </div>

      <button
        onClick={() => onClose(id)}
        className="absolute top-6 right-6 p-2 text-zen-brown/10 hover:text-zen-brown transition-colors group-hover:scale-110 active:scale-95"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

export const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  // We'll expose this via a simple global listener for this demo
  useEffect(() => {
    const handleAdd = (e: any) => {
      const { type, title, message } = e.detail;
      setNotifications(prev => [{ id: Date.now(), type, title, message }, ...prev].slice(0, 5));
    };

    window.addEventListener('zen-notify', handleAdd);
    return () => window.removeEventListener('zen-notify', handleAdd);
  }, []);

  const remove = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <div className="fixed bottom-12 right-12 z-[10000] flex flex-col gap-3">
      <AnimatePresence>
        {notifications.map(n => (
          <ZenNotification key={n.id} {...n} onClose={remove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export const notify = (type: NotificationType, title: string, message: string) => {
  const event = new CustomEvent('zen-notify', {
    detail: { type, title, message }
  });
  window.dispatchEvent(event);
};
