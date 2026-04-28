import React, { useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  Users,
  Crown,
  Clock,
  Hash,
  CreditCard,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  History,
  FileText,
  Upload,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../components/shared/ZenNotification';

// Zen Components
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenButton, ZenIconButton, ZenBadge } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenInput, ZenDropdown, ZenTextarea, ZenDatePicker, ZenAutocomplete } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { useBranches } from '../../context/BranchContext';
import { getImageUrl } from '../../utils/imageUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const getEntityId = (value: any) => {
   if (!value) return '';
   if (typeof value === 'string') return value;
   if (typeof value === 'object' && value._id) return String(value._id);
   return String(value);
};

const formatDate = (value: any) => value ? dayjs(value).format('DD MMM YYYY') : '-';
const formatDateTime = (value: any) => value ? dayjs(value).format('DD MMM YYYY, hh:mm A') : '-';
const money = (value: any) => Number(value || 0).toLocaleString();
const Memberships = () => {
    const { user } = useAuth();
    const { selectedBranch } = useBranches();
    const [memberships, setMemberships] = useState<any[]>(() => getCachedJson('zen_page_memberships_list', []));
    const [plans, setPlans] = useState<any[]>(() => getCachedJson('zen_page_memberships_plans', []));
    const [services, setServices] = useState<any[]>(() => getCachedJson('zen_page_memberships_services', []));
    const [branches, setBranches] = useState<any[]>(() => getCachedJson('zen_page_memberships_branches', []));
    const [clients, setClients] = useState<any[]>(() => getCachedJson('zen_page_memberships_clients', []));
    const [stats, setStats] = useState<any>(() => getCachedJson('zen_page_memberships_stats', null));
    const [isLoading, setIsLoading] = useState(() => getCachedJson<any[]>('zen_page_memberships_list', []).length === 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'registry' | 'plans'>('registry');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        return (localStorage.getItem('zen_membership_view') as 'grid' | 'table') || 'table';
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<any>(null);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);

    // Confirm Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'danger'
    });

    // Form States
    const [planFormData, setPlanFormData] = useState({
       name: '',
       price: 0,
       durationDays: 30,
       maxSessions: 0,
       applicableServices: [] as string[],
       description: '',
       branches: [] as string[],
       isActive: true,
       isUnlimited: false,
       benefits: '',
       icon: 'Sparkles',
       isPopular: false
    });

    const [planDocumentFile, setPlanDocumentFile] = useState<File | null>(null);
    const [removePlanDocument, setRemovePlanDocument] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
       if (!planDocumentFile) {
          setPreviewUrl(null);
          return;
       }
       if (planDocumentFile.type.startsWith('image/')) {
          const url = URL.createObjectURL(planDocumentFile);
          setPreviewUrl(url);
          return () => URL.revokeObjectURL(url);
       }
    }, [planDocumentFile]);

    const [enrollData, setEnrollData] = useState({
       clientId: '',
       planId: '',
       branchId: '',
       startDate: new Date().toISOString().split('T')[0],
       status: 'Active'
    });

    const [redeemData, setRedeemData] = useState({
       membershipId: '',
       serviceId: '',
       notes: ''
    });

    const [activeMembershipForRedeem, setActiveMembershipForRedeem] = useState<any>(null);

    const resetEnrollmentForm = () => {
       setEditingEnrollmentId(null);
       setEnrollData({
          clientId: '',
          planId: '',
          branchId: '',
          startDate: new Date().toISOString().split('T')[0],
          status: 'Active'
       });
    };

    const openCreateEnrollment = () => {
       resetEnrollmentForm();
       setIsEnrollModalOpen(true);
    };

     const openEditEnrollment = (membership: any) => {
        setEditingEnrollmentId(membership._id);
        setEnrollData({
          clientId: membership.client?._id || '',
          planId: membership.plan?._id || '',
          branchId: membership.branch?._id || '',
          startDate: new Date(membership.startDate).toISOString().split('T')[0],
          status: membership.status
       });
       setIsEnrollModalOpen(true);
    };

    const closeEnrollmentModal = () => {
       setIsEnrollModalOpen(false);
       resetEnrollmentForm();
    };

    const editingEnrollment = useMemo(
       () => memberships.find((membership) => membership._id === editingEnrollmentId),
       [memberships, editingEnrollmentId]
    );



    useEffect(() => {
       localStorage.setItem('zen_membership_view', viewMode);
       setPage(1);
    }, [viewMode]);

    useEffect(() => {
       setPage(1);
    }, [selectedBranch]);

    const PAGE_LIMIT = 12;

    const membershipQueryString = (targetPage: number, targetLimit: number) => {
       const params = new URLSearchParams({
          page: targetPage.toString(),
          limit: targetLimit.toString()
       });

       if (selectedBranch !== 'all') {
          params.set('branch', selectedBranch);
       }

       return params.toString();
    };

    const statsQueryString = () => {
       const params = new URLSearchParams();
       if (selectedBranch !== 'all') {
          params.set('branch', selectedBranch);
       }
       return params.toString();
    };

    const fetchData = async (silent: boolean = false) => {
       if (!silent && memberships.length === 0) setIsLoading(true);
       try {
          const headers = { 'Authorization': `Bearer ${user?.token}` };

          // Define a safe fetch wrapper
          const safeFetch = async (url: string, defaultValue: any) => {
             try {
                const res = await fetch(url, { headers });
                if (!res.ok) {
                   const errorData = await res.json().catch(() => ({}));
                   console.error(`API Error (${url}):`, errorData.message || res.statusText);
                   return defaultValue;
                }
                const data = await res.json();
                return data;
             } catch (err) {
                console.error(`Fetch error (${url}):`, err);
                return defaultValue;
             }
          };

          const [
             plansData,
             membershipsData,
             servicesData,
             branchesData,
             clientsData,
             statsData
          ] = await Promise.all([
             safeFetch(`${API_URL}/memberships/plans`, []),
             safeFetch(`${API_URL}/memberships/client/all?${membershipQueryString(page, PAGE_LIMIT)}`, { data: [], pagination: { pages: 1 } }),
             safeFetch(`${API_URL}/services`, []),
             safeFetch(`${API_URL}/branches`, []),
             safeFetch(`${API_URL}/clients?lightweight=true`, []),
             safeFetch(`${API_URL}/memberships/stats${statsQueryString() ? `?${statsQueryString()}` : ''}`, null)
          ]);

          setPlans(Array.isArray(plansData) ? plansData : (plansData?.data || []));

          const mList = Array.isArray(membershipsData) ? membershipsData : (membershipsData?.data || []);
          setMemberships(mList);
          setTotalPages(membershipsData?.pagination?.pages || 1);

          setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.data || []));
          setBranches(Array.isArray(branchesData) ? branchesData : (branchesData?.data ?? branchesData?.branches ?? []));
          setClients(Array.isArray(clientsData) ? clientsData : (clientsData?.data || []));

          if (statsData) {
             setStats(statsData?.data || statsData);
          }
       } catch (error) {
          console.error('Core fetch failure:', error);
          if (!silent) notify('error', 'Sync Failure', 'Failed to retrieve membership records. Please check your connection.');
       } finally {
          if (!silent) setIsLoading(false);
       }
    };

    useEffect(() => {
        localStorage.setItem('zen_membership_view', viewMode);
    }, [viewMode]);

    useEffect(() => {
       fetchData();

       const interval = setInterval(() => {
         if (!shouldPollNow()) return;
          fetchData(true);
       }, getPollIntervalMs(30000)); // default 30s

       return () => clearInterval(interval);
    }, [page, selectedBranch, user?.token]);

    useEffect(() => setCachedJson('zen_page_memberships_list', memberships), [memberships]);
    useEffect(() => setCachedJson('zen_page_memberships_plans', plans), [plans]);
    useEffect(() => setCachedJson('zen_page_memberships_services', services), [services]);
    useEffect(() => setCachedJson('zen_page_memberships_branches', branches), [branches]);
    useEffect(() => setCachedJson('zen_page_memberships_clients', clients), [clients]);
    useEffect(() => setCachedJson('zen_page_memberships_stats', stats), [stats]);

    const handleCreatePlan = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
          const formData = new FormData();

          // Prepare benefits array
          const benefitsArr = typeof planFormData.benefits === 'string'
            ? (planFormData.benefits as string).split('\n').filter(b => b.trim())
            : planFormData.benefits;

          Object.entries(planFormData).forEach(([key, value]) => {
             if (key === 'benefits') {
                formData.append(key, JSON.stringify(benefitsArr));
             } else if (['applicableServices', 'branches'].includes(key)) {
                formData.append(key, JSON.stringify(value));
             } else if (key === 'durationDays') {
                formData.append(key, String(planFormData.isUnlimited ? 36500 : value));
             } else {
                formData.append(key, String(value));
             }
          });

          if (planDocumentFile) formData.append('document', planDocumentFile);
          if (removePlanDocument) formData.append('removeDocument', 'true');

          const url = editingPlan
             ? `${API_URL}/memberships/plans/${editingPlan._id}`
             : `${API_URL}/memberships/plans`;
          const method = editingPlan ? 'PUT' : 'POST';

          const response = await fetch(url, {
             method,
             headers: {
                'Authorization': `Bearer ${user?.token}`
             },
             body: formData
          });

          if (response.ok) {
             setIsPlanModalOpen(false);
             setEditingPlan(null);
             fetchData();
             notify('success', 'Plan Saved', 'Membership plan successfully synchronized');
          }
       } catch (error) {
          console.error('Error saving plan:', error);
          notify('error', 'Creation Error', 'Failed to create new tier');
       }
    };

    const handleEnroll = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
          const url = editingEnrollmentId
             ? `${API_URL}/memberships/${editingEnrollmentId}`
             : `${API_URL}/memberships/enroll`;

          const method = editingEnrollmentId ? 'PUT' : 'POST';
          const response = await fetch(url, {
             method,
             headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
             },
             body: JSON.stringify(enrollData)
          });

          if (response.ok) {
             closeEnrollmentModal();
             fetchData();
             notify('success', editingEnrollmentId ? 'Enrollment Updated' : 'Enrollment Complete', 'Membership records updated successfully');
          }
       } catch (error) {
          console.error('Error enrolling client:', error);
          notify('error', 'Enrollment Failed', 'Failed to initiate membership');
       }
    };

    const handleRedeemClick = (membership: any) => {
       setActiveMembershipForRedeem(membership);
       setRedeemData({
          membershipId: membership._id,
          serviceId: '',
          notes: ''
       });
       setIsRedeemModalOpen(true);
    };

    const handleRedeem = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
          const response = await fetch(`${API_URL}/memberships/${redeemData.membershipId}/redeem`, {
             method: 'POST',
             headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
             },
             body: JSON.stringify(redeemData)
          });

          if (response.ok) {
             setIsRedeemModalOpen(false);
             fetchData();
             notify('success', 'Details Redeemed', 'Service session recorded successfully');
          }
       } catch (error) {
          console.error('Error redeeming session:', error);
          notify('error', 'Redemption Error', 'Failed to record service usage');
       }
    };

    const deleteMembershipConfirmed = async (id: string) => {
       try {
          const response = await fetch(`${API_URL}/memberships/${id}`, {
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
             fetchData();
             notify('success', 'Registry Cleaned', 'Membership record removed');
          } else {
             throw new Error('Failed to delete');
          }
       } catch (error) {
          console.error('Error deleting membership:', error);
          notify('error', 'Deletion Failed', 'Failed to remove membership');
       }
    };

    const deletePlanConfirmed = async (id: string) => {
       try {
          const response = await fetch(`${API_URL}/memberships/plans/${id}`, {
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
             fetchData();
             notify('success', 'Plan Disabled', 'Membership plan has been disabled');
          } else {
             throw new Error('Failed to delete plan');
          }
       } catch (error) {
          console.error('Error deleting plan:', error);
          notify('error', 'Retirement Failed', 'Failed to retire tier');
       }
    };

    const handleDeleteMembership = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Membership',
            message: 'Are you sure you want to remove this client from the membership registry? This action cannot be undone.',
            onConfirm: () => deleteMembershipConfirmed(id),
            type: 'danger'
        });
    };

    const handleDeletePlan = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Retire Tier',
            message: 'Are you sure you want to deactivate this membership plan? Existing members will retain their benefits, but no new enrollments will be possible.',
            onConfirm: () => deletePlanConfirmed(id),
            type: 'warning'
        });
    };

    const getStatusColor = (status: string) => {
       switch (status) {
          case 'Active': return 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20 shadow-[0_0_15px_rgba(74,103,32,0.1)]';
          case 'Expired': return 'bg-zen-brown/10 text-zen-brown/40 border-zen-brown/25';
          default: return 'bg-gray-100 text-gray-400 border-gray-200';
       }
    };

    const toggleService = (serviceId: string) => {
       const current = [...planFormData.applicableServices];
       const index = current.indexOf(serviceId);
       if (index > -1) {
          setPlanFormData({ ...planFormData, applicableServices: current.filter(id => id !== serviceId) });
       } else {
          setPlanFormData({ ...planFormData, applicableServices: [...current, serviceId] });
       }
    };

    const getBranchName = (branch: any) => {
       if (!branch) return 'Main Branch';
       if (typeof branch === 'object') return branch.name || getBranchName(branch._id);
       return branches.find((b: any) => b._id === branch)?.name || 'Main Branch';
    };

    const getServiceName = (service: any) => {
       if (!service) return '';
       if (typeof service === 'object') return service.name || '';
       return services.find((s: any) => s._id === service)?.name || String(service);
    };

    const getServiceNames = (serviceList: any[] = []) => {
       const names = serviceList
          .map((service) => getServiceName(service))
          .filter(Boolean);
       return names.length > 0 ? names.join(', ') : 'All services';
    };

    const getBranchNames = (branchList: any[] = []) => {
       const names = branchList
          .map((branch) => getBranchName(branch))
          .filter(Boolean);
       return names.length > 0 ? names.join(', ') : 'All branches';
    };

    const getPlanBenefits = (plan: any) => {
       const benefits = Array.isArray(plan?.benefits)
          ? plan.benefits
          : String(plan?.benefits || '').split('\n');
       const cleaned = benefits.map((benefit: string) => benefit.trim()).filter(Boolean);
       return cleaned.length > 0 ? cleaned.join(', ') : '-';
    };

    const getUsedSessions = (membership: any) =>
       Math.max(0, Number(membership.totalSessions || 0) - Number(membership.remainingSessions || 0));

    const getUsagePercent = (membership: any) => {
       const total = Number(membership.totalSessions || 0);
       if (total <= 0) return '0%';
       return `${Math.round((getUsedSessions(membership) / total) * 100)}%`;
    };

    const getUsageHistorySummary = (membership: any) => {
       const usageHistory = Array.isArray(membership.usageHistory) ? membership.usageHistory : [];
       if (usageHistory.length === 0) return '-';

       return usageHistory
          .map((usage: any, index: number) => {
             const serviceName = getServiceName(usage.service) || 'Service';
             const branchName = getBranchName(usage.branch || membership.branch);
             const notes = usage.notes ? `, Notes: ${usage.notes}` : '';
             return `${index + 1}. ${formatDateTime(usage.usedAt)} - ${serviceName} - ${branchName}${notes}`;
          })
          .join(' | ');
    };

    const matchesSearch = (values: any[]) => {
       const query = searchTerm.trim().toLowerCase();
       if (!query) return true;
       return values.some((value) => String(value || '').toLowerCase().includes(query));
    };

    const planMatchesBranch = (plan: any) => {
       if (selectedBranch === 'all') return true;
       const planBranches = Array.isArray(plan.branches) ? plan.branches : [];
       if (planBranches.length === 0) return true;
       return planBranches.some((branch: any) => getEntityId(branch) === selectedBranch);
    };

    const membershipMatchesBranch = (membership: any) =>
       selectedBranch === 'all' || getEntityId(membership.branch) === selectedBranch;

    const filteredMemberships = useMemo(() => memberships.filter((membership) =>
       membershipMatchesBranch(membership) &&
       matchesSearch([
          membership.client?.name,
          membership.client?.phone,
          membership.client?.email,
          membership.plan?.name,
          membership.branch?.name,
          membership.status,
          membership.paymentStatus
       ])
    ), [memberships, searchTerm]);

    const filteredPlans = useMemo(() => plans.filter((plan) =>
       planMatchesBranch(plan) &&
       matchesSearch([
          plan.name,
          plan.description,
          plan.price,
          plan.maxSessions,
          getServiceNames(plan.applicableServices),
          getBranchNames(plan.branches),
          getPlanBenefits(plan)
       ])
    ), [plans, branches, services, selectedBranch, searchTerm]);

    const fetchAllMembershipsForExport = async () => {
       const allMemberships: any[] = [];
       const exportLimit = 200;
       let exportPage = 1;
       let exportTotalPages = 1;

       do {
          const response = await fetch(`${API_URL}/memberships/client/all?${membershipQueryString(exportPage, exportLimit)}`, {
             headers: {
                'Authorization': `Bearer ${user?.token}`,
                'Accept': 'application/json'
             }
          });

          if (!response.ok) {
             throw new Error('Unable to fetch membership export list');
          }

          const payload = await response.json();
          const pageRows = Array.isArray(payload?.data)
             ? payload.data
             : Array.isArray(payload)
               ? payload
               : [];

          allMemberships.push(...pageRows);
          exportTotalPages = Number(payload?.pagination?.pages || 1);
          exportPage += 1;
       } while (exportPage <= exportTotalPages);

       return allMemberships.filter((membership) =>
          membershipMatchesBranch(membership) &&
          matchesSearch([
             membership.client?.name,
             membership.client?.phone,
             membership.client?.email,
             membership.plan?.name,
             membership.branch?.name,
             membership.status,
             membership.paymentStatus
          ])
       );
    };

    const fetchAllPlansForExport = async () => {
       const allPlans: any[] = [];
       const exportLimit = 200;
       let exportPage = 1;
       let exportTotalPages = 1;

       do {
          const response = await fetch(`${API_URL}/memberships/plans?page=${exportPage}&limit=${exportLimit}`, {
             headers: {
                'Authorization': `Bearer ${user?.token}`,
                'Accept': 'application/json'
             }
          });

          if (!response.ok) {
             throw new Error('Unable to fetch membership plans for export');
          }

          const payload = await response.json();
          const pageRows = Array.isArray(payload?.data)
             ? payload.data
             : Array.isArray(payload)
               ? payload
               : [];

          allPlans.push(...pageRows);
          exportTotalPages = Number(payload?.pagination?.pages || 1);
          exportPage += 1;
       } while (exportPage <= exportTotalPages);

       return allPlans.filter((plan) =>
          planMatchesBranch(plan) &&
          matchesSearch([
             plan.name,
             plan.description,
             plan.price,
             plan.maxSessions,
             getServiceNames(plan.applicableServices),
             getBranchNames(plan.branches),
             getPlanBenefits(plan)
          ])
       );
    };

    const membershipExportColumns = useMemo<ExportColumn<any>[]>(
       () => [
          { header: 'Client Name', accessor: (membership) => membership.client?.name || '-' },
          { header: 'Client Phone', accessor: (membership) => membership.client?.phone || '-' },
          { header: 'Client Email', accessor: (membership) => membership.client?.email || '-' },
          { header: 'Branch', accessor: (membership) => getBranchName(membership.branch) },
          { header: 'Plan', accessor: (membership) => membership.plan?.name || '-' },
          { header: 'Plan Price (QR)', accessor: (membership) => money(membership.plan?.price) },
          { header: 'Status', accessor: (membership) => membership.status || '-' },
          { header: 'Payment Status', accessor: (membership) => membership.paymentStatus || '-' },

          { header: 'Total Paid (QR)', accessor: (membership) => money(membership.totalPaid) },
          { header: 'Start Date', accessor: (membership) => formatDate(membership.startDate) },
          { header: 'End Date', accessor: (membership) => formatDate(membership.endDate) },
          { header: 'Duration Days', accessor: (membership) => membership.plan?.durationDays ?? '-' },
          { header: 'Total Sessions', accessor: (membership) => membership.totalSessions ?? 0 },
          { header: 'Used Sessions', accessor: (membership) => getUsedSessions(membership) },
          { header: 'Remaining Sessions', accessor: (membership) => membership.remainingSessions ?? 0 },
          { header: 'Usage Percent', accessor: (membership) => getUsagePercent(membership) },
          { header: 'Included Services', accessor: (membership) => getServiceNames(membership.plan?.applicableServices || []) },
          { header: 'Plan Benefits', accessor: (membership) => getPlanBenefits(membership.plan) },
          { header: 'Usage Count', accessor: (membership) => membership.usageHistory?.length || 0 },
          { header: 'Usage History', accessor: (membership) => getUsageHistorySummary(membership) },
          { header: 'Created On', accessor: (membership) => formatDateTime(membership.createdAt) },
          { header: 'Updated On', accessor: (membership) => formatDateTime(membership.updatedAt) }
       ],
       [branches, services]
    );

    const planExportColumns = useMemo<ExportColumn<any>[]>(
       () => [
          { header: 'Plan Name', accessor: (plan) => plan.name || '-' },
          { header: 'Price (QR)', accessor: (plan) => money(plan.price) },
          { header: 'Duration Days', accessor: (plan) => plan.durationDays >= 36500 ? 'Unlimited' : plan.durationDays },
          { header: 'Max Sessions', accessor: (plan) => plan.maxSessions ?? 0 },
          { header: 'Status', accessor: (plan) => plan.isActive ? 'Active' : 'Retired' },
          { header: 'Popular', accessor: (plan) => plan.isPopular ? 'Yes' : 'No' },
          { header: 'Applicable Services', accessor: (plan) => getServiceNames(plan.applicableServices || []) },
          { header: 'Branch Coverage', accessor: (plan) => getBranchNames(plan.branches || []) },
          { header: 'Benefits', accessor: (plan) => getPlanBenefits(plan) },
          { header: 'Description', accessor: (plan) => plan.description || '-' },
          { header: 'Created On', accessor: (plan) => formatDateTime(plan.createdAt) },
          { header: 'Updated On', accessor: (plan) => formatDateTime(plan.updatedAt) }
       ],
       [branches, services]
    );

    const activeExportData = activeTab === 'registry' ? filteredMemberships : filteredPlans;
    const activeExportColumns = activeTab === 'registry' ? membershipExportColumns : planExportColumns;
    const activeExportTitle = activeTab === 'registry' ? 'Memberships' : 'Membership Plans';
    const activeExportFileName = activeTab === 'registry' ? 'memberships' : 'membership_plans';
    const activeExportResolver = activeTab === 'registry' ? fetchAllMembershipsForExport : fetchAllPlansForExport;

    return (
    <ZenPageLayout
title="Membership Management"
      addButtonLabel={user?.role === 'Client' ? "" : "New Enrollment"}
      addButtonIcon={user?.role === 'Client' ? null : <Crown size={18} />}
      onAddClick={user?.role === 'Client' ? () => {} : openCreateEnrollment}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      searchActions={
        <ExportPopup<any>
          data={activeExportData}
          columns={activeExportColumns}
          fileName={activeExportFileName}
          title={activeExportTitle}
          triggerLabel="Download"
          description={
            activeTab === 'registry'
              ? 'Export every matching membership with client, plan, payment, cycle, session, and usage-history details.'
              : 'Export every matching membership plan with pricing, duration, services, benefits, and branch coverage.'
          }
          resolveData={activeExportResolver}
        />
      }
      topContent={
        <>
          {/* Tabs Header */}
          <div className="mb-8 bg-white/80 backdrop-blur-xl p-2.5 rounded-2xl border border-zen-brown/15 shadow-sm flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap px-2">
            {[
              { id: 'registry', label: user?.role === 'Client' ? 'My Memberships' : 'Memberships', icon: Users },
              ...(user?.role !== 'Client' ? [{ id: 'plans', label: 'Tier Management', icon: Crown }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-5 rounded-2xl flex items-center gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] relative transition-all duration-500 ${activeTab === tab.id ? 'bg-zen-brown text-white shadow-sm' : 'text-zen-brown/35 hover:text-zen-brown hover:bg-white'}`}
              >
                <tab.icon size={14} className="sm:w-4 sm:h-4" strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'registry' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pt-2 pb-8 px-1 sm:px-2">
              {[
                { label: 'Total Clients', value: (stats?.totalActive ?? memberships.length).toString(), icon: Users, trend: `${stats?.totalActive || 0} active currently`, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', delay: 0 },
                { label: 'Plan Engagement', value: stats?.activeTiers?.toString() || '0', icon: BarChart3, trend: 'In membership', color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', delay: 0.2 },
                { label: 'Available Sessions', value: stats?.totalSessionsRemaining?.toString() || '0', icon: Sparkles, trend: 'Unused credits', color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', delay: 0.4 },
                { label: 'Completed Memberships', value: stats?.totalExpired?.toString() || '0', icon: AlertCircle, trend: 'History', color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', delay: 0.6 }
              ].map((stat, i) => (
                <ZenStatCard key={i} {...stat} />
              ))}
            </div>
          )}
        </>
      }
    >

      <AnimatePresence mode="wait">
         <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
         >
            {activeTab === 'plans' && (
              <div className="space-y-8">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                    <div>
                       <h3 className="text-lg sm:text-xl font-serif font-bold text-zen-brown">Membership Plan Setup</h3>
                       <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Global Service Structure</p>
                    </div>
                    <ZenButton onClick={() => {
                      setEditingPlan(null);
                      setPlanFormData({
                        name: '',
                        price: 0,
                        durationDays: 30,
                        maxSessions: 0,
                        applicableServices: [],
                        description: '',
                        branches: [],
                        isActive: true,
                        isUnlimited: false,
                        benefits: '',
                        icon: 'Sparkles',
                        isPopular: false
                      });
                      setPlanDocumentFile(null);
                      setRemovePlanDocument(false);
                      setIsPlanModalOpen(true);
                    }} variant="secondary" type="button" className="w-full sm:w-auto">Define New Plan</ZenButton>
                 </div>

                 {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {filteredPlans.map((plan) => (
                        <div key={plan._id} className="group relative bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-zen-brown/15 transition-all duration-500 hover:shadow-xl hover:translate-y-[-4px] hover:z-10 h-full flex flex-col justify-between">
                           {/* Background Glow */}
                           <div className="absolute top-0 right-0 w-28 h-28 bg-zen-sand/5 rounded-bl-3xl rounded-tr-3xl overflow-hidden -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

                           <div className="absolute -bottom-4 -right-4 text-zen-sand opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 pointer-events-none">
                              <Crown size={150} />
                           </div>

                           <div className="relative z-10 flex flex-col h-full justify-between">
                              <div>
                                 <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-zen-sand/10 text-zen-sand flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-sm border border-zen-brown/10">
                                       <Crown size={28} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                       <ZenBadge variant={plan.isActive ? 'sand' : 'default'}>
                                          {plan.isActive ? 'Active' : 'Retired'}
                                       </ZenBadge>
                                       <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                                          {plan.document && (
                                             <ZenIconButton
                                               icon={FileText}
                                               variant="secondary"
                                               onClick={() => window.open(getImageUrl(plan.document), '_blank')}
                                             />
                                          )}
                                          <ZenIconButton icon={Edit3} onClick={() => {
                                             setEditingPlan(plan);
                                             setPlanFormData({
                                                ...plan as any,
                                                applicableServices: plan.applicableServices?.map((s: any) => typeof s === 'string' ? s : s._id) || [],
                                                isUnlimited: plan.durationDays >= 36500,
                                                benefits: Array.isArray(plan.benefits) ? plan.benefits.join('\n') : (plan.benefits || '')
                                             });
                                             setPlanDocumentFile(null);
                                             setRemovePlanDocument(false);
                                             setIsPlanModalOpen(true);
                                          }} />
                                          <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeletePlan(plan._id)} />
                                       </div>
                                    </div>
                                 </div>

                                 <h4 className="text-xl font-serif font-black text-zen-brown mb-2 group-hover:text-zen-sand transition-colors duration-500">{plan.name}</h4>
                                 <div className="flex items-baseline gap-2 mb-5">
                                    <span className="text-3xl font-black tracking-tighter text-zen-brown">QR {plan.price}</span>
                                    <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Renewal Rate</span>
                                 </div>

                                 {/* Applicable Services List */}
                                 <div className="mb-6">
                                    <p className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.3em] mb-3 px-1">Included Services</p>
                                    <div className="flex flex-wrap gap-1.5">
                                       {(plan.applicableServices || []).slice(0, 3).map((s: any) => (
                                          <span key={s._id} className="px-2 py-1 bg-zen-brown/5 rounded-lg text-[8px] text-zen-brown/60 font-bold border border-zen-brown/15 shadow-sm">
                                             {s.name}
                                          </span>
                                       ))}
                                       {(plan.applicableServices || []).length > 3 && (
                                          <span className="px-2 py-1 bg-zen-sand/10 rounded-lg text-[8px] text-zen-sand font-bold border border-zen-sand/10">
                                             +{(plan.applicableServices || []).length - 3} More
                                          </span>
                                       )}
                                       {(plan.applicableServices || []).length === 0 && (
                                          <span className="text-[8px] text-zen-brown/20 italic font-serif">Universal Service Coverage</span>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zen-brown/15 relative z-10">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Usage Limit</span>
                                    <span className="text-sm font-black text-zen-brown flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-zen-sand" />
                                       {plan.maxSessions} Sessions
                                    </span>
                                 </div>
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Validity Duration</span>
                                    <span className="text-sm font-black text-zen-brown flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-zen-leaf" />
                                       {plan.durationDays >= 36500 ? 'Permanent' : `${plan.durationDays} Days`}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  ) : (
                    <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden table-container animate-in fade-in slide-in-from-bottom-4 duration-700">
                       <div className="table-container">
                          <table className="w-full min-w-[760px] lg:min-w-[900px]">
                          <thead>
                             <tr>
                                <th>S NO</th>
                                <th>VISUAL</th>
                                <th>IDENTITY</th>
                                <th>METRICS</th>
                                <th>DURATION</th>
                                <th>BENEFIT</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                             </tr>
                          </thead>
                          <tbody>
                             {filteredPlans.map((plan, idx) => (
                                <tr key={plan._id} className="transition-all group border-b border-black/[0.02]">
                                   <td className="text-center italic opacity-40 text-[11px]">{(idx + 1).toString().padStart(2, '0')}</td>
                                   <td>
                                       <div className="flex justify-center">
                                          <div className="w-10 h-10 rounded-xl bg-zen-sand/10 flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform">
                                             <Crown size={18} />
                                          </div>
                                       </div>
                                   </td>
                                   <td>
                                       <div className="flex flex-row items-center justify-center gap-2 px-6">
                                          <span className="zen-table-primary">{plan.name}</span>
                                          <span className="text-zen-brown/20 px-1">|</span>
                                          <span className="zen-table-meta">Membership Plan</span>
                                       </div>
                                   </td>
                                   <td>
                                      <div className="flex flex-row items-center justify-center gap-2">
                                         <span className="zen-table-primary">QR {plan.price}</span>
                                         <span className="text-zen-brown/20 px-1">|</span>
                                         <span className="zen-table-meta">Renewal Rate</span>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex flex-row items-center justify-center gap-2">
                                         <span className="text-sm font-serif font-black text-zen-brown leading-none">
                                            {plan.durationDays >= 36500 ? 'Infinite' : plan.durationDays}
                                         </span>
                                         <span className="text-zen-brown/20 px-1">|</span>
                                         <span className="text-[8px] font-black text-zen-brown/30 uppercase tracking-widest mt-0">Days</span>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex flex-row items-center justify-center gap-2">
                                         <span className="text-sm font-serif font-black text-zen-brown leading-none">{plan.maxSessions}</span>
                                         <span className="text-zen-brown/20 px-1">|</span>
                                         <span className="text-[8px] font-black text-zen-brown/30 uppercase tracking-widest mt-0">Credits</span>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex justify-center">
                                         <ZenBadge variant={plan.isActive ? 'sand' : 'default'}>{plan.isActive ? 'OPERATIONAL' : 'RETIRED'}</ZenBadge>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex items-center justify-center gap-2">
                                         <ZenIconButton icon={Edit3} onClick={() => {
                                            setEditingPlan(plan);
                                            setPlanFormData({
                                               ...plan as any,
                                               applicableServices: plan.applicableServices?.map((s: any) => typeof s === 'string' ? s : s._id) || [],
                                               isUnlimited: plan.durationDays >= 36500
                                            });
                                            setIsPlanModalOpen(true);
                                         }} />
                                         <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeletePlan(plan._id)} />
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                          </table>
                       </div>
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'registry' && (
               <div className="space-y-6">


                    {viewMode === 'table' ? (
                       <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden table-container">
                          <div className="table-container">
                          <table className="w-full min-w-[760px] lg:min-w-[1000px]">
                             <thead>
                                 <tr>
                                   <th>S NO</th>
                                   <th>IMAGE</th>
                                   <th>CLIENT IDENTITY</th>
                                   <th>PLAN SUBSCRIBED</th>
                                   <th>METRICS & CYCLE</th>
                                   <th>USAGE</th>
                                   <th>STATUS</th>
                                   {user?.role !== 'Client' && <th>ACTIONS</th>}
                                </tr>
                             </thead>
                             <tbody>
                                {filteredMemberships.map((m, index) => (
                                  <tr key={m._id} className="transition-all group border-b border-black/[0.02]">
                                     <td className="text-center italic opacity-40 text-[11px]">{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</td>
                                     <td>
                                         <div className="flex justify-center">
                                            <div className="w-12 h-12 rounded-xl bg-zen-sand/10 border border-zen-brown/10 flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform duration-500">
                                               <Users size={18} strokeWidth={1.5} />
                                            </div>
                                         </div>
                                     </td>
                                     <td>
                                        <div className="flex flex-col items-center justify-center gap-0.5 px-6">
                                           <span className="zen-table-primary leading-none">{m.client?.name}</span>
                                           <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">{m.client?.phone}</span>
                                        </div>
                                     </td>
                                     <td>
                                        <div className="flex justify-center">
                                           <ZenBadge variant="sand" className="uppercase font-black tracking-widest px-4">{m.plan?.name}</ZenBadge>
                                        </div>
                                     </td>
                                     <td>
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                           <div className="text-[11px] font-black text-zen-brown uppercase tracking-widest leading-none">
                                              {dayjs(m.startDate).format('DD/MM')} — {dayjs(m.endDate).format('DD/MM')}
                                           </div>
                                           <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-widest">Validity Cycle</span>
                                        </div>
                                     </td>
                                     <td>
                                         <div className="flex items-center justify-center">
                                            <p className="zen-table-primary">{(m.totalSessions || 0) - (m.remainingSessions || 0)} / {m.totalSessions || 0}</p>
                                         </div>
                                     </td>
                                     <td>
                                        <div className="flex justify-center">
                                           <ZenBadge variant={m.status === 'Active' ? 'leaf' : 'sand'} className="uppercase font-black tracking-widest">{m.status}</ZenBadge>
                                        </div>
                                     </td>
                                     {user?.role !== 'Client' && (
                                        <td>
                                           <div className="flex items-center justify-center gap-2">
                                              <ZenIconButton icon={History} onClick={() => {
                                                 setSelectedHistory(m);
                                                 setIsHistoryModalOpen(true);
                                              }} />
                                              <ZenIconButton icon={Edit3} onClick={() => {
                                                 openEditEnrollment(m);
                                              }} />
                                              <ZenIconButton icon={Trash2} onClick={() => handleDeleteMembership(m._id)} />
                                           </div>
                                        </td>
                                     )}
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                          </div>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredMemberships.map((m) => (
                             <div key={m._id} className="group relative bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-zen-brown/15 transition-all duration-500 hover:shadow-xl hover:translate-y-[-4px] h-full flex flex-col justify-between overflow-hidden">
                                {/* Background Glow Overlay */}
                                <div className="absolute top-0 right-0 w-28 h-28 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

                                <div className="relative z-10">
                                   <div className="flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-4">
                                         <div className="w-14 h-14 rounded-2xl bg-zen-sand/10 text-zen-sand flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-sm border border-zen-brown/10">
                                            <Users size={24} strokeWidth={1.5} />
                                         </div>
                                         <div className="min-w-0">
                                            <h4 className="font-serif font-black text-lg text-zen-brown group-hover:text-zen-sand transition-colors duration-500 truncate">{m.client?.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">{m.client?.phone}</span>
                                               <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${getStatusColor(m.status)}`}>
                                                  {m.status}
                                               </span>
                                            </div>
                                         </div>
                                      </div>
                                      {user?.role !== 'Client' && (
                                        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                                           <ZenIconButton icon={History} onClick={() => {
                                                 setSelectedHistory(m);
                                                 setIsHistoryModalOpen(true);
                                              }} />
                                           <ZenIconButton icon={Edit3} onClick={() => {
                                                 openEditEnrollment(m);
                                              }} />
                                           <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteMembership(m._id)} />
                                        </div>
                                      )}
                                   </div>

                                   <div className="space-y-4">
                                      <div className="flex items-center justify-between p-5 bg-white border border-zen-brown/10 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-500 group/tier">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-zen-sand/5 flex items-center justify-center text-zen-sand group-hover/tier:scale-110 transition-transform">
                                               <ShieldCheck size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                               <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Service Tier</span>
                                               <span className="text-xs font-black text-zen-brown uppercase tracking-widest">{m.plan?.name}</span>
                                            </div>
                                         </div>
                                         <div className="flex flex-col items-end">
                                            <span className="text-2xl font-black text-zen-brown tracking-tighter">
                                               {Math.max(0, (m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)) - m.remainingSessions)}<span className="text-sm text-zen-brown/30 mx-1">/</span>{m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)}
                                            </span>

                                         </div>
                                      </div>

                                      <div className="flex items-center justify-between px-2 pt-2">
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest">Record Cycle</span>
                                            <div className="flex items-center gap-2 text-zen-brown/60">
                                               <Calendar size={14} className="text-zen-sand" />
                                               <span className="text-[10px] font-serif font-black">{new Date(m.startDate).toLocaleDateString()}</span>
                                            </div>
                                         </div>
                                         <ZenBadge variant="leaf">Active Member</ZenBadge>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                    <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                 </div>
            )}
         </motion.div>
      </AnimatePresence>

      {/* Plan Configuration Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'New Membership Plan'}
        subtitle="Configure pricing, duration, and included services"
        maxWidth="max-w-4xl"
        headerIcon={CreditCard}
        footer={
          <div className="flex gap-6">
            <ZenButton variant="secondary" onClick={() => setIsPlanModalOpen(false)} className="flex-1" type="button">Cancel</ZenButton>
            <ZenButton type="submit" form="plan-form" className="flex-[2] flex items-center justify-center gap-3 shadow-sm">
               <span>{editingPlan ? 'Save Plan' : 'Create Plan'}</span>
               <CheckCircle2 size={18} />
            </ZenButton>
          </div>
        }
      >
        <form id="plan-form" onSubmit={handleCreatePlan} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
               <ZenInput label="Plan Name" placeholder="E.g. Monthly Standard" value={planFormData.name} onChange={(e: any) => setPlanFormData({...planFormData, name: e.target.value})} />
               <ZenInput label="Total Sessions" icon={Hash} type="number" value={planFormData.maxSessions} onChange={(e: any) => setPlanFormData({...planFormData, maxSessions: Number(e.target.value)})} />
               <ZenInput label="Plan Price (QR)" icon={CreditCard} type="number" value={planFormData.price} onChange={(e: any) => setPlanFormData({...planFormData, price: Number(e.target.value)})} />
               <div className="space-y-4">
                  <ZenInput
                     label="Duration (Days)"
                     icon={Clock}
                     type="number"
                     disabled={planFormData.isUnlimited}
                     value={planFormData.isUnlimited ? '' : planFormData.durationDays}
                     onChange={(e: any) => setPlanFormData({...planFormData, durationDays: Number(e.target.value)})}
                  />
                  <label className="flex items-center gap-3 cursor-pointer group mt-2">
                     <input
                       type="checkbox"
                       checked={planFormData.isUnlimited}
                       onChange={e => setPlanFormData({...planFormData, isUnlimited: e.target.checked})}
                       className="w-4 h-4 rounded border-zen-brown/25 text-zen-sand focus:ring-zen-sand transition-all"
                     />
                     <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Unlimited duration</span>
                  </label>
               </div>

               <div className="flex flex-col justify-center">
                  <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-4">Plan Status</h4>
                  <div className="flex gap-8">
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={planFormData.isActive} onChange={e => setPlanFormData({...planFormData, isActive: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-zen-leaf after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ms-3 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">{planFormData.isActive ? 'Active' : 'Inactive'}</span>
                     </label>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={planFormData.isPopular} onChange={e => setPlanFormData({...planFormData, isPopular: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-zen-sand after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ms-3 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Mark Popular</span>
                     </label>
                  </div>
               </div>

               <ZenDropdown label="Thematic Icon" icon={Crown} options={['Sparkles', 'Gem', 'Crown', 'Star', 'ShieldCheck', 'Zap']} value={planFormData.icon} onChange={val => setPlanFormData({...planFormData, icon: val})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
               <ZenTextarea label="Included Benefits (One per line)" placeholder="E.g. Unlimited Access&#10;Member Priority" value={planFormData.benefits as any} onChange={(e: any) => setPlanFormData({...planFormData, benefits: e.target.value})} />
               <ZenTextarea label="Internal Description" value={planFormData.description} onChange={(e: any) => setPlanFormData({...planFormData, description: e.target.value})} />
            </div>

            <div className="bg-zen-cream/30 p-8 rounded-[2.5rem] border-2 border-dashed border-zen-brown/15 hover:border-zen-brown/30 transition-all group/upload relative overflow-hidden">
               <input
                 type="file"
                 id="plan-document"
                 className="hidden"
                 onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     setPlanDocumentFile(file);
                     setRemovePlanDocument(false);
                   }
                 }}
               />

               <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-3xl bg-white shadow-md flex items-center justify-center text-zen-brown/40 group-hover/upload:text-zen-sand group-hover/upload:scale-105 transition-all duration-500 overflow-hidden border-2 border-white">
                     {planDocumentFile ? (
                        planDocumentFile.type.startsWith('image/') ? (
                           <img src={previewUrl || ''} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                           <FileText size={32} strokeWidth={1.5} />
                        )
                     ) : ((planFormData as any).document && !removePlanDocument) ? (
                        /\.(jpg|jpeg|png|webp|gif|avif)$/i.test((planFormData as any).document) ? (
                           <img src={getImageUrl((planFormData as any).document)} className="w-full h-full object-cover" alt="Current" />
                        ) : (
                           <FileText size={32} strokeWidth={1.5} />
                        )
                     ) : (
                        <Upload size={32} strokeWidth={1.5} />
                     )}
                  </div>

                  <div className="space-y-1">
                     <p className="text-sm font-serif font-black text-zen-brown">
                        {planDocumentFile ? planDocumentFile.name : (planFormData as any).document ? 'Update Plan Document' : 'Upload Plan Document'}
                     </p>
                     <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">PDF, DOCX, or Images up to 10MB</p>
                  </div>

                  <div className="flex gap-3">
                     <label htmlFor="plan-document" className="px-6 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown border border-zen-brown/10 hover:border-zen-brown/30 hover:bg-zen-cream/50 cursor-pointer shadow-sm transition-all active:scale-95">
                        {planDocumentFile || (planFormData as any).document ? 'Change File' : 'Select File'}
                     </label>

                     {((planFormData as any).document || planDocumentFile) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanDocumentFile(null);
                            setRemovePlanDocument(true);
                          }}
                          className="px-6 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-red-100 hover:bg-red-100 transition-all active:scale-95"
                        >
                           Remove
                        </button>
                     )}
                  </div>
               </div>

               {/* Existing Document Link */}
               {(planFormData as any).document && !planDocumentFile && !removePlanDocument && (
                  <div className="mt-6 flex justify-center">
                     <a
                        href={getImageUrl((planFormData as any).document)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-[10px] font-black text-zen-sand uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
                     >
                        <ExternalLink size={12} />
                        View Current Document
                     </a>
                  </div>
               )}
            </div>

            <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] px-2">Included Services</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   {(services || []).map(service => {
                      const isSelected = planFormData.applicableServices.includes(service._id);
                      return (
                         <button
                           key={service._id}
                           type="button"
                           onClick={() => toggleService(service._id)}
                           className={`p-4 rounded-2xl border text-left transition-all duration-300 ${isSelected ? 'bg-zen-brown text-zen-cream border-zen-brown shadow-xl' : 'bg-white text-zen-brown/60 border-zen-brown/15 hover:border-zen-brown/35'}`}
                         >
                            <p className="font-serif font-bold text-sm leading-tight">{service.name}</p>
                            <div className="flex items-center justify-center mt-2">
                               <span className="text-[8px] uppercase tracking-widest opacity-60">
                                  {typeof service.category === 'object' ? (service.category as any)?.name : (service.category || 'Wellness')}
                               </span>
                               {isSelected && <CheckCircle2 size={12} className="ml-2" />}
                            </div>
                         </button>
                      );
                   })}
                </div>
            </div>
        </form>
      </Modal>

      <Modal
         isOpen={isEnrollModalOpen}
         onClose={closeEnrollmentModal}
         title={editingEnrollmentId ? 'Edit Enrollment' : 'New Enrollment'}
         subtitle="Assign a client to a membership plan"
         maxWidth="max-w-2xl"
         headerIcon={Plus}
         footer={
            <div className="flex gap-4">
               <ZenButton variant="secondary" onClick={closeEnrollmentModal} className="flex-1" type="button">Cancel</ZenButton>
               <ZenButton type="submit" form="enroll-form" className="flex-[2]">{editingEnrollmentId ? 'Save Enrollment' : 'Create Enrollment'}</ZenButton>
            </div>
         }
      >
         <form id="enroll-form" onSubmit={handleEnroll} className="space-y-10">
            <ZenAutocomplete
               label="Select Client"
               placeholder="Search client by name or phone..."
               options={(clients || []).map(c => ({
                  id: c._id,
                  name: c.name || 'Unknown',
                  subtext: c.phone || 'No Phone'
               }))}
               value={enrollData.clientId}
               onChange={(val: string) => setEnrollData({...enrollData, clientId: val})}
               disabled={!!editingEnrollmentId}
               icon={Users}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <ZenDropdown
                  label="Membership Plan"
                  options={(plans || []).map(p => p.name)}
                  value={(plans || []).find(p => p._id === enrollData.planId)?.name || ''}
                  onChange={val => {
                     const plan = (plans || []).find(p => p.name === val);
                     if (plan) setEnrollData({...enrollData, planId: plan._id});
                  }}
               />
               <ZenDropdown
                  label="Assign Branch"
                  options={(branches || []).map(b => b.name)}
                  value={(branches || []).find(b => b._id === enrollData.branchId)?.name || ''}
                  onChange={val => {
                     const branch = (branches || []).find(b => b.name === val);
                     if (branch) setEnrollData({...enrollData, branchId: branch._id});
                  }}
               />
            </div>

            <ZenDatePicker label="Start Date" value={enrollData.startDate} onChange={val => setEnrollData({...enrollData, startDate: val})} />


         </form>
      </Modal>

      {/* Redemption Modal */}
      <Modal
         isOpen={isRedeemModalOpen}
         onClose={() => setIsRedeemModalOpen(false)}
         title="Redeem Service"
         maxWidth="max-w-xl"
         headerIcon={Sparkles}
         footer={
            <div className="flex gap-4">
               <ZenButton variant="secondary" onClick={() => setIsRedeemModalOpen(false)} className="flex-1" type="button">Cancel</ZenButton>
               <ZenButton type="submit" form="redeem-form" className="flex-[2]">Confirm</ZenButton>
            </div>
         }
      >
         <form id="redeem-form" onSubmit={handleRedeem} className="space-y-8">
            {activeMembershipForRedeem && (
               <div className="bg-zen-cream/30 p-6 rounded-3xl border border-zen-brown/15">
                  <p className="font-serif font-lg font-bold text-zen-brown">{activeMembershipForRedeem.client?.name}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zen-brown/15">
                     <span className="text-xl font-serif font-bold text-zen-brown">{activeMembershipForRedeem.remainingSessions} / {activeMembershipForRedeem.totalSessions} sessions</span>
                  </div>
               </div>
            )}

            <ZenDropdown
               label="Service"
               options={(services || []).map((s: any) => s.name)}
               value={(services || []).find((s: any) => s._id === redeemData.serviceId)?.name || ''}
               onChange={(val: any) => {
                  const s = (services || []).find((serv: any) => serv.name === val);
                  if (s) setRedeemData({...redeemData, serviceId: s._id});
               }}
            />

            <ZenTextarea label="Notes" value={redeemData.notes} onChange={(e: any) => setRedeemData({...redeemData, notes: e.target.value})} />
         </form>
      </Modal>

      {/* Usage History Modal */}
      <Modal
         isOpen={isHistoryModalOpen}
         onClose={() => setIsHistoryModalOpen(false)}
         title="Membership History"
         subtitle="Historical usage records"
         maxWidth="max-w-4xl"
         headerIcon={History}
         footer={
            <div className="flex justify-between items-center">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Client</span>
                  <p className="font-serif font-bold text-zen-brown">{selectedHistory?.client?.name}</p>
               </div>
               <ZenBadge variant="sand">{selectedHistory?.plan?.name}</ZenBadge>
            </div>
         }
      >
         <div className="space-y-10">

            <div className="bg-white/70 rounded-[2.5rem] border border-white overflow-hidden shadow-sm">
               <div className="table-container">
               <table className="w-full min-w-[760px]">
                  <thead>
                     <tr>
                        <th>S No</th>
                        <th>Date</th>
                        <th>Branch</th>
                        <th>Service</th>
                        <th>Time</th>
                     </tr>
                  </thead>
                  <tbody>
                     {selectedHistory?.usageHistory?.length > 0 ? selectedHistory.usageHistory.map((usage: any, idx: number) => (
                        <tr key={idx}>
                           <td>{(idx + 1).toString().padStart(2, '0')}</td>
                           <td>
                              <span className="zen-table-primary">{new Date(usage.usedAt).toLocaleDateString()}</span>
                           </td>
                           <td>
                              <div className="flex items-center gap-2">
                                 <MapPin size={10} className="text-zen-sand" />
                                 {usage.branch?.name || 'Main Branch'}
                              </div>
                           </td>
                           <td>
                              <span className="zen-table-primary">{usage.service?.name || usage.serviceId}</span>
                           </td>
                           <td>
                              <span className="zen-table-meta">{new Date(usage.usedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </td>
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan={5} className="py-12 text-center text-sm font-serif italic text-zen-brown/30">No redemption records found for this membership</td>
                        </tr>
                     )}
                  </tbody>
               </table>
               </div>
            </div>

            <div className="flex justify-center pt-4">
               <ZenButton variant="secondary" onClick={() => setIsHistoryModalOpen(false)} className="px-12">Close History</ZenButton>
            </div>
         </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
      />
    </ZenPageLayout>
  );
};

export default Memberships;
