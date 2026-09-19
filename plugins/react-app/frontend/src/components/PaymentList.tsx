import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, ChevronRight, CreditCard, CheckCircle2, 
  Clock, XCircle, AlertCircle, Loader2, ArrowDownLeft, ArrowUpRight, Plus, Filter 
} from 'lucide-react';
import { api, PaymentListItem } from '../services/api';
import { useTranslation } from '../i18n';

const getPaymentStatusBadgeClass = (statusId: string): string => {
  switch (statusId) {
    case 'PMNT_CONFIRMED': return 'ds-badge ds-badge-purple';
    case 'PMNT_RECEIVED': return 'ds-badge ds-badge-green';
    case 'PMNT_SENT': return 'ds-badge ds-badge-blue';
    case 'PMNT_NOT_PAID': return 'ds-badge ds-badge-yellow';
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return 'ds-badge ds-badge-red';
    default: return 'ds-badge ds-badge-slate';
  }
};

const getPaymentStatusIcon = (statusId: string) => {
  switch (statusId) {
    case 'PMNT_CONFIRMED':
    case 'PMNT_RECEIVED': return <CheckCircle2 size={14} />;
    case 'PMNT_NOT_PAID': return <Clock size={14} />;
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return <XCircle size={14} />;
    default: return <CreditCard size={14} />;
  }
};

const getPaymentStatusLabel = (statusId: string, locale: string): string => {
  if (locale === 'tr') {
    switch (statusId) {
      case 'PMNT_RECEIVED': return 'Alındı / Tahsil';
      case 'PMNT_SENT': return 'Gönderildi / Tediye';
      case 'PMNT_CONFIRMED': return 'Onaylandı';
      case 'PMNT_NOT_PAID': return 'Ödenmedi';
      case 'PMNT_CANCELLED': return 'İptal Edildi';
      case 'PMNT_VOID': return 'Hükümsüz';
      default: return (statusId || '').replace('PMNT_', '').replace(/_/g, ' ');
    }
  } else {
    switch (statusId) {
      case 'PMNT_RECEIVED': return 'Received';
      case 'PMNT_SENT': return 'Sent';
      case 'PMNT_CONFIRMED': return 'Confirmed';
      case 'PMNT_NOT_PAID': return 'Not Paid';
      case 'PMNT_CANCELLED': return 'Cancelled';
      case 'PMNT_VOID': return 'Void';
      default: return (statusId || '').replace('PMNT_', '').replace(/_/g, ' ');
    }
  }
};

interface PaymentListProps {
  onViewPayment: (paymentId: string) => void;
  onCreatePayment: () => void;
}

