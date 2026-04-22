import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Loader2,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { motion, AnimatePresence } from 'motion/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
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
  specialties?: string[];
  bio?: string;
  yearsOfExperience?: number;
}

function getImageUrl(path?: string): string {
  if (!path || path === 'undefined' || path === 'null') return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const clean = path.replace(/^\.?\/?/, '');
  
  // If it already contains the full URL or localhost, return as is
  if (clean.includes('://') || clean.includes('localhost:')) return clean;

  // If it doesn't already have 'uploads/' and isn't in 'images/', assume it's in uploads
  if (!clean.startsWith('uploads/') && !clean.startsWith('images/')) {
    return `${BASE_URL}/uploads/${clean}`;
  }
  return `${BASE_URL}/${clean}`;
}

function getBranchName(branch?: Branch | string): string {
  if (typeof branch === 'object') return branch?.name || 'Sanctuary';
  return 'Sanctuary';
}

function getInitials(name?: string): string {
  const value = (name || '').trim();
  if (!value) return 'ZT';

  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return initials.toUpperCase() || 'ZT';
}

const DUMMY_PORTRAITS = [
  'https://images.unsplash.com/photo-1544161515-4ae6ce6fe858', // Therapist
  'https://images.unsplash.com/photo-1594744803329-a584af1cae23', // Woman Prof
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', // Man Prof
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330', // Woman Prof 2
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', // Man Prof 2
  'https://images.unsplash.com/photo-1552693673-1bf958298935', // Woman Prof 3
  'https://images.unsplash.com/photo-1560250097-0b93528c311a', // Man Prof 3
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', // Woman Prof 4
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e', // Man Prof 4
  'https://images.unsplash.com/photo-1580489944761-15a19d654956', // Woman Prof 5
];

const TeamCardSkeleton = () => (
  <div className="group relative overflow-hidden rounded-[2.5rem] bg-white/40 p-4 backdrop-blur-sm border border-white/50 shadow-xl shadow-zen-primary/5">
    <div className="aspect-[3/4] w-full animate-pulse rounded-[2rem] bg-gradient-to-br from-zen-primary/10 via-lavender-100/30 to-zen-sand/5" />
    <div className="mt-6 space-y-4 px-2">
      <div className="h-6 w-3/4 rounded-full bg-zen-primary/10 animate-pulse" />
      <div className="h-4 w-1/2 rounded-full bg-zen-primary/10 animate-pulse" />
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded-full bg-zen-primary/10 animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-zen-primary/10 animate-pulse" />
      </div>
    </div>
  </div>
);

