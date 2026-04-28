import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Edit2, Trash2, Camera, X, 
  Sparkles, Building2, Zap, DoorOpen, Clock, Grid, List, Search,
  Calendar, History, User, UserCheck, ShieldCheck, CheckCircle2, AlertCircle, MapPin
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
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenDatePicker } from '../../components/zen/ZenInputs';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';
import { resolveRoomImageMeta } from '../../utils/roomImage';
import { getAssetBaseUrl } from '../../utils/imageUrl';
import { getCachedJson, setCachedJson } from '../../utils/localCache';

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
  branch?: Branch | string;
  image?: string;
  isActive: boolean;
  cleaningDuration?: number;
  createdAt?: string;
  updatedAt?: string;
}

const getRoomBranchId = (room: Room) => {
  if (!room.branch) return '';
  return typeof room.branch === 'string' ? room.branch : room.branch._id || '';
};

const getRoomBranchName = (room: Room) => {
  if (!room.branch) return 'Main Branch';
  return typeof room.branch === 'string' ? room.branch : room.branch.name || 'Main Branch';
};

const formatExportDate = (value?: string) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
};

const Rooms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
  const { getRoomCategories } = useCategories();
  const roomCategories = getRoomCategories();
  const [rooms, setRooms] = useState<Room[]>(() => getCachedJson('zen_page_rooms_list', []));
  const [loading, setLoading] = useState(() => getCachedJson<Room[]>('zen_page_rooms_list', []).length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_rooms_view') as 'grid' | 'table') || 'grid';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [roomAppointments, setRoomAppointments] = useState<any[]>(() => getCachedJson('zen_page_room_appointments', []));
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [registryDate, setRegistryDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [rawServices, setRawServices] = useState<any[]>(() => getCachedJson('zen_page_room_services', []));

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
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranch, debouncedSearch]);

  useEffect(() => {
    fetchRooms();
  }, [selectedBranch, page, debouncedSearch, user?.token]);

  useEffect(() => setCachedJson('zen_page_rooms_list', rooms), [rooms]);
  useEffect(() => setCachedJson('zen_page_room_appointments', roomAppointments), [roomAppointments]);
  useEffect(() => setCachedJson('zen_page_room_services', rawServices), [rawServices]);

  const fetchRooms = async () => {
    try {
      if (rooms.length === 0) setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
        search: debouncedSearch,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });

      const response = await fetch(`${API_URL}/rooms?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
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
        branch: getRoomBranchId(room),
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
    setImagePreview(null);
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

  const fetchAllRoomsForExport = async (): Promise<Room[]> => {
    const allRooms: Room[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const queryParams = new URLSearchParams({
        page: exportPage.toString(),
        limit: exportLimit.toString(),
        search: debouncedSearch,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });

      const response = await fetch(`${API_URL}/rooms?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch rooms for export');
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      allRooms.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const unique = new Map<string, Room>();
    allRooms.forEach((room) => {
      if (room?._id) {
        unique.set(room._id, room);
      }
    });

    return Array.from(unique.values());
  };

  const roomExportColumns = useMemo<ExportColumn<Room>[]>(
    () => [
      { header: 'Room Name', accessor: (room) => room.name },
      { header: 'Room Category', accessor: (room) => room.type || 'None' },
      { header: 'Branch', accessor: (room) => getRoomBranchName(room) },
      { header: 'Operational State', accessor: (room) => room.status || 'Free' },
      { header: 'Availability', accessor: (room) => (room.isActive ? 'Active' : 'Inactive') },
      { header: 'Cleaning Duration (Min)', accessor: (room) => room.cleaningDuration ?? 0 },
      { header: 'Timer', accessor: (room) => room.timer || '00:00' },
      { header: 'Image', accessor: (room) => room.image || '-' },
      { header: 'Created At', accessor: (room) => formatExportDate(room.createdAt) },
      { header: 'Updated At', accessor: (room) => formatExportDate(room.updatedAt) }
    ],
    []
  );

  const filteredRooms = rooms;


  const roomImageBaseUrl = getAssetBaseUrl();
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
      searchActions={
        <ExportPopup<Room>
          data={filteredRooms}
          columns={roomExportColumns}
          fileName="rooms"
          title="Rooms"
          triggerLabel="Download"
          description="Choose format and export the complete rooms list with branch, status, cleaning, and image details."
          resolveData={fetchAllRoomsForExport}
        />
      }
      addButtonLabel="Add Room"
      onAddClick={() => handleOpenModal()}
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Rooms', value: rooms.length, icon: Building2, color: 'text-yellow-600', bg: 'bg-yellow-600/10', glow: 'bg-yellow-600/20', trend: 'Global capacity' },
            { label: 'Active Spaces', value: rooms.filter(r => r.isActive).length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Operational now' },
            { label: 'System Inactive', value: rooms.filter(r => !r.isActive).length, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Decommissioned' },
            { label: 'Space Categories', value: roomCategories.length, icon: DoorOpen, color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', trend: 'Variety types' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.05} />
          ))}
        </div>
      }
    >
      <div className="space-y-10 pb-20">


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
                          {getRoomBranchName(room)}
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
            <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700">
              <table className="w-full text-center border-collapse min-w-[680px] sm:min-w-[800px]">
                <thead>
                  <tr>
                    <th>S No</th>
                    <th>Visual</th>
                    <th>Branch</th>
                    <th>Room Name</th>
                    <th>Category</th>
                    <th>Cleaning</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                          <td className="py-4 text-[11px] font-bold text-zen-brown/60">{getRoomBranchName(room)}</td>
                          <td className="py-4">
                            <div className="flex flex-col items-center justify-center leading-none">
                              <span className="text-sm font-bold text-zen-brown">{room.name}</span>
                              <span className="text-[9px] font-medium text-zen-brown/30 uppercase tracking-widest mt-1">Active Space</span>
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-4xl"
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
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <p className="text-[10px] text-zen-brown/30 italic uppercase tracking-widest font-black">
               {editingRoom ? 'Live synchronization active' : 'Ready for commission'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
               <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[10px]">Cancel</ZenButton>
               {activeTab === 'profile' && (
                 <ZenButton onClick={() => (document.getElementById('roomForm') as HTMLFormElement)?.requestSubmit()} className="px-8 py-2.5 text-[10px]">
                    <span>{editingRoom ? 'Update Protocol' : 'Commission Room'}</span>
                    <Sparkles size={14} className="ml-2" />
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
                    <div className="grid gap-3">
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

                          return slotStart && slotStart.isBefore(aptEnd) && slotEnd?.isAfter(aptStart);
                        });

                        const isPrimarySlot = apt && parseTime(apt.time, registryDate)?.format('HH:mm') === slotTime;

                        return (
                          <div key={slotTime} className={`flex items-center gap-5 p-3 rounded-2xl border transition-all duration-700 ${apt ? 'bg-zen-sand/[0.02] border-zen-sand/15 shadow-sm' : 'bg-white border-zen-brown/5 hover:border-zen-gold/20'}`}>
                            <div className={`w-20 shrink-0 text-center py-2 rounded-xl border transition-all ${apt ? 'bg-zen-sand text-white border-zen-sand shadow-lg shadow-zen-sand/20' : 'bg-zen-cream/40 border-zen-brown/5 text-zen-brown/30'}`}>
                              <p className="text-[10px] font-black tracking-tight font-serif">{displayTime}</p>
                            </div>
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              {apt ? (
                                isPrimarySlot ? (
                                  <div 
                                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity group/booking min-w-0"
                                    onClick={() => navigate('/appointments')}
                                  >
                                    <div className="w-10 h-10 rounded-xl bg-white border border-zen-sand/20 flex items-center justify-center text-zen-sand shadow-sm group-hover/booking:scale-110 transition-transform flex-shrink-0"><UserCheck size={16} /></div>
                                    <div className="flex flex-row items-center gap-2 min-w-0">
                                      <h4 className="text-base font-serif font-bold text-zen-brown leading-tight truncate group-hover/booking:text-zen-sand transition-colors">{apt.client || apt.clientName || 'Guest'}</h4>
                                      <span className="text-zen-brown/20">|</span>
                                      <p className="text-[9px] font-bold text-zen-sand/60 uppercase tracking-[0.2em] truncate">{apt.service || 'Service'}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-4 opacity-40 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-zen-sand/10 flex items-center justify-center text-zen-sand border border-zen-sand/20 flex-shrink-0"><Sparkles size={16} /></div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-serif font-medium text-zen-brown italic truncate tracking-tight">Cleaning Cycle</p>
                                      <p className="text-[8px] font-bold text-zen-sand/40 uppercase tracking-widest mt-0.5 truncate">Post-Ritual Buffer</p>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-4 opacity-20 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-zen-cream/30 flex items-center justify-center text-zen-brown/40 border border-zen-brown/5 flex-shrink-0"><DoorOpen size={16} strokeWidth={1.5} /></div>
                                  <div><p className="text-sm font-serif font-medium text-zen-brown italic tracking-tight">Available</p></div>
                                </div>
                              )}
                              {apt && isPrimarySlot && (
                                <div className="hidden lg:flex items-center gap-2 pl-4">
                                  <div className="w-1.5 h-1.5 rounded-full bg-zen-sand animate-pulse" />
                                  <span className="text-[8px] font-black uppercase tracking-widest text-zen-sand/60">{apt.status}</span>
                                </div>
                              )}
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
                        {(imagePreview || previewRoomImage) ? (
                          <img 
                            src={imagePreview || previewRoomImage?.src} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            style={imagePreview ? undefined : { objectPosition: previewRoomImage?.objectPosition }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-4xl sm:text-6xl uppercase tracking-tighter profile-pic-placeholder">
                            {formData.name.charAt(0) || <DoorOpen size={48} strokeWidth={0.5} />}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={32} /></div>
                      </div>
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setRoomImageFile(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setImagePreview(null);
                          }
                        }} 
                      />
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
