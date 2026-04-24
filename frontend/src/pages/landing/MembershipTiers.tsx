import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Check, Gem, ShieldCheck, 
  Crown, Star, ArrowRight, Zap, Info
} from 'lucide-react';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { getCachedJson, setCachedJson } from '../../utils/localCache';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const ICON_MAP: Record<string, any> = {
  Sparkles, Gem, Crown, Star, ShieldCheck, Zap
};

const MembershipTiers = () => {
  const { settings } = usePublicSettings();
  const [plans, setPlans] = useState<any[]>(() => getCachedJson('zen_landing_membership_tiers', []));
  const [loading, setLoading] = useState(() => getCachedJson<any[]>('zen_landing_membership_tiers', []).length === 0);

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
      icon: Sparkles,
      color: "from-zen-sand/20 to-zen-sand/5",
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
       icon: Gem,
       color: "from-zen-brown/10 to-zen-brown/5",
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
       icon: Crown,
       color: "from-zen-sand/30 to-zen-sand/10",
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
    <div className="min-h-screen bg-zen-cream pt-32 pb-24 px-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_center,_#d4a37308,_transparent_70%)] -z-0" />
      <div className="absolute bottom-10 left-10 w-[40vw] h-[40vw] bg-[radial-gradient(circle_at_center,_#53433705,_transparent_70%)] animate-pulse -z-0" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="text-center space-y-4 mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.6em] text-zen-sand"
          >
            <span className="w-12 h-[1px] bg-zen-sand/30" />
            Exclusive Tiers
            <span className="w-12 h-[1px] bg-zen-sand/30" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-[6.5rem] font-serif font-bold text-zen-brown leading-[0.9] tracking-tight"
          >
            Join the Sanctuary <br /> 
            <span className="italic relative animate-text-shine">
              Inner Circle
              <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-zen-brown/10" />
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zen-brown/40 font-serif max-w-2xl mx-auto italic"
          >
            Experience a deeper level of restoration with our curated membership tiers, designed to weave wellness into the fabric of your lifestyle.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {displayedPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              className={`relative bg-white/60 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/50 shadow-2xl shadow-zen-brown/5 flex flex-col group transition-all duration-700 hover:translate-y-[-10px] ${
                (plan.popular || plan.isPopular) ? 'ring-2 ring-zen-sand shadow-zen-sand/10' : ''
              }`}
            >
              {(plan.popular || plan.isPopular) && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zen-sand text-white px-5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                  Most Preferred
                </div>
              )}

              <div className="space-y-8 flex-1">
                <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-tr ${plan.color || 'from-zen-sand/10 to-transparent'} flex items-center justify-center text-zen-sand group-hover:scale-110 transition-transform duration-700`}>
                  {ICON_MAP[plan.icon] ? React.createElement(ICON_MAP[plan.icon], { size: 32, strokeWidth: 1 }) : <Sparkles size={32} strokeWidth={1} />}
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-serif font-black text-zen-brown">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-serif font-black tracking-tight text-zen-brown">{plan.price}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">QAR / {plan.duration || 'Monthly'}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-zen-brown/5" />

                <ul className="space-y-4">
                  {(plan.benefits || []).map((benefit: string, bi: number) => (
                    <li key={bi} className="flex items-start gap-4 group/item">
                      <div className="mt-1 w-5 h-5 rounded-full bg-zen-sand/10 flex items-center justify-center text-zen-sand shrink-0 group-hover/item:bg-zen-sand group-hover/item:text-white transition-all">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-xs font-semibold text-zen-brown/70 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 pt-8">
                <button className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-700 flex items-center justify-center gap-3 shadow-xl ${
                  plan.popular 
                    ? 'bg-zen-brown text-white hover:bg-zen-sand shadow-zen-brown/20' 
                    : 'bg-zen-cream group-hover:bg-zen-brown group-hover:text-white text-zen-brown'
                }`}>
                  Initiate Membership <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="mt-32 p-12 lg:p-20 bg-zen-brown rounded-[4rem] text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <Sparkles size={400} className="absolute -top-20 -right-20 text-white animate-pulse" />
          </div>
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-center lg:text-left">
               <h2 className="text-4xl lg:text-6xl font-serif font-black italic tracking-tight leading-tight">Can't decide on the <br /> perfect ritual cycle?</h2>
               <p className="text-white/60 font-serif italic text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Our Sanctuary Guides are available for a private consultation to discuss your wellness intentions and tailor a membership experience just for you.
               </p>
               <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                  <button className="px-10 py-6 bg-zen-sand text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all">
                    Private Consultation
                  </button>
                  <p className="text-xs font-black uppercase tracking-widest text-white/30 italic">No Commitment Required</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 sm:gap-8">
              {[
                { icon: ShieldCheck, title: "Vault Privacy", desc: "Confidential rituals" },
                { icon: Star, title: "Curated Gifting", desc: "Premium wellness sets" },
                { icon: Zap, title: "Rapid Access", desc: "Priority waitlisting" },
                { icon: Info, title: "Concierge", desc: "Direct butler support" }
              ].map((feature, i) => (
                <div key={i} className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-4 hover:bg-white/10 transition-colors">
                  <feature.icon className="text-zen-sand" size={24} strokeWidth={1.5} />
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest">{feature.title}</h4>
                    <p className="text-[10px] text-white/40 font-serif italic">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MembershipTiers;
