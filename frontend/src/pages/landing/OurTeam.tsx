import React from 'react';
import { Award, Star, Heart, Instagram, Linkedin, Twitter } from 'lucide-react';

const OurTeam = () => {
  const practitioners = [
    {
      name: 'Dr. Aarav Sharma',
      role: 'Master of Ayurveda',
      specialty: 'Marma Point Therapy & Detoxification',
      image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80',
      bio: 'With over 20 years of experience in traditional Hindu medicine, Dr. Sharma brings ancestral wisdom to every modern ritual.'
    },
    {
      name: 'Elena Vora',
      role: 'Head of Aesthetics',
      specialty: 'Facial Sculpting & Dermal Vitality',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80',
      bio: 'Elena views skin as a living canvas. Her proprietary "Gold Dust" ritual has been featured in leading global wellness journals.'
    },
    {
      name: 'Julian Thorne',
      role: 'Sound Healing Specialist',
      specialty: 'Vibrational Therapy & Somatic Release',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80',
      bio: 'Julian uses sound as a surgical tool for the spirit. His sessions combine Gregorian chants with modern frequency modulations.'
    },
    {
      name: 'Sophia Chen',
      role: 'Horticulture & Aromatics Lead',
      specialty: 'Botanical Infusion & Essential Blending',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80',
      bio: 'Sophia manages our private sanctuary gardens, ensuring that every botanical used in our treatments is harvested at peak potency.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Header Spacer */}
      <div className="h-40" />

      {/* Hero Section */}
      <section className="px-6 lg:px-24 mb-32">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-end">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
             <div className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
                <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
                The Hands of Healing
             </div>
             <h1 className="text-6xl lg:text-9xl font-serif font-bold leading-[0.8] tracking-tighter">
                Masters of <br />
                <span className="italic">Equilibrium</span>
             </h1>
          </div>
          <div className="pb-4 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
             <p className="text-xl text-[#32172A]/70 leading-relaxed font-sans max-w-md">
                Meet the artisans of peace. Our practitioners are not just trained; they are chosen for their profound connection to the art of renewal.
             </p>
          </div>
        </div>
      </section>

      {/* Practitioners Grid */}
      <section className="px-6 lg:px-24 pb-32">
         <div className="max-w-7xl mx-auto space-y-24">
            {practitioners.map((staff, i) => (
              <div 
                key={i} 
                className={`flex flex-col lg:flex-row gap-16 items-center ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
              >
                 <div className="flex-1 w-full animate-in fade-in zoom-in duration-1000">
                    <div className="aspect-[4/5] rounded-[5rem] overflow-hidden shadow-2xl relative group">
                       <img 
                          src={staff.image} 
                          alt={staff.name} 
                          className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                       />
                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                           {[Instagram, Linkedin, Twitter].map((Social, idx) => (
                             <a key={idx} href="#" className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-[#32172A] transition-all">
                               <Social size={20} />
                             </a>
                           ))}
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="space-y-4">
                       <h2 className="text-5xl lg:text-6xl font-serif font-bold">{staff.name}</h2>
                       <div className="flex items-center gap-4">
                          <span className="px-4 py-1.5 bg-[#4A2C40]/5 rounded-full text-xs font-bold tracking-widest text-[#4A2C40] uppercase">
                            {staff.role}
                          </span>
                       </div>
                    </div>

                    <div className="p-10 border border-[#32172A]/5 bg-white rounded-[3rem] shadow-sm space-y-6">
                       <div className="flex items-center gap-3 text-[#4A2C40]">
                          <Award size={20} />
                          <span className="text-sm font-bold tracking-widest uppercase">{staff.specialty}</span>
                       </div>
                       <p className="text-[#32172A]/60 leading-relaxed italic text-lg">
                         "{staff.bio}"
                       </p>
                       <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-[#4A2C40] text-[#4A2C40]" />)}
                       </div>
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </section>

      {/* Philosophy Join CTA */}
      <section className="px-6 lg:px-24 pb-32">
         <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="w-20 h-[1px] bg-[#32172A]/20 mx-auto" />
            <h2 className="text-4xl font-serif font-bold italic text-[#4A2C40]/80">"Healing is not about fixing. It's about remembering who you were before the world got in the way."</h2>
            <div className="flex items-center justify-center gap-6">
               <Heart className="text-[#4A2C40]" size={32} />
               <p className="text-sm font-bold uppercase tracking-[0.3em]">Built with Intention</p>
            </div>
         </div>
      </section>
    </div>
  );
};

export default OurTeam;
