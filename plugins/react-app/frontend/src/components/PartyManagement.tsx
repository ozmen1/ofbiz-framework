import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Building2,
  UserCheck,
  Truck,
  User,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Eye,
  FileText,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  CalendarClock,
  MessageSquarePlus,
  Tag,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  FolderOpen,
  Sliders,
  Key,
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import {
  fetchParties,
  fetchPartyDetail,
  fetchPartyMetadata,
  fetchPartyFinancialProfile,
  setPartyStatus,
  addPartyRole,
  deletePartyRole,
  deletePartyContactMech,
  deletePartyIdentification,
  addPartyClassification,
  deletePartyClassification,
  deletePartyPaymentTerm,
  fetchPartyPaymentMethods,
  deletePartyPaymentMethod,
  fetchPartyAttributes,
  deletePartyAttribute,
  fetchPartyContents,
  deletePartyContentRecord,
  fetchPartyUserLogins,
  updatePartyUserLoginStatus,
  PartyListItem,
  PartyMetrics,
  PartyDetail,
  PartyMetadataResponse,
  PartyFinancialProfile,
  PartyPaymentMethodsResponse,
  PartyAttribute,
  PartyContentsResponse,
  PartyUserLoginsResponse,
} from '../services/api';
import { CreatePartyModal } from './CreatePartyModal';
import { PartyContactModal } from './PartyContactModal';
import { PartyRelationshipModal } from './PartyRelationshipModal';
import { PartyStatementModal } from './PartyStatementModal';
import { PartyFinancialModal } from './PartyFinancialModal';
import { PartyPaymentTermModal } from './PartyPaymentTermModal';
import { PartyNoteModal } from './PartyNoteModal';
import { PartyPaymentMethodModal } from './PartyPaymentMethodModal';
import { PartyAttributeModal } from './PartyAttributeModal';
import { PartyContentModal } from './PartyContentModal';
import { PartyUserLoginModal } from './PartyUserLoginModal';

type ActiveTab = 'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'DISABLED';
type DrawerTab = 'OVERVIEW' | 'FINANCIAL' | 'TERMS' | 'SEGMENTS' | 'PAYMENTS' | 'DOCUMENTS' | 'ATTRIBUTES' | 'USER_LOGINS' | 'NOTES';

