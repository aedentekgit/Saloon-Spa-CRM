import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Edit2, Trash2, Camera, X, 
  Sparkles, Building2, Zap, DoorOpen, Clock, Grid, List, Search,
  Calendar, History, User, UserCheck, ShieldCheck, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

const parseTime = (t: string, d: string) => {
  if (!t) return null;
  const formats = ['HH:mm', 'h:mm A', 'hh:mm A', 'H:mm'];
  for (const f of formats) {
    const p = dayjs(`${d} ${t}`, `YYYY-MM-DD ${f}`, true);
    if (p.isValid()) return p;
  }
  return null;
};
import { useSettings } from '../../context/SettingsContext';

import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenDatePicker } from '../../components/zen/ZenInputs';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';
import { resolveRoomImageMeta } from '../../utils/roomImage';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
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

  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [roomAppointments, setRoomAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [registryDate, setRegistryDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [rawServices, setRawServices] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'None',
    status: 'Free',
    branch: '',
    isActive: true,
    cleaningDuration: 15
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
      console.log('Fetching rooms from:', `${API_URL}/rooms?page=${page}&limit=${PAGE_LIMIT}`);
      const response = await fetch(`${API_URL}/rooms?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      console.log('Fetch response status:', response.status);
      const data = await response.json();
      console.log('Fetch response data:', data);
      if (data.data) {
        setRooms(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setRooms(data);
        setTotalPages(1);
      } else {
        notify('error', 'Data Structure Error', 'Received unexpected data format from system.');
        setRooms([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      notify('error', 'Sync Error', 'Failed to synchronize room records.');
      setRooms([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomAppointments = async (room: Room) => {
    try {
      setLoadingAppointments(true);
      const [aptRes, svcRes] = await Promise.all([
        fetch(`${API_URL}/appointments?room=${encodeURIComponent(room.name)}`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        }),
        fetch(`${API_URL}/services`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        })
      ]);
      const aptData = await aptRes.json();
      const svcData = await svcRes.json();
      setRoomAppointments(aptData.data || aptData || []);
      setRawServices(svcData.data || svcData || []);
    } catch (error) {
      console.error('Failed to fetch room data:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleOpenModal = (room: Room | null = null) => {
    if (room) {
      setEditingRoom(room);
      setActiveTab('bookings');
      fetchRoomAppointments(room);
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
      setActiveTab('profile');
      setRoomAppointments([]);
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
        notify('success', 'Room Saved', editingRoom ? 'Room updated successfully' : 'New room created successfully');
        setIsModalOpen(false);
        fetchRooms();
      } else {
        const error = await response.json();
        notify('error', 'Protocol Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Connection Error', 'Could not establish connection to server.');
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Remove Room',
      'Are you sure you want to delete this room? This action is irreversible.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Success', 'Room decommissioned');
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
      notify('error', 'Error', 'Failed to update room status.');
    }
  };

  const filteredRooms = useMemo(() => {
    let filtered = rooms;

    // Filter by Branch
    if (selectedBranch && selectedBranch !== 'all') {
      filtered = filtered.filter(room => {
        const branchId = room.branch?._id || (typeof room.branch === 'string' ? room.branch : (room as any).branchId);
        return branchId === selectedBranch;
      });
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
      title="Rooms & Spaces"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Room"
      onAddClick={() => handleOpenModal()}
    >
      <div className="h-[calc(100vh-180px)] overflow-hidden flex flex-col space-y-10">
        <div className="flex-none">
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-zen-brown tracking-tighter">Space Management</h1>
          <p className="mt-2 text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.5em]">Capacity & Sanctuary Registry</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-4">
          <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
            {[
              { label: 'Total Rooms', value: rooms.length, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', trend: 'Global capacity' },
              { label: 'Live Channels', value: rooms.filter(r => r.status === 'Active').length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Operational now' },
              { label: 'Space Categories', value: roomCategories.length, icon: DoorOpen, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', trend: 'Variety types' },
              { label: 'Branch Coverage', value: branches.length, icon: Sparkles, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Full coverage' }
            ].map((stat, i) => (
              <ZenStatCard key={i} {...stat} delay={i * 0.2} />
            ))}
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-zen-brown/15 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-8 items-end">
              <div className="flex-1 w-full flex flex-col gap-3">
                <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Space Search</label>
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search rooms by name or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-zen-cream/30 border border-zen-brown/10 rounded-xl focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto items-end">
                <div className="flex items-center gap-4">
                  <div className="w-full lg:w-[240px]">
                    <ZenDropdown 
                      label="Active Branch"
                      options={['All Branches', ...(branches || []).map(b => b.name)]}
                      value={(branches || []).find(b => b._id === selectedBranch)?.name || 'All Branches'}
                      onChange={(val: any) => {
                        if (val === 'All Branches') {
                          setSelectedBranch('all');
                        } else {
                          const branch = (branches || []).find(b => b.name === val);
                          if (branch) setSelectedBranch(branch._id);
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Perspective</label>
                    <div className="flex items-center h-[48px] bg-zen-cream/50 p-1 rounded-xl border border-zen-brown/10 shadow-inner">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                      >
                        <Grid size={16} />
                      </button>
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full lg:w-auto">
                  <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Management</label>
                  <ZenButton onClick={() => handleOpenModal()} variant="primary" className="w-full sm:w-auto px-8 h-[48px] shadow-sm flex items-center justify-center gap-2 group">
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span className="uppercase tracking-[0.2em] text-[10px] font-black">Add Room</span>
                  </ZenButton>
                </div>
              </div>
            </div>
          </div>

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
                    className="group relative bg-white/80 backdrop-blur-xl rounded-[1rem] sm:rounded-[1.5rem] shadow-sm border border-white overflow-hidden flex flex-col transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 cursor-pointer"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => handleOpenModal(room)}
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
                          {room.branch?.name || 'Main Branch'}
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
                        <ZenBadge variant={room.status === 'Free' ? 'leaf' : room.status === 'Occupied' ? 'danger' : 'sand'} className="lowercase italic font-serif text-[10px] sm:text-xs">
                          {room.status}
                        </ZenBadge>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <ZenIconButton 
                            icon={Sparkles} 
                            variant={room.isActive ? 'leaf' : 'sand'} 
                            onClick={(e) => { e.stopPropagation(); toggleIsActive(room); }} 
                            className={room.isActive ? 'text-zen-leaf' : 'text-zen-sand'}
                            size="sm"
                          />
                          <ZenIconButton icon={Edit2} onClick={(e) => { e.stopPropagation(); handleOpenModal(room); }} size="sm" />
                          <ZenIconButton icon={Trash2} variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(room._id); }} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden animate-in fade-in duration-700">
              <table className="w-full text-center border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">S No</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Visual</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Branch</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Room Name</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Category</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Cleaning</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Status</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-sm font-serif italic text-zen-brown/20">No room data available in this sanctuary.</td>
                    </tr>
                  ) : (
                    filteredRooms.map((room, index) => {
                      const roomImage = getDisplayImage(room);
                      return (
                        <tr key={room._id} onClick={() => handleOpenModal(room)} className="cursor-pointer group hover:bg-zen-cream/5 border-b border-gray-50 transition-colors last:border-0">
                          <td className="py-4 italic opacity-40 text-xs">
                            {((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="py-4">
                            <div className="flex justify-center">
                              <div className="w-16 h-10 rounded-lg overflow-hidden bg-zen-cream border border-gray-100 shadow-sm group-hover:scale-105 transition-transform duration-500">
                                <img src={roomImage.src} alt="" className="w-full h-full object-cover" style={{ objectPosition: roomImage.objectPosition }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-[11px] font-bold text-zen-brown/60">{room.branch?.name || 'Main Branch'}</td>
                          <td className="py-4">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-bold text-zen-brown">{room.name}</span>
                              <span className="text-[9px] font-medium text-zen-brown/30 uppercase tracking-widest">Active Space</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <ZenBadge variant="sand" className="scale-90 font-black tracking-widest">{room.type}</ZenBadge>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-center gap-2 text-[10px] text-zen-brown/40 italic font-black uppercase tracking-widest">
                              <Clock size={10} className="text-zen-sand" />
                              {room.cleaningDuration || 0}m
                            </div>
                          </td>
                          <td className="py-4">
                            <ZenBadge variant={room.status === 'Free' ? 'leaf' : room.status === 'Occupied' ? 'danger' : 'sand'} className="scale-90 font-black tracking-widest">{room.status}</ZenBadge>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-center gap-3">
                              <ZenIconButton icon={Sparkles} variant={room.isActive ? 'leaf' : 'sand'} onClick={(e) => { e.stopPropagation(); toggleIsActive(room); }} size="sm" />
                              <ZenIconButton icon={Edit2} onClick={(e) => { e.stopPropagation(); handleOpenModal(room); }} size="sm" />
                              <ZenIconButton icon={Trash2} variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(room._id); }} size="sm" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex-none pt-6">
            <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-5xl"
        header={
          <div className="flex items-start justify-between gap-6 px-10 py-8">
            <div className="flex items-start gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                <DoorOpen size={24} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Room Management</p>
                <h3 className="mt-1 text-2xl font-semibold text-zen-brown truncate">{editingRoom ? `Room Profile: ${editingRoom.name}` : 'Create New Room'}</h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">
                  {editingRoom ? 'Review utilization, scheduled rituals, and manage room properties.' : 'Configure a new ritual space for your sanctuary.'}
                </p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-6 w-full px-10 py-8 border-t border-gray-50 bg-gray-50/30">
            <p className="text-xs text-zen-brown/40 italic">
               {editingRoom ? 'System syncs room records in real-time.' : 'New rooms appear in the terminal immediately after creation.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
               <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="px-8">Cancel</ZenButton>
               {activeTab === 'profile' && (
                 <ZenButton onClick={() => (document.getElementById('roomForm') as HTMLFormElement)?.requestSubmit()} className="px-10">
                    <span>{editingRoom ? 'Update Protocol' : 'Commission Room'}</span>
                    <Sparkles size={18} className="ml-2" />
                 </ZenButton>
               )}
            </div>
          </div>
        }
      >
        <div className="space-y-8 px-10 pb-10">
          {editingRoom && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 border-b border-zen-brown/5">
              {[
                { id: 'bookings', label: 'Booking Registry', icon: History },
                { id: 'profile', label: 'Space Protocol', icon: Edit2 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-t-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-500 whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'bg-zen-brown/5 text-zen-brown border-zen-brown'
                      : 'bg-transparent text-zen-brown/30 border-transparent hover:text-zen-brown/60 hover:bg-zen-cream/30'
                  }`}
                >
                  <tab.icon size={14} className={activeTab === tab.id ? 'text-zen-brown' : 'text-zen-brown/20'} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'bookings' && editingRoom ? (
              <motion.div
                key="bookings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zen-brown/5">
                  <div className="flex-1 max-w-sm">
                    <ZenDatePicker label="Schedule Registry Date" value={registryDate} onChange={setRegistryDate} />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zen-sand" />
                      <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-zen-brown/20 bg-white" />
                      <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Available</span>
                    </div>
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                  {loadingAppointments ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <div className="w-10 h-10 border-2 border-zen-sand border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[0.3em]">Synchronizing Registry...</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const hour = Math.floor(i / 2) + 9;
                        const min = (i % 2) * 30;
                        const slotTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                        const displayTime = dayjs().hour(hour).minute(min).format('hh:mm A');
                        
                        const slotStart = parseTime(slotTime, registryDate);
                        const slotEnd = slotStart?.add(30, 'minute');

                        const apt = roomAppointments.find(a => {
                          const aptDate = dayjs(a.date).format('YYYY-MM-DD');
                          if (aptDate !== registryDate) return false;
                          
                          const aptStart = parseTime(a.time, registryDate);
                          if (!aptStart) return false;

                          const svc = rawServices.find(s => s.name === a.service);
                          const duration = svc?.duration || 60;
                          const cleaning = editingRoom?.cleaningDuration || 0;
                          const aptEnd = aptStart.add(duration + cleaning, 'minute');

                          // Return true if the current 30-min slot overlaps with the appointment range
                          return slotStart && slotStart.isBefore(aptEnd) && slotEnd?.isAfter(aptStart);
                        });

                        const isPrimarySlot = apt && parseTime(apt.time, registryDate)?.format('HH:mm') === slotTime;

                        return (
                          <div key={slotTime} className={`flex items-center gap-6 p-5 rounded-3xl border transition-all duration-500 ${apt ? 'bg-zen-sand/[0.03] border-zen-sand/20' : 'bg-white border-zen-brown/5'}`}>
                            <div className={`w-24 shrink-0 text-center py-2.5 rounded-2xl border ${apt ? 'bg-zen-sand text-white border-zen-sand' : 'bg-gray-50 border-black/5 text-zen-brown/40'}`}>
                              <p className="text-[11px] font-black tracking-tight">{displayTime}</p>
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                              {apt ? (
                                isPrimarySlot ? (
                                  <div 
                                    className="flex items-center gap-5 cursor-pointer hover:opacity-80 transition-opacity group/booking"
                                    onClick={() => navigate('/appointments')}
                                  >
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-zen-sand/10 flex items-center justify-center text-zen-sand shadow-sm group-hover/booking:scale-110 transition-transform"><UserCheck size={20} /></div>
                                    <div>
                                      <h4 className="text-lg font-serif font-bold text-zen-brown leading-tight group-hover/booking:underline decoration-zen-sand/30 underline-offset-4">{apt.client || apt.clientName || 'Guest'}</h4>
                                      <p className="text-[10px] font-bold text-zen-sand uppercase tracking-widest mt-1">{apt.service || 'Service'}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-5 opacity-50">
                                    <div className="w-12 h-12 rounded-2xl bg-zen-sand/10 flex items-center justify-center text-zen-sand border border-zen-sand/20"><Sparkles size={20} /></div>
                                    <div>
                                      <p className="text-sm font-serif font-medium text-zen-brown italic">Cleaning & Buffer</p>
                                      <p className="text-[9px] font-bold text-zen-sand/60 uppercase tracking-widest mt-0.5">Following {apt.client || 'Ritual'}</p>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-5 opacity-30">
                                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-zen-brown/20 border border-black/5"><DoorOpen size={20} /></div>
                                  <div><p className="text-base font-serif font-medium text-zen-brown italic">Available</p></div>
                                </div>
                              )}
                              {apt && isPrimarySlot && <ZenBadge variant="sand" className="hidden lg:block">{apt.status}</ZenBadge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <form id="roomForm" onSubmit={handleSubmit} className="space-y-12 pb-10">
                  <div className="flex items-center gap-8 sm:gap-12">
                    <div className="relative w-24 sm:w-40 h-24 sm:h-40 group cursor-pointer shrink-0">
                      <div className="w-full h-full zen-pointed-surface ring-4 ring-zen-sand/20 ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-xl relative">
                        {(roomImageFile || previewRoomImage) ? (
                          <img 
                            src={roomImageFile ? URL.createObjectURL(roomImageFile) : previewRoomImage?.src} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            style={roomImageFile ? undefined : { objectPosition: previewRoomImage?.objectPosition }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-4xl sm:text-6xl uppercase tracking-tighter profile-pic-placeholder">
                            {formData.name.charAt(0) || <DoorOpen size={48} strokeWidth={0.5} />}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={32} /></div>
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setRoomImageFile(e.target.files?.[0] || null)} />
                      <div className="absolute bottom-1 right-1 p-3 bg-zen-brown text-white rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all ring-4 ring-white"><Edit2 size={16} /></div>
                    </div>
                    <div className="flex-1">
                      <ZenInput label="Room Name" placeholder="E.g. Sapphire Suite" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-5xl border-none p-0 h-auto font-bold tracking-tighter" />
                      <p className="mt-4 text-[11px] font-bold text-zen-brown/20 uppercase tracking-[0.5em]">Core identity</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-10 sm:gap-y-14">
                    <ZenDropdown label="Room Category" options={['None', ...roomCategories]} value={formData.type} onChange={(val: any) => setFormData({...formData, type: val})} />
                    <ZenDropdown label="Assigned Branch" options={['None', ...(branches || []).map(b => b.name)]} value={(branches || []).find(b => b._id === formData.branch)?.name || 'None'} onChange={(val) => {
                      const branch = (branches || []).find(b => b.name === val);
                      setFormData({...formData, branch: branch ? branch._id : ''});
                    }} />
                    <ZenDropdown label="Operational State" options={['Free', 'Occupied', 'Cleaning']} value={formData.status} onChange={(val: any) => setFormData({...formData, status: val})} />
                    <ZenDropdown label="Availability" options={['Active', 'Inactive']} value={formData.isActive ? 'Active' : 'Inactive'} onChange={(val: any) => setFormData({...formData, isActive: val === 'Active'})} />
                    <ZenInput label="Cleaning Duration (Minutes)" type="number" value={formData.cleaningDuration} onChange={(e: any) => setFormData({...formData, cleaningDuration: parseInt(e.target.value) || 0})} />
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
