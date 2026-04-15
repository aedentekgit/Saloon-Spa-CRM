import React, { useState, useEffect, useMemo } from 'react';
import { Award, Star, Heart, Instagram, Linkedin, Twitter, MapPin, Sparkles, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const BASE_URL = API_URL.replace('/api', '');

interface Branch {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Employee {
  _id: string;
  name: string;
  role: string;
  profilePic?: string;
  branch?: Branch | string;
  status: string;
}

function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.replace(/^\.?\/?/, '');
  return `${BASE_URL}/${clean}`;
}

const OurTeam = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/employees`),
          fetch(`${API_URL}/branches`)
        ]);

        if (!empRes.ok || !branchRes.ok) throw new Error('Failed to fetch registry');

        const [empData, branchData] = await Promise.all([
          empRes.json(),
          branchRes.json()
        ]);

        setEmployees(Array.isArray(empData) ? empData : []);
        setBranches(Array.isArray(branchData) ? branchData.filter((b: Branch) => b.isActive) : []);
      } catch (err) {
        setError('The artisan scrolls could not be retrieved.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEmployees = useMemo(() => {
    // Only show Active employees
    const active = employees.filter(e => e.status === 'Active');
    if (selectedBranch === 'all') return active;
    
    return active.filter(e => {
      const bId = typeof e.branch === 'object' ? e.branch?._id : e.branch;
      return bId === selectedBranch;
    });
  }, [employees, selectedBranch]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#32172A]">
      {/* Hero Section */}
      <section className="px-6 lg:px-24 mb-16 pt-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-end">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
             <div className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] uppercase text-[#4A2C40]/60">
                <span className="w-8 h-[1px] bg-[#4A2C40]/30" />
                The Hands of Healing
             </div>
             <h1 className="text-6xl lg:text-7xl font-serif font-bold leading-tight">
                Masters of <br />
                <span className="italic animate-text-shine">Equilibrium</span>
             </h1>
          </div>
          <div className="pb-4 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
             <p className="text-xl text-[#32172A]/70 leading-relaxed font-sans max-w-md">
                Meet the artisans of peace. Each practitioner is chosen for their profound connection to the art of renewal.
             </p>
          </div>
        </div>
      </section>

      {/* Branch Tabs */}
      <section className="px-6 lg:px-24 mb-24">
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

      {/* Practitioners Grid */}
      <section className="px-6 lg:px-24 pb-32 min-h-[600px] relative">
         <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="w-12 h-12 text-[#4A2C40]/20 animate-spin" />
                <p className="text-[10px] font-bold text-[#4A2C40]/30 uppercase tracking-[0.4em]">Reviewing Artisan Registry...</p>
              </div>
            ) : error ? (
              <div className="text-center py-40">
                <p className="text-[#32172A]/40 italic">{error}</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6 text-center">
                 <div className="w-20 h-20 rounded-full bg-[#32172A]/5 flex items-center justify-center opacity-20">
                    <Sparkles size={32} strokeWidth={1} />
                 </div>
                 <h3 className="text-2xl font-serif text-[#32172A]/40">No artisans currently in this sanctuary</h3>
                 <p className="text-[#32172A]/30 text-sm max-w-xs">Our healing team is currently orchestrating rituals in other chambers.</p>
              </div>
            ) : (
              <div className="space-y-24">
                {filteredEmployees.map((staff, i) => {
                  const branchName = typeof staff.branch === 'object' ? staff.branch?.name : 'Sanctuary';
                  const picUrl = getImageUrl(staff.profilePic);

                  return (
                    <div 
                      key={staff._id} 
                      className={`flex flex-col lg:flex-row gap-16 items-center ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
                    >
                      <div className="flex-1 w-full animate-in fade-in zoom-in duration-1000">
                          <div className="aspect-[4/5] rounded-[5rem] overflow-hidden shadow-sm relative group">
                            {picUrl ? (
                              <img 
                                src={picUrl} 
                                alt={staff.name} 
                                className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            {/* Fallback pattern */}
                            <div 
                              className="w-full h-full bg-gradient-to-br from-[#4A2C40]/5 to-[#4A2C40]/20 items-center justify-center"
                              style={{ display: picUrl ? 'none' : 'flex' }}
                            >
                               <Sparkles size={64} className="text-[#4A2C40]/10" strokeWidth={0.5} />
                            </div>
                            
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
                            <h2 className="text-5xl lg:text-7xl font-serif font-bold text-[#32172A] leading-tight">{staff.name}</h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="px-5 py-2 bg-[#4A2C40]/5 rounded-full text-[10px] font-bold tracking-[0.2em] text-[#4A2C40] uppercase">
                                  {staff.role || 'Therapist'}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#32172A]/30 uppercase tracking-widest">
                                   <MapPin size={12} />
                                   {branchName}
                                </div>
                            </div>
                          </div>

                          <div className="p-10 border border-[#32172A]/5 bg-white rounded-[3.5rem] shadow-sm space-y-8">
                            <div className="flex items-center gap-3 text-[#4A2C40]">
                                <Award size={20} />
                                <span className="text-sm font-bold tracking-[0.2em] uppercase">Healing Registry verified</span>
                            </div>
                            <p className="text-[#32172A]/60 leading-relaxed italic text-xl font-serif">
                              Specializing in orchestrating rituals that harmonize the spirit and rejuvenate the physical form at our {branchName} sanctuary.
                            </p>
                            <div className="flex items-center justify-between">
                               <div className="flex gap-1.5">
                                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-[#4A2C40] text-[#4A2C40]" />)}
                               </div>
                               <button className="text-[10px] font-bold uppercase tracking-widest text-[#4A2C40] hover:translate-x-1 transition-transform border-b border-[#4A2C40]/20 pb-1">
                                  Request Ritual
                                </button>
                            </div>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
