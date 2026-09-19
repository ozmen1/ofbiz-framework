import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Search,
  RefreshCw,
  Eye,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import {
  api,
  PaymentGatewayConfigItem,
  PaymentGatewayResponseItem,
  PaymentGatewayResponseDetail,
  PaymentGatewayMetadataResponse,
} from '../services/api';
import { useTranslation } from '../i18n';

type GatewayTab = 'responses' | 'configs';

export const PaymentGateways: React.FC = () => {
  const { translations, locale } = useTranslation();

  // State: Tab & Loading
  const [activeTab, setActiveTab] = useState<GatewayTab>('responses');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<PaymentGatewayMetadataResponse['metadata']>({
    configTypes: [],
    serviceTypes: [],
    transCodes: [],
    paymentMethodTypes: [],
  });

  // TAB 1: Responses (Transaction Logs)
  const [responses, setResponses] = useState<PaymentGatewayResponseItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [viewIndex, setViewIndex] = useState<number>(0);
  const [viewSize] = useState<number>(20);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    approvedCount: 0,
    declinedCount: 0,
    totalCapturedAmount: 0,
  });

  // Filters
  const [search, setSearch] = useState<string>('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('');
  const [methodTypeFilter, setMethodTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [thruDate, setThruDate] = useState<string>('');

  // Response Detail Modal
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [selectedResponseDetail, setSelectedResponseDetail] = useState<PaymentGatewayResponseDetail | null>(null);

  // TAB 2: Configs
  const [configs, setConfigs] = useState<PaymentGatewayConfigItem[]>([]);
  const [configsLoading, setConfigsLoading] = useState<boolean>(false);
  const [showCreateConfigModal, setShowCreateConfigModal] = useState<boolean>(false);
  const [showEditConfigModal, setShowEditConfigModal] = useState<boolean>(false);
  const [editingConfig, setEditingConfig] = useState<PaymentGatewayConfigItem | null>(null);

  const [newConfigId, setNewConfigId] = useState<string>('');
  const [newConfigTypeId, setNewConfigTypeId] = useState<string>('');
  const [newConfigDescription, setNewConfigDescription] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Format currency
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // 1. Fetch Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const res = await api.getPaymentGatewayMetadata();
      if (res && res.metadata) {
        setMetadata(res.metadata);
      }
    } catch (err: any) {
      console.warn('Could not load payment gateway metadata:', err);
    }
  }, []);

  // 2. Fetch Responses
  const loadResponses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPaymentGatewayResponses({
        search: search.trim() || undefined,
        paymentServiceTypeEnumId: serviceTypeFilter || undefined,
        paymentMethodTypeId: methodTypeFilter || undefined,
        statusFilter: statusFilter || undefined,
        fromDate: fromDate || undefined,
        thruDate: thruDate || undefined,
        viewIndex,
        viewSize,
      });

      if (res && res.responses) {
        setResponses(res.responses);
        setTotalCount(res.totalCount || 0);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching payment gateway responses');
    } finally {
      setLoading(false);
    }
  }, [search, serviceTypeFilter, methodTypeFilter, statusFilter, fromDate, thruDate, viewIndex, viewSize]);

  // 3. Fetch Configs
  const loadConfigs = useCallback(async () => {
    try {
      setConfigsLoading(true);
      const res = await api.getPaymentGatewayConfigs();
      if (res && res.configs) {
        setConfigs(res.configs);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching payment gateway configs');
    } finally {
      setConfigsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    if (activeTab === 'responses') {
      loadResponses();
    } else {
      loadConfigs();
    }
  }, [activeTab, loadResponses, loadConfigs]);

  // Open Response Detail
  const handleOpenDetail = async (responseId: string) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const res = await api.getPaymentGatewayResponseDetail(responseId);
      if (res && res.responseDetail) {
        setSelectedResponseDetail(res.responseDetail);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load response detail');
    } finally {
      setDetailLoading(false);
    }
  };

  // Create Config
  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setError(null);
      const res = await api.savePaymentGatewayConfig({
        paymentGatewayConfigId: newConfigId.trim() || undefined,
        paymentGatewayConfigTypeId: newConfigTypeId || undefined,
        description: newConfigDescription.trim() || undefined,
      });
      if (res && res.success) {
        setShowCreateConfigModal(false);
        setNewConfigId('');
        setNewConfigTypeId('');
        setNewConfigDescription('');
        setSuccess(translations.paymentGateways.messages.successSavedConfig);
        await loadConfigs();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setSavingConfig(false);
    }
  };

  // Update Config
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    try {
      setSavingConfig(true);
      setError(null);
      const res = await api.savePaymentGatewayConfig({
        paymentGatewayConfigId: editingConfig.paymentGatewayConfigId,
        paymentGatewayConfigTypeId: editingConfig.paymentGatewayConfigTypeId || undefined,
        description: editingConfig.description || undefined,
      });
      if (res && res.success) {
        setShowEditConfigModal(false);
        setEditingConfig(null);
        setSuccess(translations.paymentGateways.messages.successSavedConfig);
        await loadConfigs();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update config');
    } finally {
      setSavingConfig(false);
    }
  };

  // Delete Config
  const handleDeleteConfig = async (configId: string) => {
    if (!window.confirm(translations.paymentGateways.configs.confirmDelete)) return;
    try {
      setSavingConfig(true);
      setError(null);
      const res = await api.deletePaymentGatewayConfig(configId);
      if (res && res.success) {
        setSuccess(translations.paymentGateways.messages.successDeletedConfig);
        await loadConfigs();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete config');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="ds-page-title flex items-center gap-2.5">
            <ShieldCheck className="text-indigo-400" size={26} />
            {translations.paymentGateways.title}
          </h1>
          <p className="ds-page-subtitle">{translations.paymentGateways.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => (activeTab === 'responses' ? loadResponses() : loadConfigs())}
            disabled={loading || configsLoading}
            className="ds-btn-secondary !p-2"
            title={translations.common.refresh}
          >
            <RefreshCw size={16} className={loading || configsLoading ? 'animate-spin' : ''} />
          </button>

          {activeTab === 'configs' && (
            <button
              onClick={() => {
                setNewConfigId('');
                setNewConfigTypeId('');
                setNewConfigDescription('');
                setShowCreateConfigModal(true);
              }}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              {translations.paymentGateways.configs.newConfig}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="ds-card p-4 border-l-4 border-l-rose-500 bg-rose-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-rose-300 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="ds-card p-4 border-l-4 border-l-emerald-500 bg-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-emerald-300 text-sm">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Transactions */}
        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.paymentGateways.stats.totalTrans}</span>
            <Activity className="text-indigo-400" size={18} />
          </div>
          <div className="ds-stat-value text-indigo-300">{stats.totalTransactions}</div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {locale === 'tr' ? 'Tüm zamanların ağ geçidi logları' : 'All recorded gateway attempts'}
          </div>
        </div>

        {/* Total Captured Volume */}
        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.paymentGateways.stats.capturedVolume}</span>
            <DollarSign className="text-emerald-400" size={18} />
          </div>
          <div className="ds-stat-value text-emerald-300">{formatCurrency(stats.totalCapturedAmount)}</div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {locale === 'tr' ? 'Tahsilatı kesinleşen işlemler' : 'Completed capture transactions'}
          </div>
        </div>

        {/* Approved Authorizations */}
        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.paymentGateways.stats.approvedCount}</span>
            <CheckCircle2 className="text-blue-400" size={18} />
          </div>
          <div className="ds-stat-value text-blue-300">{stats.approvedCount}</div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {stats.totalTransactions > 0
              ? `${Math.round((stats.approvedCount / stats.totalTransactions) * 100)}% ${
                  locale === 'tr' ? 'başarı oranı' : 'approval rate'
                }`
              : '—'}
          </div>
        </div>

        {/* Declined Count */}
        <div className="ds-stat-card border-l-4 border-l-rose-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.paymentGateways.stats.declinedCount}</span>
            <AlertTriangle className="text-rose-400" size={18} />
          </div>
          <div className="ds-stat-value text-rose-300">{stats.declinedCount}</div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {locale === 'tr' ? 'Bakiye/kart/limit redleri' : 'Declines / NSF / Bad card errors'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ds-tab-bar">
        <button
          onClick={() => setActiveTab('responses')}
          className={`ds-tab ${activeTab === 'responses' ? 'ds-tab-active' : ''}`}
        >
          <Activity size={16} />
          {translations.paymentGateways.tabs.responses} ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('configs')}
          className={`ds-tab ${activeTab === 'configs' ? 'ds-tab-active' : ''}`}
        >
          <ShieldCheck size={16} />
          {translations.paymentGateways.tabs.configs} ({configs.length})
        </button>
      </div>

      {/* TAB 1: GATEWAY RESPONSES & TRANSACTION LOGS */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="ds-card p-4 flex gap-3 flex-wrap items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={translations.paymentGateways.filters.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-input pl-9 text-xs"
              />
            </div>

            {/* Service Type */}
            <select
              value={serviceTypeFilter}
              onChange={(e) => {
                setServiceTypeFilter(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs w-auto min-w-[170px]"
            >
              <option value="">{translations.paymentGateways.filters.allServiceTypes}</option>
              {metadata.serviceTypes.map((st) => (
                <option key={st.enumId} value={st.enumId}>
                  {st.description || st.enumId}
                </option>
              ))}
            </select>

            {/* Payment Method Type */}
            <select
              value={methodTypeFilter}
              onChange={(e) => {
                setMethodTypeFilter(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs w-auto min-w-[160px]"
            >
              <option value="">{translations.paymentGateways.filters.allMethodTypes}</option>
              {metadata.paymentMethodTypes.map((pm) => (
                <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>
                  {pm.description || pm.paymentMethodTypeId}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs w-auto min-w-[140px]"
            >
              <option value="">{translations.paymentGateways.filters.allStatuses}</option>
              <option value="APPROVED">{translations.paymentGateways.filters.approved}</option>
              <option value="CAPTURED">{translations.paymentGateways.filters.captured}</option>
              <option value="DECLINED">{translations.paymentGateways.filters.declined}</option>
            </select>

            {/* Dates */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-input text-xs w-auto py-1.5"
                title={locale === 'tr' ? 'Başlangıç Tarihi' : 'From Date'}
              />
              <span className="text-slate-500">-</span>
              <input
                type="date"
                value={thruDate}
                onChange={(e) => {
                  setThruDate(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-input text-xs w-auto py-1.5"
                title={locale === 'tr' ? 'Bitiş Tarihi' : 'Thru Date'}
              />
            </div>
          </div>

          {/* Table */}
          <div className="ds-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="ds-spinner"></div>
              </div>
            ) : responses.length === 0 ? (
              <div className="ds-empty py-16">
                <CreditCard size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">
                  {translations.paymentGateways.responses.noResponses}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table text-xs">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{translations.paymentGateways.responses.responseId}</th>
                      <th className="ds-th">{translations.paymentGateways.responses.serviceType}</th>
                      <th className="ds-th">{translations.paymentGateways.responses.methodType}</th>
                      <th className="ds-th">{translations.paymentGateways.responses.referenceNum}</th>
                      <th className="ds-th-right">{translations.paymentGateways.responses.amount}</th>
                      <th className="ds-th text-center">{translations.paymentGateways.responses.status}</th>
                      <th className="ds-th">{translations.paymentGateways.responses.message}</th>
                      <th className="ds-th">{translations.paymentGateways.responses.date}</th>
                      <th className="ds-th text-center">{translations.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r) => {
                      const isCaptured = r.status === 'CAPTURED';
                      const isApproved = r.status === 'APPROVED';
                      const isDeclined = r.status === 'DECLINED';

                      return (
                        <tr key={r.paymentGatewayResponseId} className="ds-tbody-row">
                          <td className="ds-td-mono font-bold text-indigo-400">
                            #{r.paymentGatewayResponseId}
                          </td>
                          <td className="ds-td text-slate-300">
                            <span className="font-semibold text-white">{r.paymentServiceTypeDesc}</span>
                          </td>
                          <td className="ds-td text-slate-400">
                            {r.paymentMethodTypeDesc || r.paymentMethodTypeId || '—'}
                          </td>
                          <td className="ds-td-mono text-slate-300">
                            {r.referenceNum || r.altReference || '—'}
                          </td>
                          <td className="ds-td-right font-mono font-bold text-white">
                            {formatCurrency(r.amount, r.currencyUomId)}
                          </td>
                          <td className="ds-td text-center">
                            <span
                              className={`ds-badge ${
                                isCaptured
                                  ? 'ds-badge-green'
                                  : isApproved
                                  ? 'ds-badge-blue'
                                  : isDeclined
                                  ? 'ds-badge-red'
                                  : 'ds-badge-slate'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="ds-td max-w-xs truncate text-slate-400" title={r.gatewayMessage || ''}>
                            {r.gatewayMessage || '—'}
                          </td>
                          <td className="ds-td text-slate-400 font-mono text-[11px]">
                            {r.transactionDate ? r.transactionDate.substring(0, 19).replace('T', ' ') : '—'}
                          </td>
                          <td className="ds-td text-center">
                            <button
                              onClick={() => handleOpenDetail(r.paymentGatewayResponseId)}
                              className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-300 hover:text-white transition-colors"
                              title={translations.paymentGateways.responses.viewDetail}
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GATEWAY CONFIGS */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white">
                {translations.paymentGateways.tabs.configs}
              </h2>
              <p className="text-xs text-slate-400">
                {locale === 'tr'
                  ? 'Sanal POS, Authorize.Net, CyberSource, EFT ve test ağ geçidi profilleri.'
                  : 'Manage payment gateway configurations and merchant connector profiles.'}
              </p>
            </div>

            <button
              onClick={() => {
                setNewConfigId('');
                setNewConfigTypeId('');
                setNewConfigDescription('');
                setShowCreateConfigModal(true);
              }}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              {translations.paymentGateways.configs.newConfig}
            </button>
          </div>

          {/* Configs Table */}
          <div className="ds-card overflow-hidden">
            {configsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="ds-spinner"></div>
              </div>
            ) : configs.length === 0 ? (
              <div className="ds-empty py-16">
                <ShieldCheck size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">
                  {translations.paymentGateways.configs.noConfigs}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table text-xs">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{translations.paymentGateways.configs.configId}</th>
                      <th className="ds-th">{translations.paymentGateways.configs.configType}</th>
                      <th className="ds-th">{translations.paymentGateways.configs.description}</th>
                      <th className="ds-th text-center">{translations.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((cfg) => (
                      <tr key={cfg.paymentGatewayConfigId} className="ds-tbody-row">
                        <td className="ds-td-mono font-bold text-indigo-400">
                          {cfg.paymentGatewayConfigId}
                        </td>
                        <td className="ds-td text-slate-300">
                          <span className="ds-badge ds-badge-slate">
                            {cfg.typeDescription || cfg.paymentGatewayConfigTypeId || 'Generic Gateway'}
                          </span>
                        </td>
                        <td className="ds-td font-medium text-white">{cfg.description || '—'}</td>
                        <td className="ds-td text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingConfig(cfg);
                                setShowEditConfigModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-300 hover:text-white transition-colors"
                              title={translations.paymentGateways.configs.editConfig}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteConfig(cfg.paymentGatewayConfigId)}
                              className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                              title={translations.paymentGateways.configs.deleteConfig}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RESPONSE DETAIL */}
      {showDetailModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-400" />
                {translations.paymentGateways.detail.title} #{selectedResponseDetail?.paymentGatewayResponseId}
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedResponseDetail(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading || !selectedResponseDetail ? (
              <div className="flex items-center justify-center py-16">
                <div className="ds-spinner"></div>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Header Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">
                      {translations.paymentGateways.responses.amount}
                    </span>
                    <span className="text-base font-mono font-bold text-emerald-400">
                      {formatCurrency(selectedResponseDetail.amount, selectedResponseDetail.currencyUomId)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">
                      {translations.paymentGateways.responses.status}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {selectedResponseDetail.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">
                      {translations.paymentGateways.responses.referenceNum}
                    </span>
                    <span className="text-xs font-mono font-semibold text-indigo-400 truncate block">
                      {selectedResponseDetail.referenceNum || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">
                      {translations.paymentGateways.responses.date}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      {selectedResponseDetail.transactionDate?.substring(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                </div>

                {/* Gateway Details Section */}
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {locale === 'tr' ? 'Banka & Gateway Yanıt Bilgileri' : 'Gateway Response & Verification'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block">
                        {translations.paymentGateways.detail.gatewayCode}
                      </span>
                      <span className="font-mono text-white font-semibold">
                        {selectedResponseDetail.gatewayCode || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">
                        {translations.paymentGateways.detail.gatewayFlag}
                      </span>
                      <span className="font-mono text-white font-semibold">
                        {selectedResponseDetail.gatewayFlag || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">
                        {translations.paymentGateways.detail.orderPrefId}
                      </span>
                      <span className="font-mono text-indigo-400 font-semibold">
                        {selectedResponseDetail.orderPaymentPreferenceId || '—'}
                      </span>
                    </div>
                  </div>

                  {selectedResponseDetail.gatewayMessage && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-slate-500 block">
                        {translations.paymentGateways.detail.gatewayMessage}
                      </span>
                      <p className="text-slate-200 mt-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        {selectedResponseDetail.gatewayMessage}
                      </p>
                    </div>
                  )}

                  {/* Verification Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Declined:</span>
                      <span
                        className={`font-semibold ${
                          selectedResponseDetail.resultDeclined === 'Y' ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {selectedResponseDetail.resultDeclined === 'Y' ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">NSF:</span>
                      <span
                        className={`font-semibold ${
                          selectedResponseDetail.resultNsf === 'Y' ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {selectedResponseDetail.resultNsf === 'Y' ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Bad Expire:</span>
                      <span
                        className={`font-semibold ${
                          selectedResponseDetail.resultBadExpire === 'Y' ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {selectedResponseDetail.resultBadExpire === 'Y' ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Bad Card No:</span>
                      <span
                        className={`font-semibold ${
                          selectedResponseDetail.resultBadCardNumber === 'Y' ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {selectedResponseDetail.resultBadCardNumber === 'Y' ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Raw Messages Section */}
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {translations.paymentGateways.detail.rawMessages}
                  </h3>
                  {selectedResponseDetail.messages && selectedResponseDetail.messages.length > 0 ? (
                    <div className="space-y-1">
                      {selectedResponseDetail.messages.map((m, idx) => (
                        <pre
                          key={idx}
                          className="bg-slate-950 p-2 rounded text-[10px] text-slate-300 font-mono overflow-x-auto"
                        >
                          {m}
                        </pre>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px]">
                      {translations.paymentGateways.detail.noRawMessages}
                    </p>
                  )}
                </div>

                {/* Linked Payments */}
                {selectedResponseDetail.linkedPayments && selectedResponseDetail.linkedPayments.length > 0 && (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {translations.paymentGateways.detail.linkedPayments}
                    </h3>
                    <div className="space-y-1">
                      {selectedResponseDetail.linkedPayments.map((p) => (
                        <div
                          key={p.paymentId}
                          className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs"
                        >
                          <span className="font-mono font-bold text-indigo-400">#{p.paymentId}</span>
                          <span className="text-slate-400">{p.paymentTypeId}</span>
                          <span className="font-mono text-emerald-400 font-bold">{formatCurrency(p.amount)}</span>
                          <span className="ds-badge ds-badge-green">{p.statusId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedResponseDetail(null);
                }}
                className="ds-btn-secondary"
              >
                {translations.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GATEWAY CONFIG */}
      {showCreateConfigModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-400" />
                {translations.paymentGateways.configs.newConfig}
              </h2>
              <button onClick={() => setShowCreateConfigModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.paymentGateways.configs.configId} (
                  {locale === 'tr' ? 'Opsiyonel / Boş bırakılırsa otomatik üretilir' : 'Optional / Auto-generated if empty'})
                </label>
                <input
                  type="text"
                  placeholder="AUTHORIZE_NET_01 / TEST_GATEWAY"
                  value={newConfigId}
                  onChange={(e) => setNewConfigId(e.target.value.toUpperCase())}
                  className="ds-input font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">{translations.paymentGateways.configs.configType}</label>
                <select
                  value={newConfigTypeId}
                  onChange={(e) => setNewConfigTypeId(e.target.value)}
                  className="ds-select"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata.configTypes.map((ct) => (
                    <option key={ct.paymentGatewayConfigTypeId} value={ct.paymentGatewayConfigTypeId}>
                      {ct.description || ct.paymentGatewayConfigTypeId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">{translations.paymentGateways.configs.description} *</label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'tr' ? 'Örn: İş Bankası Sanal POS 3D' : 'e.g. Primary Authorize.Net Processor'}
                  value={newConfigDescription}
                  onChange={(e) => setNewConfigDescription(e.target.value)}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateConfigModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button type="submit" disabled={savingConfig} className="ds-btn-primary">
                  {savingConfig ? translations.common.loading : translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT GATEWAY CONFIG */}
      {showEditConfigModal && editingConfig && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-400" />
                {translations.paymentGateways.configs.editConfig}: {editingConfig.paymentGatewayConfigId}
              </h2>
              <button onClick={() => setShowEditConfigModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label">{translations.paymentGateways.configs.configType}</label>
                <select
                  value={editingConfig.paymentGatewayConfigTypeId || ''}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, paymentGatewayConfigTypeId: e.target.value })
                  }
                  className="ds-select"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata.configTypes.map((ct) => (
                    <option key={ct.paymentGatewayConfigTypeId} value={ct.paymentGatewayConfigTypeId}>
                      {ct.description || ct.paymentGatewayConfigTypeId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">{translations.paymentGateways.configs.description} *</label>
                <input
                  type="text"
                  required
                  value={editingConfig.description || ''}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, description: e.target.value })
                  }
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditConfigModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button type="submit" disabled={savingConfig} className="ds-btn-primary">
                  {savingConfig ? translations.common.loading : translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGateways;
