import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

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
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Hero Section */}
      <section className="px-6 lg:px-24 mb-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
             <div className="space-y-6">
                <div className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
                   <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
                   Reach the Sanctuary
                </div>
                <h1 className="text-6xl lg:text-9xl font-serif font-bold leading-[0.8] tracking-tighter">
                   Begin Your<br />
                   <span className="italic relative">
                     Journey
                     <span className="absolute -bottom-4 left-0 w-full h-[2px] bg-[#4A2C40]/10" />
                   </span>
                </h1>
             </div>

             <div className="grid sm:grid-cols-2 gap-12">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-[#4A2C40]">
                      <MapPin size={24} />
                      <h3 className="font-serif font-bold text-xl">The Grounds</h3>
                   </div>
                   <p className="text-[#32172A]/60 leading-relaxed font-sans">
                      12 Lotus Path, Equilibrium Valley<br />
                      West Doha, Qatar
                   </p>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-[#4A2C40]">
                      <Clock size={24} />
                      <h3 className="font-serif font-bold text-xl">Sanctuary Hours</h3>
                   </div>
                   <p className="text-[#32172A]/60 leading-relaxed font-sans">
                      Sunrise — Sunset<br />
                      Daily Rituals Available
                   </p>
                </div>

                <div className="space-y-4 text-center sm:text-left">
                   <div className="flex items-center gap-3 text-[#4A2C40]">
                      <Phone size={24} />
                      <h3 className="font-serif font-bold text-xl">Direct Line</h3>
                   </div>
                   <p className="text-[#32172A]/60 leading-relaxed font-sans">
                      +974 4455 6677<br />
                      +974 7788 9900
                   </p>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-[#4A2C40]">
                      <Mail size={24} />
                      <h3 className="font-serif font-bold text-xl">Correspondence</h3>
                   </div>
                   <p className="text-[#32172A]/60 leading-relaxed font-sans">
                      peace@zenspa.qa<br />
                      concierge@zenspa.qa
                   </p>
                </div>
             </div>
          </div>

          <div className="animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
             <div className="p-10 lg:p-16 bg-white border border-[#32172A]/5 rounded-[4rem] shadow-2xl relative">
                {isSubmitted ? (
                  <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
                     <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={48} />
                     </div>
                     <h2 className="text-4xl font-serif font-bold text-[#32172A]">Message Received</h2>
                     <p className="text-[#32172A]/60 max-w-xs mx-auto">
                        Your inquiry has reached the sanctuary. Our concierge will respond within 12 hours.
                     </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                       <h3 className="text-3xl font-serif font-bold">Inquiry Form</h3>
                       <p className="text-sm text-[#32172A]/40 uppercase tracking-widest font-bold font-sans">All fields are sacred</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="group space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-[#32172A]/40 group-focus-within:text-[#4A2C40] transition-colors">Full Name</label>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-transparent border-b border-[#32172A]/10 py-3 px-1 focus:border-[#4A2C40] outline-none transition-colors font-sans text-lg italic" 
                            placeholder="John Doe"
                          />
                       </div>
                       <div className="group space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-[#32172A]/40 group-focus-within:text-[#4A2C40] transition-colors">Email Address</label>
                          <input 
                            type="email" 
                            required
                            className="w-full bg-transparent border-b border-[#32172A]/10 py-3 px-1 focus:border-[#4A2C40] outline-none transition-colors font-sans text-lg italic" 
                            placeholder="john@example.com"
                          />
                       </div>
                    </div>

                    <div className="group space-y-2">
                       <div className="flex justify-between items-center">
                          <label className={`text-xs font-bold uppercase tracking-widest ${phoneError ? 'text-red-500' : 'text-[#32172A]/40 group-focus-within:text-[#4A2C40]'} transition-colors`}>Phone Number</label>
                          {phoneError && <span className="text-[10px] text-red-500 font-bold uppercase">{phoneError}</span>}
                       </div>
                       <input 
                         type="tel" 
                         value={phone}
                         onChange={handlePhoneChange}
                         required
                         className={`w-full bg-transparent border-b ${phoneError ? 'border-red-500' : 'border-[#32172A]/10 focus:border-[#4A2C40]'} py-3 px-1 outline-none transition-colors font-sans text-lg italic`} 
                         placeholder="+974 0000 0000"
                       />
                    </div>

                    <div className="group space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest text-[#32172A]/40 group-focus-within:text-[#4A2C40] transition-colors">Requested Ritual</label>
                       <select className="w-full bg-transparent border-b border-[#32172A]/10 py-3 px-1 focus:border-[#4A2C40] outline-none transition-colors font-sans text-lg italic appearance-none">
                          <option>General Inquiry</option>
                          <option>Ayurvedic Massage</option>
                          <option>Sound Healing</option>
                          <option>Floral Facial</option>
                          <option>Himalayan Salt Sauna</option>
                       </select>
                    </div>

                    <div className="group space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest text-[#32172A]/40 group-focus-within:text-[#4A2C40] transition-colors">Intentions</label>
                       <textarea 
                         rows={4}
                         className="w-full bg-transparent border-b border-[#32172A]/10 py-3 px-1 focus:border-[#4A2C40] outline-none transition-colors font-sans text-lg italic resize-none" 
                         placeholder="Tell us what you seek to find..."
                       />
                    </div>

                    <button 
                      type="submit"
                      disabled={!!phoneError}
                      className="w-full py-5 bg-[#32172A] text-white rounded-full font-bold flex items-center justify-center gap-3 group/btn hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
                    >
                       Dispatch Inquiry
                       <Send size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                  </form>
                )}
             </div>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="px-6 lg:px-24 pb-32">
         <div className="max-w-7xl mx-auto h-[500px] bg-[#E4E2DE] rounded-[5rem] overflow-hidden flex items-center justify-center relative group">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80" 
              alt="Map Location" 
              className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#32172A]/20 to-transparent" />
            <div className="relative p-12 backdrop-blur-2xl bg-white/40 border border-white/80 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 text-center animate-bounce-slow">
               <div className="p-4 bg-[#4A2C40] text-white rounded-2xl shadow-xl">
                  <MapPin size={32} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-2xl font-serif font-bold text-[#32172A]">The Entrance</h3>
                  <p className="text-sm text-[#32172A]/60">Equilibrium Valley, Doha</p>
               </div>
               <button className="text-xs font-bold uppercase tracking-widest text-[#4A2C40] underline underline-offset-8">Gps coordinates</button>
            </div>
         </div>
      </section>
    </div>
  );
};

export default Contact;
