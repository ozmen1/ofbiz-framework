import React, { useState, useEffect } from 'react';
import { Mail, X, Send, AlertCircle, Loader2, FileText } from 'lucide-react';
import { api, InvoiceDetailResponse } from '../services/api';
import { useTranslation } from '../i18n';

interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  invoiceId: string;
  detail: InvoiceDetailResponse | null;
  onClose: () => void;
  onSent: () => void;
}

export const SendInvoiceEmailModal: React.FC<SendInvoiceEmailModalProps> = ({
  isOpen,
  invoiceId,
  detail,
  onClose,
  onSent
}) => {
  const { translations, locale } = useTranslation();
  const inv = translations.invoices;
  const common = translations.common;

  // Derive initial recipient email if available from contact mechs
  const defaultRecipient = () => {
    if (!detail?.contactMechs) return '';
    const emailCm = detail.contactMechs.find(
      cm => cm.contactMechPurposeTypeId === 'ORDER_EMAIL' || 
            cm.contactMechPurposeTypeId === 'PRIMARY_EMAIL' || 
            cm.detailInfo?.includes('@')
    );
    return emailCm?.detailInfo || '';
  };

  const defaultSubject = () => {
    return locale === 'tr'
      ? `Fatura Detayı #${invoiceId} - ${detail?.invoice?.referenceNumber || ''}`
      : `Invoice Details #${invoiceId} - ${detail?.invoice?.referenceNumber || ''}`;
  };

  const defaultBody = () => {
    const totalFormatted = detail?.totals?.total
      ? `${detail.totals.total.toFixed(2)} ${detail.invoice.currencyUomId}`
      : '';
    return locale === 'tr'
      ? `Sayın Müşterimiz / İş Ortağımız,\n\n${invoiceId} nolu faturanız düzenlenmiştir.\nFatura Tutarı: ${totalFormatted}\nVade Tarihi: ${detail?.invoice?.dueDate || '-'}\n\nFatura detayları ekte yer almaktadır.\n\nBilgilerinize sunar, iyi çalışmalar dileriz.`
      : `Dear Customer / Business Partner,\n\nInvoice #${invoiceId} has been generated.\nAmount Due: ${totalFormatted}\nDue Date: ${detail?.invoice?.dueDate || '-'}\n\nPlease find the invoice details attached.\n\nBest regards,`;
  };

  const [sendTo, setSendTo] = useState<string>('');
  const [sendCc, setSendCc] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Body Scroll Lock (Golden Invariant 2)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSendTo(defaultRecipient());
      setSubject(defaultSubject());
      setBodyText(defaultBody());
      setError(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTo.trim()) {
      setError(locale === 'tr' ? 'Alıcı e-posta adresi zorunludur.' : 'Recipient email is required.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await api.sendInvoiceEmail({
        invoiceId,
        sendTo: sendTo.trim(),
        sendCc: sendCc.trim() || undefined,
        subject: subject.trim(),
        bodyText: bodyText.trim()
      });
      onSent();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === 'tr' ? 'E-posta gönderilemedi.' : 'Failed to send email.'));
    } finally {
      setSending(false);
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
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                {inv.sendEmailModalTitle}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Summary Banner */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FileText size={16} className="text-indigo-400" />
              <span>
                {detail?.invoice?.partyIdFrom} &rarr; {detail?.invoice?.partyIdTo}
              </span>
            </div>
            <span className="font-mono font-bold text-white">
              {detail?.totals?.total?.toFixed(2)} {detail?.invoice?.currencyUomId}
            </span>
          </div>

          <div>
            <label className="ds-label">{inv.recipientEmail}</label>
            <input
              type="email"
              placeholder="customer@example.com"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              className="ds-input w-full text-sm"
              required
            />
          </div>

          <div>
            <label className="ds-label">{inv.ccEmail}</label>
            <input
              type="text"
              placeholder="accounting@company.com"
              value={sendCc}
              onChange={(e) => setSendCc(e.target.value)}
              className="ds-input w-full text-sm"
            />
          </div>

          <div>
            <label className="ds-label">{inv.emailSubject}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="ds-input w-full text-sm"
              required
            />
          </div>

          <div>
            <label className="ds-label">{inv.emailBody}</label>
            <textarea
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="ds-input w-full text-xs font-sans leading-relaxed min-h-[100px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={sending}
              className="ds-btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{inv.sendingEmail}</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{inv.sendEmailBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendInvoiceEmailModal;
