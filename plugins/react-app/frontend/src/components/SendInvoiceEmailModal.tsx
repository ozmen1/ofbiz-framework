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

  // Derive initial recipient email with smart multi-source fallback
  const defaultRecipient = () => {
    // 1. Check backend-computed default recipient email
    if (detail?.invoice?.defaultRecipientEmail) {
      return detail.invoice.defaultRecipientEmail;
    }

    const isPurchase = detail?.invoice?.invoiceTypeId === 'PURCHASE_INVOICE';

    // 2. Check counter-party email directly on invoice header
    if (isPurchase && detail?.invoice?.partyFromEmail) return detail.invoice.partyFromEmail;
    if (!isPurchase && detail?.invoice?.partyToEmail) return detail.invoice.partyToEmail;

    // 3. Check partyEmails array from backend
    if (detail?.partyEmails && detail.partyEmails.length > 0) {
      const targetPartyId = isPurchase ? detail.invoice.partyIdFrom : detail.invoice.partyIdTo;
      const match = detail.partyEmails.find(pe => pe.partyId === targetPartyId);
      if (match?.email) return match.email;
      return detail.partyEmails[0].email;
    }

    // 4. Check contact mechs linked directly to invoice
    if (detail?.contactMechs) {
      const emailCm = detail.contactMechs.find(
        cm => cm.contactMechPurposeTypeId === 'ORDER_EMAIL' || 
              cm.contactMechPurposeTypeId === 'PRIMARY_EMAIL' || 
              cm.detailInfo?.includes('@')
      );
      if (emailCm?.detailInfo) return emailCm.detailInfo;
    }

    return '';
  };

  // Derive initial CC email (e.g. internal accounting or company email)
  const defaultCc = () => {
    const isPurchase = detail?.invoice?.invoiceTypeId === 'PURCHASE_INVOICE';
    // For purchase invoices, our company is partyTo
    if (isPurchase && detail?.invoice?.partyToEmail) return detail.invoice.partyToEmail;
    // For sales invoices, our company is partyFrom
    if (!isPurchase && detail?.invoice?.partyFromEmail) return detail.invoice.partyFromEmail;
    return '';
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
      setSendCc(defaultCc());
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
            {detail?.partyEmails && detail.partyEmails.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">
                  {locale === 'tr' ? 'Kayıtlı E-Postalar:' : 'Registered Emails:'}
                </span>
                {detail.partyEmails.map((pe, idx) => (
                  <button
                    key={`to-${pe.partyId}-${pe.email}-${idx}`}
                    type="button"
                    onClick={() => setSendTo(pe.email)}
                    title={pe.purposeDesc || pe.partyName}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                      sendTo === pe.email
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-medium'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold text-slate-400 mr-1">{pe.partyName || pe.partyId}:</span>
                    {pe.email}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-amber-400/80 mt-1">
                {locale === 'tr' 
                  ? 'Cari kartında kayıtlı e-posta bulunamadı. Lütfen e-postayı manuel giriniz.' 
                  : 'No registered email found on party card. Please enter manually.'}
              </p>
            )}
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
            {detail?.partyEmails && detail.partyEmails.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">
                  {locale === 'tr' ? 'Hızlı Bilgi (CC):' : 'Quick CC:'}
                </span>
                {detail.partyEmails
                  .filter(pe => pe.email !== sendTo)
                  .map((pe, idx) => (
                    <button
                      key={`cc-${pe.partyId}-${pe.email}-${idx}`}
                      type="button"
                      onClick={() => setSendCc(pe.email)}
                      title={pe.purposeDesc || pe.partyName}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        sendCc === pe.email
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-medium'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <span className="font-semibold text-slate-400 mr-1">{pe.partyName || pe.partyId}:</span>
                      {pe.email}
                    </button>
                  ))}
              </div>
            )}
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
