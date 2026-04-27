import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Sparkles, Waves, Leaf, Sun, Coffee, Music, Clock, Coins, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { getImageUrl } from '../../utils/imageUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

// Category → icon mapping
const categoryIconMap: Record<string, React.ElementType> = {
  massage: Waves,
  hair: Sparkles,
  facial: Leaf,
  sauna: Sun,
  body: Coffee,
  sound: Music,
  nail: Sparkles,
  wax: Leaf,
  default: Sparkles,
};

function getCategoryIcon(category?: string): React.ElementType {
  if (!category) return Sparkles;
  const key = category.toLowerCase();
  for (const [k, icon] of Object.entries(categoryIconMap)) {
    if (key.includes(k)) return icon;
  }
  return Sparkles;
}

interface Branch {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Service {
  _id: string;
  name: string;
  duration: number;
  price: number;
  category?: string;
  description?: string;
  image?: string;
  status: 'Active' | 'Inactive';
  branch?: string | { _id: string; name: string };
}

// Skeleton card shown while loading
const SkeletonCard = () => (
  <div className="bg-white rounded-[1.5rem] overflow-hidden border border-zen-primary/5 animate-pulse">
    <div className="aspect-[4/5] bg-zen-primary/10" />
    <div className="p-10 space-y-4">
      <div className="h-6 bg-zen-primary/10 rounded-full w-3/4" />
      <div className="h-4 bg-zen-primary/10 rounded-full w-full" />
      <div className="h-4 bg-zen-primary/10 rounded-full w-2/3" />
      <div className="flex gap-4 pt-4">
        <div className="h-6 bg-zen-primary/10 rounded-full w-20" />
        <div className="h-6 bg-zen-primary/10 rounded-full w-16" />
      </div>
    </div>
  </div>
);

const LandingServices = () => {
  const [services, setServices] = useState<Service[]>(() => getCachedJson('zen_landing_services', []));
  const [branches, setBranches] = useState<Branch[]>(() => getCachedJson('zen_landing_service_branches', []));
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(() => getCachedJson<Service[]>('zen_landing_services', []).length === 0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (services.length === 0) setLoading(true);
        const [servRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/services/public`),
          fetch(`${API_URL}/branches/public`)
        ]);

        if (!servRes.ok || !branchRes.ok) throw new Error('Failed to fetch ritual registry');

        const [servRaw, branchRaw] = await Promise.all([
          servRes.json(),
          branchRes.json()
        ]);

        const servData = Array.isArray(servRaw) ? servRaw : (servRaw?.data || []);
        const branchDataList = Array.isArray(branchRaw) ? branchRaw : (branchRaw?.data || []);

        setServices(servData);
        setBranches(branchDataList.filter((b: Branch) => b.isActive));
      } catch (err) {
        setError('Unable to load offerings.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => setCachedJson('zen_landing_services', services), [services]);
  useEffect(() => setCachedJson('zen_landing_service_branches', branches), [branches]);

  const filteredServices = useMemo(() => {
    let active = services.filter(s => s.status === 'Active');
    
    if (selectedBranch !== 'all') {
      active = active.filter(s => {
        const bId = typeof s.branch === 'object' ? s.branch?._id : s.branch;
        return bId === selectedBranch;
      });
    }

    if (selectedCategory !== 'all') {
      active = active.filter(s => (s.category || 'Wellness') === selectedCategory);
    }
    
    return active;
  }, [services, selectedBranch, selectedCategory]);

  const categories = useMemo(() => {
    const active = services.filter(s => s.status === 'Active');
    const branchSpecific = selectedBranch === 'all' 
      ? active 
      : active.filter(s => {
          const bId = typeof s.branch === 'object' ? s.branch?._id : s.branch;
          return bId === selectedBranch;
        });
    const cats = Array.from(new Set(branchSpecific.map(s => s.category || 'Wellness')));
    return ['all', ...cats.sort()];
  }, [services, selectedBranch]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-zen-brown font-sans">
      
      {/* Compact, Professional Header */}
      <header className="relative pt-24 pb-16 px-6 lg:px-20 border-b border-zen-stone/10 bg-white">
        <div className="max-w-[1400px] mx-auto space-y-10">
           <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-[1px] bg-zen-gold/40"></div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.6em] text-zen-gold font-sans">Curated Registry</span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-[6.5rem] font-serif font-bold text-zen-brown leading-[0.9] tracking-tight">
                Ritual <span className="italic relative animate-text-shine">
                  Catalogue
                  <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-zen-brown/10" />
                </span>
              </h1>
           </div>
           
           {/* Refined Branch Selector - Full Width Scrollable */}
           <div className="flex bg-zen-stone/5 p-1.5 rounded-full border border-zen-stone/10 overflow-x-auto no-scrollbar max-w-fit">
              <button
               onClick={() => setSelectedBranch('all')}
               className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                selectedBranch === 'all' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/50 hover:text-zen-brown'
               }`}
             >
               All Locations
             </button>
             {branches.map((branch) => (
               <button
                 key={branch._id}
                  onClick={() => setSelectedBranch(branch._id)}
                  className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                    selectedBranch === branch._id ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/50 hover:text-zen-brown'
                  }`}
                >
                 {branch.name}
               </button>
             ))}
           </div>
        </div>
      </header>

      {/* Main Interaction Area */}
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row min-h-[70vh]">
        
         {/* Category Side Navigation - Clean and spacious */}
        <aside className="w-full lg:w-80 lg:border-r border-zen-stone/10 p-6 lg:py-24 lg:sticky lg:top-0 h-fit">
           <div className="space-y-12">
              <div className="space-y-8">
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zen-brown/30 ml-4">Select Category</p>
                 <div className="flex lg:flex-col overflow-x-auto no-scrollbar gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                         onClick={() => setSelectedCategory(cat)}
                        className={`group relative flex items-center px-8 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap lg:whitespace-normal text-left ${
                          selectedCategory === cat 
                            ? 'bg-zen-brown text-white' 
                            : 'text-zen-brown/40 hover:text-zen-brown hover:bg-zen-stone/5'
                        }`}
                      >
                          <span className="relative z-10">{cat === 'all' ? 'All Rituals' : cat}</span>
                          {selectedCategory === cat && (
                            <motion.div 
                              layoutId="nav-bg"
                              className="absolute inset-0 bg-zen-brown rounded-2xl"
                              transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                            />
                          )}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="hidden lg:block p-8 bg-zen-stone/5 rounded-[2.5rem] space-y-6">
                 <Sparkles className="text-zen-gold/60" size={20} />
                 <p className="text-[12px] text-zen-brown/50 leading-relaxed font-serif italic">
                   Seeking a custom journey? Our artisans can tailor a unique ritual for your specific needs.
                 </p>
                 <Link to="/contact" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown hover:text-zen-gold transition-colors">
                    <span>Contact Us</span>
                    <ArrowRight size={12} />
                 </Link>
              </div>
           </div>
        </aside>

        {/* Dynamic Ritual Gallery */}
        <main className="flex-1 p-6 lg:p-20">
           {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
               {Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="space-y-6 animate-pulse">
                    <div className="aspect-[4/3] bg-zen-stone/5 rounded-2xl" />
                    <div className="h-4 bg-zen-stone/5 w-1/2" />
                    <div className="h-8 bg-zen-stone/5 w-full" />
                 </div>
               ))}
             </div>
           ) : error ? (
             <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6">
                <AlertCircle size={48} className="text-zen-brown/10" strokeWidth={0.5} />
                <p className="text-2xl font-serif italic text-zen-brown/30">{error}</p>
             </div>
           ) : filteredServices.length === 0 ? (
             <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6">
                <Sparkles size={64} className="text-zen-brown/10" strokeWidth={0.5} />
                <p className="text-2xl font-serif italic text-zen-brown/30">No rituals found in this category.</p>
             </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-20">
               <AnimatePresence mode="popLayout">
                 {filteredServices.map((service, idx) => {
                   const imgUrl = getImageUrl(service.image);
                   return (
                     <motion.div
                       key={service._id}
                       layout
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       transition={{ duration: 0.5, delay: idx * 0.03 }}
                       className="group"
                     >
                       <Link to="/book" className="block space-y-6">
                          <div className="relative aspect-[3/2] overflow-hidden rounded-[2.5rem] bg-zen-stone/5 group-hover:shadow-2xl transition-all duration-700">
                             <img 
                                src={imgUrl || `https://images.unsplash.com/photo-1544161515-4ae6ce6fe858?auto=format&fit=crop&q=80&service=${service._id}`}
                                alt={service.name}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                             />
                             <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full text-[11px] font-bold text-zen-brown shadow-lg border border-white/50">
                                <span className="text-zen-gold mr-1">QR</span> {service.price}
                             </div>
                          </div>
                          
                          <div className="space-y-4 px-2">
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-gold">{service.category}</span>
                                 <div className="flex items-center gap-2 text-[10px] font-bold text-zen-brown/30">
                                    <Clock size={12} />
                                    <span>{service.duration} MIN</span>
                                 </div>
                              </div>
                              
                              <h3 className="text-3xl font-serif font-bold text-zen-brown group-hover:text-zen-gold transition-colors leading-tight">{service.name}</h3>
                              
                              <p className="text-[15px] text-zen-brown/50 font-serif leading-relaxed line-clamp-2 italic">
                                 {service.description || `Experience absolute restoration through this masterfully architected ritual sequence.`}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zen-brown/20 group-hover:text-zen-brown transition-colors">
                                 <span>View Ritual Details</span>
                                 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                              </div>
                          </div>
                       </Link>
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
            </div>
           )}
        </main>
      </div>

      {/* Simplified Professional Footer */}
      <footer className="py-16 border-t border-zen-stone/10 bg-white">
         <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zen-brown">The Zen Collective Ritual Registry</span>
            <div className="flex gap-10">
               <Waves size={14} />
               <Leaf size={14} />
               <Sparkles size={14} />
               <Sun size={14} />
            </div>
         </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default LandingServices;
