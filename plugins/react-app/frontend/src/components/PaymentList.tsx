import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Plus, Filter, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Clock,
  ChevronRight, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { api, PaymentListItem } from '../services/api';
import { useTranslation } from '../i18n';

// Helpers
const getPaymentStatusBadgeClass = (statusId: string): string => {
  switch (statusId) {
    case 'PMNT_RECEIVED':
    case 'PMNT_CONFIRMED':
      return 'ds-badge ds-badge-green';
    case 'PMNT_SENT':
      return 'ds-badge ds-badge-blue';
    case 'PMNT_NOT_PAID':
      return 'ds-badge ds-badge-yellow';
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID':
      return 'ds-badge ds-badge-red';
    default:
      return 'ds-badge ds-badge-slate';
  }
};

const getPaymentStatusLabel = (statusId: string, t: any): string => {
  switch (statusId) {
    case 'PMNT_RECEIVED': return t.statusReceived;
    case 'PMNT_SENT': return t.statusSent;
    case 'PMNT_CONFIRMED': return t.statusConfirmed;
    case 'PMNT_NOT_PAID': return t.statusNotPaid;
    case 'PMNT_CANCELLED': return t.statusCancelled;
    case 'PMNT_VOID': return t.statusVoid;
    default: return (statusId || '').replace('PMNT_', '').replace(/_/g, ' ');
  }
};

interface PaymentListProps {
  onViewPayment: (paymentId: string) => void;
  onCreatePayment: () => void;
}

