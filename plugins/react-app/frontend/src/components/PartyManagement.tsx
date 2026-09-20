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
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import {
  fetchParties,
  fetchPartyDetail,
  fetchPartyMetadata,
  setPartyStatus,
  deletePartyContactMech,
  deletePartyIdentification,
  PartyListItem,
  PartyMetrics,
  PartyDetail,
  PartyMetadataResponse,
} from '../services/api';
import { CreatePartyModal } from './CreatePartyModal';
import { PartyContactModal } from './PartyContactModal';
import { PartyRelationshipModal } from './PartyRelationshipModal';
import { PartyStatementModal } from './PartyStatementModal';

type ActiveTab = 'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'DISABLED';

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
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [statementPartyId, setStatementPartyId] = useState<string | null>(null);

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

  // Load single party detail
  const handleOpenDetail = async (partyId: string) => {
    setSelectedPartyId(partyId);
    setIsLoadingDetail(true);
    try {
      const res = await fetchPartyDetail(partyId);
      setPartyDetail(res.partyDetail);
    } catch (err: any) {
      console.error('Error fetching party details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedPartyId(null);
    setPartyDetail(null);
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

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="ds-spinner mx-auto mb-2" />
                  <span>{common.loading}</span>
                </div>
              ) : partyDetail ? (
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
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                                {addr.purposeTypeId}
                              </span>
                              <p className="text-xs text-white font-medium">
                                {addr.address1} {addr.address2}
                              </p>
                              <p className="text-xs text-slate-400">
                                {addr.city} {addr.postalCode} - {addr.countryGeoId}
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
                      <div className="space-y-2">
                        {partyDetail.telecomNumbers.map(tn => (
                          <div
                            key={tn.contactMechId}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80"
                          >
                            <div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                                {tn.purposeTypeId}
                              </span>
                              <p className="text-xs font-mono font-bold text-white mt-1">
                                {tn.fullNumber}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(tn.contactMechId)}
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
                            <div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                                {em.purposeTypeId}
                              </span>
                              <p className="text-xs font-semibold text-white mt-1">
                                {em.emailAddress}
                              </p>
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

                  {/* Relationships & Key Contacts */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-400" />
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
                          const isFrom = rel.partyIdFrom === partyDetail.partyId;
                          const targetName = isFrom ? rel.partyNameTo : rel.partyNameFrom;
                          const targetId = isFrom ? rel.partyIdTo : rel.partyIdFrom;

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                                  {rel.partyRelationshipTypeId}
                                </span>
                                <p className="text-xs font-semibold text-white mt-1">
                                  {targetName} ({targetId})
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
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-indigo-400" />
                      <span>{t.rolesAndClass}</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {partyDetail.roles.map(r => (
                        <span
                          key={r.roleTypeId}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700"
                        >
                          {r.description} ({r.roleTypeId})
                        </span>
                      ))}
                    </div>
                  </div>
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
    </div>
  );
};
