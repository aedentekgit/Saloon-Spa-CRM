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
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { getCachedJson, setCachedJson } from '../../utils/localCache';

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
  const [clients, setClients] = useState<Client[]>(() => getCachedJson('zen_page_whatsapp_clients', []));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => getCachedJson('zen_page_whatsapp_campaigns', []));
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('All Clients');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(() => {
    const cachedClients = getCachedJson<Client[]>('zen_page_whatsapp_clients', []);
    const cachedCampaigns = getCachedJson<Campaign[]>('zen_page_whatsapp_campaigns', []);
    return cachedClients.length === 0 && cachedCampaigns.length === 0;
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const templates = [
    { id: 1, name: 'Appointment Reminder', icon: Calendar, text: 'Hi [Name], this is a reminder for your appointment at the Workspace on [Date] at [Time]. We look forward to your presence!' },
    { id: 2, name: 'Birthday Offer', icon: Gift, text: 'Happy Birthday [Name]! To celebrate your solar return, we offer a 20% grace on any service this month. Book your workspace time now!' },
    { id: 3, name: 'Gratitude Message', icon: CheckCircle2, text: 'Thank you for your presence in our workspace, [Name]! We hope you enjoyed your [Service]. Your feedback is valued.' },
    { id: 4, name: 'Promotional Offer', icon: MessageSquare, text: 'Special offer! Receive a complimentary Foot Service with any Deep Tissue Treatment this week. Limited availability!' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const hasVisibleData = clients.length > 0 || campaigns.length > 0;
      if (!hasVisibleData) setLoading(true);
      const [cliRes, camRes] = await Promise.all([
        fetch(`${API_URL}/clients`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/whatsapp`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      const cliData = await cliRes.json();
      const camData = await camRes.json();
      const clientList = Array.isArray(cliData) ? cliData : (cliData?.data || []);
      const campaignList = Array.isArray(camData) ? camData : (camData?.data || []);
      
      if (Array.isArray(clientList)) setClients(clientList.filter((c: any) => c.status === 'Active'));
      if (Array.isArray(campaignList)) setCampaigns(campaignList);
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to retrieve messaging records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_whatsapp_clients', clients), [clients]);
  useEffect(() => setCachedJson('zen_page_whatsapp_campaigns', campaigns), [campaigns]);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplate(tpl);
    let processedText = tpl.text;
    processedText = processedText.replace('[Date]', dayjs().format('MMM DD'));
    processedText = processedText.replace('[Time]', '10:00 AM');
    processedText = processedText.replace('[Service]', 'Service');
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
        notify('success', 'Messaging Campaign Initiated', 'The bulk message has been queued successfully.');
        setMessage('');
        setSelectedTemplate(null);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Messaging Error', 'Failed to initiate the messaging campaign.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ZenPageLayout
      title="Messaging Center"
      hideSearch
      hideAddButton
    >
      <div className="space-y-12">
        {/* Top Summary / Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-zen-brown p-8 rounded-[1.5rem] shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                 <Zap size={100} />
              </div>
              <div className="relative z-10 flex items-center gap-6">
                 <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                    <MessageSquare className="text-white" size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Today's Flow</p>
                    <p className="text-3xl font-serif font-bold text-white">124</p>
                 </div>
              </div>
           </div>

           <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Sparkles size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em] mb-1">Impact Level</p>
                    <p className="text-3xl font-serif font-bold text-emerald-600">99%</p>
                 </div>
              </div>
           </div>

           <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[1.5rem] border border-zen-brown/15 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-zen-sand/10 rounded-2xl flex items-center justify-center text-zen-sand">
                    <CheckCircle2 size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em] mb-1">Gateway Status</p>
                    <p className="text-3xl font-serif font-bold text-zen-brown">Active</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Resonant</span>
              </div>
           </div>
        </div>

        <div className="space-y-12">
           {/* Templates Section */}
           <div className="bg-white/60 backdrop-blur-sm p-10 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Message Templates</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em] mt-2 italic">Predefined Dissemination Protocols</p>
                 </div>
                 <ZenIconButton icon={Layout} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`group p-8 rounded-[1.25rem] border transition-all duration-500 cursor-pointer relative overflow-hidden ${selectedTemplate?.id === tpl.id 
                        ? 'bg-zen-brown text-white border-zen-brown shadow-xl scale-[1.02]' 
                        : 'bg-white text-zen-brown border border-zen-brown/15 hover:bg-zen-cream hover:border-zen-sand hover:scale-[1.02]'}`}
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
                       <p className={`text-sm leading-relaxed relative z-10 ${selectedTemplate?.id === tpl.id ? 'text-white/70' : 'text-zen-brown/40 italic'}`}>"{tpl.text}"</p>
                    </div>
                 ))}
              </div>
           </div>

           {/* Campaign Terminal */}
           <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[1.5rem] border border-zen-brown/15 shadow-xl">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Campaign Terminal</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2 italic">Global Broadcast Orchestration</p>
                 </div>
                 <ZenIconButton icon={Settings} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 <div className="lg:col-span-8 space-y-10">
                    <ZenDropdown 
                      label="Target Audience"
                      options={['All Clients', 'Active Only', 'Birthdays', 'No Visit']}
                      value={selectedAudience}
                      onChange={setSelectedAudience}
                    />
                    
                    <ZenTextarea 
                      label="Dissemination Content"
                      placeholder="Refine your message or select a template above..."
                      value={message}
                      onChange={(e: any) => setMessage(e.target.value)}
                      rows={6}
                    />

                    <div className="flex items-center justify-between p-6 bg-zen-cream/30 rounded-[1rem] border border-zen-brown/15">
                       <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">* Personalize with [Name] placeholder</p>
                       <div className="flex items-center gap-2 text-[10px] font-black text-zen-leaf uppercase tracking-widest">
                          <Zap size={14} />
                          Instant Relay
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-4 flex flex-col justify-end gap-6">
                    <div className="p-8 bg-zen-sand/10 rounded-[1.5rem] border border-zen-sand/20 italic">
                       <p className="text-sm text-zen-brown/60 leading-relaxed">
                          "Messages are broadcasted through the primary WhatsApp Gateway. Ensure your device is connected before initiating large campaigns."
                       </p>
                    </div>
                    <ZenButton 
                      className="w-full py-8 rounded-[1.5rem] text-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-4 bg-[#25D366] hover:bg-[#20bd5c] text-white border-none transform transition-transform hover:scale-[1.02] active:scale-95" 
                      onClick={handleSend}
                      disabled={!message || isSending}
                    >
                       {isSending ? (
                          <div className="flex items-center gap-4">
                             <div className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full animate-spin"></div>
                             <span>Sending...</span>
                          </div>
                       ) : (
                          <>
                             <Send size={28} />
                             <span className="font-bold">Initiate Broadcast</span>
                          </>
                       )}
                    </ZenButton>
                 </div>
              </div>
           </div>

           {/* History Section */}
           <div className="bg-white/60 backdrop-blur-sm rounded-[1.5rem] border border-zen-brown/15 overflow-hidden shadow-sm flex flex-col">
              <div className="p-8 border-b border-zen-brown/15 bg-white/40 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-serif font-bold text-zen-brown tracking-tight">Campaign History</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-1">Archived Dissemination Logs</p>
                 </div>
                 <ZenIconButton icon={Clock} />
              </div>
              
              <div className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {campaigns.map((cam) => (
                       <div key={cam._id} className="group p-8 bg-white hover:bg-zen-cream/30 border border-zen-brown/10 rounded-[1.25rem] transition-all duration-500 shadow-sm hover:shadow-md">
                          <div className="flex justify-between items-start mb-6">
                             <div>
                                <p className="text-lg font-serif font-bold text-zen-brown tracking-tight mb-1">{cam.templateName}</p>
                                <div className="flex items-center gap-3">
                                   <ZenBadge variant="stone" className="text-[8px] uppercase font-black">{cam.audience}</ZenBadge>
                                   <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">{dayjs(cam.date).format('MMM DD, YYYY')}</span>
                                </div>
                             </div>
                             <ZenBadge variant="leaf" className="bg-emerald-50 text-emerald-600 border-none shadow-none text-[9px]">{cam.status}</ZenBadge>
                          </div>
                          
                          <p className="text-sm text-zen-brown/60 line-clamp-2 italic mb-6">"{cam.message}"</p>
                          
                          <div className="flex justify-between items-center border-t border-zen-brown/5 pt-6">
                             <div className="flex items-center gap-2">
                                <Users size={14} className="text-zen-sand" />
                                <span className="text-[10px] font-black text-zen-brown uppercase tracking-widest">{cam.sentCount} Recipients</span>
                             </div>
                             <div className="w-8 h-8 rounded-full bg-zen-cream/50 flex items-center justify-center text-zen-sand group-hover:bg-zen-sand group-hover:text-white transition-colors">
                                <Send size={12} />
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
                 {campaigns.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center opacity-20 italic font-serif">
                       <MessageSquare size={48} className="mb-4" />
                       <p>No messaging history recorded.</p>
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
