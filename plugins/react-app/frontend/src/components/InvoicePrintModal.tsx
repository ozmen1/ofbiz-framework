import React, { useEffect, useState, useCallback } from 'react';
import { Printer, X, FileText, AlertCircle, Building2, User } from 'lucide-react';
import { api, InvoiceDetailResponse, fetchPartyDetail, PartyDetail } from '../services/api';
import { useTranslation } from '../i18n';

interface InvoicePrintModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  preloadedDetail?: InvoiceDetailResponse | null;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoiceId,
  isOpen,
  onClose,
  preloadedDetail
}) => {
  const { translations, locale } = useTranslation();
  const invT = translations.invoices;
  const common = translations.common;

  const [detail, setDetail] = useState<InvoiceDetailResponse | null>(preloadedDetail || null);
  const [loading, setLoading] = useState<boolean>(!preloadedDetail);
  const [error, setError] = useState<string | null>(null);
  const [partyFromDetail, setPartyFromDetail] = useState<PartyDetail | null>(null);
  const [partyToDetail, setPartyToDetail] = useState<PartyDetail | null>(null);

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

  // Load invoice detail if not preloaded
  const loadData = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      let d = preloadedDetail;
      if (!d || d.invoice?.invoiceId !== invoiceId) {
        d = await api.getInvoiceDetails(invoiceId);
        setDetail(d);
      } else {
        setDetail(d);
      }

      // Fetch party details for richer invoice headers
      if (d?.invoice?.partyIdFrom) {
        fetchPartyDetail(d.invoice.partyIdFrom)
          .then(res => setPartyFromDetail(res.partyDetail))
          .catch(() => {});
      }
      if (d?.invoice?.partyIdTo) {
        fetchPartyDetail(d.invoice.partyIdTo)
          .then(res => setPartyToDetail(res.partyDetail))
          .catch(() => {});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === 'tr' ? 'Fatura detayları yüklenemedi.' : 'Failed to load invoice details.'));
    } finally {
      setLoading(false);
    }
  }, [invoiceId, preloadedDetail, locale]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const invoice = detail?.invoice;
  const items = detail?.items || [];
  const totals = detail?.totals || {
    total: 0,
    taxTotal: 0,
    subTotal: 0,
    appliedAmount: 0,
    outstandingAmount: 0
  };

  const partyFromName = partyFromDetail?.displayName || partyFromDetail?.group?.groupName || invoice?.partyIdFrom || '-';
  const partyToName = partyToDetail?.displayName || partyToDetail?.group?.groupName || invoice?.partyIdTo || '-';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Print Specific CSS Style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-container, #printable-invoice-container * {
            visibility: visible !important;
          }
          #printable-invoice-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            background: white !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 100% Opaque Backdrop (NO backdrop-blur per Golden Invariant 2) */}
      <div 
        className="fixed inset-0 bg-black/80 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Main Frame */}
      <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl z-10 animate-fade-in">
        
        {/* Modal Top Control Header (Sticky, No Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-white text-base font-semibold leading-tight m-0">
                {invT.printPreview}
              </h3>
              <span className="text-xs text-slate-400 font-mono">#{invoiceId}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !detail}
              className="ds-btn-primary py-2 px-4 text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              <Printer size={16} />
              <span>{invT.printAction}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={common.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-950 flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <div className="ds-spinner"></div>
              <span>{common.loading}</span>
            </div>
          ) : error ? (
            <div className="ds-alert-error my-8 max-w-md w-full flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : !invoice ? (
            <div className="text-slate-500 py-16">{invT.notFound}</div>
          ) : (
            /* Printable Paper Sheet */
            <div
              id="printable-invoice-container"
              className="bg-white text-slate-900 w-full max-w-3xl p-6 sm:p-10 rounded-xl shadow-xl border border-slate-200 font-sans text-sm flex flex-col justify-between min-h-[840px]"
            >
              <div>
                {/* Header: Company & Invoice Info */}
                <div className="flex flex-wrap items-start justify-between border-b-2 border-slate-900 pb-6 mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                        OF
                      </div>
                      <span className="text-xl font-bold tracking-tight text-slate-900">
                        OFBiz Enterprise
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Kurumsal Kaynak Planlama & Muhasebe Sistemi
                    </p>
                  </div>

                  <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-900 tracking-wider m-0">
                      {invT.invoiceTitle}
                    </h1>
                    <div className="text-sm font-mono font-bold text-indigo-700 mt-1">
                      #{invoice.invoiceId}
                    </div>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                      {(invoice.invoiceTypeId || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6 text-xs">
                  <div>
                    <span className="text-slate-500 block">{invT.invoiceDate}:</span>
                    <span className="font-semibold text-slate-900">{invoice.invoiceDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{invT.dueDate}:</span>
                    <span className="font-semibold text-slate-900">{invoice.dueDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{common.reference}:</span>
                    <span className="font-semibold text-slate-900">{invoice.referenceNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{common.status}:</span>
                    <span className="font-semibold text-slate-900">{(invoice.statusId || '').replace('INVOICE_', '')}</span>
                  </div>
                </div>

                {/* Parties Details (From / To) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  {/* Bill From */}
                  <div className="p-4 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-2">
                      {invT.billFrom}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base m-0 flex items-center gap-1.5">
                      <Building2 size={16} className="text-slate-400 shrink-0" />
                      {partyFromName}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 font-mono">
                      Cari Kodu: {invoice.partyIdFrom}
                    </p>
                    {partyFromDetail?.description && (
                      <p className="text-xs text-slate-500 mt-1">{partyFromDetail.description}</p>
                    )}
                  </div>

                  {/* Bill To */}
                  <div className="p-4 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-2">
                      {invT.billTo}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base m-0 flex items-center gap-1.5">
                      <User size={16} className="text-slate-400 shrink-0" />
                      {partyToName}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 font-mono">
                      Cari Kodu: {invoice.partyIdTo}
                    </p>
                    {partyToDetail?.description && (
                      <p className="text-xs text-slate-500 mt-1">{partyToDetail.description}</p>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-6 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">{invT.itemType}</th>
                        <th className="py-2.5 px-3">{common.description}</th>
                        <th className="py-2.5 px-3 text-right">{invT.quantity}</th>
                        <th className="py-2.5 px-3 text-right">{invT.unitPrice}</th>
                        <th className="py-2.5 px-3 text-right">{invT.lineTotal}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <tr key={it.invoiceItemSeqId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                              {it.invoiceItemSeqId}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {(it.invoiceItemTypeId || '').replace('INV_', '').replace(/_/g, ' ')}
                            </td>
                            <td className="py-2.5 px-3 text-slate-900 font-medium">
                              {it.description || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {it.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatCurrency(it.amount, invoice.currencyUomId)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                              {formatCurrency(it.itemTotal, invoice.currencyUomId)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            {invT.noItems}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Totals Calculation Box */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                  {/* Left: General Notes */}
                  <div className="flex-1 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200 w-full">
                    <span className="font-bold text-slate-800 block mb-1">
                      {common.description} & {invT.notesAndTerms}:
                    </span>
                    <p className="m-0 leading-relaxed text-slate-600">
                      {invoice.description || 'Bu fatura sistem üzerinden elektronik olarak üretilmiştir. Ödemelerin belirtilen vade tarihine kadar yapılması rica olunur.'}
                    </p>
                  </div>

                  {/* Right: Financial Totals Box */}
                  <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>{invT.subtotalWithoutTax}:</span>
                      <span className="font-mono font-medium text-slate-900">
                        {formatCurrency(totals.subTotal, invoice.currencyUomId)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>{locale === 'tr' ? 'Hesaplanan KDV' : 'Tax Total'}:</span>
                      <span className="font-mono font-medium text-slate-900">
                        {formatCurrency(totals.taxTotal, invoice.currencyUomId)}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-bold text-slate-900">
                      <span>{invT.grandTotal}:</span>
                      <span className="font-mono text-indigo-700">
                        {formatCurrency(totals.total, invoice.currencyUomId)}
                      </span>
                    </div>

                    {totals.appliedAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 pt-1 text-xs border-t border-slate-200">
                        <span>{invT.paidAmount}:</span>
                        <span className="font-mono font-medium">
                          -{formatCurrency(totals.appliedAmount, invoice.currencyUomId)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-xs font-bold text-slate-900">
                      <span>{invT.balanceDue}:</span>
                      <span className={`font-mono ${totals.outstandingAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatCurrency(totals.outstandingAmount, invoice.currencyUomId)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures & Stamp Row (Bottom) */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-lg min-h-[90px]">
                  <span className="font-semibold text-slate-700 mb-1">{invT.authorizedStamp}</span>
                  <span className="text-[10px] text-slate-400">Yetkili İmza / Kaşe</span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-lg min-h-[90px]">
                  <span className="font-semibold text-slate-700 mb-1">{invT.recipientSignature}</span>
                  <span className="text-[10px] text-slate-400">Ad Soyad / Tarih / İmza</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Bottom Footer (No Print) */}
        <div className="no-print px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="ds-btn-secondary py-1.5 px-4 text-xs sm:text-sm cursor-pointer"
          >
            {common.close}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !detail}
            className="ds-btn-primary py-1.5 px-4 text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Printer size={15} />
            <span>{invT.printAction}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoicePrintModal;
