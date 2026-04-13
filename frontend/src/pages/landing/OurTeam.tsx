import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Instagram, Linkedin, Twitter, Star } from 'lucide-react';

const OurTeam = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch(`${API_URL}/employees`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setEmployees(data.filter(e => e.status === 'Active' && e.role !== 'Admin'));
        }
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  return (
    <div className="pt-24 lg:pt-40 pb-24 lg:pb-32 min-h-screen">
      <section className="container mx-auto px-6 mb-20 lg:mb-32 text-center">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 bg-zen-sand/5 border border-zen-sand/10 rounded-full text-zen-sand text-[11px] font-black uppercase tracking-[0.4em] mb-10 shadow-inner"
          >
            <Sparkles size={14} />
            Temple Guardians
        </motion.div>
        <h1 className="text-5xl lg:text-7xl font-serif font-black text-zen-brown tracking-tighter mb-8 leading-tight">
          Master <span className="text-zen-sand italic">Artisans</span>
        </h1>
        <p className="text-[15px] lg:text-[17px] text-zen-brown/50 font-medium max-w-2xl mx-auto leading-relaxed">
          The curators of your sanctuary. Our artisans are meticulously selected for their expertise in ancient rituals and contemporary wellness.
        </p>
      </section>

      {/* Team Grid */}
      <section className="container mx-auto px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-zen-sand border-t-transparent rounded-full animate-spin mb-6" />
            <p className="font-serif italic text-zen-brown/40 text-lg">Awakening guardians...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 lg:gap-16">
               {employees.map((staff, i) => (
                 <motion.div
                   key={staff._id}
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   className="group text-center"
                 >
                    <div className="relative aspect-[4/5] rounded-[3.5rem] overflow-hidden mb-10 shadow-3xl transition-all duration-700 group-hover:shadow-zen-sand/20 group-hover:-translate-y-4 bg-zen-sand/5">
                       {staff.profilePic ? (
                         <img src={getImageUrl(staff.profilePic)} alt={staff.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                       ) : (
                         <div className="w-full h-full bg-gradient-to-br from-zen-sand/10 to-zen-leaf/10 flex flex-col items-center justify-center">
                           <Sparkles size={80} className="text-zen-sand opacity-20 mb-4" />
                           <p className="text-[9px] uppercase font-black tracking-widest text-zen-brown opacity-20">Sanctuary Profile</p>
                         </div>
                       )}
                       
                       {/* Overlay Socials */}
                       <div className="absolute inset-0 bg-gradient-to-t from-zen-brown/90 via-zen-brown/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-10">
                          <div className="flex items-center justify-center gap-6">
                             {['Instagram', 'Linkedin', 'Twitter'].map((IconName, j) => (
                               <button key={j} className="text-white/60 hover:text-zen-sand hover:scale-125 transition-all text-[11px] font-black uppercase tracking-widest">
                                 {IconName}
                               </button>
                             ))}
                          </div>
                       </div>

                       {/* Specialty Tag */}
                       <div className="absolute top-8 right-8">
                          <div className="glass px-5 py-2.5 rounded-2xl text-zen-brown text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 border-white/60">
                             <Star size={12} className="text-zen-sand fill-zen-sand" />
                             Master Tier
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <h3 className="text-2xl lg:text-3xl font-serif text-zen-brown tracking-tighter group-hover:text-zen-sand transition-colors">{staff.name}</h3>
                       <p className="text-[11px] font-black text-zen-sand uppercase tracking-[0.5em]">{staff.role}</p>
                       <div className="mt-8 h-px w-20 bg-zen-sand/20 mx-auto group-hover:w-32 transition-all duration-700" />
                    </div>
                 </motion.div>
               ))}
            </div>

            {employees.length === 0 && (
              <div className="flex flex-col items-center justify-center py-40 glass rounded-[4rem] text-center border-dashed border-zen-sand/20">
                 <div className="w-20 h-20 rounded-full bg-zen-sand/5 flex items-center justify-center text-zen-sand/20 mb-8 border border-dashed border-zen-sand/20">
                    <Sparkles size={40} />
                 </div>
                 <p className="font-serif italic text-2xl text-zen-brown/40">The Artisans are currently meditating...</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default OurTeam;
