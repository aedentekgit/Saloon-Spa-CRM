import React from 'react';
import { History, Heart, Sparkles, MapPin } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Hero Content */}
      <section className="px-6 lg:px-24 mb-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
                <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
                The Zen Heritage
              </div>
              <h1 className="text-6xl lg:text-8xl font-serif font-bold leading-tight">
                Our Story of <br />
                <span className="italic">Mindfulness</span>
              </h1>
            </div>

            <div className="space-y-6 text-lg text-[#32172A]/70 leading-relaxed max-w-xl">
              <p>
                Founded in 2024, Zen Sanctuary was born from a simple yet profound vision: to create a physical manifestion of inner peace. We believe that true luxury is found in the moments between, when the world fades and clarity emerges.
              </p>
              <p>
                Drawing from centuries-old eastern traditions and refined with modern neuro-science, our methods go beyond surface treatment. We study the architecture of the soul, ensuring that every guest leaves not just refreshed, but redefined.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="space-y-2">
                <span className="text-4xl font-serif font-bold text-[#4A2C40]">12+</span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#32172A]/40">Master Therapists</p>
              </div>
              <div className="space-y-2">
                <span className="text-4xl font-serif font-bold text-[#4A2C40]">24k</span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#32172A]/40">Souls Restored</p>
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="aspect-square rounded-[5rem] overflow-hidden shadow-2xl relative z-10">
              <img 
                src="/images/about_hero.png" 
                alt="Zen Sanctuary – luxurious spa treatment room with herbal botanicals and candlelight" 
                className="w-full h-full object-cover grayscale-[0.3]"
              />
            </div>
            {/* Soft decorative circles */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#E5BAD4]/20 rounded-full blur-3xl -z-0" />
            <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-[#4A2C40]/5 rounded-full blur-3xl -z-0" />
          </div>
        </div>
      </section>

      {/* Philosophy Carousel-like Display */}
      <section className="bg-[#32172A] text-[#FAF9F6] py-32 px-6 lg:px-24 rounded-t-[5rem]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="space-y-8">
              <div className="p-4 bg-white/5 w-fit rounded-2xl border border-white/10">
                <History className="text-[#E5BAD4]" size={32} />
              </div>
              <h3 className="text-3xl font-serif font-bold leading-tight">Ancestral Healing</h3>
              <p className="text-white/60 leading-relaxed">
                We preserve the sanctity of traditional ayurvedic and herbal practices, sourcing rare botanicals directly from sustainable mountain gardens.
              </p>
            </div>

            <div className="space-y-8">
              <div className="p-4 bg-white/5 w-fit rounded-2xl border border-white/10">
                <Sparkles className="text-[#E5BAD4]" size={32} />
              </div>
              <h3 className="text-3xl font-serif font-bold leading-tight">Modern Luxury</h3>
              <p className="text-white/60 leading-relaxed">
                Silence is our greatest luxury. Every room is acoustically tuned and equipped with ambient light cycles to match your circadian rhythm.
              </p>
            </div>

            <div className="space-y-8">
              <div className="p-4 bg-white/5 w-fit rounded-2xl border border-white/10">
                <Heart className="text-[#E5BAD4]" size={32} />
              </div>
              <h3 className="text-3xl font-serif font-bold leading-tight">Radical Empathy</h3>
              <p className="text-white/60 leading-relaxed">
                Our staff is trained not just in service, but in the art of anticipation. We aim to understand your needs before you have to voice them.
              </p>
            </div>
          </div>

          <div className="mt-32 pt-32 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full border border-white/40 p-2 overflow-hidden">
                <img src="/images/about_founder.png" alt="Elena Vora – Master of Equilibrium & Founder" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <p className="font-serif font-bold text-xl">Elena Vora</p>
                <p className="text-sm text-white/40 uppercase tracking-widest">Master of Equilibrium & Founder</p>
              </div>
            </div>
            
            <div className="max-w-md text-right md:text-left italic text-2xl text-white/80 leading-snug">
              "We don't sell treatments. We provide the container for transformation to occur."
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
