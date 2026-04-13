import React from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, Sparkles } from 'lucide-react';
import { ZenInput, ZenTextarea } from '../../components/zen/ZenInputs';
import { ZenButton } from '../../components/zen/ZenButtons';

const Contact = () => {
  return (
    <div className="pt-20 lg:pt-32 pb-24 lg:pb-40 min-h-screen">
      <section className="container mx-auto px-6 mb-16 lg:mb-24 text-center">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-zen-sand/5 border border-zen-sand/10 rounded-full text-zen-sand text-[10px] font-black uppercase tracking-[0.3em] mb-10 shadow-inner"
          >
            <MessageCircle size={14} />
            Connect With Us
        </motion.div>
        <h1 className="text-5xl lg:text-7xl font-serif font-black text-zen-brown tracking-tighter mb-8 leading-tight">
          Seek Your <span className="text-zen-sand">Sanctuary</span>
        </h1>
        <p className="text-lg lg:text-xl text-zen-brown/50 font-medium max-w-3xl mx-auto leading-relaxed">
          Questions, inquiries, or pre-meditation consultations? Our gatekeepers are here to guide you to your perfect resonance.
        </p>
      </section>

      <section className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          
          {/* Info Side */}
          <div className="w-full lg:w-1/3 space-y-12">
            <div className="glass rounded-[3rem] p-10 space-y-8 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-zen-sand">
                <MapPin size={120} />
              </div>

              <div>
                <h3 className="text-[11px] font-black text-zen-sand uppercase tracking-[0.4em] mb-6">The Locale</h3>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zen-sand/5 flex items-center justify-center text-zen-sand shrink-0 shadow-inner">
                    <MapPin size={20} />
                  </div>
                  <p className="text-sm text-zen-brown/60 font-medium leading-[2]">
                    123 Lotus Avenue, Celestial Gardens<br />Doha, Qatar
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black text-zen-sand uppercase tracking-[0.4em] mb-6">Voice Resonance</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zen-sand/5 flex items-center justify-center text-zen-sand shrink-0 shadow-inner">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-serif font-black text-zen-brown">+974 4455 6677</p>
                    <p className="text-[10px] text-zen-brown/30 font-bold uppercase tracking-widest mt-0.5">Primary Reception</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black text-zen-sand uppercase tracking-[0.4em] mb-6">Operational Hours</h3>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zen-sand/5 flex items-center justify-center text-zen-sand shrink-0 shadow-inner">
                    <Clock size={20} />
                  </div>
                  <div className="space-y-2 text-sm text-zen-brown/60 font-medium">
                     <div className="flex justify-between gap-8">
                       <span>Mon - Sat:</span>
                       <span className="text-zen-brown font-black">09:00 - 21:00</span>
                     </div>
                     <div className="flex justify-between gap-8">
                       <span>Sunday:</span>
                       <span className="text-zen-brown font-black">10:00 - 18:00</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-[3rem] p-10 flex flex-col items-center text-center space-y-4 border-dashed border-zen-sand/20">
               <p className="text-[10px] font-black text-zen-sand uppercase tracking-[0.3em]">Immediate Query?</p>
               <button className="flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                  <Sparkles size={16} />
                  WhatsApp Concierge
               </button>
            </div>
          </div>

          {/* Form Side */}
          <div className="w-full lg:w-2/3">
             <div className="glass rounded-[4rem] p-12 lg:p-20 shadow-3xl bg-gradient-to-br from-white/90 to-zen-sand/5 border-white">
                <h2 className="text-3xl lg:text-5xl font-serif text-zen-brown tracking-tight mb-12">Send a <span className="italic text-zen-sand">Message</span></h2>
                
                <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <ZenInput label="Identity" placeholder="Full Name" icon={Send} />
                      <ZenInput label="Email Node" placeholder="email@address.com" icon={Mail} />
                   </div>
                   <ZenInput label="Inquiry Thread" placeholder="Subject of Interest" icon={Sparkles} />
                   <ZenTextarea label="The Oracle Message" placeholder="Describe your sanctuary needs..." />
                   
                   <div className="pt-6">
                      <ZenButton className="w-full h-16 rounded-[2rem] text-sm tracking-[0.3em]">Transmit Inquiry</ZenButton>
                   </div>
                   
                   <p className="text-center text-[10px] font-medium text-zen-brown/30 uppercase tracking-[0.2em] pt-6">
                      Our custodians will resonate back within 24 operational hours.
                   </p>
                </form>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
