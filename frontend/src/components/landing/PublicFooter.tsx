import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="relative pt-12 pb-12 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-zen-sand/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-zen-leaf/5 blur-[120px] rounded-full -z-10" />

      <div className="container mx-auto px-6">
        <div className="glass rounded-[3rem] p-10 lg:p-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-8 border-white/40 shadow-2xl">
          
          {/* Brand Info */}
          <div className="space-y-6">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zen-sand to-zen-leaf flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform duration-500">
                <Sparkles size={20} />
              </div>
              <span className="font-serif text-2xl font-black text-zen-brown tracking-tighter">ZEN<span className="text-zen-sand">SPA</span></span>
            </NavLink>
            <p className="text-[13px] text-zen-brown/50 font-medium leading-relaxed max-w-xs">
              A sanctuary of tranquility dedicated to the harmony of body, mind, and spirit. Rediscover yourself in our architecture of peace.
            </p>
            <div className="flex items-center gap-4">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-xl glass-dark flex items-center justify-center text-zen-brown/40 hover:text-zen-sand hover:scale-110 transition-all duration-300">
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h5 className="text-[10px] font-black text-zen-brown uppercase tracking-[0.4em] mb-8">Navigation</h5>
            <div className="flex flex-col gap-4">
              {['Home', 'About', 'Services', 'Our Team', 'Contact'].map((item) => (
                <NavLink 
                  key={item} 
                  to={item === 'Services' ? '/landing-services' : item === 'Our Team' ? '/team' : `/${item.toLowerCase().replace(' ', '')}`} 
                  className="text-[13px] font-medium text-zen-brown/40 hover:text-zen-sand transition-colors"
                >
                  {item}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h5 className="text-[10px] font-black text-zen-brown uppercase tracking-[0.4em] mb-8">Locale</h5>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-zen-sand/5 flex items-center justify-center text-zen-sand shrink-0">
                  <MapPin size={16} />
                </div>
                <p className="text-[13px] text-zen-brown/60 font-medium leading-[1.8]">
                  123 Lotus Avenue, Celestial Gardens<br />Doha, Qatar
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-zen-sand/5 flex items-center justify-center text-zen-sand shrink-0">
                  <Phone size={16} />
                </div>
                <p className="text-[13px] text-zen-brown/60 font-black">+974 4455 6677</p>
              </div>
            </div>
          </div>

          {/* Newsletter / CTA */}
          <div>
            <h5 className="text-[10px] font-black text-zen-brown uppercase tracking-[0.4em] mb-8">Registry</h5>
            <div className="space-y-4">
              <p className="text-[13px] text-zen-brown/40 font-medium leading-relaxed">
                Celestial updates and exclusive retreat offers.
              </p>
              <div className="relative group">
                <input 
                  type="email" 
                  placeholder="Oracle Email"
                  className="w-full h-12 bg-zen-sand/5 border border-zen-sand/10 rounded-xl px-5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zen-sand/20 transition-all placeholder:text-zen-brown/20"
                />
                <button className="absolute right-1 top-1 bottom-1 w-10 h-10 bg-zen-sand text-white rounded-lg flex items-center justify-center hover:bg-zen-brown transition-all">
                  <Mail size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Bits */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/20 border-t border-zen-brown/5 pt-8">
          <span>&copy; 2026 ZEN SPA SANCTUARY. All Rights Reserved.</span>
          <div className="flex items-center gap-8">
            <button className="hover:text-zen-sand transition-colors">Privacy Paradigm</button>
            <button className="hover:text-zen-sand transition-colors">Terms of Tranquility</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
