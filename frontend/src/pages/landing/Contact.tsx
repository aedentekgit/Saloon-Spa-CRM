import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { motion, AnimatePresence } from 'motion/react';
import PublicNavbar from '../../components/landing/PublicNavbar';
import PublicFooter from '../../components/landing/PublicFooter';

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { settings } = usePublicSettings();

  const validatePhone = (value: string) => {
    // Basic international phone validation regex
    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    if (!value) return 'Required';
    if (!phoneRegex.test(value)) return 'Invalid phone format (e.g. +1 234 567 8900)';
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);
    setPhoneError(validatePhone(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5005);
  };

  return (
    <div className="relative min-h-screen bg-zen-cream text-zen-brown overflow-hidden selection:bg-zen-sand/20">
      <PublicNavbar />

      {/* Unique Immersive Header for Contact */}
      <header className="relative z-10 px-6 pt-48 pb-16 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="space-y-12"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-[10px] md:text-sm font-bold tracking-[0.4em] uppercase text-zen-brown/40">
                  <span className="w-12 h-[1px] bg-zen-brown/20" />
                  Direct Connection
                </div>
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-[0.9] tracking-tighter">
                  Begin Your<br />
                  <span className="italic relative animate-text-shine">
                    Journey
                  </span>
                </h1>
              </div>

              <div className="p-8 lg:p-12 bg-white rounded-[3rem] shadow-2xl shadow-zen-brown/5 border border-zen-stone/10">
                 <div className="space-y-10">
                    <div className="flex gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-zen-sand/10 flex items-center justify-center text-zen-sand">
                          <MapPin size={24} />
                       </div>
                       <div className="space-y-2">
                          <h3 className="font-serif font-bold text-xl uppercase tracking-widest text-[10px] text-zen-brown/40">The Grounds</h3>
                          <p className="text-lg leading-relaxed font-sans">{settings.general.address}</p>
                       </div>
                    </div>
                    <div className="flex gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-zen-sand/10 flex items-center justify-center text-zen-sand">
                          <Phone size={24} />
                       </div>
                       <div className="space-y-2">
                          <h3 className="font-serif font-bold text-xl uppercase tracking-widest text-[10px] text-zen-brown/40">Direct Line</h3>
                          <p className="text-lg leading-relaxed font-sans">{settings.general.contactNumber}</p>
                       </div>
                    </div>
                    <div className="flex gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-zen-sand/10 flex items-center justify-center text-zen-sand">
                          <Mail size={24} />
                       </div>
                       <div className="space-y-2">
                          <h3 className="font-serif font-bold text-xl uppercase tracking-widest text-[10px] text-zen-brown/40">Correspondence</h3>
                          <p className="text-lg leading-relaxed font-sans">{settings.general.email}</p>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative p-10 lg:p-16 bg-zen-brown text-zen-cream rounded-[4rem] shadow-3xl overflow-hidden"
            >
              {/* Decorative background element for the form */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -z-0" />
              
              <div className="relative z-10">
                {isSubmitted ? (
                  <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-white/10 text-white rounded-full flex items-center justify-center">
                      <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-4xl font-serif font-bold">Message Received</h2>
                    <p className="opacity-60 max-w-xs mx-auto">
                      Your inquiry has reached the sanctuary. Our concierge will respond within 12 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-serif font-bold">Inquiry Form</h3>
                      <p className="text-[10px] opacity-40 uppercase tracking-[0.4em] font-bold">All fields are sacred</p>
                    </div>

                    <div className="space-y-6">
                      <div className="group space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40 group-focus-within:opacity-100 transition-opacity">Full Name</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-transparent border-b border-white/20 py-4 px-1 focus:border-white outline-none transition-colors font-sans text-xl" 
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="group space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40 group-focus-within:opacity-100 transition-opacity">Email Address</label>
                        <input 
                          type="email" 
                          required
                          className="w-full bg-transparent border-b border-white/20 py-4 px-1 focus:border-white outline-none transition-colors font-sans text-xl" 
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="group space-y-2">
                        <div className="flex justify-between items-center">
                          <label className={`text-[9px] font-bold uppercase tracking-[0.3em] ${phoneError ? 'text-red-400' : 'opacity-40 group-focus-within:opacity-100'} transition-opacity`}>Phone Number</label>
                          {phoneError && <span className="text-[9px] text-red-400 font-bold uppercase">{phoneError}</span>}
                        </div>
                        <input 
                          type="tel" 
                          value={phone}
                          onChange={handlePhoneChange}
                          required
                          className={`w-full bg-transparent border-b ${phoneError ? 'border-red-400' : 'border-white/20 focus:border-white'} py-4 px-1 outline-none transition-colors font-sans text-xl`} 
                          placeholder="+974 0000 0000"
                        />
                      </div>
                      <div className="group space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40 group-focus-within:opacity-100 transition-opacity">Intentions</label>
                        <textarea 
                          rows={3}
                          className="w-full bg-transparent border-b border-white/20 py-4 px-1 focus:border-white outline-none transition-colors font-sans text-xl resize-none" 
                          placeholder="Tell us what you seek to find..."
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={!!phoneError}
                      className="w-full py-6 bg-white text-zen-brown rounded-full font-bold flex items-center justify-center gap-4 group/btn hover:bg-zen-sand hover:text-white transition-all shadow-2xl disabled:opacity-50"
                    >
                      <span className="uppercase tracking-[0.3em] text-[11px]">Dispatch Inquiry</span>
                      <Send size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Map Section - Simplified Context */}
      <section className="px-6 lg:px-24 pb-32">
        <div className="max-w-7xl mx-auto h-[600px] bg-zen-stone/10 rounded-[4rem] overflow-hidden relative group">
          <img 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80" 
            alt="Map Location" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zen-cream via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-12 flex justify-center">
             <div className="px-10 py-6 backdrop-blur-3xl bg-white/60 border border-white/80 rounded-[2rem] shadow-sm flex items-center gap-8">
                <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest">Sanctuary Entrance</span>
                   <span className="text-xl font-serif font-bold text-zen-brown">{settings.general.address}</span>
                </div>
                <div className="h-10 w-[1px] bg-zen-brown/10" />
                <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-zen-brown underline underline-offset-8">Get Coordinates</button>
             </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Contact;
