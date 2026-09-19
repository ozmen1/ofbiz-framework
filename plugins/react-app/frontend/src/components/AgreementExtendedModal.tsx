import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  api,
  AgreementExtendedDetailResponse,
  CreateAgreementItemPayload,
  CreateAgreementTermPayload,
  CreateAgreementProductPricePayload,
} from '../services/api';
import { useTranslation } from '../i18n';

interface AgreementExtendedModalProps {
  agreementId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAgreementUpdated?: () => void;
}

type TabType = 'overview' | 'items' | 'terms' | 'prices' | 'workflow';

export const AgreementExtendedModal: React.FC<AgreementExtendedModalProps> = ({
  agreementId,
  isOpen,
  onClose,
  onAgreementUpdated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.budgetAndAgreement.agreement;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [data, setData] = useState<AgreementExtendedDetailResponse | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submodals
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [itemForm, setItemForm] = useState<CreateAgreementItemPayload>({
    agreementId: '',
    agreementItemTypeId: 'AGREEMENT_PRICING_PR',
    currencyUomId: 'TRY',
    agreementText: '',
  });

  const [showTermModal, setShowTermModal] = useState<boolean>(false);
  const [termForm, setTermForm] = useState<CreateAgreementTermPayload>({
    agreementId: '',
    termTypeId: 'FIN_PAYMENT_TERM',
    termDays: 30,
    termValue: 0,
    description: '',
  });

  const [showPriceModal, setShowPriceModal] = useState<boolean>(false);
  const [priceForm, setPriceForm] = useState<CreateAgreementProductPricePayload>({
    agreementId: '',
    productId: '',
    price: 0,
    currencyUomId: 'TRY',
  });

  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [nextStatus, setNextStatus] = useState<string>('AGR_ACTIVE');
  const [statusComments, setStatusComments] = useState<string>('');

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

  const loadData = useCallback(async (agId: string) => {
    setLoading(true);
    try {
      const res = await api.getAgreementExtendedDetails(agId);
      setData(res);
    } catch (err: any) {
      triggerError(err.message || 'Error loading agreement details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && agreementId) {
      setSuccessMsg(null);
      setErrorMsg(null);
      setActiveTab('overview');
      setItemForm({
        agreementId,
        agreementItemTypeId: 'AGREEMENT_PRICING_PR',
        currencyUomId: 'TRY',
        agreementText: '',
      });
      setTermForm({
        agreementId,
        termTypeId: 'FIN_PAYMENT_TERM',
        termDays: 30,
        termValue: 0,
        description: '',
      });
      setPriceForm({
        agreementId,
        productId: '',
        price: 0,
        currencyUomId: 'TRY',
      });
      loadData(agreementId);
    }
  }, [isOpen, agreementId, loadData]);

  if (!isOpen || !agreementId) return null;

  // Handlers
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createAgreementItem({
        ...itemForm,
        agreementId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Madde eklendi.' : 'Item created.'));
      setShowItemModal(false);
      setItemForm({
        agreementId,
        agreementItemTypeId: 'AGREEMENT_PRICING_PR',
        currencyUomId: 'TRY',
        agreementText: '',
      });
      await loadData(agreementId);
    } catch (err: any) {
      triggerError(err.message || 'Item creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveItem = async (itemSeqId: string) => {
    if (!window.confirm(isTr ? 'Bu maddeyi ve bağlı kayıtları silmek istediğinize emin misiniz?' : 'Delete this item?')) return;
    setActionLoading(true);
    try {
      const res = await api.removeAgreementItem(agreementId, itemSeqId);
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Madde silindi.' : 'Item removed.'));
      await loadData(agreementId);
    } catch (err: any) {
      triggerError(err.message || 'Failed to remove item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createAgreementTerm({
        ...termForm,
        agreementId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Şart kaydedildi.' : 'Term created.'));
      setShowTermModal(false);
      setTermForm({
        agreementId,
        termTypeId: 'FIN_PAYMENT_TERM',
        termDays: 30,
        termValue: 0,
        description: '',
      });
      await loadData(agreementId);
    } catch (err: any) {
      triggerError(err.message || 'Term creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTerm = async (termId: string) => {
    if (!window.confirm(isTr ? 'Bu sözleşme şartını silmek istediğinize emin misiniz?' : 'Delete this term?')) return;
    setActionLoading(true);
    try {
      const res = await api.removeAgreementTerm(termId);
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Şart silindi.' : 'Term removed.'));
      await loadData(agreementId);
    } catch (err: any) {
      triggerError(err.message || 'Failed to remove term');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceForm.productId?.trim()) {
      triggerError(isTr ? 'Ürün kodu zorunludur.' : 'Product ID is required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.createAgreementProductPrice({
        ...priceForm,
        agreementId,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Sözleşmeli fiyat tanımlandı.' : 'Contract price created.'));
      setShowPriceModal(false);
      setPriceForm({
        agreementId,
        productId: '',
        price: 0,
        currencyUomId: 'TRY',
      });
      await loadData(agreementId);
    } catch (err: any) {
      triggerError(err.message || 'Price creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePrice = async (productId: string, itemSeqId: string) => {
    if (!window.confirm(isTr ? 'Bu ürün için özel sözleşme fiyatını kaldırmak istiyor musunuz?' : 'Delete this contracted price?')) return;
    setActionLoading(true);
    try {
      const res = await api.removeAgreementProductPrice(agreementId, productId, itemSeqId);
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Fiyat kaldırıldı.' : 'Price removed.'));
      await loadData(agreementId);
    } catch (err: any) {
      triggerError(err.message || 'Failed to remove price');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetStatus = async (statusId: string) => {
    setNextStatus(statusId);
    setStatusComments('');
    setShowStatusModal(true);
  };

  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.setAgreementStatus(agreementId, nextStatus, statusComments);
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Sözleşme durumu güncellendi.' : 'Agreement status updated.'));
      setShowStatusModal(false);
      await loadData(agreementId);
      if (onAgreementUpdated) onAgreementUpdated();
    } catch (err: any) {
      triggerError(err.message || 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (statusId?: string) => {
    switch (statusId) {
      case 'AGR_ACTIVE':
        return <span className="ds-badge ds-badge-green"><CheckCircle2 size={12} className="mr-1 inline" />{t.active}</span>;
      case 'AGR_APPROVED':
        return <span className="ds-badge ds-badge-blue"><Check size={12} className="mr-1 inline" />{translations.budgetAndAgreement.budget.approved}</span>;
      case 'AGR_IN_PROCESS':
        return <span className="ds-badge ds-badge-yellow"><Clock size={12} className="mr-1 inline" />{t.inProcess}</span>;
      case 'AGR_CANCELLED':
        return <span className="ds-badge ds-badge-red">{t.cancelled}</span>;
      case 'AGR_TERMINATED':
        return <span className="ds-badge ds-badge-slate">{t.terminated}</span>;
      default:
        return <span className="ds-badge ds-badge-slate">{statusId || 'AGR_ACTIVE'}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 overflow-y-auto animate-fade-in">
      <div className="ds-card border-slate-700/80 w-full max-w-5xl bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto rounded-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/90 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <FileText size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {data?.agreement.description || agreementId}
                  </h2>
                  <span className="ds-badge ds-badge-blue font-mono text-xs">
                    #{agreementId}
                  </span>
                  {getStatusBadge(data?.agreement.statusId)}
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  {data?.agreement.agreementTypeDesc} | {data?.agreement.partyFromDesc} → {data?.agreement.partyToDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(agreementId)}
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
            <Layers size={16} />
            {t.tabs.overview}
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'items'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            {t.tabs.items}
            {data?.items?.length ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {data.items.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'terms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock size={16} />
            {t.tabs.terms}
            {data?.terms?.length ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {data.terms.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'prices'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign size={16} />
            {t.tabs.productPrices}
            {data?.productPrices?.length ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {data.productPrices.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'workflow'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={16} />
            {t.tabs.statusHistory}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ds-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Building2 size={16} className="text-indigo-400" />
                    {isTr ? 'Sözleşme Tarafları & Kimliği' : 'Parties & Identification'}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Düzenleyen Kurum (Party From)' : 'Issuing Party'}</span>
                      <span className="font-semibold text-white">{data?.agreement.partyFromDesc}</span>
                      <span className="font-mono text-xs text-slate-400 ml-2">({data?.agreement.partyIdFrom})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Muhatap / Müşteri (Party To)' : 'Client / Partner'}</span>
                      <span className="font-semibold text-indigo-400">{data?.agreement.partyToDesc}</span>
                      <span className="font-mono text-xs text-slate-400 ml-2">({data?.agreement.partyIdTo})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">{isTr ? 'Sözleşme Türü' : 'Agreement Type'}</span>
                      <span className="font-medium text-white">{data?.agreement.agreementTypeDesc}</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Calendar size={16} className="text-amber-400" />
                    {isTr ? 'Geçerlilik Tarihleri & Durum' : 'Validity & Lifecycle'}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">{isTr ? 'İmza / Sözleşme Tarihi' : 'Agreement Date'}</span>
                      <span className="font-medium text-white">{data?.agreement.agreementDate || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">{isTr ? 'Yürürlük Başlangıcı' : 'From Date'}</span>
                      <span className="font-medium text-emerald-400">{data?.agreement.fromDate || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">{isTr ? 'Bitiş Tarihi' : 'Thru Date'}</span>
                      <span className="font-medium text-amber-400">{data?.agreement.thruDate || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-slate-400 text-xs">{isTr ? 'Güncel Durum' : 'Current Status'}</span>
                      <div>{getStatusBadge(data?.agreement.statusId)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Text Data / Legal Content */}
              {data?.agreement.textData && (
                <div className="ds-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-indigo-400" />
                    {isTr ? 'Sözleşme Metni & Özel Hükümler' : 'Agreement Legal Text'}
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {data.agreement.textData}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: ITEMS ================= */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.tabs.items}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Sözleşmenin bağımsız maddeleri, kapsam ve fasılları.' : 'Agreement clauses and item breakdown.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowItemModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.newItem}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">#</th>
                      <th className="ds-th">{isTr ? 'Madde Türü' : 'Item Type'}</th>
                      <th className="ds-th">{isTr ? 'Para Birimi' : 'Currency'}</th>
                      <th className="ds-th">{isTr ? 'Madde Metni / Açıklama' : 'Clause Text'}</th>
                      <th className="ds-th-right">{isTr ? 'İşlem' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items?.length ? (
                      data.items.map((itm) => (
                        <tr key={itm.agreementItemSeqId} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-mono text-indigo-400 font-bold">#{itm.agreementItemSeqId}</td>
                          <td className="ds-td font-medium text-white">{itm.agreementItemTypeDesc}</td>
                          <td className="ds-td">
                            <span className="ds-badge ds-badge-slate">{itm.currencyUomId}</span>
                          </td>
                          <td className="ds-td text-slate-300 max-w-md truncate">{itm.agreementText || '—'}</td>
                          <td className="ds-td-right">
                            <button
                              onClick={() => handleRemoveItem(itm.agreementItemSeqId)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title={isTr ? 'Maddeyi Sil' : 'Remove Item'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="ds-td text-center py-8 text-slate-400">
                          {t.noItems}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: TERMS ================= */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.tabs.terms}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Vade, ödeme koşulları, faiz ve ticari şartlar.' : 'Payment terms, limits, and obligations.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTermModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.newTerm}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">ID</th>
                      <th className="ds-th">{t.termType}</th>
                      <th className="ds-th">{t.termDays}</th>
                      <th className="ds-th-right">{t.termValue}</th>
                      <th className="ds-th">{t.comments}</th>
                      <th className="ds-th-right">{isTr ? 'İşlem' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.terms?.length ? (
                      data.terms.map((term) => (
                        <tr key={term.agreementTermId} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-mono text-slate-400">#{term.agreementTermId}</td>
                          <td className="ds-td font-medium text-white">{term.termTypeDesc}</td>
                          <td className="ds-td text-slate-300">
                            {term.termDays ? `${term.termDays} ${isTr ? 'Gün' : 'Days'}` : '—'}
                          </td>
                          <td className="ds-td-right font-mono font-bold text-emerald-400">
                            {term.termValue ? fmt(term.termValue) : '—'}
                          </td>
                          <td className="ds-td text-slate-300 max-w-xs truncate">{term.description || term.textValue || '—'}</td>
                          <td className="ds-td-right">
                            <button
                              onClick={() => handleRemoveTerm(term.agreementTermId)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title={isTr ? 'Şartı Sil' : 'Remove Term'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="ds-td text-center py-8 text-slate-400">
                          {t.noTerms}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: PRODUCT PRICES ================= */}
          {activeTab === 'prices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.tabs.productPrices}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Bu sözleşmeye tabi müşteriye/tedarikçiye özel sabit fiyat listesi.' : 'Agreed contract pricing for specific products.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowPriceModal(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.newProductPrice}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">Ürün Kodu</th>
                      <th className="ds-th">{t.product}</th>
                      <th className="ds-th">Bağlı Madde</th>
                      <th className="ds-th-right">{t.contractPrice}</th>
                      <th className="ds-th-right">{isTr ? 'İşlem' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.productPrices?.length ? (
                      data.productPrices.map((pr, idx) => (
                        <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-mono font-medium text-indigo-400">{pr.productId}</td>
                          <td className="ds-td font-medium text-white">{pr.productName}</td>
                          <td className="ds-td font-mono text-slate-400">#{pr.agreementItemSeqId}</td>
                          <td className="ds-td-right font-mono font-bold text-emerald-400 text-base">
                            {fmt(pr.price)}
                          </td>
                          <td className="ds-td-right">
                            <button
                              onClick={() => handleRemovePrice(pr.productId, pr.agreementItemSeqId)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title={isTr ? 'Fiyatı Sil' : 'Remove Price'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="ds-td text-center py-8 text-slate-400">
                          {t.noProductPrices}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 5: WORKFLOW & STATUS HISTORY ================= */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Status Action Buttons */}
              <div className="ds-card p-5 space-y-3 bg-gradient-to-r from-slate-900 to-indigo-950/20 border border-slate-800">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-indigo-400" />
                  {t.changeStatus}
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleSetStatus('AGR_IN_PROCESS')}
                    disabled={actionLoading || data?.agreement.statusId === 'AGR_IN_PROCESS'}
                    className="ds-btn-secondary text-xs py-2 px-3 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <Clock size={14} />
                    {isTr ? 'İşleme Al (In Process)' : 'Mark In Process'}
                  </button>
                  <button
                    onClick={() => handleSetStatus('AGR_APPROVED')}
                    disabled={actionLoading || data?.agreement.statusId === 'AGR_APPROVED'}
                    className="ds-btn-secondary text-xs py-2 px-3 text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
                  >
                    <Check size={14} />
                    {isTr ? 'Onayla (Approved)' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleSetStatus('AGR_ACTIVE')}
                    disabled={actionLoading || data?.agreement.statusId === 'AGR_ACTIVE'}
                    className="ds-btn-primary text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 size={14} />
                    {isTr ? 'Yürürlüğe Al (Active)' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleSetStatus('AGR_TERMINATED')}
                    disabled={actionLoading || data?.agreement.statusId === 'AGR_TERMINATED'}
                    className="ds-btn-secondary text-xs py-2 px-3 text-slate-300 border-slate-700 hover:bg-slate-800"
                  >
                    {isTr ? 'Feshet / Sona Erdir' : 'Terminate'}
                  </button>
                  <button
                    onClick={() => handleSetStatus('AGR_CANCELLED')}
                    disabled={actionLoading || data?.agreement.statusId === 'AGR_CANCELLED'}
                    className="ds-btn-danger text-xs py-2 px-3"
                  >
                    {t.cancelled}
                  </button>
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-indigo-400" />
                  {isTr ? 'Sözleşme Durum Değişiklik Geçmişi' : 'Status Transition History'}
                </h4>
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.statusDate}</th>
                        <th className="ds-th">{isTr ? 'Yeni Durum' : 'Transitioned Status'}</th>
                        <th className="ds-th">{t.statusUser}</th>
                        <th className="ds-th">{t.comments}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.statuses?.length ? (
                        data.statuses.map((st) => (
                          <tr key={st.agreementStatusId} className="ds-tbody-row hover:bg-slate-800/40">
                            <td className="ds-td text-slate-300 font-mono text-xs">{st.statusDate}</td>
                            <td className="ds-td">{getStatusBadge(st.statusId)}</td>
                            <td className="ds-td font-mono text-slate-400 text-xs">{st.setByUserLoginId || '—'}</td>
                            <td className="ds-td text-slate-300 max-w-sm truncate">{st.comments || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="ds-td text-center py-6 text-slate-400">
                            {isTr ? 'Henüz durum değişikliği kaydedilmedi.' : 'No status history recorded.'}
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

      {/* ================= MODAL: ADD AGREEMENT ITEM ================= */}
      {showItemModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                {t.newItem}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="ds-label">{isTr ? 'Madde Türü' : 'Item Type'}</label>
                <select
                  value={itemForm.agreementItemTypeId}
                  onChange={(e) => setItemForm({ ...itemForm, agreementItemTypeId: e.target.value })}
                  className="ds-select"
                >
                  <option value="AGREEMENT_PRICING_PR">{isTr ? 'Fiyatlandırma Maddesi' : 'Pricing Clause'}</option>
                  <option value="AGREEMENT_EXHIBIT">{isTr ? 'Ek / Protokol (Exhibit)' : 'Exhibit'}</option>
                  <option value="AGREEMENT_SECTION">{isTr ? 'Genel Şartlar Maddesi' : 'Section Clause'}</option>
                </select>
              </div>

              <div>
                <label className="ds-label">{isTr ? 'Para Birimi' : 'Currency'}</label>
                <input
                  type="text"
                  value={itemForm.currencyUomId || 'TRY'}
                  onChange={(e) => setItemForm({ ...itemForm, currencyUomId: e.target.value })}
                  className="ds-input font-mono uppercase"
                  placeholder="TRY / USD"
                />
              </div>

              <div>
                <label className="ds-label">{isTr ? 'Madde Metni / Açıklama' : 'Clause Text'} *</label>
                <textarea
                  rows={3}
                  required
                  value={itemForm.agreementText || ''}
                  onChange={(e) => setItemForm({ ...itemForm, agreementText: e.target.value })}
                  className="ds-input"
                  placeholder="Maddenin kapsamı ve taahhütler"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
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
                  {isTr ? 'Ekle' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD AGREEMENT TERM ================= */}
      {showTermModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" />
                {t.newTerm}
              </h3>
              <button onClick={() => setShowTermModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTerm} className="space-y-4">
              <div>
                <label className="ds-label">{t.termType}</label>
                <select
                  value={termForm.termTypeId}
                  onChange={(e) => setTermForm({ ...termForm, termTypeId: e.target.value })}
                  className="ds-select"
                >
                  <option value="FIN_PAYMENT_TERM">{isTr ? 'Ödeme Vadesi (Payment Term)' : 'Payment Term'}</option>
                  <option value="FIN_PAY_DAYS_DELIV">{isTr ? 'Teslimattan Sonra Vade' : 'Payment Days Deliv'}</option>
                  <option value="INVOICING_LIMIT">{isTr ? 'Fatura Limiti' : 'Invoicing Limit'}</option>
                  <option value="FIN_LATE_FEE_TERM">{isTr ? 'Gecikme Faizi Oranı' : 'Late Fee Term'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.termDays}</label>
                  <input
                    type="number"
                    value={termForm.termDays || ''}
                    onChange={(e) => setTermForm({ ...termForm, termDays: parseInt(e.target.value) || 0 })}
                    className="ds-input font-mono"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.termValue}</label>
                  <input
                    type="number"
                    step="any"
                    value={termForm.termValue || ''}
                    onChange={(e) => setTermForm({ ...termForm, termValue: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">{t.comments}</label>
                <input
                  type="text"
                  value={termForm.description || ''}
                  onChange={(e) => setTermForm({ ...termForm, description: e.target.value })}
                  className="ds-input"
                  placeholder="30 gün net ödeme"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
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

      {/* ================= MODAL: ADD PRODUCT PRICE ================= */}
      {showPriceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" />
                {t.newProductPrice}
              </h3>
              <button onClick={() => setShowPriceModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePrice} className="space-y-4">
              <div>
                <label className="ds-label">{t.product} (Product ID) *</label>
                <input
                  type="text"
                  required
                  value={priceForm.productId}
                  onChange={(e) => setPriceForm({ ...priceForm, productId: e.target.value })}
                  className="ds-input font-mono"
                  placeholder="PROD_1001"
                />
              </div>

              <div>
                <label className="ds-label">{t.contractPrice} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceForm.price || ''}
                  onChange={(e) => setPriceForm({ ...priceForm, price: parseFloat(e.target.value) || 0 })}
                  className="ds-input font-mono text-base"
                  placeholder="1500.00"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
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

      {/* ================= MODAL: STATUS TRANSITION CONFIRM ================= */}
      {showStatusModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-400" />
                {t.changeStatus}
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitStatus} className="space-y-4">
              <div>
                <label className="ds-label">{isTr ? 'Hedef Durum' : 'Target Status'}</label>
                <div className="pt-1">{getStatusBadge(nextStatus)}</div>
              </div>

              <div>
                <label className="ds-label">{t.comments}</label>
                <input
                  type="text"
                  value={statusComments}
                  onChange={(e) => setStatusComments(e.target.value)}
                  className="ds-input"
                  placeholder="Yönetim kurulu onayı veya fesih gerekçesi"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
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
                  {isTr ? 'Onayla ve Değiştir' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
