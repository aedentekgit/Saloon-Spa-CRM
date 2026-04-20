import React from 'react';
import { History, Heart, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import PublicNavbar from '../../components/landing/PublicNavbar';
import PublicFooter from '../../components/landing/PublicFooter';

const About = () => {
  const { settings } = usePublicSettings();
  const siteName = settings.general.siteName;

  return (
    <div className="min-h-screen bg-zen-cream text-zen-brown selection:bg-zen-sand/20">
      <PublicNavbar />
      {/* Hero Content - Image 1 Style */}
      <section className="px-6 lg:px-24 mb-16 pt-40 md:pt-48">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-[10px] md:text-sm font-bold tracking-[0.2em] uppercase text-zen-brown/60">
                <span className="w-8 h-[1px] bg-zen-brown/30" />
                Est. 2024 • {siteName}
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-[6.5rem] font-serif font-bold leading-[0.9] tracking-tight">
                Our Story at<br />
                <span className="italic relative animate-text-shine">
                  Sanctuary
                  <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-zen-brown/10" />
                </span>
              </h1>
            </div>

            <div className="space-y-8 text-xl text-zen-brown/60 font-light leading-relaxed max-w-xl">
              <p>
                {siteName} was born from a simple yet profound vision: to create a physical manifestation of inner peace. We believe that true luxury is found in the moments between, when the world fades and clarity emerges.
              </p>
            </div>

            <div className="flex items-center gap-12 pt-8">
              <div className="space-y-1">
                <span className="text-5xl font-serif font-bold text-zen-brown">12+</span>
                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-zen-brown/20">Master Therapists</p>
              </div>
              <div className="h-10 w-[1px] bg-zen-brown/10" />
              <div className="space-y-1">
                <span className="text-5xl font-serif font-bold text-zen-brown">24k</span>
                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-zen-brown/20">Souls Restored</p>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="aspect-[4/5] lg:aspect-square rounded-[3rem] lg:rounded-[5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(74,55,40,0.15)] relative z-10 border-[12px] border-white">
              <img 
                src="/about_hero_zen_1776541173591.png" 
                alt="Zen Sanctuary" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
              />
            </div>
            {/* Soft decorative elements */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-zen-sand/10 rounded-full blur-3xl -z-0 animate-pulse" />
            <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-zen-brown/5 rounded-full blur-3xl -z-0" />
          </div>
        </div>
      </section>

      {/* Philosophy Section - Minimalist Luxury Re-design */}
      <section className="bg-zen-cream py-24 lg:py-40 px-6 lg:px-24">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-32">
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-zen-brown/40">
                <span className="w-12 h-[1px] bg-zen-brown/20" />
                Our Ethos
              </div>
              <h2 className="text-5xl lg:text-7xl font-serif text-zen-brown leading-[1.1]">
                The Foundation of <br />
                <span className="italic">Sanctuary</span>
              </h2>
            </div>
            <p className="max-w-sm text-lg text-zen-brown/60 font-light leading-relaxed">
              We don't just provide services; we curate experiences that harmonize the physical and the metaphysical.
            </p>
          </div>

          {/* Pillar Cards - Refined Minimalist Design */}
          <div className="grid lg:grid-cols-3 gap-1px bg-zen-brown/10 border border-zen-brown/10 rounded-[3rem] overflow-hidden shadow-2xl shadow-zen-brown/5">
            {[
              { 
                icon: History, 
                title: 'Ancestral Healing', 
                desc: 'Preserving the sanctity of traditional ayurvedic and herbal practices, sourcing rare botanicals from sustainable mountain gardens.'
              },
              { 
                icon: Sparkles, 
                title: 'Modern Luxury', 
                desc: 'Acoustically tuned sanctuaries equipped with ambient light cycles to match your circadian rhythm for ultimate restoration.'
              },
              { 
                icon: Heart, 
                title: 'Radical Empathy', 
                desc: 'Anticipatory service rooted in the art of silence. We aim to understand your needs before they are ever voiced.'
              }
            ].map((pillar, idx) => (
              <div key={idx} className="group relative bg-white p-12 lg:p-16 hover:bg-zen-cream/30 transition-all duration-700">
                <div className="mb-12 relative">
                   <div className="w-16 h-16 rounded-2xl bg-zen-cream flex items-center justify-center text-zen-brown group-hover:scale-110 group-hover:bg-zen-brown group-hover:text-white transition-all duration-700">
                     <pillar.icon size={28} strokeWidth={1.25} />
                   </div>
                </div>
                <h3 className="text-2xl lg:text-3xl font-serif font-bold text-zen-brown mb-6">{pillar.title}</h3>
                <p className="text-zen-brown/60 leading-loose text-[15px] font-medium tracking-wide">
                  {pillar.desc}
                </p>
                <div className="mt-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-zen-brown/30 group-hover:text-zen-brown transition-colors">
                  Learn More <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>

          {/* Founder Quote - Editorial Layout */}
          <div className="mt-40 grid lg:grid-cols-2 gap-24 items-center">
            <div className="relative group overflow-hidden rounded-[4rem] aspect-[4/5] shadow-2xl">
              <img 
                src="/about_founder_portrait_1776541198229.png" 
                alt="Elena Vora" 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zen-brown/40 to-transparent opacity-60" />
              <div className="absolute bottom-12 left-12">
                 <p className="text-white font-serif text-3xl font-bold">Elena Vora</p>
                 <p className="text-white/70 text-xs uppercase tracking-[0.4em] font-black mt-2">Founder & Visionary</p>
              </div>
            </div>

            <div className="space-y-12">
               <span className="text-zen-sand">
                 <History size={48} strokeWidth={1} />
               </span>
               <blockquote className="text-3xl lg:text-5xl font-serif italic text-zen-brown leading-[1.3] tracking-tight relative">
                  <span className="absolute -top-10 -left-6 text-8xl font-serif text-zen-brown/5 select-none">"</span>
                  We don't sell treatments. We provide the container for transformation to occur at {siteName}.
               </blockquote>
               <div className="space-y-6">
                 <div className="h-[2px] w-24 bg-zen-sand" />
                 <p className="text-lg text-zen-brown/60 font-light max-w-md leading-relaxed">
                   Join us in a journey that transcends the mundane. Every detail in {siteName} is a deliberate step towards your equilibrium.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
};

export default About;
