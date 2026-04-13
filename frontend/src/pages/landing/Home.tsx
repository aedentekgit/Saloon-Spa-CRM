import React from 'react';
import { ArrowRight, Leaf, Waves, Wind, Sun, Star, Award, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A] selection:bg-[#4A2C40]/20 font-sans">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] lg:h-screen flex items-center px-4 md:px-6 lg:px-24 overflow-hidden pt-24 lg:pt-16">
        {/* Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[80%] bg-[#E5BAD4]/10 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-[#4A2C40]/5 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl w-full mx-auto grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="flex items-center gap-3 text-[10px] md:text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
              <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
              Est. 2024 • The Global Sanctuary
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-[9rem] font-serif font-bold leading-[0.9] tracking-tight">
              The Art of<br />
              <span className="italic relative">
                Profound
                <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-[#4A2C40]/10" />
              </span><br />
              Balance
            </h1>

            <p className="text-lg md:text-xl text-[#32172A]/70 max-w-xl leading-relaxed font-sans mt-6">
              Step into a realm where time slows and every breath is a ritual. 
              We harmonize ancient wisdom with contemporary luxury to restore 
              your soul&apos;s natural resonance.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <Link 
                to="/landing-services"
                className="group relative px-10 py-5 bg-[#32172A] text-[#FAF9F6] rounded-full font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#32172A]/20 text-center sm:text-left"
              >
                <span className="relative z-10 flex items-center justify-center sm:justify-start gap-2 uppercase tracking-widest text-[11px]">
                  Reservation Entry
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#4A2C40] to-[#32172A] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link 
                to="/about"
                className="px-10 py-5 border border-[#32172A]/10 rounded-full font-bold hover:bg-[#32172A]/5 transition-all text-[#32172A]/80 text-center uppercase tracking-widest text-[11px]"
              >
                Our Heritage
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-8 opacity-50 overflow-x-auto pb-4 scrollbar-hide">
               <div className="flex items-center gap-2 shrink-0">
                  <Award size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Global Spa Gold &apos;25</span>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  <ShieldCheck size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ethical Sourced</span>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  <Star size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">5.0 Sanctuary Rating</span>
               </div>
            </div>
          </div>

          {/* Decorative Media Area */}
          <div className="relative animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="aspect-[4/5] w-full rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-2xl lg:skew-y-2">
               <img 
                 src="https://images.unsplash.com/photo-1540555700478-4be28955d20a?auto=format&fit=crop&q=80" 
                 alt="Spa Environment" 
                 className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-1000 scale-110 hover:scale-100"
               />
            </div>
            {/* Glass Card Overlay - Positioned for mobile/desktop */}
            <div className="absolute -bottom-6 -left-4 md:-bottom-10 md:-left-10 p-6 md:p-10 backdrop-blur-3xl bg-white/40 border border-white/50 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl max-w-[280px] md:max-w-sm hidden sm:block">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#4A2C40]/10 rounded-2xl text-[#4A2C40]">
                  <Waves size={24} />
                </div>
                <h3 className="font-serif font-bold text-xl md:text-2xl">Pure Hydration</h3>
              </div>
              <p className="text-xs md:text-sm text-[#32172A]/60 leading-relaxed">
                Experience the restorative power of our signature thermal springs, bottled from deep within the sanctuary grounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Journeys - Mobile First Grid */}
      <section className="py-24 md:py-32 px-4 md:px-6 lg:px-24 bg-white/50">
        <div className="max-w-7xl mx-auto space-y-16">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="text-[11px] font-bold text-[#4A2C40]/60 uppercase tracking-[0.3em]">Signature Collections</div>
                <h2 className="text-4xl md:text-6xl font-serif font-bold">Curated for your <span className="italic">soul&apos;s need</span></h2>
              </div>
              <Link to="/landing-services" className="group flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#32172A]">
                Explore All Rituals
                <div className="w-12 h-12 rounded-full border border-[#32172A]/10 flex items-center justify-center group-hover:bg-[#32172A] group-hover:text-white transition-all">
                   <ArrowRight size={18} />
                </div>
              </Link>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                { title: 'Forest Bathing', desc: 'Japanese shinrin-yoku therapy with native aromatic pine.', img: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80' },
                { title: 'Somatic Release', desc: 'Unblocking deep muscular tension through mindful pressure.', img: 'https://images.unsplash.com/photo-1544161515-436cead10a73?auto=format&fit=crop&q=80' },
                { title: 'Lunar Ceremonies', desc: 'Evening rituals aligned with celestial cycles of renewal.', img: 'https://images.unsplash.com/photo-1532187863486-abf51ad95699?auto=format&fit=crop&q=80' }
              ].map((item, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden mb-6 relative">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-1000 scale-100 group-hover:scale-110" />
                    <div className="absolute inset-x-6 bottom-6 p-6 backdrop-blur-3xl bg-white/20 border border-white/20 rounded-3xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                       <Sparkles className="text-white mb-2" size={20} />
                       <h4 className="text-white font-serif font-bold text-xl">{item.title}</h4>
                    </div>
                  </div>
                  <h3 className="text-2xl font-serif font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-[#32172A]/50 leading-relaxed">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 md:py-32 px-4 md:px-6 lg:px-24">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-6 px-4">
            <h2 className="text-4xl lg:text-6xl font-serif font-bold leading-tight">The Pillars of <span className="italic">Equilibrium</span></h2>
            <p className="text-[#32172A]/60 leading-relaxed font-sans">Our philosophy is rooted in the four essential elements that define the human experience and natural balance.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Leaf, title: 'Growth', desc: 'Sustainable rituals that evolve with your unique lifestyle.' },
              { icon: Waves, title: 'Fluidity', desc: 'Flowing treatments that adapt to your body\'s energy.' },
              { icon: Wind, title: 'Clarity', desc: 'Bespoke aromatics to clear the mind and sharpen focus.' },
              { icon: Sun, title: 'Vitality', desc: 'Energy restoration through light and warmth therapy.' },
            ].map((pill, i) => (
              <div key={i} className="group p-8 md:p-10 bg-white border border-[#32172A]/5 rounded-[3rem] hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-[#4A2C40]/5 rounded-2xl flex items-center justify-center text-[#4A2C40] mb-8 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-500">
                  <pill.icon size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-4">{pill.title}</h3>
                <p className="text-sm text-[#32172A]/60 leading-relaxed font-sans">{pill.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Distinction / Awards */}
      <section className="py-24 md:py-32 px-4 md:px-6 lg:px-24 bg-[#32172A] text-[#FAF9F6] rounded-[3rem] md:rounded-[5rem] mx-4 md:mx-6 mb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 -z-0" />
        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-16 items-center">
           <div className="space-y-10">
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-[#E5BAD4] uppercase tracking-[0.4em]">Refined Excellence</div>
                <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight">A world beyond <br /><span className="italic">the mundane</span></h2>
              </div>
              <p className="text-white/60 text-lg leading-relaxed max-w-md italic">
                "We don't provide services; we curate atmospheric shifts that lead to profound physical and mental transformation."
              </p>
              <div className="flex gap-12 pt-4">
                 <div>
                    <div className="text-4xl font-serif font-bold mb-1">100%</div>
                    <div className="text-[10px] uppercase tracking-widest text-[#E5BAD4]">Organic Source</div>
                 </div>
                 <div>
                    <div className="text-4xl font-serif font-bold mb-1">24/7</div>
                    <div className="text-[10px] uppercase tracking-widest text-[#E5BAD4]">Concierge Support</div>
                 </div>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden mt-12 shadow-2xl">
                 <img src="https://images.unsplash.com/photo-1544161515-436cead10a73?auto=format&fit=crop&q=80" alt="Detail" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                 <img src="https://images.unsplash.com/photo-1620121692029-d088224efc74?auto=format&fit=crop&q=80" alt="Detail" className="w-full h-full object-cover" />
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
