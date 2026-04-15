import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, MapPin, Loader2, DoorOpen, Wind, Coffee, Music, Zap } from 'lucide-react';
import { resolveRoomImageMeta } from '../../utils/roomImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const BASE_URL = API_URL.replace('/api', '');

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(true);
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
        setLoading(true);
        const [roomRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/rooms`),
          fetch(`${API_URL}/branches`)
        ]);

        if (!roomRes.ok || !branchRes.ok) throw new Error('Sanctuary records unavailable');

        const [roomData, branchData] = await Promise.all([
          roomRes.json(),
          branchRes.json()
        ]);

        setRooms(Array.isArray(roomData) ? roomData : []);
        setBranches(Array.isArray(branchData) ? branchData.filter((b: Branch) => b.isActive) : []);
      } catch (err) {
        setError('The chamber scrolls could not be unrolled.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRooms = useMemo(() => {
    const active = rooms.filter(r => r.isActive);
    if (selectedBranch === 'all') return active;
    
    return active.filter(r => {
      const bId = typeof r.branch === 'object' ? r.branch?._id : r.branch;
      return bId === selectedBranch;
    });
  }, [rooms, selectedBranch]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Hero Section */}
      <section className="px-6 lg:px-24 mb-16 pt-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-end">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
             <div className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
                <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
                Private Sanctuaries
             </div>
             <h1 className="text-6xl lg:text-7xl font-serif font-bold leading-tight">
                Sacred <br />
                <span className="italic animate-text-shine">Chambers</span>
             </h1>
          </div>
          <div className="pb-4 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
             <p className="text-xl text-[#32172A]/70 leading-relaxed font-sans max-w-md">
                Each chamber is a cocoon of silence, meticulously designed to facilitate your journey back to yourself.
             </p>
          </div>
        </div>
      </section>

      {/* Branch Tabs */}
      <section className="px-6 lg:px-24 mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 lg:gap-8 pb-8 border-b border-[#32172A]/5 overflow-x-auto scrollbar-hide">
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

      {/* Rooms Grid */}
      <section className="px-6 lg:px-24 pb-32 min-h-[500px]">
         <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="w-12 h-12 text-[#4A2C40]/20 animate-spin" />
                <p className="text-[10px] font-bold text-[#4A2C40]/30 uppercase tracking-[0.4em]">Illuminating Sacred Chambers...</p>
              </div>
            ) : error ? (
              <div className="text-center py-40">
                <p className="text-[#32172A]/40 italic">{error}</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-40 animate-in fade-in duration-700">
                 <h3 className="text-2xl font-serif text-[#32172A]/40">No chambers found in this sanctuary</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
                {filteredRooms.map((room, idx) => {
                  const branchName = typeof room.branch === 'object' ? room.branch?.name : 'Sanctuary';
                  const roomImg = resolveRoomImageMeta(room, BASE_URL);

                  return (
                    <div 
                      key={room._id} 
                      className="group flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      {/* Image Frame */}
                      <div className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-sm relative">
                        {roomImg ? (
                          <img 
                            src={roomImg.src} 
                            alt={room.name} 
                            className="w-full h-full object-cover grayscale-[0.2] transition-all duration-1000 group-hover:scale-110 group-hover:grayscale-0"
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
                           className="w-full h-full bg-gradient-to-br from-[#4A2C40]/5 to-[#4A2C40]/15 flex items-center justify-center"
                           style={{ display: roomImg ? 'none' : 'flex' }}
                        >
                           <DoorOpen size={64} className="text-[#4A2C40]/10" strokeWidth={0.5} />
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-8 right-8 px-4 py-1.5 bg-white/30 backdrop-blur-md rounded-full text-[8px] font-bold uppercase tracking-[0.3em] text-white">
                           {room.status === 'Free' ? 'Available' : 'Occupied'}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-6 px-4">
                        <div className="flex items-center justify-between items-start">
                           <div className="space-y-1">
                              <h3 className="text-3xl font-serif font-bold text-[#32172A]">{room.name}</h3>
                              <p className="text-[10px] font-bold text-[#4A2C40]/40 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={10} /> {branchName}
                              </p>
                           </div>
                           <span className="text-[8px] font-black uppercase tracking-[0.3em] bg-[#32172A] text-[#FAF9F6] px-3 py-1 rounded-sm shadow-lg">
                              {room.type}
                           </span>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2 border-t border-[#32172A]/5">
                            {amenities.map((item, i) => (
                               <div key={i} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#32172A]/30">
                                  {item.icon}
                                  {item.label}
                               </div>
                            ))}
                        </div>
                        
                        <button className="w-full py-5 border border-[#32172A]/10 rounded-3xl text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-[#32172A] hover:text-[#FAF9F6] transition-all duration-500">
                           Reserve Chamber
                        </button>
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
            <div className="w-20 h-[1px] bg-[#32172A]/20 mx-auto" />
            <Sparkles className="mx-auto text-[#4A2C40]" size={32} strokeWidth={1} />
            <h2 className="text-4xl font-serif font-bold italic text-[#4A2C40]/80">"Architecture should speak of its time and place, but yearn for timelessness."</h2>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#32172A]/30 leading-loose">
               Each sacred chamber is attuned to specific vibrational frequencies,<br /> ensure peak atmospheric harmony for your ritual.
            </p>
         </div>
      </section>
    </div>
  );
};

export default LandingRooms;
