import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sparkles, Instagram, Facebook, Twitter, MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="bg-[#1A1816] text-[#FAF9F6] pt-32 pb-16 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#4A2C40]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="container mx-auto px-6 lg:px-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-20 mb-32">
          
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-10">
             <NavLink to="/" className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-[#4A2C40]/20 flex items-center justify-center text-[#E5BAD4] border border-white/5 group-hover:bg-[#4A2C40] transition-all duration-500 shadow-lg">
                  <Sparkles size={20} />
                </div>
                <span className="font-serif text-3xl font-bold tracking-tighter uppercase whitespace-nowrap">Zen<span className="opacity-40 font-normal italic">Spa</span></span>
             </NavLink>
             <p className="text-lg text-white/40 font-light leading-relaxed max-w-sm">
                A meticulously curated environment designed for profound stillness and physical restoration.
             </p>
             <div className="flex items-center gap-6">
                {[Instagram, Facebook, Twitter].map((Icon, i) => (
                  <button key={i} className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all duration-500">
                    <Icon size={18} />
                  </button>
                ))}
             </div>
          </div>

          {/* Site Links */}
          <div className="lg:col-span-2 space-y-8">
            <h5 className="text-[10px] font-bold text-[#E5BAD4] uppercase tracking-[0.4em]">Sitemap</h5>
            <div className="flex flex-col gap-5">
              {[
                { name: 'Home', path: '/' },
                { name: 'About', path: '/about' },
                { name: 'Services', path: '/landing-services' },
                { name: 'Our Team', path: '/team' },
                { name: 'Contact', path: '/contact' }
              ].map((link) => (
                <NavLink 
                  key={link.name} 
                  to={link.path} 
                  className="text-[12px] font-medium text-white/40 hover:text-white transition-all flex items-center group"
                >
                  <div className="w-0 group-hover:w-4 h-[1px] bg-[#E5BAD4] transition-all duration-300 mr-0 group-hover:mr-3" />
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Locale & Contact */}
          <div className="lg:col-span-3 space-y-8">
            <h5 className="text-[10px] font-bold text-[#E5BAD4] uppercase tracking-[0.4em]">The Sanctuary</h5>
            <div className="space-y-8">
              <div className="space-y-2">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Address</p>
                 <p className="text-sm text-white/50 leading-relaxed max-w-[200px]">
                    12 Lotus Path, Equilibrium Valley, Doha, Qatar
                 </p>
              </div>
              <div className="space-y-2">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Inquiries</p>
                 <p className="text-sm text-white/50">peace@zenspa.qa</p>
                 <p className="text-sm text-white/50">+974 4455 6677</p>
              </div>
            </div>
          </div>

          {/* Membership CTA */}
          <div className="lg:col-span-3 space-y-8">
            <h5 className="text-[10px] font-bold text-[#E5BAD4] uppercase tracking-[0.4em]">Membership</h5>
            <div className="space-y-8 rounded-[3rem] bg-white/5 p-8 border border-white/10 hover:border-white/20 transition-all group">
               <p className="text-sm text-white/50 leading-relaxed">
                  Join our inner circle for exclusive access to seasonal ceremonies and personalized blueprints.
               </p>
               <Link 
                 to="/contact" 
                 className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-[#E5BAD4] group-hover:text-white transition-colors"
               >
                  Inquire Now
                  <ArrowUpRight size={16} />
               </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
          <div className="flex flex-col md:flex-row items-center gap-12">
             <span>&copy; 2026 ZEN SPA GLOBAL SANCTUARIES</span>
             <div className="flex items-center gap-8">
                <button className="hover:text-white transition-colors">Privacy Privacy</button>
                <button className="hover:text-white transition-colors">Legal Terms</button>
             </div>
          </div>
          <div className="italic font-serif normal-case text-lg text-white/10">
             The Art of Profound Balance
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
