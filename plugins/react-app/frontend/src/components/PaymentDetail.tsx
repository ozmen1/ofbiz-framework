import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Edit3, Save, CheckCircle2, CreditCard, 
  User, Calendar, AlignLeft, Plus, Trash2, AlertCircle, Link2, ExternalLink, X
} from 'lucide-react';
import { api, PaymentDetailResponse, OpenInvoiceItem, PaymentMetadataResponse } from '../services/api';
import { useTranslation } from '../i18n';

interface PaymentDetailProps {
  paymentId: string | null;
  onBack: () => void;
  onViewInvoice?: (invoiceId: string) => void;
}

const getPaymentBadgeClass = (statusId: string) => {
  switch (statusId) {
    case 'PMNT_CONFIRMED': return 'ds-badge-purple';
    case 'PMNT_RECEIVED': return 'ds-badge-green';
    case 'PMNT_SENT': return 'ds-badge-blue';
    case 'PMNT_NOT_PAID': return 'ds-badge-yellow';
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return 'ds-badge-red';
    default: return 'ds-badge-slate';
  }
};

const formatStatus = (statusId: string) => {
  return (statusId || '').replace('PMNT_', '').replace(/_/g, ' ');
};

export const PaymentDetail: React.FC<PaymentDetailProps> = ({ paymentId, onBack, onViewInvoice }) => {
  const { translations, locale } = useTranslation();
  const p = translations.payments;
  const common = translations.common;
  const invT = translations.invoices;

  const [detail, setDetail] = useState<PaymentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Edit Header State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    paymentMethodTypeId: '',
    amount: 0,
    paymentRefNum: '',
    comments: '',
    effectiveDate: ''
  });

  // Modal State for Apply to Invoice
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OpenInvoiceItem | null>(null);
  const [applyAmount, setApplyAmount] = useState<number>(0);

  // Metadata
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<PaymentMetadataResponse['metadata']['paymentMethodTypes']>([]);

  const formatCurrency = useCallback((val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency
    }).format(val || 0);
  }, [locale]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const loadPayment = useCallback(() => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    api.getPaymentDetails(paymentId)
      .then(res => {
        setDetail(res);
        if (res.payment) {
          setEditForm({
            paymentMethodTypeId: res.payment.paymentMethodTypeId || '',
            amount: res.payment.amount || 0,
            paymentRefNum: res.payment.paymentRefNum || '',
            comments: res.payment.comments || '',
            effectiveDate: res.payment.effectiveDate ? res.payment.effectiveDate.substring(0, 10) : ''
          });
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || (locale === 'tr' ? 'Ödeme detayları alınamadı.' : 'Could not load payment details.'));
        setLoading(false);
      });
  }, [paymentId, locale]);

  useEffect(() => {
    loadPayment();
    api.getPaymentMetadata()
      .then(res => {
        if (res?.metadata?.paymentMethodTypes) {
          setPaymentMethodTypes(res.metadata.paymentMethodTypes);
        }
      })
      .catch(() => {});
  }, [loadPayment]);

  // Open apply modal
  const handleOpenApplyModal = () => {
    if (!paymentId) return;
    setShowApplyModal(true);
    setInvoicesLoading(true);
    setSelectedInvoice(null);
    setApplyAmount(0);

    api.getOpenInvoicesForPayment(paymentId)
      .then(res => {
        setOpenInvoices(res.openInvoices || []);
        setInvoicesLoading(false);
      })
      .catch(err => {
        setError(err.message || (locale === 'tr' ? 'Açık faturalar yüklenemedi.' : 'Could not load open invoices.'));
        setInvoicesLoading(false);
      });
  };

  const handleSelectInvoice = (inv: OpenInvoiceItem) => {
    setSelectedInvoice(inv);
    const maxPossible = Math.min(detail?.openAmount || 0, inv.outstandingAmount || 0);
    setApplyAmount(maxPossible > 0 ? maxPossible : 0);
  };

  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId || !selectedInvoice) return;
    if (applyAmount <= 0) {
      setError(locale === 'tr' ? 'Uygulanacak tutar sıfırdan büyük olmalıdır.' : 'Amount to apply must be greater than zero.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.createPaymentApplication({
        paymentId,
        invoiceId: selectedInvoice.invoiceId,
        amountApplied: applyAmount
      });
      flash(res._EVENT_MESSAGE_ || (locale === 'tr' ? 'Ödeme faturaya başarıyla uygulandı.' : 'Payment applied to invoice successfully.'));
      setShowApplyModal(false);
      loadPayment();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Ödeme faturaya uygulanamadı.' : 'Failed to apply payment to invoice.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveApplication = async (appId: string) => {
    if (!confirm(p.confirmRemoveMember || (locale === 'tr' ? 'Bu ödeme mahsubunu kaldırmak istediğinize emin misiniz?' : 'Are you sure you want to remove this payment application?'))) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.removePaymentApplication(appId);
      flash(res._EVENT_MESSAGE_ || (locale === 'tr' ? 'Mahsup kaydı kaldırıldı.' : 'Payment application removed.'));
      loadPayment();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Mahsup silinirken hata oluştu.' : 'Failed to remove application.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatusId: string) => {
    if (!paymentId) return;
    if (!confirm(locale === 'tr' ? `Ödeme durumunu "${formatStatus(newStatusId)}" olarak değiştirmek istiyor musunuz?` : `Are you sure you want to change payment status to "${formatStatus(newStatusId)}"?`)) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.setPaymentStatus(paymentId, newStatusId);
      flash(res._EVENT_MESSAGE_ || (locale === 'tr' ? `Durum güncellendi: ${formatStatus(newStatusId)}` : `Status updated: ${formatStatus(newStatusId)}`));
      loadPayment();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Durum değiştirilemedi.' : 'Could not change status.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.updatePayment({
        paymentId,
        amount: Number(editForm.amount),
        paymentMethodTypeId: editForm.paymentMethodTypeId,
        paymentRefNum: editForm.paymentRefNum,
        comments: editForm.comments,
        effectiveDate: editForm.effectiveDate
      });
      setIsEditing(false);
      flash(locale === 'tr' ? 'Ödeme bilgileri güncellendi.' : 'Payment updated successfully.');
      loadPayment();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Güncelleme başarısız oldu.' : 'Failed to update payment.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="ds-spinner mb-3" />
        <div className="text-slate-400 text-sm">{common.loading}</div>
      </div>
    );
  }

  if (!detail || !detail.payment) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="ds-btn-secondary">
          <ArrowLeft size={16} /> {common.back}
        </button>
        <div className="ds-card p-8 text-center text-red-400">
          {locale === 'tr' ? 'Ödeme bulunamadı veya bir hata oluştu.' : 'Payment not found or an error occurred.'}
        </div>
      </div>
    );
  }

  const { payment, appliedAmount, openAmount, applications } = detail;
  const isIncoming = payment.paymentTypeId.includes('CUSTOMER') || payment.paymentTypeId.includes('RECEIPT');

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="ds-page-header">
        <button 
          onClick={onBack}
          className="ds-btn-ghost flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {p.backToList}
        </button>

        {/* Status Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {payment.statusId === 'PMNT_NOT_PAID' && (
            <>
              <button
                onClick={() => handleStatusChange(isIncoming ? 'PMNT_RECEIVED' : 'PMNT_SENT')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isIncoming ? p.statusReceived : p.statusSent}
              </button>
              <button
                onClick={() => handleStatusChange('PMNT_CANCELLED')}
                disabled={actionLoading}
                className="ds-btn-danger text-xs"
              >
                {common.cancel}
              </button>
            </>
          )}

          {(payment.statusId === 'PMNT_RECEIVED' || payment.statusId === 'PMNT_SENT') && (
            <>
              <button
                onClick={() => handleStatusChange('PMNT_CONFIRMED')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {p.statusConfirmed}
              </button>
              <button
                onClick={() => handleStatusChange('PMNT_CANCELLED')}
                disabled={actionLoading}
                className="ds-btn-danger text-xs"
              >
                {common.cancel}
              </button>
            </>
          )}

          {payment.statusId === 'PMNT_CONFIRMED' && (
            <button
              onClick={() => handleStatusChange('PMNT_VOID')}
              disabled={actionLoading}
              className="ds-btn-danger text-xs"
            >
              {p.statusVoid}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="ds-alert-success flex items-center gap-3">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Cards & Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className="ds-stat-label">{p.paymentDetailsTitle}</span>
              <h3 className="ds-stat-value">#{payment.paymentId}</h3>
            </div>
            <span className={`ds-badge ${getPaymentBadgeClass(payment.statusId)}`}>
              {payment.statusDesc || formatStatus(payment.statusId)}
            </span>
          </div>
          <div className="ds-stat-sub">
            {common.type}: <strong className="text-slate-200">{payment.paymentTypeDesc}</strong>
          </div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <span className="ds-stat-label">{p.paymentAmount}</span>
          <div className="ds-stat-value text-blue-400">
            {formatCurrency(payment.amount, payment.currencyUomId)}
            <span className="text-xs text-slate-400 font-normal ml-1.5">{payment.currencyUomId}</span>
          </div>
          <div className="ds-stat-sub">
            {p.paymentMethod}: <strong className="text-slate-200">{payment.paymentMethodTypeDesc || payment.paymentMethodTypeId || '-'}</strong>
          </div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <span className="ds-stat-label">{p.appliedAmount}</span>
          <div className="ds-stat-value text-emerald-400">
            {formatCurrency(appliedAmount, payment.currencyUomId)}
          </div>
          <div className="ds-stat-sub">
            {applications.length} {locale === 'tr' ? 'adet faturaya bağlandı' : 'invoices applied'}
          </div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <span className="ds-stat-label">{p.unappliedAmount}</span>
          <div className={`ds-stat-value ${openAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formatCurrency(openAmount, payment.currencyUomId)}
          </div>
          <div className="ds-stat-sub">
            {openAmount > 0 ? (locale === 'tr' ? 'Faturaya bağlanabilir bakiye' : 'Unapplied balance') : (locale === 'tr' ? 'Tamamı eşleşti' : 'Fully matched')}
          </div>
        </div>
      </div>

      {/* Details Grid & Edit Section */}
      <div className="ds-card p-6">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
          <h4 className="text-base font-bold text-white">{p.paymentDetailsHeader}</h4>
          {payment.statusId !== 'PMNT_CANCELLED' && payment.statusId !== 'PMNT_VOID' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="ds-btn-secondary px-3 py-1.5 text-xs"
            >
              <Edit3 size={14} />
              {isEditing ? common.cancel : common.edit}
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveHeader} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="ds-label">{p.paymentMethod}</label>
                <select
                  value={editForm.paymentMethodTypeId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, paymentMethodTypeId: e.target.value }))}
                  className="ds-select"
                >
                  {paymentMethodTypes.map(pm => (
                    <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>{pm.description || pm.paymentMethodTypeId}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">{common.amount}</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="ds-input"
                />
              </div>

              <div>
                <label className="ds-label">{common.date}</label>
                <input
                  type="date"
                  value={editForm.effectiveDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="ds-input"
                />
              </div>

              <div>
                <label className="ds-label">{p.paymentRef}</label>
                <input
                  type="text"
                  value={editForm.paymentRefNum}
                  onChange={(e) => setEditForm(prev => ({ ...prev, paymentRefNum: e.target.value }))}
                  className="ds-input"
                />
              </div>
            </div>

            <div>
              <label className="ds-label">{p.notesDesc}</label>
              <textarea
                rows={2}
                value={editForm.comments}
                onChange={(e) => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                className="ds-input resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="ds-btn-secondary"
              >
                {common.cancel}
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="ds-btn-primary"
              >
                <Save size={14} />
                {common.save}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
            <div>
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <User size={14} /> {p.senderPayer}
              </div>
              <div className="font-semibold text-white">{payment.partyNameFrom}</div>
              <div className="text-xs text-slate-500 mt-0.5">ID: {payment.partyIdFrom}</div>
            </div>

            <div>
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <User size={14} /> {p.receiverPayee}
              </div>
              <div className="font-semibold text-white">{payment.partyNameTo}</div>
              <div className="text-xs text-slate-500 mt-0.5">ID: {payment.partyIdTo}</div>
            </div>

            <div>
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <Calendar size={14} /> {common.date}
              </div>
              <div className="font-semibold text-white">{payment.effectiveDate || '-'}</div>
            </div>

            <div>
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <CreditCard size={14} /> {p.paymentRef}
              </div>
              <div className="font-semibold text-white">{payment.paymentRefNum || '-'}</div>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t border-slate-700/50">
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <AlignLeft size={14} /> {common.description}
              </div>
              <div className="text-slate-200">{payment.comments || (locale === 'tr' ? 'Belirtilmedi' : 'None')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Applied Invoices Section (Fatura Mahsup Tablosu) */}
      <div className="ds-card p-6">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-4 pb-3 border-b border-slate-700/50">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Link2 size={18} className="text-indigo-400" />
              {p.appliedInvoices}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {locale === 'tr' ? 'Bu ödemenin düşüldüğü ve kapatıldığı faturalar' : 'Invoices applied to this payment'}
            </p>
          </div>

          {openAmount > 0 && payment.statusId !== 'PMNT_CANCELLED' && payment.statusId !== 'PMNT_VOID' && (
            <button
              onClick={handleOpenApplyModal}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              {p.applyInvoice}
            </button>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-700/60 rounded-xl text-slate-400">
            {locale === 'tr' ? 'Bu ödemeye henüz hiçbir fatura bağlanmamış.' : 'No invoices have been applied to this payment yet.'}
            {openAmount > 0 && (
              <div className="mt-3">
                <button onClick={handleOpenApplyModal} className="ds-btn-primary mx-auto">
                  {p.selectInvoice}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">#</th>
                  <th className="ds-th">{invT.invoiceId}</th>
                  <th className="ds-th">{common.date}</th>
                  <th className="ds-th">{common.description}</th>
                  <th className="ds-th-right">{common.total}</th>
                  <th className="ds-th-right">{p.appliedAmount}</th>
                  <th className="ds-th text-center">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.paymentApplicationId} className="ds-tbody-row">
                    <td className="ds-td-muted">
                      #{app.paymentApplicationId}
                    </td>
                    <td className="ds-td font-semibold">
                      {app.invoiceId ? (
                        <span 
                          onClick={() => onViewInvoice && onViewInvoice(app.invoiceId!)}
                          className="text-indigo-400 hover:text-indigo-300 cursor-pointer inline-flex items-center gap-1"
                        >
                          #{app.invoiceId}
                          <ExternalLink size={12} />
                        </span>
                      ) : (
                        <span className="text-slate-400">{locale === 'tr' ? 'Cari Hesap' : 'Billing Account'} ({app.billingAccountId || (locale === 'tr' ? 'Diğer' : 'Other')})</span>
                      )}
                    </td>
                    <td className="ds-td-muted">
                      {app.invoiceDate ? app.invoiceDate.substring(0, 10) : '-'}
                    </td>
                    <td className="ds-td-muted">
                      {app.invoiceDescription || '-'}
                    </td>
                    <td className="ds-td-right">
                      {app.invoiceTotal ? formatCurrency(app.invoiceTotal, payment.currencyUomId) : '-'}
                    </td>
                    <td className="ds-td-right text-emerald-400">
                      {formatCurrency(app.amountApplied, payment.currencyUomId)}
                    </td>
                    <td className="ds-td text-center">
                      <button
                        onClick={() => handleRemoveApplication(app.paymentApplicationId)}
                        title={common.delete}
                        disabled={actionLoading}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Apply to Invoice */}
      {showApplyModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {p.applyPaymentTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'tr' ? 'Bu ödemeden düşülecek açık bir fatura seçin. Kullanılabilir açık bakiye: ' : 'Select an open invoice to apply this payment to. Open balance: '}<strong className="text-amber-400">{formatCurrency(openAmount, payment.currencyUomId)}</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {invoicesLoading ? (
              <div className="py-12 text-center">
                <div className="ds-spinner mx-auto mb-2" />
                <div className="text-slate-400 text-xs">{common.loading}</div>
              </div>
            ) : openInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {locale === 'tr' ? 'Bu cariye ait henüz kapatılmamış / açık bir fatura bulunamadı.' : 'No open invoices found for this party.'}
              </div>
            ) : (
              <form onSubmit={handleConfirmApply} className="space-y-4">
                <div>
                  <label className="ds-label">
                    {p.selectInvoice}:
                  </label>
                  <div className="max-h-56 overflow-y-auto border border-slate-700/60 rounded-xl">
                    <table className="ds-table text-xs">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th w-10">{common.selected}</th>
                          <th className="ds-th">{invT.invoiceId}</th>
                          <th className="ds-th">{common.date}</th>
                          <th className="ds-th-right">{common.total}</th>
                          <th className="ds-th-right">{p.remainingDue}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoices.map(inv => (
                          <tr 
                            key={inv.invoiceId}
                            onClick={() => handleSelectInvoice(inv)}
                            className={`ds-tbody-row cursor-pointer ${
                              selectedInvoice?.invoiceId === inv.invoiceId ? 'bg-indigo-500/20' : ''
                            }`}
                          >
                            <td className="ds-td">
                              <input 
                                type="radio" 
                                checked={selectedInvoice?.invoiceId === inv.invoiceId} 
                                onChange={() => handleSelectInvoice(inv)} 
                                className="accent-indigo-500"
                              />
                            </td>
                            <td className="ds-td-mono font-bold">#{inv.invoiceId}</td>
                            <td className="ds-td-muted">{inv.invoiceDate ? inv.invoiceDate.substring(0, 10) : '-'}</td>
                            <td className="ds-td-right">{formatCurrency(inv.total, payment.currencyUomId)}</td>
                            <td className="ds-td-right text-amber-400 font-bold">
                              {formatCurrency(inv.outstandingAmount, payment.currencyUomId)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedInvoice && (
                  <div className="ds-card p-4 space-y-2">
                    <label className="ds-label">
                      {p.matchAmount} ({payment.currencyUomId}):
                    </label>
                    <div className="flex gap-3 items-center">
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={Math.min(openAmount, selectedInvoice.outstandingAmount)}
                        value={applyAmount}
                        onChange={(e) => setApplyAmount(parseFloat(e.target.value) || 0)}
                        required
                        className="ds-input flex-1 font-bold text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setApplyAmount(Math.min(openAmount, selectedInvoice.outstandingAmount))}
                        className="ds-btn-secondary px-3 py-2 text-xs"
                      >
                        {p.applyAll}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.invoiceRemaining}: {formatCurrency(selectedInvoice.outstandingAmount, payment.currencyUomId)} | {p.paymentOpenBalance}: {formatCurrency(openAmount, payment.currencyUomId)}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="ds-btn-secondary"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedInvoice || applyAmount <= 0 || actionLoading}
                    className="ds-btn-primary"
                  >
                    {actionLoading ? <div className="ds-spinner-sm" /> : <CheckCircle2 size={16} />}
                    {common.confirm}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentDetail;
