import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Calendar, 
  Gift, 
  CheckCircle2, 
  Search,
  Zap,
  Sparkles,
  Layout,
  Clock,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../components/zen/ZenInputs';
import { notify } from '../components/ZenNotification';

interface Client {
  _id: string;
  name: string;
  phone: string;
  status: string;
}

interface Campaign {
  _id: string;
  templateName: string;
  audience: string;
  message: string;
  sentCount: number;
  status: string;
  date: string;
}

const WhatsApp = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('All Clients');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const templates = [
    { id: 1, name: 'Appointment Reminder', icon: Calendar, text: 'Hi [Name], this is a reminder for your appointment at the Sanctuary on [Date] at [Time]. We look forward to your presence!' },
    { id: 2, name: 'Birthday Ritual', icon: Gift, text: 'Happy Birthday [Name]! To celebrate your solar return, we offer a 20% grace on any ritual this month. Book your sanctuary time now!' },
    { id: 3, name: 'Gratitude Message', icon: CheckCircle2, text: 'Thank you for your presence in our sanctuary, [Name]! We hope you enjoyed your [Service]. Your resonance is valued.' },
    { id: 4, name: 'Promotional Offering', icon: MessageSquare, text: 'Sacred Special! Receive a complimentary Foot Ritual with any Deep Tissue Awakening this week. Limited availability!' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cliRes, camRes] = await Promise.all([
        fetch(`${API_URL}/clients`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/whatsapp`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      const cliData = await cliRes.json();
      const camData = await camRes.json();
      
      if (Array.isArray(cliData)) setClients(cliData.filter((c: any) => c.status === 'Active'));
      if (Array.isArray(camData)) setCampaigns(camData);
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to retrieve messaging sanctuary records');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplate(tpl);
    let processedText = tpl.text;
    processedText = processedText.replace('[Date]', dayjs().format('MMM DD'));
    processedText = processedText.replace('[Time]', '10:00 AM');
    processedText = processedText.replace('[Service]', 'Sanctuary Ritual');
    setMessage(processedText);
  };

  const handleSend = async () => {
    if (!message) return;
    setIsSending(true);

    const filteredClients = clients.filter(c => {
       if (selectedAudience === 'Active Only') return c.status === 'Active';
       return true;
    });

    const newCampaign = {
      templateName: selectedTemplate?.name || 'Custom Message',
      audience: selectedAudience,
      message,
      sentCount: filteredClients.length,
      date: dayjs().format('YYYY-MM-DD')
    };

    try {
      const response = await fetch(`${API_URL}/whatsapp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(newCampaign)
      });

      if (response.ok) {
        notify('success', 'Messaging Sequence Initiated', 'The bulk dissemination has been queued successfully.');
        setMessage('');
        setSelectedTemplate(null);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Dissemination Error', 'Failed to initiate the messaging sequence.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ZenPageLayout
      title="Messaging Sanctuary"
      hideSearch
      hideAddButton
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-10">
           <div className="bg-white/60 backdrop-blur-sm p-10 rounded-[3rem] border border-zen-brown/15 shadow-2xl shadow-zen-brown/15">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Ritual Templates</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em] mt-2">Predefined Communication Sequences</p>
                 </div>
                 <ZenIconButton icon={Layout} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`group p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer relative overflow-hidden ${selectedTemplate?.id === tpl.id 
                        ? 'bg-zen-brown text-white border-zen-brown shadow-2xl shadow-zen-brown/20' 
                        : 'bg-white text-zen-brown border border-zen-brown/15 hover:bg-zen-cream hover:border-zen-sand'}`}
                    >
                       {selectedTemplate?.id === tpl.id && (
                          <div className="absolute top-0 right-0 p-6 opacity-10">
                             <Sparkles size={100} />
                          </div>
                       )}
                       
                       <div className="flex items-center gap-4 mb-6 relative z-10">
                          <div className={`p-4 rounded-2xl transition-all duration-500 ${selectedTemplate?.id === tpl.id ? 'bg-white/10 text-white' : 'bg-zen-cream text-zen-sand group-hover:bg-white group-hover:shadow-lg'}`}>
                             <tpl.icon size={24} />
                          </div>
                          <span className="text-lg font-serif font-bold tracking-tight">{tpl.name}</span>
                       </div>
                       <p className={`text-sm leading-relaxed relative z-10 ${selectedTemplate?.id === tpl.id ? 'text-white/60' : 'text-zen-brown/40 italic'}`}>"{tpl.text}"</p>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] border border-zen-brown/15 shadow-2xl shadow-zen-brown/15">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Campaign Terminal</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Global Resonance Orchestration</p>
                 </div>
                 <ZenIconButton icon={Settings} />
              </div>

              <div className="space-y-10">
                 <ZenDropdown 
                   label="Target Resonance Area"
                   options={['All Clients', 'Active Only', 'Birthdays', 'No Visit']}
                   value={selectedAudience}
                   onChange={setSelectedAudience}
                 />
                 
                 <ZenTextarea 
                   label="Dissemination Content"
                   placeholder="Refine your sequence or select a template above..."
                   value={message}
                   onChange={(e: any) => setMessage(e.target.value)}
                 />

                 <div className="flex items-center justify-between p-6 bg-zen-cream/10 rounded-[2rem] border border-zen-brown/15">
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em]">* Personalize with [Name] placeholder</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zen-leaf uppercase tracking-widest">
                       <Zap size={14} />
                       Instant Delivery
                    </div>
                 </div>

                 <ZenButton 
                   className="w-full py-6 rounded-[2.5rem] text-xl shadow-2xl shadow-emerald-500/10 flex items-center justify-center gap-4 bg-[#25D366] hover:bg-[#20bd5c] text-white border-none" 
                   onClick={handleSend}
                   disabled={!message || isSending}
                 >
                    {isSending ? (
                       <div className="flex items-center gap-4">
                          <div className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full animate-spin"></div>
                          <span>Resonating...</span>
                       </div>
                    ) : (
                       <>
                          <Send size={24} />
                          <span>Initiate Bulk Sequence</span>
                       </>
                    )}
                 </ZenButton>
              </div>
           </div>
        </div>

        <div className="space-y-10">
           <div className="bg-zen-brown p-10 rounded-[3rem] shadow-2xl shadow-zen-brown/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                 <Zap size={150} />
              </div>
              <div className="relative z-10 text-center">
                 <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 backdrop-blur-xl">
                    <MessageSquare className="text-white" size={36} />
                 </div>
                 <h3 className="text-xl font-serif font-bold text-white tracking-tight">Messaging Hub</h3>
                 <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-2 mb-8">Dissemination Status</p>
                 
                 <div className="flex items-center justify-center gap-3 bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/20 w-fit mx-auto mb-8">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Fully Resonant</span>
                 </div>

                 <div className="grid grid-cols-2 gap-6 text-left">
                    <div>
                       <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Today's Flow</p>
                       <p className="text-2xl font-serif font-bold text-white">124</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Impact Level</p>
                       <p className="text-2xl font-serif font-bold text-emerald-400">99%</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white/60 backdrop-blur-sm rounded-[3rem] border border-zen-brown/15 overflow-hidden shadow-2xl shadow-zen-brown/15 flex flex-col h-[600px]">
              <div className="p-8 border-b border-zen-brown/15 bg-white/40 flex justify-between items-center">
                 <div>
                    <h3 className="text-lg font-serif font-bold text-zen-brown">Sequence History</h3>
                    <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-1">Archived Campaigns</p>
                 </div>
                 <ZenIconButton icon={Clock} />
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
                 {campaigns.map((cam) => (
                    <div key={cam._id} className="group p-6 bg-white hover:bg-zen-cream/30 border border-zen-brown/15 rounded-[2.5rem] transition-all duration-500">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <p className="text-sm font-serif font-bold text-zen-brown tracking-tight">{cam.templateName}</p>
                             <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-[.2em] mt-1">{cam.audience}</p>
                          </div>
                          <ZenBadge variant="leaf" className="bg-emerald-50 text-emerald-600 border-none shadow-none">{cam.status}</ZenBadge>
                       </div>
                       
                       <div className="flex justify-between items-end border-t border-zen-brown/15 pt-4">
                          <div className="flex items-center gap-2">
                             <Users size={12} className="text-zen-sand" />
                             <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">{cam.sentCount} Ambassadors</span>
                          </div>
                          <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-[.2em]">{dayjs(cam.date).format('MMM DD, YYYY')}</p>
                       </div>
                    </div>
                 ))}
                 {campaigns.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic font-serif">
                       No sequences disseminated yet.
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </ZenPageLayout>
  );
};

export default WhatsApp;
