import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { motion, AnimatePresence } from 'motion/react';
import { ZenInput } from '../../components/zen/ZenInputs';
import { validatePhoneNumber } from '../../utils/validation';

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { settings } = usePublicSettings();

  const validatePhone = (value: string) => {
    if (!value) return 'Required';
    const validation = validatePhoneNumber(value, settings?.general?.countryIso || 'QA');
    if (!validation.isValid) return validation.message || 'Invalid format';
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
    <div className="relative min-h-screen bg-zen-cream text-zen-brown selection:bg-zen-sand/20 overflow-x-hidden">

      {/* Soft Ambient Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(212,163,115,0.08),_transparent_70%)] animate-pulse" />
        <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(83,67,55,0.03),_transparent_70%)]" />
      </div>

      <header className="relative z-10 px-4 sm:px-6 pt-8 md:pt-24 lg:pt-32 pb-16 sm:pb-32">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-32 items-center">

            {/* Left Narrative Column */}
            <div className="space-y-10 sm:space-y-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-bold tracking-[0.22em] sm:tracking-[0.4em] uppercase text-zen-brown/40">
                  <span className="w-12 h-[1px] bg-zen-brown/20" />
                  Request Reservation
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-[6.5rem] font-serif font-bold leading-[0.95] lg:leading-[0.9] tracking-tight">
                  Start Your <br />
                  <span className="italic relative animate-text-shine">
                    Ascent
                    <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-zen-brown/10" />
                    <Sparkles className="absolute -top-8 -right-8 text-zen-sand/40 scale-150" size={32} strokeWidth={1} />
                  </span>
                </h1>

                <p className="text-lg sm:text-2xl text-zen-brown/60 leading-relaxed font-light max-w-lg">
                  Every ritual begins with an intention. Share yours with our guest relations team.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="grid gap-6 sm:gap-12"
              >
                <div className="flex gap-4 sm:gap-8 group cursor-default">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-zen-brown/10 flex items-center justify-center text-zen-brown group-hover:bg-zen-primary group-hover:text-white transition-all duration-700 shadow-sm shrink-0">
                    <MapPin size={22} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">The Grounds</p>
                    <p className="text-base sm:text-xl font-serif font-bold group-hover:text-zen-primary transition-colors break-words">{settings.general.address}</p>
                  </div>
                </div>

                <div className="flex gap-4 sm:gap-8 group cursor-default">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-zen-brown/10 flex items-center justify-center text-zen-brown group-hover:bg-zen-primary group-hover:text-white transition-all duration-700 shadow-sm shrink-0">
                    <Phone size={22} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">Immediate Channel</p>
                    <p className="text-base sm:text-xl font-serif font-bold group-hover:text-zen-primary transition-colors">
                      {settings.general.contactNumber.startsWith('+') || settings.general.contactNumber.startsWith('00')
                        ? settings.general.contactNumber
                        : `${settings.general.dialingCode} ${settings.general.contactNumber}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 sm:gap-8 group cursor-default">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-zen-brown/10 flex items-center justify-center text-zen-brown group-hover:bg-zen-primary group-hover:text-white transition-all duration-700 shadow-sm shrink-0">
                    <Mail size={22} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">Digital Liaison</p>
                    <p className="text-base sm:text-xl font-serif font-bold group-hover:text-zen-primary transition-colors break-all">{settings.general.email}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Form Column */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-white/40 blur-3xl -z-10 rounded-full" />
              <div className="bg-white/70 backdrop-blur-3xl rounded-[1.5rem] sm:rounded-[3rem] lg:rounded-[4rem] p-5 sm:p-10 lg:p-16 border border-white shadow-none relative overflow-hidden">

                {/* Decorative Pattern Overlay */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none">
                  <Sparkles size={200} />
                </div>

                <AnimatePresence mode="wait">
                  {isSubmitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="min-h-[500px] flex flex-col items-center justify-center text-center space-y-8"
                    >
                      <div className="w-24 h-24 rounded-full bg-zen-primary/10 flex items-center justify-center text-zen-primary">
                        <CheckCircle2 size={48} strokeWidth={1} />
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-4xl font-serif font-bold leading-tight">Confirmation <br /> Received</h2>
                        <p className="text-zen-brown/60 max-w-xs leading-relaxed">
                          Your intentions have reached us. Our specialists will contact you shortly.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsSubmitted(false)}
                        className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-primary underline underline-offset-8"
                      >
                         Send another inquiry
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8 sm:space-y-12"
                    >
                      <div className="space-y-2">
                        <h2 className="text-4xl font-serif font-bold text-zen-brown">Contact Ritual</h2>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.4em] text-zen-brown/30 italic">Direct Correspondence</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-7 sm:space-y-10">
                        <div className="grid md:grid-cols-2 gap-7 sm:gap-8">
                          <div className="group space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/40 group-focus-within:text-zen-primary transition-colors">Identity</label>
                            <input
                              type="text"
                              required
                              className="w-full bg-transparent border-b border-zen-brown/10 py-3 text-lg font-serif outline-none focus:border-zen-primary transition-all placeholder:text-zen-brown/5"
                              placeholder="Full Name"
                            />
                          </div>
                          <div className="group space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/40 group-focus-within:text-zen-primary transition-colors">Digital Point</label>
                            <input
                              type="email"
                              required
                              className="w-full bg-transparent border-b border-zen-brown/10 py-3 text-lg font-serif outline-none focus:border-zen-primary transition-all placeholder:text-zen-brown/5"
                              placeholder="Email Address"
                            />
                          </div>
                        </div>

                        <ZenInput
                          label="Communication"
                          icon={Phone}
                          type="tel"
                          value={phone}
                          onChange={(e: any) => {
                            const val = e.target.value;
                            setPhone(val);
                            setPhoneError(validatePhone(val));
                          }}
                          required
                          error={phoneError}
                          variant="line"
                          placeholder="0000 0000"
                        />

                        <div className="group space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/40 group-focus-within:text-zen-primary transition-colors">Intentions</label>
                          <textarea
                            rows={3}
                            className="w-full bg-transparent border-b border-zen-brown/10 py-3 text-lg font-serif outline-none focus:border-zen-primary transition-all placeholder:text-zen-brown/5 resize-none"
                            placeholder="Tell us what you seek..."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!!phoneError}
                          className="group/btn w-full bg-zen-primary text-white rounded-2xl sm:rounded-full py-4 sm:py-6 flex items-center justify-center gap-3 sm:gap-6 text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.4em] hover:bg-zen-brown transition-all duration-700 shadow-xl shadow-zen-primary/10 disabled:opacity-30"
                        >
                          Send Transmission
                          <ArrowRight size={16} className="group-hover/btn:translate-x-2 transition-transform" />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Map Section */}
      <section className="px-4 sm:px-6 lg:px-24 pb-16 sm:pb-32">
        <div className="max-w-[1400px] mx-auto rounded-[1.5rem] sm:rounded-[3rem] lg:rounded-[5rem] overflow-hidden relative group h-[430px] sm:h-[560px] lg:h-[700px] border border-white/50">
          <img
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80"
            alt="Sanctuary Entrance"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zen-cream via-transparent to-transparent opacity-80" />
          <div className="absolute inset-x-0 bottom-6 sm:bottom-12 lg:bottom-24 flex justify-center px-4 sm:px-6">
            <div className="w-full sm:w-auto p-5 sm:p-8 lg:p-14 bg-white/85 backdrop-blur-3xl rounded-[1.25rem] sm:rounded-[2rem] lg:rounded-[3rem] border border-white shadow-none flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-8 lg:gap-12 group-hover:-translate-y-1 sm:group-hover:-translate-y-4 transition-transform duration-700">
               <div className="space-y-2">
                 <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.4em] text-zen-brown/30">Arrival Point</p>
                 <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown break-words">{settings.general.address}</h2>
               </div>
               <div className="hidden md:block w-[1px] h-12 bg-zen-brown/10" />
               <button className="flex items-center gap-3 sm:gap-4 text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.3em] text-zen-primary group/map">
                 Get Coordinates
                 <div className="w-10 h-10 rounded-full bg-zen-primary/10 flex items-center justify-center group-hover/map:bg-zen-primary group-hover/map:text-white transition-all">
                   <ArrowUpRight size={18} />
                 </div>
               </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