const OurTeam = () => {
  const { settings } = usePublicSettings();
  const siteName = settings.general.siteName;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [empRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/employees/public`),
          fetch(`${API_URL}/branches/public`),
        ]);

        if (!empRes.ok || !branchRes.ok) {
          throw new Error(`Data synchronization failed (${empRes.status})`);
        }

        const [empRaw, branchRaw] = await Promise.all([empRes.json(), branchRes.json()]);
        
        const empData = Array.isArray(empRaw) ? empRaw : (empRaw?.data || []);
        const branchDataList = Array.isArray(branchRaw) ? branchRaw : (branchRaw?.data || []);

        setEmployees(empData);
        setBranches(branchDataList.filter((branch: Branch) => branch.isActive));
      } catch (err: any) {
        console.error('Zen Team Synchronization Error:', err.message);
        setError('The artisan registry is currently unreachable.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === 'Active'),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return activeEmployees;

    return activeEmployees.filter((employee) => {
      const branchId = typeof employee.branch === 'object' ? employee.branch?._id : employee.branch;
      return branchId === selectedBranch;
    });
  }, [activeEmployees, selectedBranch]);

  const branchMap = useMemo(
    () => new Map(branches.map((branch) => [branch._id, branch])),
    [branches]
  );

  const selectedBranchLabel =
    selectedBranch === 'all'
      ? 'Global Network'
      : branchMap.get(selectedBranch)?.name || 'Selected sanctuary';

  return (
    <div className="relative min-h-screen bg-zen-cream text-zen-brown overflow-hidden selection:bg-zen-sand/20">
      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.08),_transparent_70%)] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(51,39,102,0.05),_transparent_70%)]" style={{ animation: 'float 20s ease-in-out infinite' }} />
      </div>

      {/* Dynamic Collective Header for Team - Reduced top padding */}
      <header className="relative z-10 px-6 pt-12 md:pt-24 lg:pt-32 pb-32 lg:px-24 overflow-hidden">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="relative order-2 lg:order-1"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6 pt-12">
                   <div className="aspect-[3/4] rounded-full overflow-hidden border-4 border-white shadow-2xl">
                      <img src="https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&q=80" alt="Team member" className="w-full h-full object-cover" />
                   </div>
                   <div className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                      <img src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80" alt="Environment" className="w-full h-full object-cover" />
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                      <img src="/images/hero_team.png" alt="Main Team" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80'; }} />
                   </div>
                   <div className="aspect-[3/2] rounded-full overflow-hidden border-4 border-white shadow-2xl">
                      <img src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80" alt="Action" className="w-full h-full object-cover" />
                   </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-zen-sand/10 rounded-full blur-3xl -z-10" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-10 order-1 lg:order-2"
            >
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-zen-stone/20 text-[10px] font-bold tracking-[0.2em] uppercase text-zen-brown">
                  <Users size={12} className="text-zen-sand" />
                   The Zen Collective
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-[6.5rem] font-serif font-bold leading-[0.9] tracking-tight">
                  Masters of<br />
                  <span className="italic relative animate-text-shine">
                    The Art
                    <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-zen-brown/10" />
                  </span>
                </h1>
              </div>

              <p className="text-xl text-zen-brown/70 max-w-xl leading-relaxed font-sans font-light">
                Meet the master practitioners and specialized artisans who define the {siteName} standard of excellence across our {branches.length} sanctuaries.
              </p>

              <div className="pt-6">
                <Link 
                  to="/contact"
                  className="group inline-flex items-center gap-6 text-sm font-bold uppercase tracking-[0.3em] overflow-hidden"
                >
                  <span className="relative group-hover:text-zen-sand transition-colors">Join our mission</span>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-zen-brown/20 group-hover:bg-zen-brown group-hover:text-white transition-all">
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Interactive Filter Bar */}
      <nav className="sticky top-20 z-40 py-6 px-6 lg:px-24 backdrop-blur-md bg-zen-cream/60 border-y border-zen-stone/10">
        <div className="mx-auto max-w-[1400px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-1 bg-zen-sand rounded-full" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/40">Active Filter</p>
              <p className="text-sm font-bold text-zen-primary">{selectedBranchLabel}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
            <button
              onClick={() => setSelectedBranch('all')}
              className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                selectedBranch === 'all'
                  ? 'bg-zen-primary text-white border-zen-primary'
                  : 'bg-white/50 text-zen-brown/50 border-white/80 hover:border-zen-sand/30 hover:text-zen-sand'
              }`}
            >
              All Sanctuaries
            </button>
            {branches.map((branch) => (
              <button
                key={branch._id}
                onClick={() => setSelectedBranch(branch._id)}
                className={`px-6 py-2.5 rounded-full whitespace-nowrap text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                  selectedBranch === branch._id
                    ? 'bg-zen-primary text-white border-zen-primary'
                    : 'bg-white/50 text-zen-brown/50 border-white/80 hover:border-zen-sand/30 hover:text-zen-sand'
                }`}
              >
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Team Roster Grid */}
      <main className="relative z-10 px-6 py-24 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {Array.from({ length: 8 }).map((_, i) => <TeamCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-40 glass rounded-[4rem] border border-white/60 backdrop-blur-xl animate-in zoom-in duration-500">
              <div className="h-24 w-24 rounded-full bg-zen-primary/5 flex items-center justify-center text-zen-primary mb-8 border border-zen-primary/10">
                <AlertCircle size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-4xl font-bold text-zen-primary mb-4 font-accent">Equilibrium Interrupted</h2>
              <p className="text-zen-brown/60 mb-10 text-center max-w-sm italic">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-12 py-4 bg-zen-primary text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-zen-sand transition-all shadow-2xl shadow-zen-primary/20"
              >
                Reestablish Connection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16 items-start">
              <AnimatePresence mode="popLayout">
                {filteredEmployees.map((staff, idx) => {
                  const branchName = getBranchName(staff.branch);
                  const picUrl = getImageUrl(staff.profilePic);
                  const initials = getInitials(staff.name);

                  const fallbackPortrait = DUMMY_PORTRAITS[idx % DUMMY_PORTRAITS.length] + '?q=80&w=800&auto=format&fit=crop&crop=faces&facepad=2';

                  return (
                    <motion.article
                      key={staff._id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.6, delay: idx * 0.04 }}
                      className="group relative flex flex-col"
                    >
                      {/* Boutique Image Container */}
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] bg-zen-stone/5 border border-zen-stone/10 transition-all duration-700 group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]">
                        <img
                          src={picUrl || fallbackPortrait}
                          alt={staff.name}
                          className="h-full w-full object-cover transition-all duration-1000 scale-105 group-hover:scale-110"
                          onError={(e) => {
                             const target = e.currentTarget as HTMLImageElement;
                             // Prevent infinite loop if fallback also fails
                             if (target.src !== fallbackPortrait) {
                                target.src = fallbackPortrait;
                             }
                          }}
                        />
                        
                        {/* Elegant Minimal Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zen-brown/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        {/* Quick View Button */}
                        <Link 
                          to="/contact"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        >
                          <div className="px-6 py-3 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-zen-brown shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
                             Connect
                          </div>
                        </Link>
                      </div>

                      {/* Professional Meta Section */}
                      <div className="mt-8 space-y-4 px-2">
                        <div className="space-y-1">
                           <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.4em] text-zen-gold">
                              <span>{staff.role || 'Therapist'}</span>
                              <span className="text-zen-brown/20">{branchName}</span>
                           </div>
                           <h3 className="text-2xl font-serif font-bold text-zen-brown group-hover:text-zen-gold transition-colors duration-500">{staff.name}</h3>
                        </div>

                        <p className="text-[13px] text-zen-brown/40 font-serif leading-relaxed line-clamp-2 italic">
                          {staff.bio || `A master of restorative arts, dedicated to the sublime ${siteName} experience.`}
                        </p>

                        <div className="flex flex-wrap gap-2 pt-1">
                           {(staff.specialties && staff.specialties.length > 0 ? staff.specialties : []).map((tag) => (
                             <span key={tag} className="px-3 py-1 bg-zen-sand/5 border border-zen-sand/10 rounded-full text-[8px] font-black uppercase tracking-widest text-zen-gold/80">
                               {tag}
                             </span>
                           ))}
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t border-zen-stone/5">
                           <div className="flex gap-0.5">
                             {Array.from({ length: 5 }).map((_, s) => (
                               <Star key={s} size={10} className="fill-zen-gold/40 text-transparent" />
                             ))}
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-zen-brown/10 group-hover:text-zen-gold/60 transition-colors">
                             {staff.yearsOfExperience ? `${staff.yearsOfExperience} Years Experience` : 'Specialist'}
                           </span>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Luxury Footer CTA */}
      <section className="relative z-10 px-6 py-40 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[4rem] bg-zen-primary p-12 lg:p-24 text-center">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.3),_transparent_60%)]" />
             <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-white/40 mb-8">Personalized Sanctuary</p>
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-12 font-accent">Ready to <span className="italic text-zen-sand">Connect</span>?</h2>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Link 
                    to="/contact" 
                    className="w-full sm:w-auto px-12 py-5 bg-white text-zen-primary rounded-full text-[11px] font-bold uppercase tracking-[0.3em] transition-all hover:bg-zen-sand hover:text-white"
                  >
                    Reserve Your Session
                  </Link>
                  <p className="text-white/40 text-xs font-medium tracking-wide">Or explore our specialized treatment menus.</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
};

export default OurTeam;
