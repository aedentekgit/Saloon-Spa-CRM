import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, Loader2, DoorOpen, Wind, Coffee, Music, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { resolveRoomImageMeta } from '../../utils/roomImage';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { withBase } from '../../utils/assetPath';
import { getAssetBaseUrl } from '../../utils/imageUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const BASE_URL = getAssetBaseUrl();

interface Branch {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Room {
  _id: string;
  name: string;
  type: string;
  image?: string;
  branch?: Branch | string;
  isActive: boolean;
  status: string;
}

const LandingRooms = () => {
  const [rooms, setRooms] = useState<Room[]>(() => getCachedJson('zen_landing_rooms', []));
  const [branches, setBranches] = useState<Branch[]>(() => getCachedJson('zen_landing_room_branches', []));
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(() => getCachedJson<Room[]>('zen_landing_rooms', []).length === 0);
  const [error, setError] = useState('');

  // Luxury amenities usually associated with rooms
  const amenities = [
    { icon: <Wind size={14} />, label: 'Climate Control' },
    { icon: <Music size={14} />, label: 'Ambient Soul' },
    { icon: <Coffee size={14} />, label: 'Aromatic Bar' },
    { icon: <Zap size={14} />, label: 'Chrono-Therapy' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (rooms.length === 0) setLoading(true);
        const [roomRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/rooms/public`),
          fetch(`${API_URL}/branches/public`)
        ]);

        if (!roomRes.ok || !branchRes.ok) throw new Error('Sanctuary records unavailable');

        const [roomRaw, branchRaw] = await Promise.all([
          roomRes.json(),
          branchRes.json()
        ]);

        // Robust handling for both direct arrays and { data: [...] } formats
        const roomData = Array.isArray(roomRaw) ? roomRaw : (roomRaw?.data || []);
        const branchDataList = Array.isArray(branchRaw) ? branchRaw : (branchRaw?.data || []);

        setRooms(roomData);
        setBranches(branchDataList.filter((b: Branch) => b.isActive));
      } catch (err) {
        setError('The chamber scrolls could not be unrolled.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => setCachedJson('zen_landing_rooms', rooms), [rooms]);
  useEffect(() => setCachedJson('zen_landing_room_branches', branches), [branches]);

  const filteredRooms = useMemo(() => {
    const active = rooms.filter(r => r.isActive);
    if (selectedBranch === 'all') return active;
    
    return active.filter(r => {
      const bId = typeof r.branch === 'object' ? r.branch?._id : r.branch;
      return bId === selectedBranch;
    });
  }, [rooms, selectedBranch]);

  return (
    <div className="min-h-screen bg-zen-cream text-zen-brown selection:bg-zen-sand/20">
      {/* Reduced top padding for header */}
      <header className="relative z-10 px-6 pt-12 md:pt-24 lg:pt-32 pb-32 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="lg:col-span-6 space-y-10 relative z-20"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.4em] uppercase text-zen-brown/40">
                  <span className="w-12 h-[1px] bg-zen-brown/20" />
                  Space & Atmosphere
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-[6.5rem] font-serif font-bold leading-[0.9] tracking-tight">
                  Sacred<br />
                  <span className="italic relative animate-text-shine">
                    Chambers
                    <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-zen-brown/10" />
                  </span>
                </h1>
              </div>

              <div className="space-y-8">
                <p className="text-xl text-zen-brown/60 leading-relaxed font-sans max-w-md font-light">
                  Each chamber is a cocoon of silence, meticulously designed to facilitate your journey back to yourself.
                </p>
                <div className="flex items-center gap-6">
                   <div className="h-[1px] w-12 bg-zen-brown/10" />
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zen-brown/30 italic">Curated Environment</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="lg:col-span-6 relative"
            >
              {/* Primary Image Frame */}
              <div className="relative aspect-[16/10] w-full rounded-[3rem] overflow-hidden shadow-2xl z-10 border-[8px] border-white/50 backdrop-blur-sm">
                <img 
                  src={withBase('/images/hero_chambers.png')} 
                  alt="Sacred Chamber" 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1540555700478-4be289a5090a?auto=format&fit=crop&q=80'; }}
                />
              </div>

              {/* Secondary Floating Overlap Element */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-12 -right-6 w-48 h-64 hidden xl:block z-20 rounded-[2rem] overflow-hidden border-[6px] border-white shadow-2xl shadow-zen-brown/20"
              >
                <img 
                  src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80" 
                  alt="Detail" 
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Geometric Decorative Accent */}
              <div className="absolute -top-12 -left-12 w-48 h-48 border border-zen-sand/20 rounded-full -z-0 animate-pulse" />
            </motion.div>
          </div>
        </div>
      </header>

      {/* Branch Tabs */}
      <section className="px-6 lg:px-24 mb-16">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-center gap-4 lg:gap-8 px-4 -mx-4 pt-4 -mt-4 pb-8 border-b border-zen-primary/5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedBranch('all')}
              className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap
                ${selectedBranch === 'all' 
                  ? 'bg-zen-primary text-white shadow-xl scale-105' 
                  : 'bg-white text-zen-primary/40 hover:text-zen-primary border border-zen-primary/5'}
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
                    ? 'bg-zen-primary text-white shadow-xl scale-105' 
                    : 'bg-white text-zen-primary/40 hover:text-zen-primary border border-zen-primary/5'}
                `}
              >
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Grid */}
      <section className="px-6 lg:px-24 pb-32 min-h-[500px]">
         <div className="max-w-[1400px] mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="w-12 h-12 text-zen-brown/20 animate-spin" />
                <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em]">Illuminating Sacred Chambers...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-40 glass rounded-[4rem] border border-white/60 backdrop-blur-xl animate-in fade-in duration-700">
                <div className="h-24 w-24 rounded-full bg-zen-primary/5 flex items-center justify-center text-zen-primary mb-8 border border-zen-primary/10">
                  <DoorOpen size={40} strokeWidth={1.5} />
                </div>
                <h2 className="text-4xl font-bold text-zen-primary mb-4 font-accent tracking-tight">Sanctuaries Sealed</h2>
                <p className="text-zen-brown/60 mb-10 text-center max-w-sm italic">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-12 py-4 bg-zen-primary text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-zen-sand transition-all shadow-2xl shadow-zen-primary/20"
                >
                  Unveil Chambers
                </button>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-40 animate-in fade-in duration-700">
                 <h3 className="text-2xl font-serif text-zen-primary/40">No chambers found in this sanctuary</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
                {filteredRooms.map((room, idx) => {
                  const branchName = typeof room.branch === 'object' ? room.branch?.name : 'Sanctuary';
                  const roomImg = resolveRoomImageMeta(room, BASE_URL);

                  return (
                    <div 
                      key={room._id} 
                      className="group relative bg-white rounded-[1.5rem] overflow-hidden border border-zen-primary/5 hover:shadow-2xl hover:shadow-zen-primary/5 transition-all duration-700 animate-in fade-in slide-in-from-bottom-12 flex flex-col"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      {/* Image Frame */}
                      <div className="aspect-[3/2] md:aspect-[16/10] overflow-hidden relative">
                        {roomImg ? (
                          <img 
                            src={roomImg.src} 
                            alt={room.name} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            style={{ objectPosition: roomImg.objectPosition }}
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Fallback pattern */}
                        <div 
                           className="absolute inset-0 bg-gradient-to-br from-zen-primary/5 to-zen-primary/15 flex items-center justify-center"
                           style={{ display: roomImg ? 'none' : 'flex' }}
                        >
                           <DoorOpen size={64} className="text-zen-brown/10" strokeWidth={0.5} />
                        </div>
                        
                        {/* Dark Gradient Overlay for legible badge */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zen-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                        {/* Status Badge */}
                        <div className="absolute top-6 right-6 px-4 py-2 backdrop-blur-3xl bg-white/80 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-zen-primary shadow-lg">
                           {room.status === 'Free' ? 'Available' : 'Occupied'}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-6 xl:p-8 flex flex-col">
                        <div className="flex items-start justify-between mb-5">
                           <div className="space-y-2">
                              <p className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={10} /> {branchName}
                              </p>
                              <h3 className="text-2xl font-serif font-bold text-zen-primary leading-tight group-hover:text-zen-brown transition-colors">{room.name}</h3>
                           </div>
                           <span className="text-[8px] font-black uppercase tracking-[0.3em] bg-zen-primary text-white px-3 py-1.5 rounded-[0.4rem] shadow-sm shrink-0">
                              {room.type}
                           </span>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-3 pt-4 pb-5 border-t border-zen-primary/5">
                            {amenities.map((item, i) => (
                               <div key={i} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zen-primary/40 group-hover:text-zen-primary/60 transition-colors">
                                  {item.icon}
                                  {item.label}
                               </div>
                            ))}
                        </div>
                        
                        <Link 
                            to="/book"
                            className="w-full py-3.5 border border-zen-primary/10 rounded-full text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-zen-primary hover:text-white text-zen-brown transition-all duration-500 mt-2 flex items-center justify-center"
                         >
                            Reserve Chamber
                         </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
         </div>
      </section>

      {/* Philosophy Section */}
      <section className="px-6 lg:px-24 pb-32">
         <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="w-20 h-[1px] bg-zen-primary/20 mx-auto" />
            <Sparkles className="mx-auto text-zen-brown" size={32} strokeWidth={1} />
            <h2 className="text-4xl font-serif font-bold italic text-zen-brown/80">"Architecture should speak of its time and place, but yearn for timelessness."</h2>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-zen-primary/30 leading-loose">
               Each sacred chamber is attuned to specific vibrational frequencies,<br /> ensure peak atmospheric harmony for your ritual.
            </p>
         </div>
      </section>
    </div>
  );
};

export default LandingRooms;