const PaymentList: React.FC<PaymentListProps> = ({ onViewPayment, onCreatePayment }) => {
  const { translations, locale } = useTranslation();
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    paymentTypeId: '',
    paymentMethodTypeId: '',
    statusId: ''
  });

  // Metadata
  const [paymentTypes, setPaymentTypes] = useState<{ paymentTypeId: string; description: string }[]>([]);
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<{ paymentMethodTypeId: string; description: string }[]>([]);
  const [statusList, setStatusList] = useState<{ statusId: string; description: string }[]>([]);

  // Load Metadata
  useEffect(() => {
    api.getPaymentMetadata()
      .then(res => {
        if (res?.metadata) {
          setPaymentTypes(res.metadata.paymentTypes || []);
          setPaymentMethodTypes(res.metadata.paymentMethodTypes || []);
          setStatusList(res.metadata.statusList || []);
        }
      })
      .catch(err => console.warn('Could not load payment metadata:', err));
  }, []);

  // Fetch payments
  const loadPayments = useCallback((currentFilters = filters) => {
    setLoading(true);
    setError(null);
    api.getPayments(currentFilters)
      .then(data => {
        setPayments(data.payments || []);
        setTotalCount(data.totalCount || 0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Ödemeler yüklenirken hata oluştu.');
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadPayments(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters, loadPayments]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    const reset = {
      search: '',
      paymentTypeId: '',
      paymentMethodTypeId: '',
      statusId: ''
    };
    setFilters(reset);
    loadPayments(reset);
  };

  // Metrics
  const totalReceived = payments
    .filter(p => p.statusId === 'PMNT_RECEIVED' || p.paymentTypeId === 'CUSTOMER_PAYMENT')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalSent = payments
    .filter(p => p.statusId === 'PMNT_SENT' || p.paymentTypeId === 'VENDOR_PAYMENT')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOpen = payments
    .reduce((acc, p) => acc + (p.openAmount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Payments */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">Kayıtlı Ödemeler</span>
            <div className="p-1.5 rounded-xl bg-indigo-600/10 text-indigo-400">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="ds-stat-value">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-1">Tüm tahsilat ve tediyeler</div>
        </div>

        {/* Customer Receipts */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">Müşteri Tahsilatları</span>
            <div className="p-1.5 rounded-xl bg-emerald-600/10 text-emerald-400">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-emerald-400">
            ${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Alınan ödemeler toplamı</div>
        </div>

        {/* Vendor Payments */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">Tedarikçi Ödemeleri</span>
            <div className="p-1.5 rounded-xl bg-blue-600/10 text-blue-400">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-blue-400">
            ${totalSent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Yapılan ödemeler toplamı</div>
        </div>

        {/* Open Balance */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">Eşleşmemiş (Açık) Bakiye</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-amber-400">
            ${totalOpen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Faturaya bağlanmamış tutar</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="ds-card p-5">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-indigo-400" />
            <span className="font-semibold text-sm text-slate-200">Filtreler &amp; Arama</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadPayments(filters)}
              className="ds-btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Yenile
            </button>
            <button
              onClick={onCreatePayment}
              className="ds-btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              Yeni Ödeme
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              name="search"
              placeholder="Ödeme No, Cari, Açıklama..."
              value={filters.search}
              onChange={handleFilterChange}
              className="ds-input pl-9 w-full"
            />
          </div>

          {/* Payment Type */}
          <select
            name="paymentTypeId"
            value={filters.paymentTypeId}
            onChange={handleFilterChange}
            className="ds-select"
          >
            <option value="">Tüm Ödeme Türleri</option>
            {paymentTypes.map(t => (
              <option key={t.paymentTypeId} value={t.paymentTypeId}>{t.description || t.paymentTypeId}</option>
            ))}
          </select>

          {/* Payment Method */}
          <select
            name="paymentMethodTypeId"
            value={filters.paymentMethodTypeId}
            onChange={handleFilterChange}
            className="ds-select"
          >
            <option value="">Tüm Ödeme Yöntemleri</option>
            {paymentMethodTypes.map(pm => (
              <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>{pm.description || pm.paymentMethodTypeId}</option>
            ))}
          </select>

          {/* Status */}
          <select
            name="statusId"
            value={filters.statusId}
            onChange={handleFilterChange}
            className="ds-select"
          >
            <option value="">Tüm Durumlar</option>
            {statusList.map(s => (
              <option key={s.statusId} value={s.statusId}>{s.description || s.statusId}</option>
            ))}
          </select>

          {(filters.search || filters.paymentTypeId || filters.paymentMethodTypeId || filters.statusId) && (
            <button
              onClick={handleResetFilters}
              className="text-slate-400 text-sm border border-dashed border-slate-600 rounded-xl px-3 py-2 hover:text-slate-200 hover:border-slate-500 transition-colors cursor-pointer bg-transparent"
            >
              Filtreleri Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Payments Table */}
      <div className="ds-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">{translations.payments.paymentId}</th>
                <th className="ds-th">{translations.payments.paymentType}</th>
                <th className="ds-th">{translations.payments.fromParty}</th>
                <th className="ds-th">{translations.payments.toParty}</th>
                <th className="ds-th">{translations.payments.paymentMethod}</th>
                <th className="ds-th">{translations.payments.effectiveDate}</th>
                <th className="ds-th-right">{translations.payments.amount}</th>
                <th className="ds-th-right">{locale === 'tr' ? 'Mahsup / Açık' : 'Applied / Open'}</th>
                <th className="ds-th">{translations.common.status}</th>
                <th className="ds-th"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={28} className="ds-spinner text-indigo-400" />
                      <div className="text-slate-400">{translations.common.loading}</div>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="ds-empty">{translations.common.noData}</div>
                  </td>
                </tr>
              ) : (
                payments.map(p => {
                  const isIncoming = p.paymentTypeId.includes('CUSTOMER') || p.paymentTypeId.includes('RECEIPT');
                  return (
                    <tr
                      key={p.paymentId}
                      onClick={() => onViewPayment(p.paymentId)}
                      className="ds-tbody-row cursor-pointer"
                    >
                      <td className="ds-td-primary">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isIncoming ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                          #{p.paymentId}
                        </div>
                      </td>
                      <td className="ds-td">
                        <div className="font-medium text-slate-200">{p.paymentTypeDesc}</div>
                        {p.paymentRefNum && (
                          <div className="text-xs text-slate-500">Ref: {p.paymentRefNum}</div>
                        )}
                      </td>
                      <td className="ds-td">
                        <div className="font-medium text-slate-200">{p.partyNameFrom || p.partyIdFrom}</div>
                        <div className="text-xs text-slate-500">{p.partyIdFrom}</div>
                      </td>
                      <td className="ds-td">
                        <div className="font-medium text-slate-200">{p.partyNameTo || p.partyIdTo}</div>
                        <div className="text-xs text-slate-500">{p.partyIdTo}</div>
                      </td>
                      <td className="ds-td-muted">
                        {p.paymentMethodTypeDesc || p.paymentMethodTypeId || '-'}
                      </td>
                      <td className="ds-td-muted whitespace-nowrap">
                        {p.effectiveDate ? p.effectiveDate.substring(0, 10) : '-'}
                      </td>
                      <td className="ds-td-right">
                        <span className="font-bold text-slate-100">
                          ${p.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">{p.currencyUomId}</span>
                      </td>
                      <td className="ds-td-right">
                        <div className={`font-semibold ${p.openAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ${p.appliedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {p.openAmount > 0 && (
                          <div className="text-xs text-slate-500">
                            {locale === 'tr' ? 'Açık:' : 'Open:'} ${p.openAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="ds-td">
                        <span className={getPaymentStatusBadgeClass(p.statusId)}>
                          {getPaymentStatusIcon(p.statusId)}
                          {getPaymentStatusLabel(p.statusId, locale)}
                        </span>
                      </td>
                      <td className="ds-td text-right">
                        <ChevronRight size={16} className="text-slate-500 ml-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentList;
