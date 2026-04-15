import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Sparkles, Waves, Leaf, Sun, Coffee, Music, Clock, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
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
  if (path.startsWith('http')) return path;
  const clean = path.replace(/^\.?\/?/, '');
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
  <div className="bg-white rounded-[3rem] overflow-hidden border border-[#32172A]/5 animate-pulse">
    <div className="aspect-[4/5] bg-[#32172A]/10" />
    <div className="p-10 space-y-4">
      <div className="h-6 bg-[#32172A]/10 rounded-full w-3/4" />
      <div className="h-4 bg-[#32172A]/10 rounded-full w-full" />
      <div className="h-4 bg-[#32172A]/10 rounded-full w-2/3" />
      <div className="flex gap-4 pt-4">
        <div className="h-6 bg-[#32172A]/10 rounded-full w-20" />
        <div className="h-6 bg-[#32172A]/10 rounded-full w-16" />
      </div>
    </div>
  </div>
);

const LandingServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [servRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/services`),
          fetch(`${API_URL}/branches`)
        ]);

        if (!servRes.ok || !branchRes.ok) throw new Error('Failed to fetch ritual registry');

        const [servData, branchData] = await Promise.all([
          servRes.json(),
          branchRes.json()
        ]);

        setServices(Array.isArray(servData) ? servData : []);
        setBranches(Array.isArray(branchData) ? branchData.filter((b: Branch) => b.isActive) : []);
      } catch (err) {
        setError('Unable to load our ritual offerings. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredServices = useMemo(() => {
    // Only show Active services
    const active = services.filter(s => s.status === 'Active');
    if (selectedBranch === 'all') return active;
    
    return active.filter(s => {
      const bId = typeof s.branch === 'object' ? s.branch?._id : s.branch;
      return bId === selectedBranch;
    });
  }, [services, selectedBranch]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Hero Section */}
      <section className="relative px-6 lg:px-24 mb-12 pt-12 overflow-hidden text-center">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center justify-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
            <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
            Sacred Rituals
            <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
          </div>
          <h1 className="text-6xl lg:text-9xl font-serif font-bold leading-[0.9] tracking-tighter">
            The Path to <br />
            <span className="italic">Renewal</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-[#32172A]/60 leading-relaxed font-sans mt-4">
            Our services are passages of renewal. Each treatment is tailored
            to your immediate state of being, facilitated by masters of their craft.
          </p>
        </div>
      </section>

      {/* Branch Tabs */}
      <section className="px-6 lg:px-24 mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 pb-8 border-b border-[#32172A]/5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedBranch('all')}
              className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap
                ${selectedBranch === 'all' 
                  ? 'bg-[#32172A] text-[#FAF9F6] shadow-xl scale-105' 
                  : 'bg-white text-[#32172A]/40 hover:text-[#32172A] border border-[#32172A]/5'}
              `}
            >
              All Sanctuaries
            </button>
            {branches.map((branch) => (
              <button
                key={branch._id}
                onClick={() => setSelectedBranch(branch._id)}
                className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap
                  ${selectedBranch === branch._id 
                    ? 'bg-[#32172A] text-[#FAF9F6] shadow-xl scale-105' 
                    : 'bg-white text-[#32172A]/40 hover:text-[#32172A] border border-[#32172A]/5'}
                `}
              >
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-6 lg:px-24 pb-32 min-h-[500px]">
        <div className="max-w-7xl mx-auto">

          {/* Loading State */}
          {loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <p className="text-[#32172A]/50 text-lg italic">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-[#4A2C40] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Retry Journey
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredServices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-6 text-center animate-in fade-in duration-700">
              <div className="w-20 h-20 rounded-full bg-[#4A2C40]/5 flex items-center justify-center opacity-30">
                <Sparkles size={32} className="text-[#4A2C40]" strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-serif text-[#32172A]/60">No rituals found in this sanctuary</h3>
              <p className="text-[#32172A]/30 text-sm max-w-sm font-bold uppercase tracking-widest">
                Our masters are preparing special offerings for this location.
              </p>
            </div>
          )}

          {/* Services Grid */}
          {!loading && !error && filteredServices.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {filteredServices.map((service, i) => {
                const Icon = getCategoryIcon(service.category);
                const imgUrl = getImageUrl(service.image);
                const branchName = typeof service.branch === 'object' ? service.branch?.name : 'Sanctuary';

                return (
                  <div
                    key={service._id}
                    className="group relative bg-white rounded-[3rem] overflow-hidden border border-[#32172A]/5 hover:shadow-2xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-8"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {/* Image */}
                    <div className="aspect-[4/5] overflow-hidden relative">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={service.name}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {/* Fallback placeholder */}
                      <div
                        className="w-full h-full bg-gradient-to-br from-[#4A2C40]/5 to-[#4A2C40]/20 flex items-center justify-center"
                        style={{ display: imgUrl ? 'none' : 'flex' }}
                      >
                        <Icon size={56} className="text-[#4A2C40]/20" strokeWidth={0.8} />
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#32172A]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                      {/* Status/Price badges */}
                      <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                        <div className="px-5 py-2 backdrop-blur-3xl bg-white/80 rounded-full text-[10px] font-bold tracking-widest text-[#4A2C40] flex items-center gap-1.5 shadow-lg">
                          <Clock size={12} />
                          {service.duration} MIN
                        </div>
                        <div className="px-5 py-2 backdrop-blur-3xl bg-[#32172A]/80 rounded-full text-[10px] font-bold tracking-widest text-white flex items-center gap-1.5 shadow-lg">
                          <Coins size={12} />
                          {service.price > 0 ? `QR ${service.price}` : 'On Request'}
                        </div>
                      </div>

                      {/* Branch tag - visible on hover */}
                      <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                          <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-bold tracking-widest text-white uppercase border border-white/40">
                             {branchName}
                          </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-10 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-[#4A2C40]/40">
                             <Icon size={12} />
                             {service.category || 'Wellness'}
                        </div>
                        <h3 className="text-3xl font-serif font-bold text-[#32172A] leading-tight">{service.name}</h3>
                      </div>

                      <p className="text-[#32172A]/60 text-sm leading-relaxed italic line-clamp-3">
                        {service.description
                          ? service.description
                          : `A masterfully orchestrated ${service.category?.toLowerCase() || 'wellness'} ritual, designed to harmonize the spirit and rejuvenate the body.`}
                      </p>
                      
                      <div className="pt-4 flex items-center justify-between border-t border-[#32172A]/5">
                        <Link
                          to="/booking"
                          className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A2C40] group/btn"
                        >
                          Book Ritual
                          <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Full Width CTA */}
      <section className="px-6 lg:px-24 pb-32">
        <div className="max-w-7xl mx-auto bg-[#32172A] rounded-[5rem] overflow-hidden relative p-12 lg:p-24 text-center group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A2C40] to-transparent opacity-50" />
          <div className="relative z-10 space-y-10">
            <h2 className="text-5xl lg:text-7xl font-serif font-bold text-white max-w-2xl mx-auto leading-tight italic">
              Experience Personal <br /> <span className="not-italic opacity-50">Transcendence.</span>
            </h2>
            <p className="text-[#FAF9F6]/50 text-xl max-w-xl mx-auto leading-relaxed">
              Tailor your path with our Equilibrium Master for a wellness blueprint unique to your soul.
            </p>
            <Link
              to="/contact"
              className="inline-block px-14 py-6 bg-[#FAF9F6] text-[#32172A] rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#E5BAD4] transition-all shadow-2xl"
            >
              Request Consultation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingServices;
