import React, { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, Check, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import { api, OpenPaymentItem } from '../services/api';
import { useTranslation } from '../i18n';

interface ApplyPaymentModalProps {
  isOpen: boolean;
  invoiceId: string;
  currencyUomId: string;
  outstandingAmount: number;
  onClose: () => void;
  onApplied: () => void;
}

export const ApplyPaymentModal: React.FC<ApplyPaymentModalProps> = ({
  isOpen,
  invoiceId,
  currencyUomId,
  outstandingAmount,
  onClose,
  onApplied
}) => {
  const { translations, locale } = useTranslation();
  const inv = translations.invoices;
  const common = translations.common;

  const [loading, setLoading] = useState<boolean>(true);
  const [openPayments, setOpenPayments] = useState<OpenPaymentItem[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [amountApplied, setAmountApplied] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Body Scroll Lock (Golden Invariant 2)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatCurrency = useCallback((val: number) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currencyUomId || 'USD'
    }).format(val || 0);
  }, [locale, currencyUomId]);

  const loadOpenPayments = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOpenPaymentsForInvoice(invoiceId);
      const list = res.openPayments || [];
      setOpenPayments(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedPaymentId(first.paymentId);
        const maxApplicable = Math.min(first.unappliedAmount, outstandingAmount);
        setAmountApplied(maxApplicable > 0 ? maxApplicable.toFixed(2) : '');
      } else {
        setSelectedPaymentId('');
        setAmountApplied('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === 'tr' ? 'Açık ödemeler alınamadı.' : 'Could not fetch open payments.'));
    } finally {
      setLoading(false);
    }
  }, [invoiceId, outstandingAmount, locale]);

  useEffect(() => {
    if (isOpen) {
      loadOpenPayments();
    }
  }, [isOpen, loadOpenPayments]);

  if (!isOpen) return null;

  const selectedPayment = openPayments.find((p) => p.paymentId === selectedPaymentId);

  const handleSelectPayment = (payment: OpenPaymentItem) => {
    setSelectedPaymentId(payment.paymentId);
    const maxApplicable = Math.min(payment.unappliedAmount, outstandingAmount);
    setAmountApplied(maxApplicable > 0 ? maxApplicable.toFixed(2) : '');
  };

  const handleSetMaxAmount = () => {
    if (!selectedPayment) return;
    const maxApplicable = Math.min(selectedPayment.unappliedAmount, outstandingAmount);
    setAmountApplied(maxApplicable.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId) {
      setError(locale === 'tr' ? 'Lütfen bir ödeme seçin.' : 'Please select a payment.');
      return;
    }

    const amt = parseFloat(amountApplied);
    if (isNaN(amt) || amt <= 0) {
      setError(locale === 'tr' ? 'Geçerli bir eşleme tutarı giriniz.' : 'Please enter a valid amount.');
      return;
    }

    if (selectedPayment && amt > selectedPayment.unappliedAmount + 0.001) {
      setError(
        locale === 'tr'
          ? `Eşleme tutarı, ödemenin açık tutarından (${formatCurrency(selectedPayment.unappliedAmount)}) büyük olamaz.`
          : `Amount cannot exceed payment unapplied balance (${formatCurrency(selectedPayment.unappliedAmount)}).`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createPaymentApplication({
        paymentId: selectedPaymentId,
        invoiceId,
        amountApplied: amt
      });
      onApplied();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === 'tr' ? 'Ödeme eşlenirken hata oluştu.' : 'Failed to apply payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Background Overlay without backdrop-blur (Golden Invariant 2) */}
      <div 
        className="fixed inset-0 bg-black/80 transition-opacity" 
        onClick={onClose} 
      />

      {/* 100% Opaque Modal Container */}
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                {inv.applyPayment}
              </h3>
              <p className="text-xs text-slate-400">
                {inv.invoiceId}: #{invoiceId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Outstanding Amount Banner */}
          <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign size={20} className="text-indigo-400" />
              <div>
                <span className="text-xs text-indigo-300 font-medium block">
                  {inv.outstandingAmount}
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {formatCurrency(outstandingAmount)}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              {currencyUomId}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <span className="text-sm text-slate-400">{common.loading}</span>
            </div>
          ) : openPayments.length === 0 ? (
            <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-xl text-center space-y-2">
              <AlertCircle size={32} className="text-amber-400 mx-auto mb-2" />
              <h4 className="text-white font-semibold text-sm">{inv.noOpenPayments}</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                {locale === 'tr'
                  ? 'Fatura tarafları arasında henüz kapatılmamış veya tahsil edilmemiş aktif açık ödeme kaydı bulunmuyor.'
                  : 'There are no active unapplied payments available between the invoice parties.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="ds-label mb-2 flex justify-between items-center">
                  <span>{inv.openPayments} ({openPayments.length})</span>
                  <span className="text-xs text-slate-400 font-normal">
                    {inv.selectPayment}
                  </span>
                </label>

                {/* Open Payments List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {openPayments.map((pmnt) => {
                    const isSelected = pmnt.paymentId === selectedPaymentId;
                    return (
                      <div
                        key={pmnt.paymentId}
                        onClick={() => handleSelectPayment(pmnt)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/50 border-indigo-500/60 shadow-sm'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500 text-white'
                                : 'border-slate-600 bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              <span>#{pmnt.paymentId}</span>
                              <span className="text-xs font-normal text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded">
                                {pmnt.paymentTypeId.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {pmnt.effectiveDate || '-'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">
                            {inv.availableUnapplied}:
                          </span>
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            {formatCurrency(pmnt.unappliedAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedPayment && (
                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="ds-label mb-0">{inv.applyAmount} ({currencyUomId})</label>
                      <button
                        type="button"
                        onClick={handleSetMaxAmount}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline"
                      >
                        {locale === 'tr' ? 'Maksimumu Yaz' : 'Apply Max'}
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.min(selectedPayment.unappliedAmount, outstandingAmount)}
                      value={amountApplied}
                      onChange={(e) => setAmountApplied(e.target.value)}
                      className="ds-input w-full font-mono text-base"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="ds-btn-secondary"
                >
                  {common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPaymentId}
                  className="ds-btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {inv.applyPayment}
                </button>
              </div>
            </form>
          )}

          {openPayments.length === 0 && !loading && (
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="ds-btn-secondary"
              >
                {common.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyPaymentModal;
