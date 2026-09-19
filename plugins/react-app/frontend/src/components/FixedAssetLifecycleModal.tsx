import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  TrendingDown,
  Wrench,
  Gauge,
  Users,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  Calendar,
  DollarSign,
  AlertCircle,
  FileCheck,
  Building2,
  Tag,
  Check,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  api,
  FixedAssetItem,
  FixedAssetDepreciationResponse,
  FixedAssetMaintItem,
  FixedAssetMeterItem,
  FixedAssetAssignmentItem,
  FixedAssetRegistrationItem,
  FixedAssetIdentItem,
  CreateFixedAssetMaintPayload,
  CreateFixedAssetMeterPayload,
  CreateFixedAssetAssignmentPayload,
  CreateFixedAssetRegistrationPayload,
} from '../services/api';
import { useTranslation } from '../i18n';

interface FixedAssetLifecycleModalProps {
  asset: FixedAssetItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAssetUpdated?: () => void;
}

type TabType = 'overview' | 'depreciation' | 'maintenance' | 'meters' | 'assignments' | 'registrations';

export const FixedAssetLifecycleModal: React.FC<FixedAssetLifecycleModalProps> = ({
  asset,
  isOpen,
  onClose,
  onAssetUpdated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.fixedAssetLifecycle;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data states
  const [depreciationData, setDepreciationData] = useState<FixedAssetDepreciationResponse | null>(null);
  const [maintenances, setMaintenances] = useState<FixedAssetMaintItem[]>([]);
  const [meters, setMeters] = useState<FixedAssetMeterItem[]>([]);
  const [assignments, setAssignments] = useState<FixedAssetAssignmentItem[]>([]);
  const [registrations, setRegistrations] = useState<FixedAssetRegistrationItem[]>([]);
  const [identifications, setIdentifications] = useState<FixedAssetIdentItem[]>([]);

  // Post Depreciation Modal state
  const [showPostDepModal, setShowPostDepModal] = useState<boolean>(false);
  const [depPostAmount, setDepPostAmount] = useState<string>('');
  const [debitGlAccount, setDebitGlAccount] = useState<string>('600000');
  const [creditGlAccount, setCreditGlAccount] = useState<string>('175000');
  const [depDescription, setDepDescription] = useState<string>('');

  // Maintenance modal state
  const [showMaintModal, setShowMaintModal] = useState<boolean>(false);
  const [maintForm, setMaintForm] = useState<CreateFixedAssetMaintPayload>({
    fixedAssetId: '',
    productMaintTypeId: 'ROUTINE_MAINT',
    statusId: 'FAM_CREATED',
    maintenanceDate: new Date().toISOString().substring(0, 10),
    comments: '',
  });

  // Meter modal state
  const [showMeterModal, setShowMeterModal] = useState<boolean>(false);
  const [meterForm, setMeterForm] = useState<CreateFixedAssetMeterPayload>({
    fixedAssetId: '',
    productMeterTypeId: 'ODOMETER',
    readingDate: new Date().toISOString().substring(0, 10),
    meterValue: 0,
  });

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState<CreateFixedAssetAssignmentPayload>({
    fixedAssetId: '',
    partyId: '',
    roleTypeId: 'OPERATOR',
    fromDate: new Date().toISOString().substring(0, 10),
    comments: '',
  });

  // Registration modal state
  const [showRegModal, setShowRegModal] = useState<boolean>(false);
  const [regForm, setRegForm] = useState<CreateFixedAssetRegistrationPayload>({
    fixedAssetId: '',
    registrationNumber: '',
    licenseNumber: '',
    govAgencyPartyId: '',
    registrationDate: new Date().toISOString().substring(0, 10),
    fixedAssetIdentTypeId: 'VIN',
    idValue: '',
  });

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const fmt = useCallback((amount?: number | null, uom?: string) => {
    if (amount === undefined || amount === null) return '0.00';
    return new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: uom || 'TRY',
      maximumFractionDigits: 2,
    }).format(amount);
  }, [isTr]);

  const loadAllData = useCallback(async (faId: string) => {
    setLoading(true);
    try {
      const [depRes, maintRes, meterRes, assignRes, regRes] = await Promise.allSettled([
        api.getFixedAssetDepreciation(faId),
        api.getFixedAssetMaintenances(faId),
        api.getFixedAssetMeters(faId),
        api.getFixedAssetAssignments(faId),
        api.getFixedAssetRegistrations(faId),
      ]);

      if (depRes.status === 'fulfilled') {
        setDepreciationData(depRes.value);
        if (depRes.value.nextSuggestedAmount) {
          setDepPostAmount(depRes.value.nextSuggestedAmount.toString());
        }
      }
      if (maintRes.status === 'fulfilled') {
        setMaintenances(maintRes.value.maintenances || []);
      }
      if (meterRes.status === 'fulfilled') {
        setMeters(meterRes.value.meters || []);
      }
      if (assignRes.status === 'fulfilled') {
        setAssignments(assignRes.value.assignments || []);
      }
      if (regRes.status === 'fulfilled') {
        setRegistrations(regRes.value.registrations || []);
        setIdentifications(regRes.value.identifications || []);
      }
    } catch (err: any) {
      triggerError(err.message || 'Error loading lifecycle data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && asset?.fixedAssetId) {
      setActiveTab('overview');
      setSuccessMsg(null);
      setErrorMsg(null);
      setDepDescription(`${asset.fixedAssetName || asset.fixedAssetId} Amortisman Kaydı`);
      loadAllData(asset.fixedAssetId);
    }
  }, [isOpen, asset, loadAllData]);

  if (!isOpen || !asset) return null;

  // Overview calculated metrics
  const purchaseCost = depreciationData?.purchaseCost ?? asset.purchaseCost ?? 0;
  const accumulatedDep = depreciationData?.accumulatedDepreciation ?? asset.depreciation ?? 0;
  const salvageVal = depreciationData?.salvageValue ?? asset.salvageValue ?? 0;
  const netBookValue = depreciationData?.netBookValue ?? asset.netBookValue ?? (purchaseCost - accumulatedDep);
  const depreciableBase = Math.max(0, purchaseCost - salvageVal);
  const depProgressPct = depreciableBase > 0 ? Math.min(100, Math.round((accumulatedDep / depreciableBase) * 100)) : 0;

  // Handlers
  const handlePostDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depPostAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerError(isTr ? 'Geçerli bir amortisman tutarı giriniz.' : 'Please enter a valid depreciation amount.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.postFixedAssetDepreciation({
        fixedAssetId: asset.fixedAssetId,
        amount: amt,
        description: depDescription,
        debitGlAccountId: debitGlAccount,
        creditGlAccountId: creditGlAccount,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || t.depreciation.postingSuccess);
      setShowPostDepModal(false);
      await loadAllData(asset.fixedAssetId);
      if (onAssetUpdated) onAssetUpdated();
    } catch (err: any) {
      triggerError(err.message || 'Depreciation post failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createFixedAssetMaint({
        ...maintForm,
        fixedAssetId: asset.fixedAssetId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Bakım görevi eklendi.' : 'Maintenance order created.'));
      setShowMaintModal(false);
      setMaintForm({
        fixedAssetId: asset.fixedAssetId,
        productMaintTypeId: 'ROUTINE_MAINT',
        statusId: 'FAM_CREATED',
        maintenanceDate: new Date().toISOString().substring(0, 10),
        comments: '',
      });
      await loadAllData(asset.fixedAssetId);
    } catch (err: any) {
      triggerError(err.message || 'Failed to create maintenance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMaintStatus = async (maintHistSeqId: string, statusId: string) => {
    setActionLoading(true);
    try {
      const res = await api.updateFixedAssetMaintStatus({
        fixedAssetId: asset.fixedAssetId,
        maintHistSeqId,
        statusId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Bakım durumu güncellendi.' : 'Status updated.'));
      await loadAllData(asset.fixedAssetId);
    } catch (err: any) {
      triggerError(err.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(meterForm.meterValue);
    if (isNaN(val) || val < 0) {
      triggerError(isTr ? 'Geçerli bir sayaç değeri giriniz.' : 'Please enter a valid meter value.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createFixedAssetMeter({
        ...meterForm,
        fixedAssetId: asset.fixedAssetId,
        meterValue: val,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Sayaç okuması kaydedildi.' : 'Meter reading recorded.'));
      setShowMeterModal(false);
      setMeterForm({
        fixedAssetId: asset.fixedAssetId,
        productMeterTypeId: 'ODOMETER',
        readingDate: new Date().toISOString().substring(0, 10),
        meterValue: 0,
      });
      await loadAllData(asset.fixedAssetId);
    } catch (err: any) {
      triggerError(err.message || 'Meter save failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.partyId?.trim()) {
      triggerError(isTr ? 'Lütfen bir personel veya cari kodu giriniz.' : 'Please enter a party ID.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createFixedAssetAssignment({
        ...assignForm,
        fixedAssetId: asset.fixedAssetId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Zimmet kaydı oluşturuldu.' : 'Assignment created.'));
      setShowAssignModal(false);
      setAssignForm({
        fixedAssetId: asset.fixedAssetId,
        partyId: '',
        roleTypeId: 'OPERATOR',
        fromDate: new Date().toISOString().substring(0, 10),
        comments: '',
      });
      await loadAllData(asset.fixedAssetId);
    } catch (err: any) {
      triggerError(err.message || 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseAssignment = async (a: FixedAssetAssignmentItem) => {
    if (!window.confirm(t.assignments.releaseConfirm)) return;
    setActionLoading(true);
    try {
      const res = await api.releaseFixedAssetAssignment({
        fixedAssetId: asset.fixedAssetId,
        partyId: a.partyId,
        roleTypeId: a.roleTypeId,
        fromDate: a.fromDate,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Zimmet başarıyla düşürüldü.' : 'Assignment released.'));
      await loadAllData(asset.fixedAssetId);
    } catch (err: any) {
      triggerError(err.message || 'Release failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createFixedAssetRegistration({
        ...regForm,
        fixedAssetId: asset.fixedAssetId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Tescil belgesi kaydedildi.' : 'Registration saved.'));
      setShowRegModal(false);
      setRegForm({
        fixedAssetId: asset.fixedAssetId,
        registrationNumber: '',
        licenseNumber: '',
        govAgencyPartyId: '',
        registrationDate: new Date().toISOString().substring(0, 10),
        fixedAssetIdentTypeId: 'VIN',
        idValue: '',
      });
      await loadAllData(asset.fixedAssetId);
    } catch (err: any) {
      triggerError(err.message || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getMaintStatusBadge = (statusId: string) => {
    switch (statusId) {
      case 'FAM_COMPLETED':
        return <span className="ds-badge ds-badge-green"><CheckCircle2 size={12} className="mr-1 inline" />{t.maintenance.completed}</span>;
      case 'FAM_IN_PROCESS':
        return <span className="ds-badge ds-badge-blue"><Clock size={12} className="mr-1 inline" />{t.maintenance.inProcess}</span>;
      case 'FAM_CANCELLED':
        return <span className="ds-badge ds-badge-red">{t.maintenance.cancelled}</span>;
      default:
        return <span className="ds-badge ds-badge-yellow">{t.maintenance.created}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="ds-card border-slate-700/80 w-full max-w-5xl bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto rounded-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/90 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Building2 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {asset.fixedAssetName || asset.fixedAssetId}
                  </h2>
                  <span className="ds-badge ds-badge-blue font-mono text-xs">
                    #{asset.fixedAssetId}
                  </span>
                  <span className="ds-badge ds-badge-slate text-xs">
                    {asset.fixedAssetTypeDesc || asset.fixedAssetTypeId}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  {t.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAllData(asset.fixedAssetId)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isTr ? 'Yenile' : 'Refresh'}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/50 flex overflow-x-auto no-scrollbar gap-1 pt-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={16} />
            {t.tabs.overview}
          </button>

          <button
            onClick={() => setActiveTab('depreciation')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'depreciation'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown size={16} />
            {t.tabs.depreciation}
            {depreciationData?.transactionHistory?.length ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {depreciationData.transactionHistory.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'maintenance'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench size={16} />
            {t.tabs.maintenance}
            {maintenances.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {maintenances.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('meters')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'meters'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge size={16} />
            {t.tabs.meters}
            {meters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {meters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'assignments'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            {t.tabs.assignments}
            {assignments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {assignments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'registrations'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            {t.tabs.registrations}
            {registrations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {registrations.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="ds-card p-4 border-l-4 border-l-indigo-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.depreciation.purchaseCost}</div>
                  <div className="text-2xl font-bold text-white tracking-tight">{fmt(purchaseCost, asset.purchaseCostUomId)}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {asset.dateAcquired ? asset.dateAcquired.substring(0, 10) : '—'}
                  </div>
                </div>

                <div className="ds-card p-4 border-l-4 border-l-amber-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.depreciation.salvageValue}</div>
                  <div className="text-2xl font-bold text-amber-400 tracking-tight">{fmt(salvageVal, asset.purchaseCostUomId)}</div>
                  <div className="text-xs text-slate-400">{isTr ? 'Geri kazanım değeri' : 'Residual baseline'}</div>
                </div>

                <div className="ds-card p-4 border-l-4 border-l-rose-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.depreciation.accumulatedDep}</div>
                  <div className="text-2xl font-bold text-rose-400 tracking-tight">{fmt(accumulatedDep, asset.purchaseCostUomId)}</div>
                  <div className="text-xs text-slate-400">{depProgressPct}% {isTr ? 'amorti edildi' : 'depreciated'}</div>
                </div>

                <div className="ds-card p-4 border-l-4 border-l-emerald-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.depreciation.netBookValue}</div>
                  <div className="text-2xl font-bold text-emerald-400 tracking-tight">{fmt(netBookValue, asset.purchaseCostUomId)}</div>
                  <div className="text-xs text-slate-400">{isTr ? 'Bilanço defter değeri' : 'Current balance sheet value'}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="ds-card p-5 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <TrendingDown size={16} className="text-indigo-400" />
                    {isTr ? 'Amortisman İlerleme Durumu' : 'Depreciation Depletion Progress'}
                  </span>
                  <span className="font-bold text-indigo-400">{depProgressPct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${depProgressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-1">
                  <span>{isTr ? 'Ayrılan: ' : 'Posted: '}{fmt(accumulatedDep, asset.purchaseCostUomId)}</span>
                  <span>{isTr ? 'Kalan Amortisman Payı: ' : 'Remaining: '}{fmt(Math.max(0, depreciableBase - accumulatedDep), asset.purchaseCostUomId)}</span>
                </div>
              </div>

              {/* Asset Details & Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ds-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Tag size={16} className="text-indigo-400" />
                    {isTr ? 'Duran Varlık Künyesi' : 'Asset Identity & Specs'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Varlık Kodu' : 'Asset ID'}</span>
                      <span className="font-medium text-white">{asset.fixedAssetId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Seri Numarası' : 'Serial Number'}</span>
                      <span className="font-medium text-white">{asset.serialNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'İktisap Tarihi' : 'Date Acquired'}</span>
                      <span className="font-medium text-white">{asset.dateAcquired ? asset.dateAcquired.substring(0, 10) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Tahmini Ömür Sonu' : 'Expected End of Life'}</span>
                      <span className="font-medium text-white">{asset.expectedEndOfLife ? asset.expectedEndOfLife.substring(0, 10) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{t.depreciation.method}</span>
                      <span className="font-medium text-indigo-400">{depreciationData?.depreciationMethod || 'ST_LINE_DEP'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{t.depreciation.usefulYears}</span>
                      <span className="font-medium text-white">{depreciationData?.usefulYears || 5} {isTr ? 'Yıl' : 'Years'}</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Wrench size={16} className="text-amber-400" />
                    {isTr ? 'Yaşam Döngüsü Özeti' : 'Lifecycle Operational Summary'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Planlı/Aktif Bakımlar' : 'Active Maintenances'}</span>
                      <span className="text-lg font-bold text-amber-400">
                        {maintenances.filter(m => m.statusId !== 'FAM_COMPLETED' && m.statusId !== 'FAM_CANCELLED').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Son Sayaç Okuması' : 'Latest Meter Reading'}</span>
                      <span className="text-lg font-bold text-white">
                        {meters.length > 0 ? `${meters[0].meterValue} (${meters[0].productMeterTypeId})` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Aktif Zimmetli Personel' : 'Current Custodian'}</span>
                      <span className="text-sm font-medium text-indigo-400">
                        {assignments.find(a => a.isActive)?.partyName || (isTr ? 'Zimmetsiz (Depoda)' : 'Unassigned')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Ruhsat / Plaka Belgesi' : 'License / Plate'}</span>
                      <span className="text-sm font-medium text-white">
                        {registrations.length > 0 ? (registrations[0].licenseNumber || registrations[0].registrationNumber) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => { setActiveTab('depreciation'); setShowPostDepModal(true); }}
                      className="ds-btn-primary text-xs py-2 px-3"
                    >
                      <TrendingDown size={14} />
                      {t.depreciation.postToGl}
                    </button>
                    <button
                      onClick={() => { setActiveTab('maintenance'); setShowMaintModal(true); }}
                      className="ds-btn-secondary text-xs py-2 px-3"
                    >
                      <Wrench size={14} />
                      {t.maintenance.newTask}
                    </button>
                    <button
                      onClick={() => { setActiveTab('meters'); setShowMeterModal(true); }}
                      className="ds-btn-secondary text-xs py-2 px-3"
                    >
                      <Gauge size={14} />
                      {t.meters.newReading}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: DEPRECIATION & GL ================= */}
          {activeTab === 'depreciation' && (
            <div className="space-y-6">
              {/* Header with Post to GL Action */}
              <div className="ds-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-indigo-500/20">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <DollarSign size={18} className="text-indigo-400" />
                    {t.depreciation.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {t.depreciation.method}: <span className="text-indigo-300 font-mono">Straight Line ({depreciationData?.depreciationMethod || 'ST_LINE_DEP'})</span> | {t.depreciation.usefulYears}: {depreciationData?.usefulYears || 5}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-400">{t.depreciation.nextSuggestedAmount}</div>
                    <div className="text-lg font-bold text-indigo-400">
                      {fmt(depreciationData?.nextSuggestedAmount, asset.purchaseCostUomId)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPostDepModal(true)}
                    className="ds-btn-primary"
                  >
                    <TrendingDown size={16} />
                    {t.depreciation.postToGl}
                  </button>
                </div>
              </div>

              {/* Straight Line Projection Schedule Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={15} className="text-indigo-400" />
                  {t.depreciation.scheduleTitle}
                </h4>
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">#</th>
                        <th className="ds-th">{t.depreciation.year}</th>
                        <th className="ds-th-right">{t.depreciation.depAmount}</th>
                        <th className="ds-th-right">{t.depreciation.accumAmount}</th>
                        <th className="ds-th-right">{t.depreciation.endingNbv}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depreciationData?.projectionSchedule?.length ? (
                        depreciationData.projectionSchedule.map((s, idx) => (
                          <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                            <td className="ds-td font-mono text-slate-400">{s.yearNumber}</td>
                            <td className="ds-td font-medium text-white">{s.year}</td>
                            <td className="ds-td-right font-medium text-rose-400">
                              {fmt(s.depreciationAmount, asset.purchaseCostUomId)}
                            </td>
                            <td className="ds-td-right text-slate-300">
                              {fmt(s.accumulatedDepreciation, asset.purchaseCostUomId)}
                            </td>
                            <td className="ds-td-right font-bold text-emerald-400">
                              {fmt(s.netBookValue, asset.purchaseCostUomId)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="ds-td text-center py-8 text-slate-400">
                            {isTr ? 'Projeksiyon hesaplanamadı.' : 'No schedule calculated.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical GL Depreciation Transactions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck size={15} className="text-emerald-400" />
                  {t.depreciation.historyTitle}
                </h4>
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.depreciation.transId}</th>
                        <th className="ds-th">{t.depreciation.date}</th>
                        <th className="ds-th">{t.depreciation.description}</th>
                        <th className="ds-th">{t.depreciation.status}</th>
                        <th className="ds-th-right">{t.depreciation.depAmount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depreciationData?.transactionHistory?.length ? (
                        depreciationData.transactionHistory.map((tr) => (
                          <tr key={tr.acctgTransId} className="ds-tbody-row hover:bg-slate-800/40">
                            <td className="ds-td font-mono text-indigo-400 font-medium">
                              #{tr.acctgTransId}
                            </td>
                            <td className="ds-td text-slate-300">{tr.transactionDate}</td>
                            <td className="ds-td text-slate-200">{tr.description}</td>
                            <td className="ds-td">
                              {tr.isPosted === 'Y' ? (
                                <span className="ds-badge ds-badge-green">
                                  <CheckCircle2 size={12} className="mr-1 inline" />
                                  {t.depreciation.posted}
                                </span>
                              ) : (
                                <span className="ds-badge ds-badge-yellow">
                                  {t.depreciation.unposted}
                                </span>
                              )}
                            </td>
                            <td className="ds-td-right font-bold text-rose-400">
                              {fmt(tr.amount, asset.purchaseCostUomId)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="ds-td text-center py-8 text-slate-400">
                            {t.depreciation.noHistory}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: MAINTENANCE ================= */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.maintenance.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Duran varlığa ait periyodik servis ve arıza müdahale geçmişi.' : 'Maintenance history and work orders.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowMaintModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.maintenance.newTask}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{t.maintenance.maintSeq}</th>
                      <th className="ds-th">{t.maintenance.maintType}</th>
                      <th className="ds-th">{t.maintenance.date}</th>
                      <th className="ds-th">{t.maintenance.interval}</th>
                      <th className="ds-th">{t.maintenance.poNumber}</th>
                      <th className="ds-th">{t.maintenance.status}</th>
                      <th className="ds-th">{t.maintenance.comments}</th>
                      <th className="ds-th-right">{isTr ? 'İşlemler' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenances.length ? (
                      maintenances.map((m) => (
                        <tr key={m.maintHistSeqId} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-mono text-indigo-400 font-medium">
                            #{m.maintHistSeqId}
                          </td>
                          <td className="ds-td font-medium text-white">{m.productMaintTypeId}</td>
                          <td className="ds-td text-slate-300">{m.maintenanceDate}</td>
                          <td className="ds-td text-slate-400">
                            {m.intervalQuantity ? `${m.intervalQuantity} ${m.intervalUomId || ''}` : '—'}
                          </td>
                          <td className="ds-td text-slate-300 font-mono text-xs">
                            {m.purchaseOrderId || '—'}
                          </td>
                          <td className="ds-td">{getMaintStatusBadge(m.statusId)}</td>
                          <td className="ds-td text-slate-300 max-w-xs truncate">{m.comments || '—'}</td>
                          <td className="ds-td-right">
                            <div className="inline-flex items-center gap-1">
                              {m.statusId === 'FAM_CREATED' && (
                                <button
                                  onClick={() => handleUpdateMaintStatus(m.maintHistSeqId, 'FAM_IN_PROCESS')}
                                  disabled={actionLoading}
                                  className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                                >
                                  {isTr ? 'Başlat' : 'Start'}
                                </button>
                              )}
                              {m.statusId === 'FAM_IN_PROCESS' && (
                                <button
                                  onClick={() => handleUpdateMaintStatus(m.maintHistSeqId, 'FAM_COMPLETED')}
                                  disabled={actionLoading}
                                  className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                                >
                                  {isTr ? 'Tamamla' : 'Complete'}
                                </button>
                              )}
                              {m.statusId !== 'FAM_COMPLETED' && m.statusId !== 'FAM_CANCELLED' && (
                                <button
                                  onClick={() => handleUpdateMaintStatus(m.maintHistSeqId, 'FAM_CANCELLED')}
                                  disabled={actionLoading}
                                  className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                                >
                                  {isTr ? 'İptal' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="ds-td text-center py-8 text-slate-400">
                          {t.maintenance.noMaints}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: METERS ================= */}
          {activeTab === 'meters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.meters.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Araç ve makineler için kilometre ve çalışma saati sayaç logları.' : 'Operating odometer and hours readings.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowMeterModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.meters.newReading}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{t.meters.readingDate}</th>
                      <th className="ds-th">{t.meters.meterType}</th>
                      <th className="ds-th-right">{t.meters.meterValue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meters.length ? (
                      meters.map((m, idx) => (
                        <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td text-slate-300">{m.readingDate ? m.readingDate.substring(0, 16) : '—'}</td>
                          <td className="ds-td">
                            <span className="ds-badge ds-badge-indigo">
                              {m.productMeterTypeId}
                            </span>
                          </td>
                          <td className="ds-td-right font-bold text-white text-base">
                            {new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US').format(m.meterValue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="ds-td text-center py-8 text-slate-400">
                          {t.meters.noMeters}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 5: ASSIGNMENTS (ZİMMET) ================= */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.assignments.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Duran varlığın personele zimmetlenmesi ve teslim süreçleri.' : 'Custody tracking and party assignments.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.assignments.newAssignment}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{t.assignments.party}</th>
                      <th className="ds-th">{t.assignments.role}</th>
                      <th className="ds-th">{t.assignments.fromDate}</th>
                      <th className="ds-th">{t.assignments.thruDate}</th>
                      <th className="ds-th">{t.assignments.status}</th>
                      <th className="ds-th">{t.assignments.comments}</th>
                      <th className="ds-th-right">{isTr ? 'İşlemler' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.length ? (
                      assignments.map((a, idx) => (
                        <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td">
                            <div className="font-medium text-white">{a.partyName}</div>
                            <div className="text-xs text-slate-400 font-mono">{a.partyId}</div>
                          </td>
                          <td className="ds-td text-slate-300">{a.roleTypeId}</td>
                          <td className="ds-td text-slate-300">{a.fromDate}</td>
                          <td className="ds-td text-slate-400">{a.thruDate || '—'}</td>
                          <td className="ds-td">
                            {a.isActive ? (
                              <span className="ds-badge ds-badge-green">
                                <CheckCircle2 size={12} className="mr-1 inline" />
                                {t.assignments.active}
                              </span>
                            ) : (
                              <span className="ds-badge ds-badge-slate">
                                <RotateCcw size={12} className="mr-1 inline" />
                                {t.assignments.released}
                              </span>
                            )}
                          </td>
                          <td className="ds-td text-slate-300 max-w-xs truncate">{a.comments || '—'}</td>
                          <td className="ds-td-right">
                            {a.isActive && (
                              <button
                                onClick={() => handleReleaseAssignment(a)}
                                disabled={actionLoading}
                                className="text-xs px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors inline-flex items-center gap-1"
                              >
                                <RotateCcw size={12} />
                                {t.assignments.releaseBtn}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="ds-td text-center py-8 text-slate-400">
                          {t.assignments.noAssignments}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 6: REGISTRATIONS ================= */}
          {activeTab === 'registrations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.registrations.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Resmi tescil belgeleri, plakalar ve kimlik (VIN/Seri) numaraları.' : 'Government registrations and VIN/Serial identifications.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowRegModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.registrations.newRegistration}
                </button>
              </div>

              {/* Registrations List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={15} className="text-indigo-400" />
                  {isTr ? 'Ruhsat & Plaka Kayıtları' : 'Registration & Plate Records'}
                </h4>
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.registrations.regNumber}</th>
                        <th className="ds-th">{t.registrations.licensePlate}</th>
                        <th className="ds-th">{t.registrations.govAgency}</th>
                        <th className="ds-th">{t.registrations.regDate}</th>
                        <th className="ds-th">{isTr ? 'Geçerlilik' : 'Validity'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.length ? (
                        registrations.map((r, idx) => (
                          <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                            <td className="ds-td font-medium text-white">{r.registrationNumber || '—'}</td>
                            <td className="ds-td font-mono font-bold text-indigo-400">{r.licenseNumber || '—'}</td>
                            <td className="ds-td text-slate-300">{r.govAgencyPartyId || '—'}</td>
                            <td className="ds-td text-slate-300">{r.registrationDate}</td>
                            <td className="ds-td text-slate-400">
                              {r.fromDate} {r.thruDate ? `→ ${r.thruDate}` : ''}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="ds-td text-center py-8 text-slate-400">
                            {t.registrations.noRegistrations}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Identification Items (VIN/Serial) */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Tag size={15} className="text-amber-400" />
                  {isTr ? 'Kimlik & Şasi Tanımlayıcıları (Identifications)' : 'Identification Numbers'}
                </h4>
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.registrations.identType}</th>
                        <th className="ds-th">{t.registrations.identValue}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {identifications.length ? (
                        identifications.map((id, idx) => (
                          <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                            <td className="ds-td">
                              <span className="ds-badge ds-badge-slate">{id.fixedAssetIdentTypeId}</span>
                            </td>
                            <td className="ds-td font-mono font-bold text-white">{id.idValue}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="ds-td text-center py-6 text-slate-400">
                            {t.registrations.noIdents}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
          <button onClick={onClose} className="ds-btn-secondary">
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>

      {/* ================= MODAL: POST DEPRECIATION TO GL ================= */}
      {showPostDepModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingDown size={18} className="text-indigo-400" />
                {t.depreciation.postModalTitle}
              </h3>
              <button onClick={() => setShowPostDepModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostDepreciation} className="space-y-4">
              <div>
                <label className="ds-label">{t.depreciation.amountToPost} *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={depPostAmount}
                    onChange={(e) => setDepPostAmount(e.target.value)}
                    className="ds-input pl-8 font-mono text-base"
                    placeholder="0.00"
                  />
                  <DollarSign size={16} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.depreciation.debitGlAccount}</label>
                  <input
                    type="text"
                    required
                    value={debitGlAccount}
                    onChange={(e) => setDebitGlAccount(e.target.value)}
                    className="ds-input font-mono text-xs"
                    placeholder="600000"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Expense</span>
                </div>
                <div>
                  <label className="ds-label">{t.depreciation.creditGlAccount}</label>
                  <input
                    type="text"
                    required
                    value={creditGlAccount}
                    onChange={(e) => setCreditGlAccount(e.target.value)}
                    className="ds-input font-mono text-xs"
                    placeholder="175000"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Accum. Dep</span>
                </div>
              </div>

              <div>
                <label className="ds-label">{t.depreciation.description}</label>
                <input
                  type="text"
                  value={depDescription}
                  onChange={(e) => setDepDescription(e.target.value)}
                  className="ds-input text-sm"
                  placeholder="Dönem amortisman gideri mahsubu"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPostDepModal(false)}
                  className="ds-btn-secondary"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {t.depreciation.postToGl}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW MAINTENANCE TASK ================= */}
      {showMaintModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-lg bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench size={18} className="text-amber-400" />
                {t.maintenance.newTask}
              </h3>
              <button onClick={() => setShowMaintModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.maintenance.maintType}</label>
                  <select
                    value={maintForm.productMaintTypeId}
                    onChange={(e) => setMaintForm({ ...maintForm, productMaintTypeId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="ROUTINE_MAINT">Periyodik Bakım (Routine)</option>
                    <option value="REPAIR">Arıza Onarım (Repair)</option>
                    <option value="INSPECTION">Muayene / Denetim (Inspection)</option>
                    <option value="SERVICE">Genel Servis (Service)</option>
                    <option value="UPGRADE">Revizyon / Upgrade</option>
                  </select>
                </div>
                <div>
                  <label className="ds-label">{t.maintenance.date}</label>
                  <input
                    type="date"
                    required
                    value={maintForm.maintenanceDate}
                    onChange={(e) => setMaintForm({ ...maintForm, maintenanceDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.maintenance.interval}</label>
                  <input
                    type="number"
                    value={maintForm.intervalQuantity || ''}
                    onChange={(e) => setMaintForm({ ...maintForm, intervalQuantity: parseFloat(e.target.value) || undefined })}
                    className="ds-input"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="ds-label">{isTr ? 'Birim (KM / Saat)' : 'UOM / Type'}</label>
                  <input
                    type="text"
                    value={maintForm.intervalUomId || ''}
                    onChange={(e) => setMaintForm({ ...maintForm, intervalUomId: e.target.value })}
                    className="ds-input"
                    placeholder="KM / HOURS"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">{t.maintenance.poNumber}</label>
                <input
                  type="text"
                  value={maintForm.purchaseOrderId || ''}
                  onChange={(e) => setMaintForm({ ...maintForm, purchaseOrderId: e.target.value })}
                  className="ds-input font-mono text-sm"
                  placeholder="PO-10024"
                />
              </div>

              <div>
                <label className="ds-label">{t.maintenance.comments}</label>
                <textarea
                  rows={2}
                  value={maintForm.comments || ''}
                  onChange={(e) => setMaintForm({ ...maintForm, comments: e.target.value })}
                  className="ds-input"
                  placeholder="Filtre değişimi, motor yağı kontrolü vb."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="ds-btn-secondary"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW METER READING ================= */}
      {showMeterModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gauge size={18} className="text-indigo-400" />
                {t.meters.newReading}
              </h3>
              <button onClick={() => setShowMeterModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMeter} className="space-y-4">
              <div>
                <label className="ds-label">{t.meters.meterType}</label>
                <select
                  value={meterForm.productMeterTypeId}
                  onChange={(e) => setMeterForm({ ...meterForm, productMeterTypeId: e.target.value })}
                  className="ds-select"
                >
                  <option value="ODOMETER">{t.meters.odometer}</option>
                  <option value="HOURS">{t.meters.hours}</option>
                  <option value="UNITS">{isTr ? 'Üretilen Adet (Cycle)' : 'Produced Units'}</option>
                </select>
              </div>

              <div>
                <label className="ds-label">{t.meters.meterValue} *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={meterForm.meterValue}
                  onChange={(e) => setMeterForm({ ...meterForm, meterValue: parseFloat(e.target.value) || 0 })}
                  className="ds-input font-mono text-base"
                  placeholder="125400"
                />
              </div>

              <div>
                <label className="ds-label">{t.meters.readingDate}</label>
                <input
                  type="date"
                  required
                  value={meterForm.readingDate}
                  onChange={(e) => setMeterForm({ ...meterForm, readingDate: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMeterModal(false)}
                  className="ds-btn-secondary"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW ASSIGNMENT (ZİMMET) ================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                {t.assignments.newAssignment}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="ds-label">{t.assignments.party} (Party ID) *</label>
                <input
                  type="text"
                  required
                  value={assignForm.partyId}
                  onChange={(e) => setAssignForm({ ...assignForm, partyId: e.target.value })}
                  className="ds-input font-mono"
                  placeholder="admin / employee1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.assignments.role}</label>
                  <select
                    value={assignForm.roleTypeId}
                    onChange={(e) => setAssignForm({ ...assignForm, roleTypeId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="OPERATOR">Kullanıcı (Operator)</option>
                    <option value="CUSTODIAN">Zimmet Sorumlusu (Custodian)</option>
                    <option value="MANAGER">Birim Yöneticisi (Manager)</option>
                    <option value="OWNER">Sahip / Tahsisli (Owner)</option>
                  </select>
                </div>
                <div>
                  <label className="ds-label">{t.assignments.fromDate} *</label>
                  <input
                    type="date"
                    required
                    value={assignForm.fromDate}
                    onChange={(e) => setAssignForm({ ...assignForm, fromDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">{t.assignments.thruDate} ({isTr ? 'İsteğe Bağlı' : 'Optional'})</label>
                <input
                  type="date"
                  value={assignForm.thruDate || ''}
                  onChange={(e) => setAssignForm({ ...assignForm, thruDate: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div>
                <label className="ds-label">{t.assignments.comments}</label>
                <input
                  type="text"
                  value={assignForm.comments || ''}
                  onChange={(e) => setAssignForm({ ...assignForm, comments: e.target.value })}
                  className="ds-input"
                  placeholder="Teslim tutanağı imzalandı vb."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="ds-btn-secondary"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Zimmetle' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW REGISTRATION ================= */}
      {showRegModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                {t.registrations.newRegistration}
              </h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRegistration} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.registrations.regNumber}</label>
                  <input
                    type="text"
                    value={regForm.registrationNumber || ''}
                    onChange={(e) => setRegForm({ ...regForm, registrationNumber: e.target.value })}
                    className="ds-input font-mono"
                    placeholder="RUH-2024-889"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.registrations.licensePlate}</label>
                  <input
                    type="text"
                    value={regForm.licenseNumber || ''}
                    onChange={(e) => setRegForm({ ...regForm, licenseNumber: e.target.value })}
                    className="ds-input font-mono font-bold"
                    placeholder="34 ABC 123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.registrations.govAgency}</label>
                  <input
                    type="text"
                    value={regForm.govAgencyPartyId || ''}
                    onChange={(e) => setRegForm({ ...regForm, govAgencyPartyId: e.target.value })}
                    className="ds-input"
                    placeholder="EGM / Noter"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.registrations.regDate}</label>
                  <input
                    type="date"
                    value={regForm.registrationDate || ''}
                    onChange={(e) => setRegForm({ ...regForm, registrationDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isTr ? 'Kimlik / Şasi Bilgisi (İsteğe Bağlı)' : 'Identification Info'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ds-label">{t.registrations.identType}</label>
                    <select
                      value={regForm.fixedAssetIdentTypeId}
                      onChange={(e) => setRegForm({ ...regForm, fixedAssetIdentTypeId: e.target.value })}
                      className="ds-select"
                    >
                      <option value="VIN">{t.registrations.vin}</option>
                      <option value="SERIAL_NUM">{t.registrations.serialNumber}</option>
                      <option value="MODEL_NUM">{isTr ? 'Model No' : 'Model #'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="ds-label">{t.registrations.identValue}</label>
                    <input
                      type="text"
                      value={regForm.idValue || ''}
                      onChange={(e) => setRegForm({ ...regForm, idValue: e.target.value })}
                      className="ds-input font-mono"
                      placeholder="WF0XXXGCDX..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="ds-btn-secondary"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
