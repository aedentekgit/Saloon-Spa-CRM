import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, Sun, Leaf, Globe, ShieldCheck } from 'lucide-react';

const About = () => {
  return (
    <div className="pt-20 lg:pt-32 pb-24 lg:pb-40">
      {/* Header Section */}
      <section className="container mx-auto px-6 mb-24 lg:mb-40 text-center">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-zen-sand/5 border border-zen-sand/10 rounded-full text-zen-sand text-[10px] font-black uppercase tracking-[0.3em] mb-10 shadow-inner"
          >
            <Sun size={14} />
            Our Philosophy
        </motion.div>
        <h1 className="text-5xl lg:text-7xl font-serif font-black text-zen-brown tracking-tighter mb-8 leading-tight">
          A Legacy of <span className="text-zen-sand text-glow">Peace</span> and Precision
        </h1>
        <p className="text-lg lg:text-xl text-zen-brown/50 font-medium max-w-3xl mx-auto leading-relaxed">
          The Zen Spa was born from a simple vision: to create a temporal rift where time slows down and the spirit can finally catch up with the body.
        </p>
      </section>

      {/* Story Sections */}
      <section className="container mx-auto px-6 space-y-24 lg:space-y-40">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="w-full lg:w-1/2 rounded-[4rem] bg-gradient-to-br from-zen-sand/10 to-zen-leaf/10 border border-zen-sand/10 aspect-video flex items-center justify-center p-8 lg:p-12 relative overflow-hidden group">
            <Sparkles size={160} className="text-zen-sand opacity-5 group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-white/20 transition-all group-hover:bg-white/0" />
            <div className="relative glass p-10 rounded-[2.5rem] border-white/60 shadow-2xl text-center">
              <span className="text-6xl font-serif font-black text-zen-sand">10+</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-zen-brown mt-2">Years of Sanctuary</p>
            </div>
          </div>
          <div className="w-full lg:w-1/2 space-y-8">
            <h2 className="text-3xl lg:text-5xl font-serif text-zen-brown tracking-tight leading-tight">
              Crafting Immersion Beyond the <span className="italic font-normal">Standard</span>.
            </h2>
            <p className="text-sm lg:text-base text-zen-brown/50 font-medium leading-relaxed">
              We don't just provide treatments; we engineer environments. Every aspect of our spa, from the precise frequency of the ambient music to the golden ratio applied to our architecture, is designed to induce a state of deep meditative resonance.
            </p>
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <p className="text-[11px] font-black text-zen-sand uppercase tracking-widest">Natural Essence</p>
                    <p className="text-sm text-zen-brown/40 font-medium leading-relaxed">Only the purest biological elements touch your skin.</p>
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-black text-zen-sand uppercase tracking-widest">Sonic Balance</p>
                    <p className="text-sm text-zen-brown/40 font-medium leading-relaxed">Curated soundscapes to align your internal rhythms.</p>
                </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="glass rounded-[4rem] p-12 lg:p-24 border-white shadow-3xl bg-gradient-to-br from-white/90 to-zen-sand/5">
          <h2 className="text-3xl lg:text-5xl font-serif text-zen-brown tracking-tight leading-tight text-center mb-16 lg:mb-24">
            The Pillars of <span className="text-zen-sand italic">Tranquility</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            {[
              { icon: Heart, title: 'Kindness', desc: 'Empathy is the foundation of every touch.' },
              { icon: Leaf, title: 'Nature', desc: 'Sourcing organic purity from the celestial Earth.' },
              { icon: Globe, title: 'Culture', desc: 'Merging global rituals with local heritage.' },
              { icon: ShieldCheck, title: 'Quality', desc: 'Excellence in every micro-interaction.' }
            ].map((value, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-6 group">
                <div className="w-16 h-16 rounded-2xl glass-dark flex items-center justify-center text-zen-sand group-hover:bg-zen-sand group-hover:text-white transition-all duration-500 shadow-xl group-hover:scale-110 group-hover:-rotate-6">
                  <value.icon size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-serif text-zen-brown mb-2">{value.title}</h4>
                  <p className="text-xs text-zen-brown/40 leading-relaxed font-medium">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
