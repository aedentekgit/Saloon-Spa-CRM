import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Sparkles, Waves, Leaf, Sun, Coffee, Music, Clock, Coins, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const BASE_URL = API_URL.replace('/api', '');

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

function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const clean = path.replace(/^\.?\/?/, '');
  if (!clean.startsWith('uploads/') && !clean.startsWith('images/')) {
    return `${BASE_URL}/uploads/${clean}`;
  }
  return `${BASE_URL}/${clean}`;
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
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-[1px] bg-zen-gold/40"></div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.6em] text-zen-gold font-sans">Curated Registry</span>
              </div>
              <h1 className="text-6xl lg:text-8xl font-serif font-black text-zen-brown leading-[0.9] tracking-tighter">
                Ritual <span className="text-zen-gold italic font-accent lowercase tracking-normal">Catalogue</span>
              </h1>
           </div>
           
           {/* Boutique Branch Selector */}
           <div className="flex bg-zen-stone/5 p-1 rounded-full border border-zen-stone/10 self-start">
              <button
               onClick={() => setSelectedBranch('all')}
               className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                selectedBranch === 'all' ? 'bg-zen-brown text-white shadow-xl' : 'text-zen-brown/40 hover:text-zen-brown/60'
               }`}
             >
               All Locations
             </button>
             {branches.map((branch) => (
               <button
                 key={branch._id}
                  onClick={() => setSelectedBranch(branch._id)}
                  className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                    selectedBranch === branch._id ? 'bg-zen-brown text-white shadow-xl' : 'text-zen-brown/40 hover:text-zen-brown/60'
                  }`}
                >
                 {branch.name}
               </button>
             ))}
           </div>
        </div>
      </header>

      {/* Main Interaction Area */}
      <div className="max-w-[1000px] mx-auto flex flex-col lg:flex-row min-h-[70vh]">
        
        {/* Category Side Navigation */}
        <aside className="w-full lg:w-72 lg:border-r border-zen-stone/10 p-6 lg:py-20 lg:sticky lg:top-0 h-fit">
           <div className="space-y-12">
              <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zen-brown/20 italic">Select Passage</p>
                 <div className="flex lg:flex-col overflow-x-auto no-scrollbar gap-2 lg:gap-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                         onClick={() => setSelectedCategory(cat)}
                        className={`group flex items-center justify-between px-8 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap lg:whitespace-normal text-left border ${
                          selectedCategory === cat ? 'bg-white border-zen-gold text-zen-brown shadow-2xl' : 'text-zen-brown/30 border-transparent hover:bg-white hover:border-zen-stone/40'
                        }`}
                      >
                          <span className="truncate">{cat === 'all' ? 'The Complete Registry' : cat}</span>
                          <div className={`hidden lg:block w-1.5 h-1.5 rounded-full transition-all ${selectedCategory === cat ? 'bg-zen-gold' : 'bg-transparent group-hover:bg-zen-gold/20'}`} />
                       </button>
                    ))}
                 </div>
              </div>

              <div className="hidden lg:block p-8 border border-zen-stone/10 rounded-3xl bg-white space-y-6">
                 <Sparkles className="text-zen-sand" size={24} />
                 <p className="text-[10px] text-zen-brown/40 leading-relaxed font-serif italic">
                   Can't find a specific ritual? Our masters can architect a custom passage for your energy.
                 </p>
                 <Link to="/contact" className="block text-[9px] font-black uppercase tracking-widest text-zen-brown border-b border-zen-stone/10 pb-2 hover:text-zen-sand transition-colors">
                    Request Consultation
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
             <div className="grid grid-cols-1 md:grid-cols-2 flex-wrap xl:grid-cols-3 gap-x-8 gap-y-16">
               <AnimatePresence mode="popLayout">
                 {filteredServices.map((service, idx) => {
                   const imgUrl = getImageUrl(service.image);
                   return (
                     <motion.div
                       key={service._id}
                       layout
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       transition={{ duration: 0.4 }}
                       className="group"
                     >
                       <Link to="/book" className="block space-y-6">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zen-stone/5 shadow-sm group-hover:shadow-xl transition-all duration-700">
                             <img 
                                src={imgUrl || `https://images.unsplash.com/photo-1544161515-4ae6ce6fe858?auto=format&fit=crop&q=80&service=${service._id}`}
                                alt={service.name}
                                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                             />
                              <div className="absolute top-6 right-6 bg-white border border-zen-gold/20 px-6 py-2 rounded-full text-[10px] font-black text-zen-brown shadow-xl">
                                <span className="text-zen-gold mr-1">QR</span> {service.price}
                              </div>
                          </div>
                          
                          <div className="space-y-3">
                              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.4em] text-zen-gold/50">
                                 <span>{service.category}</span>
                                 <span>{service.duration} MIN</span>
                              </div>
                              <h3 className="text-3xl font-serif font-black text-zen-brown group-hover:text-zen-gold transition-colors leading-tight">{service.name}</h3>
                             <p className="text-sm text-zen-brown/40 font-serif leading-relaxed line-clamp-2 italic">
                                {service.description || `Experience absolute restoration through this masterfully architected ritual sequence.`}
                             </p>
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
         <div className="max-w-[1000px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
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
