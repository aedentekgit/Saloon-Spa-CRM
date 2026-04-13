import React from 'react';
import { ArrowRight, Sparkles, Waves, Leaf, Sun, Coffee, Music } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingServices = () => {
  const rituals = [
    {
      icon: Waves,
      title: 'Ayurvedic Massage',
      desc: 'Synchronized four-hand oil massage to balance the three doshas.',
      price: '$180',
      duration: '90 MIN',
      image: 'https://images.unsplash.com/photo-1544161515-436cead10a73?auto=format&fit=crop&q=80'
    },
    {
      icon: Music,
      title: 'Sound Healing',
      desc: 'Tibetan singing bowls and planetary gongs for deep cellular vibration.',
      price: '$120',
      duration: '60 MIN',
      image: 'https://images.unsplash.com/photo-1620121692029-d088224efc74?auto=format&fit=crop&q=80'
    },
    {
      icon: Leaf,
      title: 'Floral Facials',
      desc: 'Fresh extraction of seasonal blooms for a luminous, natural glow.',
      price: '$150',
      duration: '75 MIN',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80'
    },
    {
      icon: Sun,
      title: 'Himalayan Salt Sauna',
      desc: 'Dry heat detox within a chamber of prehistoric crystal salt.',
      price: '$85',
      duration: '45 MIN',
      image: 'https://images.unsplash.com/photo-1554441584-6997033a384b?auto=format&fit=crop&q=80'
    },
    {
      icon: Coffee,
      title: 'Espresso Body Scrub',
      desc: 'Artisanal coffee beans mixed with raw honey for skin revitalization.',
      price: '$110',
      duration: '50 MIN',
      image: 'https://images.unsplash.com/photo-1620121692029-d088224efc74?auto=format&fit=crop&q=80'
    },
    {
      icon: Sparkles,
      title: 'Gold Dust Ritual',
      desc: 'Signature 24k gold leaf application for divine skin radiance.',
      price: '$250',
      duration: '120 MIN',
      image: 'https://images.unsplash.com/photo-1544161515-436cead10a73?auto=format&fit=crop&q=80'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Header Spacer */}
      <div className="h-40" />

      {/* Hero Section */}
      <section className="relative px-6 lg:px-24 mb-32 pt-20 overflow-hidden">
        {/* Decorative Background Ritual Image */}
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 blur-sm -z-10 rotate-12 translate-x-12 translate-y-12">
           <img 
             src="/Users/aedenteka/.gemini/antigravity/brain/329d471d-25fd-4c6d-b9b1-3933ada8f167/zen_spa_servces_hero_1776076465472.png" 
             alt="Ritual elements" 
             className="w-full h-full object-cover rounded-[5rem]"
           />
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
            <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
            Sacred Rituals
            <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
          </div>
          <h1 className="text-6xl lg:text-8xl font-serif font-bold leading-[0.9]">
            The Path to <br />
            <span className="italic">Renewal</span>
          </h1>
          <p className="max-w-2xl text-lg text-[#32172A]/60 leading-relaxed font-sans mt-4">
            Our services are not mere appointments; they are passages. Each treatment is tailored 
            to your immediate state of being, using rare ingredients and mindful techniques.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-6 lg:px-24 pb-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {rituals.map((ritual, i) => (
            <div 
              key={i} 
              className="group relative bg-white rounded-[3rem] overflow-hidden border border-[#32172A]/5 hover:shadow-2xl transition-all duration-700"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="aspect-[4/5] overflow-hidden relative">
                <img 
                  src={ritual.image} 
                  alt={ritual.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#32172A]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {/* Floating Price/Duration */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                   <div className="px-4 py-1.5 backdrop-blur-3xl bg-white/80 rounded-full text-xs font-bold tracking-widest text-[#4A2C40]">
                     {ritual.duration}
                   </div>
                   <div className="px-4 py-1.5 backdrop-blur-3xl bg-[#32172A]/80 rounded-full text-xs font-bold tracking-widest text-white">
                     {ritual.price}
                   </div>
                </div>
              </div>

              <div className="p-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#4A2C40]/5 rounded-xl flex items-center justify-center text-[#4A2C40]">
                    <ritual.icon size={20} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold">{ritual.title}</h3>
                </div>
                <p className="text-[#32172A]/60 text-sm leading-relaxed">
                  {ritual.desc}
                </p>
                
                <div className="pt-4">
                  <Link 
                    to="/contact" 
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#4A2C40] hover:translate-x-2 transition-transform"
                  >
                    Select Ritual
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full Width CTA */}
      <section className="px-6 lg:px-24 pb-32">
        <div className="max-w-7xl mx-auto bg-[#4A2C40] rounded-[5rem] overflow-hidden relative p-12 lg:p-24 text-center">
           <div className="absolute top-0 right-0 w-[40%] h-full bg-white/5 skew-x-12 -z-0" />
           <div className="relative z-10 space-y-8">
              <h2 className="text-4xl lg:text-6xl font-serif font-bold text-white max-w-2xl mx-auto leading-tight">
                Not sure which path to <span className="italic">choose?</span>
              </h2>
              <p className="text-[#E5BAD4]/60 text-lg max-w-xl mx-auto">
                Consult with our Equilibrium Master for a personalized wellness blueprint designed around your specific goals.
              </p>
              <button className="px-12 py-5 bg-[#FAF9F6] text-[#32172A] rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-xl">
                Request Consultation
              </button>
           </div>
        </div>
      </section>
    </div>
  );
};

export default LandingServices;