const PaymentList: React.FC<PaymentListProps> = ({ onViewPayment, onCreatePayment }) => {
  const { translations, locale } = useTranslation();
  const t = translations.payments;
  const common = translations.common;

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

  // Metadata for filter dropdowns
  const [paymentTypes, setPaymentTypes] = useState<{ paymentTypeId: string; description: string }[]>([]);
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<{ paymentMethodTypeId: string; description: string }[]>([]);
  const [statusList, setStatusList] = useState<{ statusId: string; description: string }[]>([]);

  useEffect(() => {
    // Fetch filter metadata
    const fetchMetadata = async () => {
      try {
        const res = await api.getPaymentMetadata();
        if (res.metadata) {
          setPaymentTypes(res.metadata.paymentTypes || []);
          setPaymentMethodTypes(res.metadata.paymentMethodTypes || []);
          setStatusList(res.metadata.statusList || []);
        }
      } catch (err: any) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const loadPayments = async (appliedFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPayments({
        search: appliedFilters.search || undefined,
        paymentTypeId: appliedFilters.paymentTypeId || undefined,
        paymentMethodTypeId: appliedFilters.paymentMethodTypeId || undefined,
        statusId: appliedFilters.statusId || undefined
      });
      setPayments(res.payments || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    loadPayments(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      search: '',
      paymentTypeId: '',
      paymentMethodTypeId: '',
      statusId: ''
    };
    setFilters(emptyFilters);
    loadPayments(emptyFilters);
  };

  // Summary Metrics calculations
  const totalReceived = payments
    .filter(p => p.partyIdTo === 'Company' || p.paymentTypeId === 'CUSTOMER_PAYMENT' || p.paymentTypeId === 'RECEIPT')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const totalSent = payments
    .filter(p => p.partyIdFrom === 'Company' || p.paymentTypeId === 'VENDOR_PAYMENT' || p.paymentTypeId === 'DISBURSEMENT')
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
            <span className="ds-stat-label">{t.registeredPayments}</span>
            <div className="p-1.5 rounded-xl bg-indigo-600/10 text-indigo-400">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="ds-stat-value">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-1">{t.registeredPaymentsSub}</div>
        </div>

        {/* Customer Receipts */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">{t.customerReceipts}</span>
            <div className="p-1.5 rounded-xl bg-emerald-600/10 text-emerald-400">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-emerald-400">
            ${totalReceived.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">{t.customerReceiptsSub}</div>
        </div>

        {/* Vendor Payments */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">{t.vendorDisbursements}</span>
            <div className="p-1.5 rounded-xl bg-blue-600/10 text-blue-400">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-blue-400">
            ${totalSent.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">{t.vendorDisbursementsSub}</div>
        </div>

        {/* Open Balance */}
        <div className="ds-stat-card">
          <div className="flex justify-between items-center mb-2">
            <span className="ds-stat-label">{t.unappliedBalance}</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-amber-400">
            ${totalOpen.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">{t.unappliedBalanceSub}</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="ds-card p-5">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-indigo-400" />
            <span className="font-semibold text-sm text-slate-200">{common.filter}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadPayments(filters)}
              className="ds-btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {common.refresh}
            </button>
            <button
              onClick={onCreatePayment}
              className="ds-btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              {t.newPayment}
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
              placeholder={t.searchPlaceholder}
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
            <option value="">{t.allPaymentTypes}</option>
            {paymentTypes.map(item => (
              <option key={item.paymentTypeId} value={item.paymentTypeId}>{item.description || item.paymentTypeId}</option>
            ))}
          </select>

          {/* Payment Method */}
          <select
            name="paymentMethodTypeId"
            value={filters.paymentMethodTypeId}
            onChange={handleFilterChange}
            className="ds-select"
          >
            <option value="">{t.allPaymentMethods}</option>
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
            <option value="">{t.allPaymentStatuses}</option>
            {statusList.map(s => (
              <option key={s.statusId} value={s.statusId}>{s.description || s.statusId}</option>
            ))}
          </select>

          {(filters.search || filters.paymentTypeId || filters.paymentMethodTypeId || filters.statusId) && (
            <button
              onClick={handleResetFilters}
              className="text-slate-400 text-sm border border-dashed border-slate-600 rounded-xl px-3 py-2 hover:text-slate-200 hover:border-slate-500 transition-colors cursor-pointer bg-transparent"
            >
              {t.resetFilters}
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
                <th className="ds-th">{t.paymentId}</th>
                <th className="ds-th">{t.paymentType}</th>
                <th className="ds-th">{t.fromParty}</th>
                <th className="ds-th">{t.toParty}</th>
                <th className="ds-th">{t.effectiveDate}</th>
                <th className="ds-th">{common.status}</th>
                <th className="ds-th-right">{common.amount}</th>
                <th className="ds-th-right">{t.appliedOpen}</th>
                <th className="ds-th w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="ds-spinner mx-auto" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 text-sm">
                    {common.noData}
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr
                    key={p.paymentId}
                    onClick={() => onViewPayment(p.paymentId)}
                    className="ds-tbody-row cursor-pointer"
                  >
                    <td className="ds-td font-mono font-medium text-indigo-400">
                      #{p.paymentId}
                    </td>
                    <td className="ds-td text-slate-300">
                      {p.paymentTypeDesc || p.paymentTypeId}
                    </td>
                    <td className="ds-td text-slate-300">
                      {p.partyIdFrom}
                    </td>
                    <td className="ds-td text-slate-300">
                      {p.partyIdTo}
                    </td>
                    <td className="ds-td text-slate-400 text-xs font-mono">
                      {p.effectiveDate ? p.effectiveDate.split(' ')[0] : '-'}
                    </td>
                    <td className="ds-td">
                      <span className={getPaymentStatusBadgeClass(p.statusId)}>
                        {p.statusId === 'PMNT_RECEIVED' || p.statusId === 'PMNT_CONFIRMED' ? (
                          <CheckCircle2 size={12} className="inline mr-1" />
                        ) : p.statusId === 'PMNT_CANCELLED' || p.statusId === 'PMNT_VOID' ? (
                          <XCircle size={12} className="inline mr-1" />
                        ) : (
                          <Clock size={12} className="inline mr-1" />
                        )}
                        {getPaymentStatusLabel(p.statusId, t)}
                      </span>
                    </td>
                    <td className="ds-td-right font-mono font-semibold text-slate-100">
                      ${p.amount?.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="ds-td-right text-xs">
                      <span className="text-slate-400 font-mono">
                        ${(p.amount - (p.openAmount || 0)).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {p.openAmount && p.openAmount > 0 ? (
                        <div className="text-amber-400 font-mono text-[10px] mt-0.5">
                          {t.openAmountLabel} ${p.openAmount?.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : null}
                    </td>
                    <td className="ds-td text-right text-slate-500">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentList;
