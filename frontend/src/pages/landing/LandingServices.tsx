import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, Clock, ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

const LandingServices = () => {
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servRes, catRes] = await Promise.all([
          fetch(`${API_URL}/services`),
          fetch(`${API_URL}/categories?type=service`)
        ]);
        
        const servData = await servRes.json();
        const catData = await catRes.json();
        
        if (Array.isArray(servData)) setServices(servData.filter(s => s.status === 'Active'));
        if (Array.isArray(catData)) setCategories(catData.filter(c => c.isActive !== false));
      } catch (error) {
        console.error('Error fetching landing services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
            Celestial Offering
        </motion.div>
        <h1 className="text-5xl lg:text-7xl font-serif font-black text-zen-brown tracking-tighter mb-8 leading-tight">
          Signature <span className="text-zen-sand italic">Rituals</span>
        </h1>
        <p className="text-[15px] lg:text-[17px] text-zen-brown/50 font-medium max-w-2xl mx-auto leading-relaxed">
          Discover a curated registry of master-tier rituals, designed to synchronize your earthly state with absolute serenity.
        </p>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-zen-sand border-t-transparent rounded-full animate-spin mb-6" />
            <p className="font-serif italic text-zen-brown/40 text-lg">Synchronizing registries...</p>
          </div>
        ) : (
          <>
            {categories.map((cat) => {
              const catServices = services.filter(s => 
                (typeof s.category === 'string' && s.category === cat.name) || 
                (s.category?._id === cat._id) ||
                (s.category === cat._id)
              );
              
              if (catServices.length === 0) return null;

              return (
                <div key={cat._id} className="mb-24 last:mb-0">
                  <div className="flex items-center gap-8 mb-16">
                      <h2 className="text-3xl lg:text-5xl font-serif text-zen-brown tracking-tighter whitespace-nowrap">{cat.name}</h2>
                      <div className="h-px w-full bg-gradient-to-r from-zen-sand/30 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 lg:gap-16">
                      {catServices.map((service) => (
                        <motion.div
                          key={service._id}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          whileHover={{ y: -12 }}
                          className="glass rounded-[3.5rem] overflow-hidden border-white shadow-3xl shadow-zen-brown/10 group flex flex-col h-full bg-white/60"
                        >
                          <div className="relative h-72 overflow-hidden bg-zen-sand/10">
                              {service.image ? (
                                <img src={getImageUrl(service.image)} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center opacity-20 bg-gradient-to-br from-zen-sand/20 to-zen-leaf/20">
                                  <Sparkles size={100} className="text-zen-sand mb-4" />
                                  <p className="text-[10px] uppercase font-black tracking-widest text-zen-brown">Awaiting Image</p>
                                </div>
                              )}
                              <div className="absolute top-8 right-8">
                                <div className="glass px-6 py-3 rounded-2xl text-zen-sand text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl border-white/60">
                                    {settings?.general?.currencySymbol || 'QR'} {service.price}
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          <div className="p-10 lg:p-12 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-3 text-[10px] font-black text-zen-sand uppercase tracking-[0.4em] mb-6">
                                  <Clock size={12} className="shrink-0" />
                                  {service.duration} Minutes of Peace
                                </div>
                                <h3 className="text-2xl lg:text-3xl font-serif text-zen-brown mb-6 tracking-tight group-hover:text-zen-sand transition-colors leading-tight">{service.name}</h3>
                                <p className="text-[15px] text-zen-brown/50 leading-relaxed font-medium mb-10 line-clamp-3">
                                  {service.description || `Embark on a signature ritual designed to restore your celestial resonance. A master-tier experience crafted for the discerning soul.`}
                                </p>
                              </div>

                              <NavLink 
                                to="/contact" 
                                className="w-full py-5 bg-zen-brown text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl flex items-center justify-center gap-3 group-hover:bg-zen-sand group-hover:shadow-2xl shadow-zen-sand/20 transition-all mt-auto"
                              >
                                Reserve Ritual
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                              </NavLink>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              );
            })}

            {(services.length === 0 || categories.length === 0) && (
              <div className="flex flex-col items-center justify-center py-40 glass rounded-[4rem] text-center border-dashed border-zen-sand/20">
                <div className="w-20 h-20 rounded-full bg-zen-sand/5 flex items-center justify-center text-zen-sand/20 mb-8 border border-dashed border-zen-sand/20">
                    <Sparkles size={40} />
                </div>
                <p className="font-serif italic text-2xl text-zen-brown/40">The registry is currently aligning...</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default LandingServices;
