import React from 'react';
import { motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { Sparkles, Heart, Zap, Shield, ArrowRight, Play } from 'lucide-react';

const Home = () => {
  return (
    <div className="pt-20 lg:pt-32">
      {/* Hero Section */}
      <section className="container mx-auto px-6 mb-24 lg:mb-40">
        <div className="relative glass rounded-[4rem] lg:rounded-[6rem] p-12 lg:p-24 overflow-hidden shadow-3xl flex flex-col items-center text-center">
          {/* Animated Background Orbs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-zen-sand/10 blur-[100px] animate-pulse rounded-full -z-10" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-zen-leaf/10 blur-[100px] animate-pulse rounded-full -z-10" />
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-zen-sand/5 border border-zen-sand/10 rounded-full text-zen-sand text-[10px] font-black uppercase tracking-[0.3em] mb-10 shadow-inner"
          >
            <Sparkles size={14} />
            The Sanctuary Awaits
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl lg:text-8xl font-serif font-black text-zen-brown leading-[0.9] tracking-tighter mb-8 max-w-4xl"
          >
            Recover Your <span className="text-zen-sand">Zen</span> In a World of Chaos
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg lg:text-xl text-zen-brown/50 font-medium max-w-2xl leading-relaxed mb-12"
          >
            Experience the ultimate journey of rejuvenation. Our sanctuary blends ancient healing wisdom with modern luxury to rewrite your resonance.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <NavLink to="/landing-services" className="px-12 py-5 bg-zen-sand text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-zen-sand/30 hover:shadow-zen-sand/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group">
              Explore Rituals
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </NavLink>
            <button className="flex items-center gap-4 text-zen-brown/60 hover:text-zen-sand transition-colors group">
              <div className="w-16 h-16 rounded-full glass border-white/60 flex items-center justify-center text-zen-sand shadow-xl group-hover:scale-110 transition-transform">
                <Play size={20} fill="currentColor" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Watch Experience</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container mx-auto px-6 mb-24 lg:mb-40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { 
              icon: Heart, 
              title: 'Holistic Harmony', 
              desc: 'Rituals tailored to your unique spiritual and physical frequency.',
              color: 'text-rose-400',
              bg: 'bg-rose-50'
            },
            { 
              icon: Zap, 
              title: 'Instant Rejuvenation', 
              desc: 'High-precision treatments designed for immediate resonance recovery.',
              color: 'text-amber-400',
              bg: 'bg-amber-50'
            },
            { 
              icon: Shield, 
              title: 'Safe Sanctuary', 
              desc: 'Private, secure environments for deep meditative tranquility.',
              color: 'text-indigo-400',
              bg: 'bg-indigo-50'
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="glass p-10 rounded-[3rem] border-white shadow-xl shadow-zen-brown/5 flex flex-col items-center text-center group"
            >
              <div className={`w-20 h-20 rounded-[2rem] ${feature.bg} flex items-center justify-center ${feature.color} mb-8 shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                <feature.icon size={32} />
              </div>
              <h3 className="text-2xl font-serif text-zen-brown mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-sm text-zen-brown/40 leading-relaxed font-medium">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to action section */}
      <section className="container mx-auto px-6 mb-24 lg:mb-40">
        <div className="glass rounded-[4rem] p-12 lg:p-20 flex flex-col lg:flex-row items-center justify-between gap-12 bg-gradient-to-br from-white/90 to-zen-sand/10 border-white/60 shadow-3xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-12 opacity-5 -z-10 animate-bounce">
            <Sparkles size={200} className="text-zen-sand" />
          </div>
          
          <div className="max-w-xl text-center lg:text-left">
            <h2 className="text-4xl lg:text-6xl font-serif font-black text-zen-brown leading-tight tracking-tighter mb-6">
              Ready to <span className="text-zen-sand">Awaken</span> Your Senses?
            </h2>
            <p className="text-lg text-zen-brown/50 font-medium mb-10 leading-relaxed">
              Join our sanctuary community and begin your journey towards a balanced, vibrant life today.
            </p>
            <NavLink to="/contact" className="px-12 py-5 bg-zen-brown text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-zen-brown/20 hover:bg-zen-sand transition-all inline-flex items-center gap-2">
              Book Your Session
              <ArrowRight size={16} />
            </NavLink>
          </div>

          <div className="w-full lg:w-[450px] aspect-square rounded-[4rem] bg-zen-sand/5 border border-zen-sand/10 relative flex items-center justify-center p-4">
             {/* Master Hero Visual */}
             <div className="w-full h-full rounded-[3.5rem] bg-gradient-to-br from-zen-sand/20 to-zen-leaf/20 flex items-center justify-center overflow-hidden relative shadow-inner">
                <img 
                  src="/images/hero_sanctuary.png" 
                  alt="Zen Spa Sanctuary" 
                  className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110" 
                />
                <div className="absolute inset-x-8 bottom-8 glass rounded-3xl p-6 text-center border-white/60 shadow-2xl">
                  <p className="text-[10px] font-black text-zen-sand uppercase tracking-widest mb-1">Weekly Special</p>
                  <p className="text-sm font-serif font-bold text-zen-brown">Lavender Resonance Aura Massage</p>
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