export const PartyManagement: React.FC = () => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  // List State
  const [parties, setParties] = useState<PartyListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [metrics, setMetrics] = useState<PartyMetrics>({
    totalParties: 0,
    totalGroups: 0,
    totalPersons: 0,
    activeCustomers: 0,
    activeSuppliers: 0,
  });
  const [metadata, setMetadata] = useState<PartyMetadataResponse | null>(null);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<ActiveTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewIndex, setViewIndex] = useState(0);
  const [viewSize] = useState(20);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drawer & Modals State
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [partyDetail, setPartyDetail] = useState<PartyDetail | null>(null);
  const [financialProfile, setFinancialProfile] = useState<PartyFinancialProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PartyPaymentMethodsResponse | null>(null);
  const [partyAttributes, setPartyAttributes] = useState<PartyAttribute[]>([]);
  const [partyContents, setPartyContents] = useState<PartyContentsResponse | null>(null);
  const [partyUserLogins, setPartyUserLogins] = useState<PartyUserLoginsResponse | null>(null);

  const [drawerTab, setDrawerTab] = useState<DrawerTab>('OVERVIEW');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isPaymentTermModalOpen, setIsPaymentTermModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isUserLoginModalOpen, setIsUserLoginModalOpen] = useState(false);

  const [selectedSegmentToAdd, setSelectedSegmentToAdd] = useState('');
  const [statementPartyId, setStatementPartyId] = useState<string | null>(null);

  // Party Role Management State
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleTypeId, setNewRoleTypeId] = useState('');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [deletingRoleTypeId, setDeletingRoleTypeId] = useState<string | null>(null);

  // Load Metadata
  useEffect(() => {
    fetchPartyMetadata()
      .then(res => setMetadata(res))
      .catch(err => console.error('Could not load party metadata:', err));
  }, []);


  // Fetch Parties
  const loadParties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let rType = roleFilter;
      let sId = statusFilter;

      if (activeTab === 'CUSTOMER') rType = 'CUSTOMER';
      else if (activeTab === 'SUPPLIER') rType = 'SUPPLIER';
      else if (activeTab === 'EMPLOYEE') rType = 'EMPLOYEE';
      else if (activeTab === 'DISABLED') sId = 'PARTY_DISABLED';

      const res = await fetchParties({
        search: searchTerm.trim() || undefined,
        partyTypeId: partyTypeFilter || undefined,
        roleTypeId: rType || undefined,
        statusId: sId || undefined,
        viewIndex,
        viewSize,
      });

      setParties(res.partyList || []);
      setTotalCount(res.totalCount || 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, partyTypeFilter, roleFilter, statusFilter, activeTab, viewIndex, viewSize, common.error]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  // Load single party detail and financial/payments/attributes/contents/userLogins in parallel
  const handleOpenDetail = async (partyId: string) => {
    setSelectedPartyId(partyId);
    setIsLoadingDetail(true);
    setDrawerTab('OVERVIEW');
    try {
      const [res, finRes, pmRes, attrRes, cntRes, ulRes] = await Promise.all([
        fetchPartyDetail(partyId),
        fetchPartyFinancialProfile(partyId).catch(() => null),
        fetchPartyPaymentMethods(partyId).catch(() => null),
        fetchPartyAttributes(partyId).catch(() => null),
        fetchPartyContents(partyId).catch(() => null),
        fetchPartyUserLogins(partyId).catch(() => null),
      ]);
      setPartyDetail(res.partyDetail);
      if (finRes?.financialProfile) setFinancialProfile(finRes.financialProfile);
      if (pmRes?.paymentMethods) setPaymentMethods(pmRes.paymentMethods);
      if (attrRes?.attributes) setPartyAttributes(attrRes.attributes);
      if (cntRes?.partyContents) setPartyContents(cntRes.partyContents);
      if (ulRes?.userLoginsData) setPartyUserLogins(ulRes.userLoginsData);
    } catch (err: any) {
      console.error('Error fetching party details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedPartyId(null);
    setPartyDetail(null);
    setFinancialProfile(null);
    setPaymentMethods(null);
    setPartyAttributes([]);
    setPartyContents(null);
    setPartyUserLogins(null);
    setIsAddingRole(false);
    setNewRoleTypeId('');
  };

  // Memoized available roles not yet assigned to the current party
  const availableRoles = useMemo(() => {
    if (!partyDetail || !metadata?.roleTypes) return [];
    const assignedRoleIds = new Set(partyDetail.roles.map(r => r.roleTypeId));
    return metadata.roleTypes.filter(rt => !assignedRoleIds.has(rt.roleTypeId));
  }, [partyDetail, metadata]);

  // Add party role
  const handleAddPartyRole = async () => {
    if (!partyDetail || !newRoleTypeId) return;
    setIsSubmittingRole(true);
    try {
      await addPartyRole(partyDetail.partyId, newRoleTypeId);
      setIsAddingRole(false);
      setNewRoleTypeId('');
      await handleOpenDetail(partyDetail.partyId);
      loadParties();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Delete party role
  const handleDeletePartyRole = async (roleTypeId: string) => {
    if (!partyDetail || !confirm(t.confirmDeleteRole)) return;
    setDeletingRoleTypeId(roleTypeId);
    try {
      await deletePartyRole(partyDetail.partyId, roleTypeId);
      await handleOpenDetail(partyDetail.partyId);
      loadParties();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    } finally {
      setDeletingRoleTypeId(null);
    }
  };


  const refreshFinancialData = async (partyId: string) => {
    try {
      const finRes = await fetchPartyFinancialProfile(partyId);
      if (finRes?.financialProfile) {
        setFinancialProfile(finRes.financialProfile);
      }
    } catch (err) {
      console.error('Could not refresh financial data:', err);
    }
  };

  const refreshPaymentMethods = async (partyId: string) => {
    try {
      const res = await fetchPartyPaymentMethods(partyId);
      if (res?.paymentMethods) {
        setPaymentMethods(res.paymentMethods);
      }
    } catch (err) {
      console.error('Could not refresh payment methods:', err);
    }
  };

  const refreshAttributes = async (partyId: string) => {
    try {
      const res = await fetchPartyAttributes(partyId);
      if (res?.attributes) {
        setPartyAttributes(res.attributes);
      }
    } catch (err) {
      console.error('Could not refresh party attributes:', err);
    }
  };

  const refreshContents = async (partyId: string) => {
    try {
      const res = await fetchPartyContents(partyId);
      if (res?.partyContents) {
        setPartyContents(res.partyContents);
      }
    } catch (err) {
      console.error('Could not refresh party contents:', err);
    }
  };

  const refreshUserLogins = async (partyId: string) => {
    try {
      const res = await fetchPartyUserLogins(partyId);
      if (res?.userLoginsData) {
        setPartyUserLogins(res.userLoginsData);
      }
    } catch (err) {
      console.error('Could not refresh party user logins:', err);
    }
  };

  const handleAddSegment = async () => {
    if (!selectedPartyId || !selectedSegmentToAdd) return;
    try {
      await addPartyClassification(selectedPartyId, selectedSegmentToAdd);
      setSelectedSegmentToAdd('');
      refreshFinancialData(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleDeleteSegment = async (groupId: string) => {
    if (!selectedPartyId || !confirm('Bu segment etiketini kaldırmak istediğinize emin misiniz?')) return;
    try {
      await deletePartyClassification(selectedPartyId, groupId);
      refreshFinancialData(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleDeleteTerm = async (agreementTermId: string) => {
    if (!selectedPartyId || !confirm('Bu vade koşulunu silmek istediğinize emin misiniz?')) return;
    try {
      await deletePartyPaymentTerm(agreementTermId);
      refreshFinancialData(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!selectedPartyId || !confirm('Bu ödeme yöntemini devreden çıkarmak istediğinize emin misiniz?')) return;
    try {
      await deletePartyPaymentMethod(paymentMethodId);
      refreshPaymentMethods(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleDeleteAttribute = async (attrName: string) => {
    if (!selectedPartyId || !confirm(`"${attrName}" niteliğini silmek istediğinize emin misiniz?`)) return;
    try {
      await deletePartyAttribute(selectedPartyId, attrName);
      refreshAttributes(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!selectedPartyId || !confirm('Bu belge kaydını kaldırmak istediğinize emin misiniz?')) return;
    try {
      await deletePartyContentRecord(selectedPartyId, contentId);
      refreshContents(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleToggleUserLoginStatus = async (userLoginId: string, currentEnabled: 'Y' | 'N') => {
    const nextStatus = currentEnabled === 'Y' ? 'N' : 'Y';
    const confirmMsg = nextStatus === 'N' ? 'Kullanıcı hesabını pasife almak istediğinize emin misiniz?' : 'Kullanıcı hesabını aktifleştirmek istediğinize emin misiniz?';
    if (!confirm(confirmMsg)) return;
    try {
      await updatePartyUserLoginStatus(userLoginId, nextStatus);
      if (selectedPartyId) refreshUserLogins(selectedPartyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  const handleExportCsv = () => {
    if (!parties || parties.length === 0) return;
    const headers = [t.partyId, t.name, t.type, t.roles, t.city, t.contact, t.status];
    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '""';
      const clean = str.replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = parties.map(p => {
      const typeLabel = p.partyTypeId === 'PARTY_GROUP' ? t.corporateType : t.individualType;
      const statusLabel = p.statusId === 'PARTY_ENABLED' ? t.activeStatus : t.disabledStatus;
      const rolesStr = (p.roles || []).join('; ');
      const cityCountry = [p.city, p.countryGeoId].filter(Boolean).join(', ');
      const contactStr = [p.primaryEmail, p.primaryPhone].filter(Boolean).join(' | ');

      return [
        escapeCsv(p.partyId),
        escapeCsv(p.name),
        escapeCsv(typeLabel),
        escapeCsv(rolesStr),
        escapeCsv(cityCountry),
        escapeCsv(contactStr),
        escapeCsv(statusLabel),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cariler_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle status
  const handleToggleStatus = async (partyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PARTY_ENABLED' ? 'PARTY_DISABLED' : 'PARTY_ENABLED';
    try {
      await setPartyStatus(partyId, newStatus);
      if (partyDetail && partyDetail.partyId === partyId) {
        setPartyDetail({ ...partyDetail, statusId: newStatus });
      }
      loadParties();
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  // Delete contact mech
  const handleDeleteContact = async (contactMechId: string) => {
    if (!partyDetail || !confirm('Bu iletişim bilgisini silmek istediğinize emin misiniz?')) return;
    try {
      await deletePartyContactMech(partyDetail.partyId, contactMechId);
      handleOpenDetail(partyDetail.partyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  // Delete identification
  const handleDeleteIdentification = async (idTypeId: string) => {
    if (!partyDetail || !confirm('Bu kimlik numarasını silmek istediğinize emin misiniz?')) return;
    try {
      await deletePartyIdentification(partyDetail.partyId, idTypeId);
      handleOpenDetail(partyDetail.partyId);
    } catch (err: any) {
      alert(err.message || common.error);
    }
  };

  // Memoized key role options for dropdowns
  const roleOptions = useMemo(() => {
    return metadata?.roleTypes || [];
  }, [metadata]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users size={22} />
            </div>
            <span>{t.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadParties()}
            disabled={isLoading}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
            title={common.refresh}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{common.refresh}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || parties.length === 0}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3 text-xs text-slate-300 hover:text-white"
            title={t.exportCsv}
          >
            <Download size={14} />
            <span className="hidden sm:inline">{t.exportCsv}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            <Plus size={16} />
            <span>{t.createNew}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t.totalParties}</span>
            <Users size={16} className="text-indigo-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">
            {metrics.totalParties.toLocaleString()}
          </p>
        </div>

        <div className="ds-stat-card border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t.activeCustomers}</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-300 mt-1">
            {metrics.activeCustomers.toLocaleString()}
          </p>
        </div>

        <div className="ds-stat-card border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t.activeSuppliers}</span>
            <Truck size={16} className="text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-300 mt-1">
            {metrics.activeSuppliers.toLocaleString()}
          </p>
        </div>

        <div className="ds-stat-card border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t.corporate}</span>
            <Building2 size={16} className="text-sky-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">
            {metrics.totalGroups.toLocaleString()}
          </p>
        </div>

        <div className="ds-stat-card border-l-purple-500 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t.individual}</span>
            <User size={16} className="text-purple-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">
            {metrics.totalPersons.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: t.tabAll, icon: Users },
          { id: 'CUSTOMER', label: t.tabCustomers, icon: UserCheck },
          { id: 'SUPPLIER', label: t.tabSuppliers, icon: Truck },
          { id: 'EMPLOYEE', label: t.tabEmployees, icon: Briefcase },
          { id: 'DISABLED', label: t.tabDisabled, icon: XCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as ActiveTab);
                setViewIndex(0);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon size={14} className={active ? 'text-indigo-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="ds-card p-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setViewIndex(0);
              }}
              placeholder={t.searchPlaceholder}
              className="ds-input pl-10 text-xs sm:text-sm"
            />
          </div>

          {/* Party Type Filter */}
          <div className="w-full md:w-44">
            <select
              value={partyTypeFilter}
              onChange={e => {
                setPartyTypeFilter(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs"
            >
              <option value="">{t.allTypes}</option>
              <option value="PARTY_GROUP">{t.corporateType}</option>
              <option value="PERSON">{t.individualType}</option>
            </select>
          </div>

          {/* Role Filter (Only active on ALL tab) */}
          {activeTab === 'ALL' && (
            <div className="w-full md:w-48">
              <select
                value={roleFilter}
                onChange={e => {
                  setRoleFilter(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-select text-xs"
              >
                <option value="">{t.allRoles}</option>
                {roleOptions
                  .filter(r => r.isKey)
                  .map(r => (
                    <option key={r.roleTypeId} value={r.roleTypeId}>
                      {r.description}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          {activeTab !== 'DISABLED' && (
            <div className="w-full md:w-36">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-select text-xs"
              >
                <option value="">{t.allStatuses}</option>
                <option value="PARTY_ENABLED">{t.activeStatus}</option>
                <option value="PARTY_DISABLED">{t.disabledStatus}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm">
          <AlertCircle size={16} className="shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Parties Data Table ── */}
      <div className="ds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th w-32">{t.partyId}</th>
                <th className="ds-th">{t.name}</th>
                <th className="ds-th w-28">{t.type}</th>
                <th className="ds-th">{t.roles}</th>
                <th className="ds-th w-36">{t.city}</th>
                <th className="ds-th">{t.contact}</th>
                <th className="ds-th w-24 text-center">{t.status}</th>
                <th className="ds-th w-28 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="ds-spinner mx-auto mb-2" />
                    <span>{common.loading}</span>
                  </td>
                </tr>
              ) : parties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <p className="text-sm font-medium">{t.noPartiesFound}</p>
                  </td>
                </tr>
              ) : (
                parties.map(party => {
                  const isGroup = party.partyTypeId === 'PARTY_GROUP';
                  const isEnabled = party.statusId === 'PARTY_ENABLED';

                  return (
                    <tr key={party.partyId} className="ds-tbody-row group">
                      {/* ID */}
                      <td className="ds-td">
                        <span className="ds-td-mono font-bold text-indigo-400">
                          {party.partyId}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="ds-td">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isGroup
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {isGroup ? <Building2 size={14} /> : <User size={14} />}
                          </div>
                          <div>
                            <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                              {party.name}
                            </span>
                            {party.identifications && party.identifications.length > 0 && (
                              <p className="text-[11px] text-slate-400 font-mono">
                                {party.identifications[0].partyIdentificationTypeId}:{' '}
                                {party.identifications[0].idValue}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="ds-td">
                        <span
                          className={`ds-badge ${
                            isGroup ? 'ds-badge-blue' : 'ds-badge-purple'
                          }`}
                        >
                          {isGroup ? t.corporateType : t.individualType}
                        </span>
                      </td>

                      {/* Roles Badges */}
                      <td className="ds-td">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {party.roles.length > 0 ? (
                            party.roles.map(role => (
                              <span
                                key={role}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                                  role === 'CUSTOMER'
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : role === 'SUPPLIER' || role === 'VENDOR'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : role === 'EMPLOYEE'
                                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      </td>

                      {/* City */}
                      <td className="ds-td text-xs text-slate-300">
                        {party.city || party.countryGeoId ? (
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin size={12} className="text-slate-500 shrink-0" />
                            <span>
                              {party.city}
                              {party.city && party.countryGeoId ? ', ' : ''}
                              {party.countryGeoId}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Contact summary */}
                      <td className="ds-td text-xs text-slate-300">
                        <div className="space-y-0.5">
                          {party.primaryPhone && (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Phone size={11} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{party.primaryPhone}</span>
                            </div>
                          )}
                          {party.primaryEmail && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Mail size={11} className="text-slate-500 shrink-0" />
                              <span className="truncate">{party.primaryEmail}</span>
                            </div>
                          )}
                          {!party.primaryPhone && !party.primaryEmail && (
                            <span className="text-slate-600">-</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="ds-td text-center">
                        <span
                          className={`ds-badge ${
                            isEnabled ? 'ds-badge-green' : 'ds-badge-red'
                          }`}
                        >
                          {isEnabled ? t.activeStatus : t.disabledStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="ds-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(party.partyId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-all cursor-pointer"
                            title={t.viewProfile}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatementPartyId(party.partyId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all cursor-pointer"
                            title={t.viewStatement}
                          >
                            <FileText size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(party.partyId, party.statusId)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isEnabled
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                            title={isEnabled ? t.deactivate : t.activate}
                          >
                            {isEnabled ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalCount > viewSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-400">
            <span>
              Toplam <span className="font-semibold text-white">{totalCount}</span> cari
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={viewIndex === 0}
                onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {common.previous}
              </button>
              <span className="px-2 font-mono text-slate-300">
                {viewIndex + 1} / {Math.ceil(totalCount / viewSize)}
              </span>
              <button
                type="button"
                disabled={(viewIndex + 1) * viewSize >= totalCount}
                onClick={() => setViewIndex(prev => prev + 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {common.next}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-Over Profile Drawer (360° Cari Detayı) ── */}
      {selectedPartyId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    partyDetail?.partyTypeId === 'PARTY_GROUP'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}
                >
                  {partyDetail?.partyTypeId === 'PARTY_GROUP' ? (
                    <Building2 size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight truncate max-w-[280px]">
                    {partyDetail?.displayName || selectedPartyId}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-indigo-400 font-bold">
                      {selectedPartyId}
                    </span>
                    <span
                      className={`ds-badge ${
                        partyDetail?.statusId === 'PARTY_ENABLED'
                          ? 'ds-badge-green'
                          : 'ds-badge-red'
                      }`}
                    >
                      {partyDetail?.statusId === 'PARTY_ENABLED'
                        ? t.activeStatus
                        : t.disabledStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatementPartyId(selectedPartyId)}
                  className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer border border-amber-500/20"
                  title={t.viewStatement}
                >
                  <FileText size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Tabs (Phase 2 Navigation) */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-900/40 text-xs overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab('OVERVIEW')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
                  drawerTab === 'OVERVIEW'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.tabOverview}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('FINANCIAL')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'FINANCIAL'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign size={13} />
                <span>{t.tabFinancial}</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('TERMS')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'TERMS'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarClock size={13} />
                <span>{t.tabTerms}</span>
                {financialProfile?.paymentTerms && financialProfile.paymentTerms.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">
                    {financialProfile.paymentTerms.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('SEGMENTS')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'SEGMENTS'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag size={13} />
                <span>{t.tabSegments}</span>
                {financialProfile?.classifications && financialProfile.classifications.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-full text-[10px]">
                    {financialProfile.classifications.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('PAYMENTS')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'PAYMENTS'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard size={13} />
                <span>{t.tabPayments}</span>
                {paymentMethods && (paymentMethods.eftAccounts.length > 0 || paymentMethods.creditCards.length > 0) && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">
                    {paymentMethods.eftAccounts.length + paymentMethods.creditCards.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('DOCUMENTS')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'DOCUMENTS'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen size={13} />
                <span>{t.tabDocuments}</span>
                {partyContents && partyContents.contents.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded-full text-[10px]">
                    {partyContents.contents.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('ATTRIBUTES')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'ATTRIBUTES'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders size={13} />
                <span>{t.tabAttributes}</span>
                {partyAttributes.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-full text-[10px]">
                    {partyAttributes.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('USER_LOGINS')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'USER_LOGINS'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key size={13} />
                <span>{t.tabUserLogins}</span>
                {partyUserLogins && partyUserLogins.userLogins.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[10px]">
                    {partyUserLogins.userLogins.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('NOTES')}
                className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  drawerTab === 'NOTES'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquarePlus size={13} />
                <span>{t.tabNotes}</span>
                {financialProfile?.notes && financialProfile.notes.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded-full text-[10px]">
                    {financialProfile.notes.length}
                  </span>
                )}
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="ds-spinner mx-auto mb-2" />
                  <span>{common.loading}</span>
                </div>
              ) : partyDetail ? (
                <>
                  {/* Tab 1: OVERVIEW */}
                  {drawerTab === 'OVERVIEW' && (
                    <>
                      {/* Financial Summary Card */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <CreditCard size={14} />
                            <span>{t.financialSummary}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setStatementPartyId(partyDetail.partyId)}
                            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t.viewStatement}</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                            <p className="text-[11px] text-slate-400">{t.totalInvoices}</p>
                            <p className="text-lg font-bold text-white mt-0.5">
                              {partyDetail.financialSummary.invoiceCount} adet
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                            <p className="text-[11px] text-slate-400">{t.totalPayments}</p>
                            <p className="text-lg font-bold text-white mt-0.5">
                              {partyDetail.financialSummary.paymentCount} adet
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Identifications (VKN / TCKN) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CreditCard size={14} className="text-indigo-400" />
                            <span>{t.taxAndIdNumbers}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsContactModalOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addIdentification}</span>
                          </button>
                        </div>

                        {partyDetail.identifications.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noIdentifications}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {partyDetail.identifications.map(item => (
                              <div
                                key={item.partyIdentificationTypeId}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80"
                              >
                                <div>
                                  <span className="text-xs font-semibold text-slate-300">
                                    {item.typeDescription} ({item.partyIdentificationTypeId})
                                  </span>
                                  <p className="text-sm font-mono font-bold text-indigo-400 mt-0.5">
                                    {item.idValue}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteIdentification(item.partyIdentificationTypeId)
                                  }
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title={common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Postal Addresses */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <MapPin size={14} className="text-indigo-400" />
                            <span>{t.postalAddresses}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsContactModalOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addAddress}</span>
                          </button>
                        </div>

                        {partyDetail.postalAddresses.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noAddresses}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {partyDetail.postalAddresses.map(addr => (
                              <div
                                key={addr.contactMechId}
                                className="flex items-start justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-200">
                                      {addr.address1} {addr.address2 ? ` - ${addr.address2}` : ''}
                                    </span>
                                    {addr.purposeTypeId && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        {addr.purposeTypeId}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400">
                                    {addr.city} {addr.postalCode ? `(${addr.postalCode})` : ''} -{' '}
                                    {addr.countryGeoId}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContact(addr.contactMechId)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title={common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Telecom Numbers */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Phone size={14} className="text-indigo-400" />
                            <span>{t.telecomNumbers}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsContactModalOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addPhone}</span>
                          </button>
                        </div>

                        {partyDetail.telecomNumbers.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noPhones}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {partyDetail.telecomNumbers.map(tel => (
                              <div
                                key={tel.contactMechId}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-slate-200">
                                    {tel.countryCode ? `+${tel.countryCode} ` : ''}
                                    {tel.areaCode ? `(${tel.areaCode}) ` : ''}
                                    {tel.contactNumber}
                                  </p>
                                  {tel.purposeTypeId && (
                                    <span className="text-[10px] text-slate-400">
                                      {tel.purposeTypeId}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContact(tel.contactMechId)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title={common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Email Addresses */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Mail size={14} className="text-indigo-400" />
                            <span>{t.emailAddresses}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsContactModalOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addEmail}</span>
                          </button>
                        </div>

                        {partyDetail.emailAddresses.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noEmails}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {partyDetail.emailAddresses.map(em => (
                              <div
                                key={em.contactMechId}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs font-semibold text-slate-200">
                                    {em.emailAddress}
                                  </p>
                                  {em.purposeTypeId && (
                                    <span className="text-[10px] text-slate-400">
                                      {em.purposeTypeId}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContact(em.contactMechId)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title={common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Connected Persons */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Briefcase size={14} className="text-indigo-400" />
                            <span>{t.connectedPersons}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsRelationshipModalOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addRelationship}</span>
                          </button>
                        </div>

                        {partyDetail.relationships.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noRelationships}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {partyDetail.relationships.map((rel, idx) => {
                              const otherPartyId =
                                rel.partyIdFrom === partyDetail.partyId
                                  ? rel.partyIdTo
                                  : rel.partyIdFrom;
                              const otherName =
                                rel.partyIdFrom === partyDetail.partyId
                                  ? rel.partyNameTo
                                  : rel.partyNameFrom;

                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleOpenDetail(otherPartyId)}
                                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-slate-200">
                                        {otherName}
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                        {rel.partyRelationshipTypeId}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-mono text-slate-400">
                                      {otherPartyId}
                                    </p>
                                    {rel.comments && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {rel.comments}
                                      </p>
                                    )}
                                  </div>
                                  <ChevronRight size={14} className="text-slate-600" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Active Roles */}
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-indigo-400" />
                            <span>{t.rolesAndClass}</span>
                          </h3>
                          {!isAddingRole && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingRole(true);
                                if (availableRoles.length > 0) {
                                  setNewRoleTypeId(availableRoles[0].roleTypeId);
                                }
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer border border-indigo-500/20"
                            >
                              <Plus size={12} />
                              <span>{t.addRole}</span>
                            </button>
                          )}
                        </div>

                        {/* Inline Add Role Selector */}
                        {isAddingRole && (
                          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300">{t.addRole}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingRole(false);
                                  setNewRoleTypeId('');
                                }}
                                className="text-slate-400 hover:text-white cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {availableRoles.length === 0 ? (
                              <p className="text-xs text-amber-400/90 italic">{t.noAvailableRoles}</p>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={newRoleTypeId}
                                  onChange={e => setNewRoleTypeId(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                                >
                                  {availableRoles.map(rt => (
                                    <option key={rt.roleTypeId} value={rt.roleTypeId}>
                                      {rt.description} ({rt.roleTypeId})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={isSubmittingRole || !newRoleTypeId}
                                  onClick={handleAddPartyRole}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                                >
                                  {isSubmittingRole ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Plus size={12} />
                                  )}
                                  <span>{common.save}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Roles Badge List */}
                        <div className="flex flex-wrap gap-1.5">
                          {partyDetail.roles.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Atanmış rol bulunmuyor.</span>
                          ) : (
                            partyDetail.roles.map(r => (
                              <span
                                key={r.roleTypeId}
                                className="group inline-flex items-center gap-1.5 text-xs pl-2.5 pr-1.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
                              >
                                <span>{r.description} ({r.roleTypeId})</span>
                                <button
                                  type="button"
                                  disabled={deletingRoleTypeId === r.roleTypeId}
                                  onClick={() => handleDeletePartyRole(r.roleTypeId)}
                                  title={t.removeRole}
                                  className="p-0.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  {deletingRoleTypeId === r.roleTypeId ? (
                                    <RefreshCw size={11} className="animate-spin text-rose-400" />
                                  ) : (
                                    <X size={12} />
                                  )}
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                    </>
                  )}

                  {/* Tab 2: FINANCIAL & RISK (Phase 2) */}
                  {drawerTab === 'FINANCIAL' && (
                    <div className="space-y-6">
                      {/* Risk Level Banner */}
                      <div
                        className={`p-4 rounded-xl border flex items-center justify-between ${
                          financialProfile?.riskLevel === 'SAFE'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : financialProfile?.riskLevel === 'WARNING'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : financialProfile?.riskLevel === 'EXCEEDED'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-slate-800/40 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ShieldAlert size={26} className="shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400">{t.riskStatus}</p>
                            <h4 className="text-sm font-bold text-white mt-0.5">
                              {financialProfile?.riskLevel === 'SAFE' && t.riskSafe}
                              {financialProfile?.riskLevel === 'WARNING' && t.riskWarning}
                              {financialProfile?.riskLevel === 'EXCEEDED' && t.riskExceeded}
                              {(!financialProfile?.riskLevel || financialProfile?.riskLevel === 'NO_LIMIT') && t.riskNoLimit}
                            </h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFinancialModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shrink-0"
                        >
                          {t.editCreditLimit}
                        </button>
                      </div>

                      {/* Credit Limit & Progress Bar */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{t.limitUsage}</span>
                          <span className="font-mono font-bold text-white">
                            %{financialProfile?.utilizationPercent?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              (financialProfile?.utilizationPercent || 0) >= 100
                                ? 'bg-rose-500'
                                : (financialProfile?.utilizationPercent || 0) >= 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, financialProfile?.utilizationPercent || 0)}%`,
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                          <div>
                            <p className="text-[10px] text-slate-500">{t.creditLimit}</p>
                            <p className="text-xs font-mono font-bold text-white mt-0.5">
                              ₺{financialProfile?.totalCreditLimit?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">{t.accountBalance}</p>
                            <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                              ₺{financialProfile?.totalAccountBalance?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">{t.availableBalance}</p>
                            <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                              ₺{((financialProfile?.totalCreditLimit || 0) - (financialProfile?.totalAccountBalance || 0))?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Open Receivables vs Open Payables */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                          <div className="flex items-center gap-1.5 text-xs text-indigo-400 mb-1">
                            <ArrowUpRight size={14} />
                            <span>{t.receivables}</span>
                          </div>
                          <p className="text-base font-bold font-mono text-white">
                            ₺{financialProfile?.totalReceivableOutstanding?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 mb-1">
                            <ArrowDownLeft size={14} />
                            <span>{t.payables}</span>
                          </div>
                          <p className="text-base font-bold font-mono text-white">
                            ₺{financialProfile?.totalPayableOutstanding?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
                          </p>
                        </div>
                      </div>

                      {/* Billing Accounts List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CreditCard size={14} className="text-indigo-400" />
                            <span>{t.billingAccounts}</span>
                          </h3>
                        </div>

                        {financialProfile?.billingAccounts?.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            Kredili açık hesap kartı bulunmuyor.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {financialProfile?.billingAccounts.map(ba => (
                              <div
                                key={ba.billingAccountId}
                                className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold text-indigo-400">
                                    #{ba.billingAccountId}
                                  </span>
                                  <span className="text-xs font-bold text-white">
                                    ₺{ba.accountLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {ba.accountCurrencyUomId}
                                  </span>
                                </div>
                                {ba.description && (
                                  <p className="text-xs text-slate-400">{ba.description}</p>
                                )}
                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                                  <span>Kalan: ₺{ba.availableBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                  <span>Rol: {ba.roleTypeId}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tax Auth Info */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-indigo-400" />
                          <span>{t.taxAuthInfo}</span>
                        </h3>

                        {financialProfile?.taxAuthInfos?.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            Kayıtlı vergi muafiyet veya vergi dairesi bilgisi bulunmuyor.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {financialProfile?.taxAuthInfos.map((tai, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <p className="font-semibold text-slate-200">
                                    {tai.taxAuthGeoId} - {tai.taxAuthPartyId}
                                  </p>
                                  {tai.partyTaxId && (
                                    <p className="text-slate-400 font-mono mt-0.5">
                                      Vergi No: {tai.partyTaxId}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`ds-badge ${
                                    tai.isExempt === 'Y' ? 'ds-badge-green' : 'ds-badge-gray'
                                  }`}
                                >
                                  {tai.isExempt === 'Y' ? 'Vergiden Muaf' : 'Standart Vergi'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: TERMS (Phase 2) */}
                  {drawerTab === 'TERMS' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <CalendarClock size={14} className="text-indigo-400" />
                          <span>{t.paymentTermsTitle}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsPaymentTermModalOpen(true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Plus size={13} />
                          <span>{t.addPaymentTerm}</span>
                        </button>
                      </div>

                      {financialProfile?.paymentTerms?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                          {t.noPaymentTerms}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {financialProfile?.paymentTerms.map(term => (
                            <div
                              key={term.agreementTermId}
                              className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">
                                    {term.termTypeDescription || term.termTypeId}
                                  </span>
                                  {term.termDays && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                      {term.termDays} Gün Vade
                                    </span>
                                  )}
                                  {term.termValue && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                      %{term.termValue}
                                    </span>
                                  )}
                                </div>
                                {term.description && (
                                  <p className="text-xs text-slate-400">{term.description}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTerm(term.agreementTermId)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title={common.delete}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 4: SEGMENTS (Phase 2) */}
                  {drawerTab === 'SEGMENTS' && (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                        <label className="block text-xs font-semibold text-slate-300">
                          {t.addSegment}
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedSegmentToAdd}
                            onChange={e => setSelectedSegmentToAdd(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">{t.selectSegment}...</option>
                            {financialProfile?.availableGroups.map(grp => (
                              <option
                                key={grp.partyClassificationGroupId}
                                value={grp.partyClassificationGroupId}
                              >
                                {grp.description || grp.partyClassificationGroupId}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedSegmentToAdd}
                            onClick={handleAddSegment}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                          >
                            {common.create}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Tag size={14} className="text-indigo-400" />
                          <span>{t.segmentsTitle}</span>
                        </h3>

                        {financialProfile?.classifications?.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noSegments}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {financialProfile?.classifications.map(pc => (
                              <span
                                key={pc.partyClassificationGroupId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium"
                              >
                                <span>{pc.description || pc.partyClassificationGroupId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSegment(pc.partyClassificationGroupId)}
                                  className="text-purple-400 hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <X size={13} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 5: NOTES (Phase 2) */}
                  {drawerTab === 'NOTES' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <MessageSquarePlus size={14} className="text-indigo-400" />
                          <span>{t.crmNotesTitle}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsNoteModalOpen(true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Plus size={13} />
                          <span>{t.addNote}</span>
                        </button>
                      </div>

                      {financialProfile?.notes?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                          {t.noNotes}
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {financialProfile?.notes.map(note => (
                            <div
                              key={note.noteId}
                              className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">
                                  {note.noteName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {note.noteDateTime?.split('.')[0]}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 whitespace-pre-wrap">
                                {note.noteInfo}
                              </p>
                              <div className="text-[10px] text-slate-500 pt-1">
                                {t.author}: <span className="text-slate-400">{note.noteParty}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 6: PAYMENTS */}
                  {drawerTab === 'PAYMENTS' && (
                    <div className="space-y-6">
                      {/* Section 1: Bank Accounts */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Building2 size={14} className="text-emerald-400" />
                            <span>{t.bankAccounts}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsPaymentMethodModalOpen(true)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addBankAccount}</span>
                          </button>
                        </div>

                        {paymentMethods?.eftAccounts?.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noBankAccounts}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {paymentMethods?.eftAccounts.map(eft => (
                              <div
                                key={eft.paymentMethodId}
                                className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-3"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">
                                      {eft.bankName}
                                    </span>
                                    {eft.routingNumber && (
                                      <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                        {eft.routingNumber}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-mono font-semibold text-emerald-400 tracking-wide">
                                    {eft.accountNumber}
                                  </p>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                    {eft.nameOnAccount && (
                                      <span>{t.accountHolder}: <strong className="text-slate-300">{eft.nameOnAccount}</strong></span>
                                    )}
                                    {eft.description && (
                                      <span className="italic text-slate-500">({eft.description})</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePaymentMethod(eft.paymentMethodId)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                                  title={common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Credit Cards */}
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CreditCard size={14} className="text-indigo-400" />
                            <span>{t.creditCards}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsPaymentMethodModalOpen(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus size={13} />
                            <span>{t.addCreditCard}</span>
                          </button>
                        </div>

                        {paymentMethods?.creditCards?.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                            {t.noCreditCards}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {paymentMethods?.creditCards.map(cc => (
                              <div
                                key={cc.paymentMethodId}
                                className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-3"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">
                                      {cc.cardType.replace('CCT_', '')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                      {cc.expireDate}
                                    </span>
                                  </div>
                                  <p className="text-xs font-mono font-semibold text-slate-300 tracking-wider">
                                    {cc.cardNumberMasked}
                                  </p>
                                  {cc.firstNameOnCard && (
                                    <p className="text-[10px] text-slate-400">
                                      {t.nameOnCard}: <strong className="text-slate-300">{cc.firstNameOnCard}</strong>
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePaymentMethod(cc.paymentMethodId)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                                  title={common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 7: DOCUMENTS */}
                  {drawerTab === 'DOCUMENTS' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FolderOpen size={14} className="text-sky-400" />
                          <span>{t.documentsTitle}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsContentModalOpen(true)}
                          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Plus size={13} />
                          <span>{t.addDocument}</span>
                        </button>
                      </div>

                      {partyContents?.contents?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                          {t.noDocuments}
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {partyContents?.contents.map(doc => (
                            <div
                              key={doc.contentId}
                              className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                                    {doc.contentTypeDescription || doc.partyContentTypeId}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {doc.fromDate?.split(' ')[0]}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white truncate">
                                  {doc.contentName}
                                </h4>
                                {doc.description && (
                                  <p className="text-xs text-slate-400">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteContent(doc.contentId)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                title={common.delete}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 8: ATTRIBUTES */}
                  {drawerTab === 'ATTRIBUTES' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Sliders size={14} className="text-purple-400" />
                          <span>{t.attributesTitle}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsAttributeModalOpen(true)}
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Plus size={13} />
                          <span>{t.addAttribute}</span>
                        </button>
                      </div>

                      {partyAttributes.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                          {t.noAttributes}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {partyAttributes.map(attr => (
                            <div
                              key={attr.attrName}
                              className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-purple-400">
                                    {attr.attrName}
                                  </span>
                                </div>
                                <p className="text-xs text-white break-words">
                                  {attr.attrValue}
                                </p>
                                {attr.attrDescription && (
                                  <p className="text-[10px] text-slate-400 italic">
                                    {attr.attrDescription}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAttribute(attr.attrName)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                title={common.delete}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 9: USER_LOGINS */}
                  {drawerTab === 'USER_LOGINS' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Key size={14} className="text-amber-400" />
                          <span>{t.userLoginsTitle}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsUserLoginModalOpen(true)}
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Plus size={13} />
                          <span>{t.addUserLogin}</span>
                        </button>
                      </div>

                      {partyUserLogins?.userLogins?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                          {t.noUserLogins}
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {partyUserLogins?.userLogins.map(ul => (
                            <div
                              key={ul.userLoginId}
                              className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-3"
                            >
                              <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs font-mono font-bold text-amber-300">
                                    {ul.userLoginId}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                      ul.enabled === 'Y'
                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                    }`}
                                  >
                                    {ul.enabled === 'Y' ? t.activeStatus : t.disabledStatus}
                                  </span>
                                </div>

                                {ul.securityGroups && ul.securityGroups.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {ul.securityGroups.map(sg => (
                                      <span
                                        key={sg.groupId}
                                        className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300 font-mono"
                                        title={sg.description}
                                      >
                                        {sg.groupId}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleUserLoginStatus(ul.userLoginId, ul.enabled)}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                                  ul.enabled === 'Y'
                                    ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10'
                                    : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                                }`}
                              >
                                {ul.enabled === 'Y' ? t.deactivate : t.activate}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modals ── */}
      {isCreateModalOpen && (
        <CreatePartyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={newPartyId => {
            loadParties();
            handleOpenDetail(newPartyId);
          }}
          roleOptions={roleOptions}
        />
      )}

      {isContactModalOpen && partyDetail && (
        <PartyContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          partyId={partyDetail.partyId}
          partyName={partyDetail.displayName}
          onSuccess={() => {
            handleOpenDetail(partyDetail.partyId);
            loadParties();
          }}
          purposeOptions={metadata?.contactMechPurposeTypes || []}
          identificationTypeOptions={metadata?.identificationTypes || []}
        />
      )}

      {isRelationshipModalOpen && partyDetail && (
        <PartyRelationshipModal
          isOpen={isRelationshipModalOpen}
          onClose={() => setIsRelationshipModalOpen(false)}
          companyPartyId={partyDetail.partyId}
          companyName={partyDetail.displayName}
          onSuccess={() => {
            handleOpenDetail(partyDetail.partyId);
          }}
        />
      )}

      {statementPartyId && (
        <PartyStatementModal
          isOpen={Boolean(statementPartyId)}
          onClose={() => setStatementPartyId(null)}
          partyId={statementPartyId}
          partyName={partyDetail?.displayName || statementPartyId}
        />
      )}

      {isFinancialModalOpen && partyDetail && (
        <PartyFinancialModal
          isOpen={isFinancialModalOpen}
          onClose={() => setIsFinancialModalOpen(false)}
          partyId={partyDetail.partyId}
          initialLimit={financialProfile?.totalCreditLimit || 0}
          initialCurrency={financialProfile?.billingAccounts[0]?.accountCurrencyUomId || 'TRY'}
          initialDescription={financialProfile?.billingAccounts[0]?.description || ''}
          billingAccountId={financialProfile?.billingAccounts[0]?.billingAccountId}
          onSuccess={() => {
            refreshFinancialData(partyDetail.partyId);
          }}
        />
      )}

      {isPaymentTermModalOpen && partyDetail && (
        <PartyPaymentTermModal
          isOpen={isPaymentTermModalOpen}
          onClose={() => setIsPaymentTermModalOpen(false)}
          partyId={partyDetail.partyId}
          availableTermTypes={financialProfile?.availableTermTypes || []}
          onSuccess={() => {
            refreshFinancialData(partyDetail.partyId);
          }}
        />
      )}

      {isNoteModalOpen && partyDetail && (
        <PartyNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          partyId={partyDetail.partyId}
          onSuccess={() => {
            refreshFinancialData(partyDetail.partyId);
          }}
        />
      )}

      {isPaymentMethodModalOpen && partyDetail && (
        <PartyPaymentMethodModal
          isOpen={isPaymentMethodModalOpen}
          onClose={() => setIsPaymentMethodModalOpen(false)}
          partyId={partyDetail.partyId}
          onSuccess={() => {
            refreshPaymentMethods(partyDetail.partyId);
          }}
        />
      )}

      {isContentModalOpen && partyDetail && (
        <PartyContentModal
          isOpen={isContentModalOpen}
          onClose={() => setIsContentModalOpen(false)}
          partyId={partyDetail.partyId}
          availableTypes={partyContents?.availableTypes || []}
          onSuccess={() => {
            refreshContents(partyDetail.partyId);
          }}
        />
      )}

      {isAttributeModalOpen && partyDetail && (
        <PartyAttributeModal
          isOpen={isAttributeModalOpen}
          onClose={() => setIsAttributeModalOpen(false)}
          partyId={partyDetail.partyId}
          onSuccess={() => {
            refreshAttributes(partyDetail.partyId);
          }}
        />
      )}

      {isUserLoginModalOpen && partyDetail && (
        <PartyUserLoginModal
          isOpen={isUserLoginModalOpen}
          onClose={() => setIsUserLoginModalOpen(false)}
          partyId={partyDetail.partyId}
          availableSecurityGroups={partyUserLogins?.availableSecurityGroups || []}
          onSuccess={() => {
            refreshUserLogins(partyDetail.partyId);
          }}
        />
      )}
    </div>
  );
};
