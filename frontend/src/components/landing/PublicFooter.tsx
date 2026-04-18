import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sparkles, Instagram, Facebook, Twitter, ArrowUpRight, ArrowUp } from 'lucide-react';
import { usePublicSettings } from './usePublicSettings';

const PublicFooter = () => {
  const { settings } = usePublicSettings();
  const siteName = settings.general.siteName || 'Zen Spa & Saloon';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050506] text-white pt-40 pb-16 relative overflow-hidden">
      {/* Decorative Gradient Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[60%] h-[40%] bg-zen-sand/5 blur-[160px] rounded-full -translate-y-1/2 opacity-40" />
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-zen-primary/10 blur-[140px] rounded-full translate-y-1/3 opacity-30" />
      
      <div className="container mx-auto px-6 lg:px-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-32">
          
          {/* Brand Vision */}
          <div className="lg:col-span-5 space-y-12">
             <div className="space-y-8">
                <NavLink to="/" className="inline-flex items-center gap-5 group">
                   <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/50 border border-white/10 group-hover:bg-zen-sand group-hover:text-white transition-all duration-700 shadow-2xl relative">
                      <div className="absolute inset-0 rounded-full bg-zen-sand/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Sparkles size={22} className="relative z-10" />
                   </div>
                   <span className="font-accent text-4xl font-bold tracking-tight text-white group-hover:text-zen-sand transition-colors duration-500">{siteName}</span>
                </NavLink>
                <p className="text-xl text-white/40 font-light leading-relaxed max-w-md">
                   Where profound stillness meets modern artistry. We curate experiences that restore the silhouette and nourish the spirit.
                </p>
             </div>
             
             <div className="flex items-center gap-5">
                {[
                  { Icon: Instagram, link: '#' },
                  { Icon: Facebook, link: '#' },
                  { Icon: Twitter, link: '#' }
                ].map(({ Icon, link }, i) => (
                  <a 
                    key={i} 
                    href={link}
                    className="w-12 h-12 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center text-white/30 hover:text-white hover:border-zen-sand/50 hover:bg-zen-sand/10 transition-all duration-500 group"
                  >
                    <Icon size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
             </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-16">
            {/* Navigation Sections */}
            <div className="space-y-10">
              <h5 className="text-[10px] font-bold text-zen-sand uppercase tracking-[0.5em]">Explore</h5>
              <div className="flex flex-col gap-6">
                {[
                  { name: 'Sanctuary Home', path: '/' },
                  { name: 'Philosophy', path: '/about' },
                  { name: 'The Rituals', path: '/landing-services' },
                  { name: 'Our Artisans', path: '/team' },
                  { name: 'Reach Us', path: '/contact' }
                ].map((link) => (
                  <NavLink 
                    key={link.name} 
                    to={link.path} 
                    className="text-[13px] font-medium text-white/40 hover:text-white transition-all flex items-center group w-fit"
                  >
                    <span className="h-[1px] w-0 bg-zen-sand group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-3" />
                    {link.name}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <h5 className="text-[10px] font-bold text-zen-sand uppercase tracking-[0.5em]">Sanctuary</h5>
              <div className="space-y-10">
                <div className="space-y-3">
                   <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Global Location</p>
                   <p className="text-[13px] text-white/50 leading-relaxed group hover:text-white/80 transition-colors">
                      {settings.general.address}
                   </p>
                </div>
                <div className="space-y-3">
                   <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Connect</p>
                   <p className="text-[13px] text-white/50 hover:text-zen-sand transition-colors block">{settings.general.email}</p>
                   <p className="text-[13px] text-white/50 hover:text-zen-sand transition-colors block">{settings.general.contactNumber}</p>
                </div>
              </div>
            </div>

            {/* Premium Membership Card */}
            <div className="space-y-10">
              <h5 className="text-[10px] font-bold text-zen-sand uppercase tracking-[0.5em]">Elite Circle</h5>
              <div className="relative group overflow-hidden rounded-[2.5rem] bg-white/[0.03] p-8 border border-white/5 transition-all hover:bg-white/[0.05] hover:border-zen-sand/30">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-zen-sand/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-zen-sand/20 transition-all" />
                 <p className="text-[13px] text-white/40 leading-relaxed mb-10 relative z-10">
                    Unlock preferred scheduling, seasonal rituals, and private events in our sanctuary.
                 </p>
                 <Link 
                   to="/contact" 
                   className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.3em] text-white group-hover:text-zen-sand transition-colors relative z-10"
                 >
                    Become a Member
                    <div className="bg-white/10 p-2 rounded-full group-hover:bg-zen-sand group-hover:text-white transition-all">
                       <ArrowUpRight size={14} />
                    </div>
                 </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Designer Bottom Bar */}
        <div className="pt-20 border-t border-white/5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex flex-col md:flex-row items-center gap-12 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
               <span className="hover:text-white/40 transition-colors">&copy; 2026 {siteName} Sanctuary</span>
               <div className="flex items-center gap-10">
                  <button className="hover:text-white transition-colors relative group">
                    Privacy Policy
                    <span className="absolute bottom-[-4px] left-0 w-0 h-[1px] bg-white/20 group-hover:w-full transition-all" />
                  </button>
                  <button className="hover:text-white transition-colors relative group">
                    Terms of Service
                    <span className="absolute bottom-[-4px] left-0 w-0 h-[1px] bg-white/20 group-hover:w-full transition-all" />
                  </button>
               </div>
            </div>

            <div className="flex items-center gap-12">
               <div className="hidden lg:block h-px w-24 bg-gradient-to-r from-transparent to-white/5" />
               <div className="font-accent italic text-3xl text-white/10 group-hover:text-white/20 transition-all whitespace-nowrap">
                  The Art of <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/5 via-white/20 to-white/5">Profound Balance</span>
               </div>
               <div className="hidden lg:block h-px w-24 bg-gradient-to-l from-transparent to-white/5" />
            </div>

            <button 
              onClick={scrollToTop}
              className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-zen-sand hover:bg-zen-sand/10 transition-all duration-500 group"
            >
              <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;

