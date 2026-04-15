import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Edit2, Trash2, Camera, X, 
  Sparkles, Building2, Zap, DoorOpen, Clock
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../components/zen/ZenInputs';
import { ZenPagination } from '../components/zen/ZenPagination';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useBranches } from '../context/BranchContext';
import { useCategories } from '../context/CategoryContext';
import { resolveRoomImageMeta } from '../utils/roomImage';

interface Branch {
  _id: string;
  name: string;
}

interface Room {
  _id: string;
  name: string;
  type: string;
  status: 'Free' | 'Occupied' | 'Cleaning';
  timer: string;
  branch?: Branch;
  image?: string;
  isActive: boolean;
  cleaningDuration?: number;
}

const Rooms = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch } = useBranches();
  const { getRoomCategories } = useCategories();
  const roomCategories = getRoomCategories();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_rooms_view') as 'grid' | 'table') || 'grid';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    type: 'None',
    status: 'Free',
    branch: '',
    isActive: true,
    cleaningDuration: 15
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  useEffect(() => {
    localStorage.setItem('zen_rooms_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  useEffect(() => {
    fetchRooms();
  }, [selectedBranch, page]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/rooms?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setRooms(data.data);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setRooms(data);
        setTotalPages(1);
      } else {
        notify('error', 'Error', data.message || 'Failed to retrieve sanctuaries');
        setRooms([]);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Sync Error', 'Failed to synchronize sanctuary records.');
      setRooms([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (room: Room | null = null) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        type: room.type,
        status: room.status,
        branch: room.branch?._id || '',
        isActive: room.isActive !== undefined ? room.isActive : true,
        cleaningDuration: room.cleaningDuration || 0
      });
    } else {
      setEditingRoom(null);
      setFormData({ 
        name: '', 
        type: 'None', 
        status: 'Free', 
        branch: selectedBranch === 'all' ? '' : selectedBranch,
        isActive: true,
        cleaningDuration: 15
      });
    }
    setRoomImageFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRoom ? `${API_URL}/rooms/${editingRoom._id}` : `${API_URL}/rooms`;
      const method = editingRoom ? 'PUT' : 'POST';
      
      const data = new FormData();
      data.append('name', formData.name);
      data.append('type', formData.type);
      data.append('status', formData.status);
      data.append('branch', formData.branch);
      data.append('isActive', formData.isActive.toString());
      data.append('cleaningDuration', formData.cleaningDuration.toString());
      if (roomImageFile) data.append('image', roomImageFile);

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${user?.token}` 
        },
        body: data
      });

      if (response.ok) {
        notify('success', 'Established', editingRoom ? 'Sanctuary refined' : 'New sanctuary established');
        setIsModalOpen(false);
        fetchRooms();
      } else {
        const error = await response.json();
        notify('error', 'Protocol Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Link Failure', 'Could not establish connection to headquarters.');
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Remove Sanctuary',
      'Are you sure you want to decommission this room? This action is irreversible.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Success', 'Sanctuary decommissioned');
            fetchRooms();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };

  const toggleIsActive = async (room: Room) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${room._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !room.isActive })
      });
      if (response.ok) {
        notify('success', 'Status Switched', `Room is now ${!room.isActive ? 'Active' : 'Inactive'}`);
        fetchRooms();
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to update activation resonance.');
    }
  };

  const filteredRooms = useMemo(() => {
    let filtered = rooms;

    // Filter by Branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(room => room.branch?._id === selectedBranch || (room as any).branch === selectedBranch);
    }

    // Filter by Search Term
    return filtered.filter(room => 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.branch?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rooms, searchTerm, selectedBranch]);


  const roomImageBaseUrl = API_URL.replace('/api', '');
  const getDisplayImage = (room: Room) => resolveRoomImageMeta(room, roomImageBaseUrl);
  const previewRoom = editingRoom || (formData.name ? {
    name: formData.name,
    type: formData.type,
    branch: branches.find(branch => branch._id === formData.branch),
    image: ''
  } : null);
  const previewRoomImage = previewRoom ? resolveRoomImageMeta(previewRoom as Room, roomImageBaseUrl) : null;

  return (
    <ZenPageLayout
      title="Sanctuaries"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add New Room"
      addButtonIcon={<Plus size={18} />}
      onAddClick={() => handleOpenModal()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          {filteredRooms.map((room, i) => {
            const roomImage = getDisplayImage(room);
            return (
              <div 
                key={room._id} 
                className="group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-white overflow-hidden flex flex-col transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="aspect-[16/9] sm:aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={roomImage.src} 
                    alt={room.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                    style={{ objectPosition: roomImage.objectPosition }}
                  />

                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col items-end gap-2">
                    <div className="px-3 py-1 sm:px-5 sm:py-2 backdrop-blur-3xl bg-white/80 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest text-zen-brown flex items-center gap-2 shadow-lg border border-white/20">
                      <Clock size={10} className="sm:w-3 sm:h-3 text-zen-brown/40" />
                      {room.cleaningDuration || 0} MIN
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex flex-col gap-2">
                    <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] sm:text-[9px] font-bold tracking-widest text-white uppercase border border-white/40 shadow-sm">
                       {room.branch?.name || 'Sanctuary Hub'}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 flex flex-col flex-1 gap-4 sm:gap-6">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.3em] text-zen-brown/40">
                      <Building2 size={10} />
                      {room.type} Suite
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown leading-tight truncate-2-lines">{room.name}</h3>
                  </div>

                  <div className="mt-auto pt-4 sm:pt-6 flex items-center justify-between border-t border-zen-brown/5">
                    <div className="flex items-center gap-2">
                      <ZenBadge variant={
                          room.status === 'Free' ? 'leaf' :
                          room.status === 'Occupied' ? 'danger' : 'sand'
                       } className="lowercase italic font-serif text-[10px] sm:text-xs">
                        {room.status}
                      </ZenBadge>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <ZenIconButton 
                         icon={Sparkles} 
                         variant={room.isActive ? 'leaf' : 'sand'} 
                         onClick={() => toggleIsActive(room)} 
                         className={room.isActive ? 'text-zen-leaf' : 'text-zen-sand'}
                         size="sm"
                         title="Toggle Presence"
                      />
                      <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(room)} size="sm" title="Refine Sanctury" />
                      <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(room._id)} size="sm" title="Decommission" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] shadow-sm border border-white overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
               <tr className="bg-zen-brown border-b border-zen-brown/15">
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">S No</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Visual</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Branch</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Sanctuary Name</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Category</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Cleaning</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Status</th>
                 <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, index) => {
                const roomImage = getDisplayImage(room);
                return (
                <tr key={room._id}>
                   <td className="px-8 py-5 text-center">
                     <span className="font-serif text-xl text-zen-brown/40">{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                   </td>
                  <td>
                    <div className="flex justify-center">
                      <div className="w-14 lg:w-16 h-10 lg:h-12 rounded-[1.5rem] overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                        <img 
                          src={roomImage.src} 
                          alt={room.name} 
                          className="w-full h-full object-cover"
                          style={{ objectPosition: roomImage.objectPosition }}
                        />
                      </div>
                    </div>
                  </td>
                   <td className="px-8 py-5">
                     <span className="text-[10px] font-black text-zen-brown/60 uppercase tracking-widest">{room.branch?.name || 'Main Registry'}</span>
                   </td>
                   <td className="px-10 py-5 text-left">
                     <div className="flex flex-col items-center">
                       <p className="font-serif text-lg text-zen-brown font-black tracking-tight leading-tight whitespace-nowrap">{room.name}</p>
                       <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest mt-0.5">Active Space</p>
                     </div>
                   </td>
                   <td className="px-8 py-5">
                     <ZenBadge variant="sand" className="uppercase font-black tracking-widest">{room.type}</ZenBadge>
                   </td>
                   <td className="px-8 py-5">
                     <div className="flex items-center justify-center gap-2 text-[10px] text-zen-brown/70 italic font-black uppercase tracking-widest">
                       <Clock size={12} className="text-zen-sand" />
                       {room.cleaningDuration || 0}m
                     </div>
                   </td>
                   <td className="px-8 py-5">
                     <ZenBadge variant={
                       room.status === 'Free' ? 'leaf' :
                       room.status === 'Occupied' ? 'danger' : 'sand'
                     } className="uppercase font-black tracking-widest">{room.status}</ZenBadge>
                   </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                       <ZenIconButton 
                          icon={Sparkles} 
                          variant={room.isActive ? 'leaf' : 'sand'} 
                          onClick={() => toggleIsActive(room)} 
                          className={room.isActive ? 'text-zen-leaf' : 'text-zen-sand'}
                       />
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(room)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(room._id)} />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        hideHeader 
        maxWidth="max-w-4xl"
        title={editingRoom ? "Refine Sanctuary" : "New Sanctuary Presence"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] sm:h-[85vh] w-full relative">
          
          <div className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-10 border-b border-zen-brown/15 sticky top-0 bg-white/95 backdrop-blur-sm z-[60]">
             <div className="flex items-center gap-4 sm:gap-8 flex-1">
                <div className="relative w-24 sm:w-32 h-24 sm:h-32 group cursor-pointer shrink-0">
                   <div className="w-full h-full rounded-[2rem] ring-4 ring-zen-cream ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-sm relative">
                      {(roomImageFile || previewRoomImage) ? (
                        <img 
                          src={roomImageFile ? URL.createObjectURL(roomImageFile) : previewRoomImage?.src} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          style={roomImageFile ? undefined : { objectPosition: previewRoomImage?.objectPosition }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-5xl uppercase tracking-tighter profile-pic-placeholder">
                          {formData.name.charAt(0) || <DoorOpen size={40} strokeWidth={1} />}
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={32} />
                      </div>
                   </div>
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                     onChange={e => setRoomImageFile(e.target.files?.[0] || null)} 
                   />
                   <div className="absolute bottom-1 right-1 p-2.5 bg-zen-brown text-white rounded-full shadow-sm scale-90 group-hover:scale-100 transition-all ring-4 ring-white"><Edit2 size={12} /></div>
                </div>

                <div className="space-y-4 flex-1">
                   <ZenInput label="Sanctuary Designation" placeholder="E.g. Sapphire Suite" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-4xl border-none p-0 h-auto" />
                   <div className="w-full sm:w-80 relative">
                      <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Space Registry Allocation</p>
                   </div>
                </div>
             </div>
             <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} className="self-start mt-2" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-12 scrollbar-none pb-40">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-10 sm:gap-y-14 animate-in fade-in duration-500">
                <ZenDropdown 
                   label="Sanctuary Category" 
                   options={['None', ...roomCategories]} 
                   value={formData.type} 
                   onChange={(val: any) => setFormData({...formData, type: val})} 
                />
                
                <ZenDropdown 
                   label="Assigned Branch" 
                   options={['None', ...branches.filter(b => b.isActive).map(b => b.name)]} 
                   value={branches.find(b => b._id === formData.branch)?.name || 'None'} 
                   onChange={(val) => {
                     const branch = branches.filter(b => b.isActive).find(b => b.name === val);
                     setFormData({...formData, branch: branch ? branch._id : ''});
                   }} 
                />

                <ZenDropdown 
                   label="Initial State"
                   options={['Free', 'Occupied', 'Cleaning']}
                   value={formData.status}
                   onChange={(val: any) => setFormData({...formData, status: val})}
                />

                 <ZenDropdown 
                    label="Activation Status"
                    options={['Active', 'Inactive']}
                    value={formData.isActive ? 'Active' : 'Inactive'}
                    onChange={(val: any) => setFormData({...formData, isActive: val === 'Active'})}
                 />

                 <ZenInput 
                    label="Cleaning Duration (Mins)" 
                    type="number" 
                    value={formData.cleaningDuration} 
                    onChange={(e: any) => setFormData({...formData, cleaningDuration: parseInt(e.target.value) || 0})} 
                 />

                <div className="md:col-span-1">
                   <div className="p-8 bg-zen-cream/30 rounded-[2rem] border border-zen-brown/15 border-dashed">
                      <p className="text-[10px] text-zen-brown/40 font-bold uppercase tracking-widest text-center leading-relaxed">Room status and visual identity are unified within the sanctuary network.</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="px-6 sm:px-12 py-6 sm:py-10 border-t border-zen-brown/15 bg-white/95 backdrop-blur-sm sticky bottom-0 z-[60] flex flex-col sm:flex-row gap-4 sm:gap-6">
             <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 text-lg">Discard</ZenButton>
             <ZenButton type="submit" className="order-1 sm:order-2 flex-[2] text-lg">
                <span>{editingRoom ? 'Finalize Refinement' : 'Establish Space'}</span>
                <Sparkles size={18} className="ml-2" />
             </ZenButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
      />
    </ZenPageLayout>
  );
};

export default Rooms;
