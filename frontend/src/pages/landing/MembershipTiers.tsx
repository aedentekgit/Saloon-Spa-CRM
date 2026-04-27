import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Check, Gem, ShieldCheck, 
  Crown, Star, ArrowRight, Zap, Info,
  MapPin, Clock, Fingerprint, X, LayoutGrid
} from 'lucide-react';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { getImageUrl } from '../../utils/imageUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const ICON_MAP: Record<string, any> = {
  Sparkles, Gem, Crown, Star, ShieldCheck, Zap
};

const MembershipTiers = () => {
  const { settings } = usePublicSettings();
  const [plans, setPlans] = useState<any[]>(() => getCachedJson('zen_landing_membership_tiers', []));
  const [loading, setLoading] = useState(() => getCachedJson<any[]>('zen_landing_membership_tiers', []).length === 0);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_URL}/memberships/active`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch (err) {
        console.error('Failed to fetch membership tiers');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => setCachedJson('zen_landing_membership_tiers', plans), [plans]);

  const defaultPlans = [
    {
      name: "Serenity Circle",
      price: 299,
      duration: "Monthly",
      icon: 'Sparkles',
      color: "from-blue-500/10 to-transparent",
      benefits: [
        "1 Signature Ritual per month",
        "10% off all additional services",
        "Weekday priority booking",
        "Welcome wellness gift"
      ]
    },
    {
      name: "Celestial Circle",
      price: 599,
      duration: "Monthly",
      icon: 'Gem',
      color: "from-zen-sand/10 to-transparent",
      popular: true,
      benefits: [
        "2 Advanced Rituals per month",
        "15% off all additional services",
        "7-day priority access",
        "Complimentary room upgrade",
        "Monthly thermal suite pass"
      ]
    },
    {
      name: "Sovereign Circle",
      price: 999,
      duration: "Monthly",
      icon: 'Crown',
      color: "from-amber-500/10 to-transparent",
      benefits: [
        "Unlimited Essential Rituals",
        "20% off all additional services",
        "Lounge access & Private Concierge",
        "Quarterly guest ritual pass",
        "Valet & Private Entrance"
      ]
    }
  ];

  const displayedPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="min-h-screen bg-zen-cream pt-32 pb-24 px-4 sm:px-6 relative overflow-hidden selection:bg-zen-sand selection:text-white">
      {/* Immersive Background */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-zen-sand/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-zen-brown/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-6 mb-24 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-white rounded-full shadow-sm border border-zen-brown/5 text-[9px] font-black uppercase tracking-[0.4em] text-zen-sand"
          >
            <Sparkles size={14} />
            Privileged Access
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-[7.5rem] font-serif font-black text-zen-brown leading-[0.85] tracking-tighter"
          >
            The Art of <br />
            <span className="italic relative">
               Loyalty
               <div className="absolute -bottom-2 left-0 w-full h-2 bg-zen-sand/10 -rotate-1 rounded-full blur-sm" />
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-zen-brown/40 font-serif max-w-2xl mx-auto italic leading-relaxed"
          >
            Join an exclusive community dedicated to the pursuit of consistent wellness and profound restoration.
          </motion.p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12 items-start">
          {displayedPlans.map((plan, i) => {
            const PlanIcon = ICON_MAP[plan.icon] || Sparkles;
            const isPopular = plan.popular || plan.isPopular;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 + 0.3, duration: 0.8 }}
                className={`group relative bg-white/40 backdrop-blur-3xl rounded-[3.5rem] border transition-all duration-1000 hover:shadow-[0_40px_80px_-20px_rgba(43,36,64,0.15)] hover:-translate-y-4 flex flex-col overflow-hidden ${
                  isPopular 
                    ? 'border-zen-sand/30 shadow-xl shadow-zen-sand/5' 
                    : 'border-white/60 shadow-lg shadow-black/5'
                }`}
              >
                {/* Visual Header with Image Support */}
                <div className="h-[280px] w-full relative overflow-hidden">
                  {plan.document ? (
                    <img 
                      src={getImageUrl(plan.document)} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out" 
                      alt={plan.name}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${plan.color || 'from-zen-sand/20 to-zen-primary/10'} flex items-center justify-center`}>
                       <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #2b2440 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                       <PlanIcon size={120} strokeWidth={0.5} className="text-zen-brown/5 scale-150 group-hover:rotate-12 transition-transform duration-1000" />
                    </div>
                  )}
                  
                  {/* Overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                  
                  {/* Tier Badge */}
                  <div className="absolute top-8 left-8 flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl flex items-center justify-center text-zen-sand">
                        <PlanIcon size={22} strokeWidth={1.5} />
                     </div>
                     {isPopular && (
                        <div className="px-4 py-1.5 bg-zen-sand text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-zen-sand/20">
                           Most Preferred
                        </div>
                     )}
                  </div>
                </div>

                <div className="p-10 pt-0 -mt-8 relative z-10 space-y-8 flex-1 flex flex-col">
                  <div className="space-y-4">
                    <h3 className="text-4xl font-serif font-black text-zen-brown tracking-tighter">{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-serif font-black text-zen-brown tracking-tighter">QR {plan.price}</span>
                       <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">{plan.duration || 'Monthly Cycle'}</span>
                    </div>
                    {plan.description && (
                       <p className="text-xs font-serif italic text-zen-brown/40 leading-relaxed">
                          {plan.description}
                       </p>
                    )}
                  </div>

                  <div className="h-px w-full bg-zen-brown/10" />

                  <div className="space-y-6 flex-1">
                     <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Included Rituals & Benefits</p>
                     <ul className="space-y-4">
                        {(plan.benefits || []).map((benefit: string, bi: number) => (
                           <li key={bi} className="flex items-start gap-4 group/benefit">
                              <div className="w-5 h-5 rounded-lg bg-zen-sand/10 text-zen-sand flex items-center justify-center mt-0.5 group-hover/benefit:bg-zen-sand group-hover/benefit:text-white transition-all duration-500">
                                 <Check size={12} strokeWidth={3} />
                              </div>
                              <span className="text-xs font-semibold text-zen-brown/70 leading-relaxed">{benefit}</span>
                           </li>
                        ))}
                     </ul>
                  </div>

                     <button 
                        onClick={() => setSelectedPlan(plan)}
                        className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-700 flex items-center justify-center gap-3 relative overflow-hidden ${
                          isPopular 
                           ? 'bg-zen-brown text-white hover:bg-zen-sand shadow-2xl shadow-zen-brown/20 active:scale-95' 
                           : 'bg-zen-cream text-zen-brown border border-zen-brown/5 hover:bg-zen-brown hover:text-white hover:shadow-2xl hover:shadow-zen-brown/10 active:scale-95'
                        }`}
                     >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        Initiate Membership
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                     </button>
                </div>

                {/* Decorative Pattern at bottom */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 opacity-[0.03] rotate-45 pointer-events-none">
                   <PlanIcon size={120} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Consultation Section */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mt-40 rounded-[4rem] relative overflow-hidden"
        >
          {/* Background Image/Gradient for the Banner */}
          <div className="absolute inset-0 bg-zen-brown">
             <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
             <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-zen-sand/20 to-transparent" />
          </div>

          <div className="relative z-10 p-12 lg:p-24 grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10 text-center lg:text-left">
               <div className="space-y-4">
                  <div className="inline-flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.5em] text-zen-sand">
                     <div className="w-8 h-[1px] bg-zen-sand" />
                     Bespoke Solutions
                  </div>
                  <h2 className="text-4xl lg:text-7xl font-serif font-black text-white italic tracking-tighter leading-[0.95]">
                     Tailored to your <br /> lifestyle rhythm.
                  </h2>
               </div>
               
               <p className="text-white/50 font-serif italic text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Our Wellness Concierge is available to design a membership structure that aligns perfectly with your schedule and specific therapeutic needs.
               </p>

               <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start pt-4">
                  <button className="px-12 py-6 bg-white text-zen-brown rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-zen-sand hover:text-white hover:-translate-y-1 transition-all duration-500">
                    Connect with a Guide
                  </button>
                  <div className="flex items-center gap-3 text-white/30">
                     <Clock size={16} />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Available 9AM — 9PM</span>
                  </div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
              {/* Floating Decorative Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
              
              {[
                { icon: ShieldCheck, title: "Vault Privacy", desc: "Highest discretion protocols" },
                { icon: MapPin, title: "Multi-Sanctuary", desc: "Access across all branches" },
                { icon: Fingerprint, title: "Biometric Entry", desc: "Seamless private check-in" },
                { icon: Star, title: "Curated Gifting", desc: "Quarterly wellness sets" }
              ].map((feature, i) => (
                <div key={i} className="p-8 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 space-y-5 hover:bg-white/10 transition-all duration-500 group/feat">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zen-sand group-hover/feat:scale-110 group-hover/feat:bg-zen-sand group-hover/feat:text-white transition-all duration-500">
                     <feature.icon size={22} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black uppercase tracking-widest text-white leading-none">{feature.title}</h4>
                    <p className="text-[10px] text-white/40 font-serif italic">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Trust Footer */}
        <div className="mt-32 text-center">
           <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[0.5em] mb-8">Trusted by wellness enthusiasts since 1998</p>
           <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-1000">
              <Sparkles size={32} />
              <Gem size={32} />
              <Crown size={32} />
              <Star size={32} />
              <ShieldCheck size={32} />
           </div>
        </div>
      </div>

      {/* Plan Details Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlan(null)}
              className="absolute inset-0 bg-zen-brown/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl"
            >
              {/* Modal Header/Image */}
              <div className="h-64 relative">
                {selectedPlan.document ? (
                  <img src={getImageUrl(selectedPlan.document)} className="w-full h-full object-cover" alt={selectedPlan.name} />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${selectedPlan.color || 'from-zen-sand/20 to-zen-primary/10'} flex items-center justify-center`}>
                     <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #2b2440 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                     {React.createElement(ICON_MAP[selectedPlan.icon] || Sparkles, { size: 80, strokeWidth: 0.5, className: "text-zen-brown/10" })}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-zen-brown hover:bg-white transition-all shadow-lg z-20"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-10 -mt-12 relative z-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="text-4xl font-serif font-black text-zen-brown tracking-tighter">{selectedPlan.name}</h2>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                     <span className="text-3xl font-serif font-black text-zen-brown">QR {selectedPlan.price}</span>
                     <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">{selectedPlan.duration || 'Monthly Cycle'}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-8">
                  {/* Benefits Column */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Plan Highlights</p>
                    <div className="space-y-3">
                      {(selectedPlan.benefits || []).map((benefit: string, bi: number) => (
                        <div key={bi} className="flex items-center gap-3 text-xs text-zen-brown/70 font-medium">
                          <Check size={14} className="text-zen-sand shrink-0" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services Column */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Service Privileges</p>
                    <div className="space-y-3">
                      {(selectedPlan.applicableServices || []).length > 0 ? (
                        (selectedPlan.applicableServices || []).map((service: any, si: number) => (
                          <div key={si} className="flex items-center gap-3 text-xs text-zen-brown/70 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-zen-sand/40" />
                            {typeof service === 'object' ? service.name : 'Premium Service'}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-3 text-xs text-zen-brown/30 italic">
                          <LayoutGrid size={14} />
                          All standard rituals included
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Branch Message */}
                <div className="bg-zen-cream/50 p-8 rounded-[2rem] border border-zen-brown/5 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm mx-auto flex items-center justify-center text-zen-sand">
                    <MapPin size={24} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black uppercase tracking-widest text-zen-brown">Ready to Join?</h4>
                    <p className="text-xs text-zen-brown/40 font-serif italic leading-relaxed">
                      To maintain our standards of personalized service, membership registrations are processed in person. Please visit your nearest branch to finalize your enrollment and receive your physical member card.
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedPlan(null)}
                    className="w-full py-4 bg-zen-brown text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zen-sand transition-all shadow-lg active:scale-95"
                  >
                    Understood
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes text-shine {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .animate-text-shine {
          background: linear-gradient(to right, #2b2440 20%, #8b5cf6 40%, #8b5cf6 60%, #2b2440 80%);
          background-size: 200% auto;
          color: #000;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: text-shine 5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MembershipTiers;

