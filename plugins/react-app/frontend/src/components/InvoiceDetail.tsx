import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Save, Edit3, CheckCircle2, Clock, XCircle, FileText, Building2, User, 
  Calendar, AlignLeft, Plus, Trash2, Copy, AlertCircle, Check, Loader2,
  Tag, ShieldAlert, CreditCard, Printer
} from 'lucide-react';
import { api, InvoiceDetailResponse, InvoiceItem } from '../services/api';
import InvoiceNotesAndTerms from './InvoiceNotesAndTerms';
import InvoicePrintModal from './InvoicePrintModal';
import EditInvoiceItemModal from './EditInvoiceItemModal';
import ApplyPaymentModal from './ApplyPaymentModal';
import InvoiceRolesAndAttributes from './InvoiceRolesAndAttributes';
import { useTranslation } from '../i18n';

interface InvoiceDetailProps {
  invoiceId: string | null;
  onBack: () => void;
  onViewInvoice?: (newId: string) => void;
  onViewPayment?: (paymentId: string) => void;
}

const getStatusBadgeClass = (statusId: string): string => {
  switch (statusId) {
    case 'INVOICE_PAID': return 'ds-badge ds-badge-green';
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return 'ds-badge ds-badge-blue';
    case 'INVOICE_READY': return 'ds-badge ds-badge-purple';
    case 'INVOICE_IN_PROCESS': return 'ds-badge ds-badge-yellow';
    case 'INVOICE_CANCELLED': return 'ds-badge ds-badge-red';
    default: return 'ds-badge ds-badge-slate';
  }
};

const getStatusDotColor = (statusId: string): string => {
  switch (statusId) {
    case 'INVOICE_PAID': return 'bg-emerald-400';
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return 'bg-blue-400';
    case 'INVOICE_READY': return 'bg-purple-400';
    case 'INVOICE_IN_PROCESS': return 'bg-amber-400';
    case 'INVOICE_CANCELLED': return 'bg-red-400';
    default: return 'bg-indigo-400';
  }
};

const getStatusIcon = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return <CheckCircle2 size={16} />;
    case 'INVOICE_IN_PROCESS': return <Clock size={16} />;
    case 'INVOICE_CANCELLED': return <XCircle size={16} />;
    default: return <FileText size={16} />;
  }
};

const formatStatus = (statusId: string) => {
  return (statusId || '').replace('INVOICE_', '').replace(/_/g, ' ');
};

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack, onViewInvoice, onViewPayment }) => {
  const { translations, locale } = useTranslation();
  const inv = translations.invoices;
  const common = translations.common;

  const [detail, setDetail] = useState<InvoiceDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Edit Item Modal State (Faz 3)
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  // Apply Payment Modal State (Faz 3)
  const [showApplyPaymentModal, setShowApplyPaymentModal] = useState<boolean>(false);

  // Edit Header State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    description: '',
    dueDate: '',
    invoiceDate: '',
    referenceNumber: '',
    currencyUomId: 'USD'
  });

  // Add Item State
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    invoiceItemTypeId: 'INV_PROD_ITEM',
    productId: '',
    description: '',
    quantity: 1,
    amount: 0
  });

  // Metadata for item types
  const [itemTypes, setItemTypes] = useState<{ invoiceItemTypeId: string; description: string }[]>([]);

  const formatCurrency = useCallback((val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency
    }).format(val || 0);
  }, [locale]);

  // Load Invoice Details
  const loadInvoice = useCallback(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    api.getInvoiceDetails(invoiceId)
      .then(data => {
        setDetail(data);
        if (data.invoice) {
          setHeaderForm({
            description: data.invoice.description || '',
            dueDate: data.invoice.dueDate || '',
            invoiceDate: data.invoice.invoiceDate || '',
            referenceNumber: data.invoice.referenceNumber || '',
            currencyUomId: data.invoice.currencyUomId || 'USD'
          });
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || (locale === 'tr' ? 'Fatura detayları yüklenemedi.' : 'Could not load invoice details.'));
        setLoading(false);
      });
  }, [invoiceId, locale]);

  useEffect(() => {
    loadInvoice();
    api.getInvoiceMetadata()
      .then(res => {
        if (res?.metadata?.invoiceItemTypes) {
          setItemTypes(res.metadata.invoiceItemTypes);
        }
      })
      .catch(() => {});
  }, [loadInvoice]);

  // Flash message helper
  const flashMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  // Header Save
  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateInvoice({
        invoiceId,
        description: headerForm.description,
        dueDate: headerForm.dueDate,
        invoiceDate: headerForm.invoiceDate,
        referenceNumber: headerForm.referenceNumber,
        currencyUomId: headerForm.currencyUomId
      });
      setIsEditingHeader(false);
      flashMessage(locale === 'tr' ? 'Fatura başlığı başarıyla güncellendi.' : 'Invoice header updated successfully.');
      loadInvoice();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Başlık güncellenirken hata oluştu.' : 'Error updating invoice header.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatusId: string) => {
    if (!invoiceId) return;
    if (!confirm(locale === 'tr' ? `Fatura durumunu "${formatStatus(newStatusId)}" olarak değiştirmek istediğinize emin misiniz?` : `Are you sure you want to change invoice status to "${formatStatus(newStatusId)}"?`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.setInvoiceStatus(invoiceId, newStatusId);
      flashMessage(res._EVENT_MESSAGE_ || (locale === 'tr' ? `Fatura durumu güncellendi: ${formatStatus(newStatusId)}` : `Invoice status updated: ${formatStatus(newStatusId)}`));
      loadInvoice();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Durum değiştirilemedi.' : 'Could not change invoice status.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    if (!itemForm.description) {
      setError(locale === 'tr' ? 'Kalem açıklaması zorunludur.' : 'Item description is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.createInvoiceItem({
        invoiceId,
        invoiceItemTypeId: itemForm.invoiceItemTypeId,
        productId: itemForm.productId || undefined,
        description: itemForm.description,
        quantity: itemForm.quantity,
        amount: itemForm.amount
      });
      setShowAddItem(false);
      setItemForm({ invoiceItemTypeId: 'INV_PROD_ITEM', productId: '', description: '', quantity: 1, amount: 0 });
      flashMessage(locale === 'tr' ? 'Yeni kalem başarıyla eklendi.' : 'Item added successfully.');
      loadInvoice();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Kalem eklenemedi.' : 'Could not add item.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (seqId: string) => {
    if (!invoiceId) return;
    if (!confirm(locale === 'tr' ? `${seqId} nolu faturanın kalemini silmek istiyor musunuz?` : `Delete invoice item ${seqId}?`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.removeInvoiceItem(invoiceId, seqId);
      flashMessage(locale === 'tr' ? 'Kalem silindi.' : 'Item deleted.');
      loadInvoice();
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Kalem silinirken hata oluştu.' : 'Error deleting item.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Invoice
  const handleCopyInvoice = async () => {
    if (!invoiceId) return;
    if (!confirm(inv.copyConfirm || (locale === 'tr' ? `"${invoiceId}" nolu faturayı kopyalamak istiyor musunuz?` : `Copy invoice "${invoiceId}"?`))) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.copyInvoice(invoiceId);
      flashMessage(locale === 'tr' ? `Fatura kopyalandı! Yeni Fatura: ${res.invoiceId}` : `Invoice copied! New Invoice: ${res.invoiceId}`);
      if (onViewInvoice && res.invoiceId) {
        onViewInvoice(res.invoiceId);
      } else {
        loadInvoice();
      }
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Fatura kopyalanamadı.' : 'Failed to copy invoice.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Remove Payment Application (Faz 3)
  const handleRemovePaymentApplication = async (paymentApplicationId: string) => {
    if (!invoiceId) return;
    if (!confirm(inv.removeApplicationConfirm)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.removePaymentApplication(paymentApplicationId);
      flashMessage(inv.paymentApplicationRemoved);
      loadInvoice();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === 'tr' ? 'Ödeme eşlemesi kaldırılamadı.' : 'Could not remove payment application.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
        <span className="text-slate-400">{common.loading}</span>
      </div>
    );
  }

  if (!detail || !detail.invoice) {
    return (
      <div className="ds-card p-8 text-center">
        <ShieldAlert size={48} className="text-red-400 mx-auto mb-4" />
        <h3 className="text-white text-lg font-semibold mb-4">{inv.notFound}</h3>
        <p className="text-slate-400 mb-6">{error || inv.notFoundSub}</p>
        <button className="ds-btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> {inv.backToList}
        </button>
      </div>
    );
  }

  const { invoice, items, totals, statusHistory, paymentsApplied } = detail;
  const isEditable = invoice.statusId === 'INVOICE_IN_PROCESS';

  return (
    <div className="flex flex-col gap-8">

      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button className="ds-btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} /> {inv.backToList}
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="ds-btn-secondary flex items-center gap-2 cursor-pointer"
            onClick={() => setShowPrintModal(true)}
            title={inv.printInvoice}
          >
            <Printer size={16} /> {inv.printInvoice}
          </button>

          <button
            className="ds-btn-secondary flex items-center gap-2"
            onClick={handleCopyInvoice}
            disabled={actionLoading}
            title={inv.copyInvoice}
          >
            <Copy size={16} /> {inv.copyInvoice}
          </button>

          <span className={`${getStatusBadgeClass(invoice.statusId)} flex items-center gap-1.5 px-3 py-1.5 text-sm`}>
            {getStatusIcon(invoice.statusId)}
            {formatStatus(invoice.statusId)}
          </span>
          <h2 className="text-2xl font-bold text-white">#{invoice.invoiceId}</h2>
        </div>
      </div>

      {/* Messages / Alerts */}
      {message && (
        <div className="ds-alert-success flex items-center gap-3">
          <Check size={20} />
          <div>{message}</div>
        </div>
      )}

      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={20} />
          <div><strong>{common.error}:</strong> {error}</div>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="ds-stat-card">
          <div className="ds-stat-label">{inv.subtotalWithoutTax}</div>
          <div className="ds-stat-value">
            {formatCurrency(totals.subTotal, invoice.currencyUomId)}
          </div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-label">{locale === 'tr' ? 'Vergi / KDV' : 'Tax Total'}</div>
          <div className="ds-stat-value text-blue-300">
            {formatCurrency(totals.taxTotal, invoice.currencyUomId)}
          </div>
        </div>

        <div className="ds-stat-card border border-indigo-500/40">
          <div className="ds-stat-label text-indigo-400">{common.total}</div>
          <div className="ds-stat-value text-white">
            {formatCurrency(totals.total, invoice.currencyUomId)}
          </div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-label">{inv.outstandingAmount}</div>
          <div className={`ds-stat-value ${totals.outstandingAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formatCurrency(totals.outstandingAmount, invoice.currencyUomId)}
          </div>
        </div>
      </div>

      {/* Invoice Status Action Bar */}
      <div className="ds-card px-8 py-5 flex items-center justify-between flex-wrap gap-4 animate-fade-in">
        <div>
          <span className="text-sm text-slate-400 block">{locale === 'tr' ? 'Fatura Durumu İşlemleri' : 'Invoice Status Actions'}</span>
          <span className="font-semibold text-slate-200">{locale === 'tr' ? 'Mevcut Aşama: ' : 'Current Stage: '} {formatStatus(invoice.statusId)}</span>
        </div>

        <div className="flex gap-3 flex-wrap">
          {invoice.statusId === 'INVOICE_IN_PROCESS' && (
            <>
              <button
                className="ds-btn-primary bg-gradient-to-r from-blue-500 to-blue-700 flex items-center gap-2"
                onClick={() => handleStatusChange('INVOICE_APPROVED')}
                disabled={actionLoading}
              >
                <CheckCircle2 size={16} /> {inv.statusApproved}
              </button>
              <button
                className="ds-btn-secondary flex items-center gap-2"
                onClick={() => handleStatusChange('INVOICE_READY')}
                disabled={actionLoading}
              >
                {inv.statusReady}
              </button>
              <button
                className="ds-btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
                onClick={() => handleStatusChange('INVOICE_CANCELLED')}
                disabled={actionLoading}
              >
                <XCircle size={16} /> {inv.statusCancelled}
              </button>
            </>
          )}

          {(invoice.statusId === 'INVOICE_APPROVED' || invoice.statusId === 'INVOICE_READY') && (
            <>
              <button
                className="ds-btn-primary bg-gradient-to-r from-sky-500 to-sky-700 flex items-center gap-2"
                onClick={() => handleStatusChange('INVOICE_SENT')}
                disabled={actionLoading}
              >
                <FileText size={16} /> {inv.statusSent}
              </button>
              <button
                className="ds-btn-primary bg-gradient-to-r from-emerald-600 to-emerald-800 flex items-center gap-2"
                onClick={() => handleStatusChange('INVOICE_PAID')}
                disabled={actionLoading}
              >
                <CheckCircle2 size={16} /> {inv.statusPaid}
              </button>
              <button
                className="ds-btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
                onClick={() => handleStatusChange('INVOICE_CANCELLED')}
                disabled={actionLoading}
              >
                <XCircle size={16} /> {inv.statusCancelled}
              </button>
            </>
          )}

          {invoice.statusId === 'INVOICE_SENT' && (
            <>
              <button
                className="ds-btn-primary bg-gradient-to-r from-emerald-600 to-emerald-800 flex items-center gap-2"
                onClick={() => handleStatusChange('INVOICE_PAID')}
                disabled={actionLoading}
              >
                <CheckCircle2 size={16} /> {inv.statusPaid}
              </button>
              <button
                className="ds-btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
                onClick={() => handleStatusChange('INVOICE_CANCELLED')}
                disabled={actionLoading}
              >
                <XCircle size={16} /> {inv.statusCancelled}
              </button>
            </>
          )}

          {invoice.statusId === 'INVOICE_PAID' && (
            <span className="text-emerald-400 flex items-center gap-2 font-semibold">
              <CheckCircle2 size={18} /> {inv.invoiceCompleted}
            </span>
          )}

          {invoice.statusId === 'INVOICE_CANCELLED' && (
            <span className="text-red-400 flex items-center gap-2 font-semibold">
              <XCircle size={18} /> {inv.invoiceCancelledMsg}
            </span>
          )}
        </div>
      </div>

      {/* Invoice Header Details */}
      <div className="ds-card animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Edit3 size={20} className="text-indigo-400" /> {inv.headerInfo}
          </h3>
          {!isEditingHeader && isEditable && (
            <button className="ds-btn-secondary flex items-center gap-2" onClick={() => setIsEditingHeader(true)}>
              <Edit3 size={16} /> {inv.editHeader}
            </button>
          )}
        </div>

        <form onSubmit={handleSaveHeader}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">

            {/* Parties Info */}
            <div className="flex flex-col gap-5 p-6 bg-black/20 rounded-xl">
              <div>
                <span className="text-sm text-slate-400">{translations.payments.fromParty}</span>
                <div className="flex items-center gap-2 font-semibold text-lg text-slate-100 mt-1">
                  <Building2 size={18} className="text-indigo-400" /> {invoice.partyIdFrom}
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-400">{translations.payments.toParty}</span>
                <div className="flex items-center gap-2 font-semibold text-lg text-slate-100 mt-1">
                  <User size={18} className="text-indigo-400" /> {invoice.partyIdTo}
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-400">{common.type}</span>
                <div className="font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
                  <Tag size={16} className="text-slate-400" />
                  {invoice.invoiceTypeId.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Dates & Reference */}
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">{common.date}</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      name="invoiceDate"
                      value={headerForm.invoiceDate}
                      onChange={(e) => setHeaderForm({ ...headerForm, invoiceDate: e.target.value })}
                      className="ds-input pl-9 w-full [color-scheme:dark]"
                      disabled={!isEditingHeader}
                    />
                  </div>
                </div>
                <div>
                  <label className="ds-label">{common.dueDate}</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      name="dueDate"
                      value={headerForm.dueDate}
                      onChange={(e) => setHeaderForm({ ...headerForm, dueDate: e.target.value })}
                      className="ds-input pl-9 w-full [color-scheme:dark]"
                      disabled={!isEditingHeader}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="ds-label">{common.reference}</label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={headerForm.referenceNumber}
                  onChange={(e) => setHeaderForm({ ...headerForm, referenceNumber: e.target.value })}
                  className="ds-input w-full"
                  placeholder={locale === 'tr' ? 'Opsiyonel referans numarası' : 'Optional reference number'}
                  disabled={!isEditingHeader}
                />
              </div>

              <div>
                <label className="ds-label">{common.description}</label>
                <div className="relative">
                  <AlignLeft size={16} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
                  <textarea
                    name="description"
                    value={headerForm.description}
                    onChange={(e) => setHeaderForm({ ...headerForm, description: e.target.value })}
                    className="ds-input pl-9 w-full min-h-[70px]"
                    placeholder={inv.descriptionPlaceholder}
                    disabled={!isEditingHeader}
                  />
                </div>
              </div>

              {isEditingHeader && (
                <div className="flex justify-end gap-4 mt-2">
                  <button type="button" onClick={() => setIsEditingHeader(false)} className="ds-btn-secondary">
                    {common.cancel}
                  </button>
                  <button type="submit" className="ds-btn-primary flex items-center gap-2" disabled={actionLoading}>
                    <Save size={16} /> {common.save}
                  </button>
                </div>
              )}
            </div>

          </div>
        </form>
      </div>

      {/* Invoice Line Items Section */}
      <div className="ds-card pt-6 pb-0 px-0 animate-fade-in overflow-hidden">
        <div className="px-8 mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-white text-xl font-semibold">{inv.itemsCount} ({items.length})</h3>
            <span className="text-sm text-slate-400">{inv.itemsSubtext}</span>
          </div>
          {isEditable && !showAddItem && (
            <button
              className="ds-btn-primary flex items-center gap-2 text-sm"
              onClick={() => setShowAddItem(true)}
            >
              <Plus size={16} /> {inv.addItem}
            </button>
          )}
        </div>

        {/* Add Item Inline Form */}
        {showAddItem && (
          <div className="mx-8 mb-6 p-6 bg-black/30 rounded-xl border border-slate-700/50">
            <h4 className="text-indigo-400 font-semibold mb-4">{inv.addItem}</h4>
            <form onSubmit={handleAddItem}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                <div>
                  <label className="ds-label">{inv.itemType}</label>
                  <select
                    value={itemForm.invoiceItemTypeId}
                    onChange={(e) => setItemForm({ ...itemForm, invoiceItemTypeId: e.target.value })}
                    className="ds-select w-full"
                  >
                    {itemTypes.length > 0 ? (
                      itemTypes.map(t => (
                        <option key={t.invoiceItemTypeId} value={t.invoiceItemTypeId}>{t.description}</option>
                      ))
                    ) : (
                      <>
                        <option value="INV_PROD_ITEM">Product Item</option>
                        <option value="INV_FEE_ITEM">Fee / Service Item</option>
                        <option value="ITM_SALES_TAX">Sales Tax</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="ds-label">{inv.itemDescOrName}</label>
                  <input
                    type="text"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder={locale === 'tr' ? 'Örn: Danışmanlık Hizmeti' : 'e.g. Consulting Services'}
                    className="ds-input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="ds-label">{inv.quantity}</label>
                  <input
                    type="number"
                    step="any"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="ds-input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="ds-label">{inv.unitPrice} ({invoice.currencyUomId})</label>
                  <input
                    type="number"
                    step="any"
                    value={itemForm.amount}
                    onChange={(e) => setItemForm({ ...itemForm, amount: parseFloat(e.target.value) || 0 })}
                    className="ds-input w-full"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-5">
                <button type="button" onClick={() => setShowAddItem(false)} className="ds-btn-secondary">
                  {common.cancel}
                </button>
                <button type="submit" className="ds-btn-primary flex items-center gap-2" disabled={actionLoading}>
                  <Plus size={16} /> {common.save}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table of items */}
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">#</th>
                <th className="ds-th">{inv.itemType}</th>
                <th className="ds-th">{common.description}</th>
                <th className="ds-th-right">{inv.quantity}</th>
                <th className="ds-th-right">{inv.unitPrice}</th>
                <th className="ds-th-right">{inv.lineTotal}</th>
                {isEditable && <th className="ds-th text-center">{common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((it) => (
                  <tr key={it.invoiceItemSeqId} className="ds-tbody-row">
                    <td className="ds-td-primary">{it.invoiceItemSeqId}</td>
                    <td className="ds-td-muted">{it.invoiceItemTypeId.replace('INV_', '').replace(/_/g, ' ')}</td>
                    <td className="ds-td">{it.description || '-'}</td>
                    <td className="ds-td-right">{it.quantity}</td>
                    <td className="ds-td-mono text-right">
                      {formatCurrency(it.amount, invoice.currencyUomId)}
                    </td>
                    <td className="ds-td-mono text-right font-semibold text-slate-100">
                      {formatCurrency(it.itemTotal, invoice.currencyUomId)}
                    </td>
                    {isEditable && (
                      <td className="ds-td text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingItem(it)}
                            disabled={actionLoading}
                            title={inv.editItem}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors disabled:opacity-40"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(it.invoiceItemSeqId)}
                            disabled={actionLoading}
                            title={common.delete}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isEditable ? 7 : 6} className="ds-td text-center py-10 text-slate-500">
                    {inv.noItems}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applied Payments & Status History */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">

        {/* Applied Payments */}
        <div className="ds-card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-lg font-semibold flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-400" /> {inv.appliedPayments} ({paymentsApplied.length})
            </h3>
            {invoice.statusId !== 'INVOICE_CANCELLED' && (totals.outstandingAmount ?? 0) > 0.001 && (
              <button
                type="button"
                onClick={() => setShowApplyPaymentModal(true)}
                className="ds-btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5 border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                <Plus size={14} /> {inv.applyPayment}
              </button>
            )}
          </div>
          {paymentsApplied.length > 0 ? (
            <div className="flex flex-col gap-3">
              {paymentsApplied.map((pa) => (
                <div
                  key={pa.paymentApplicationId}
                  className="flex justify-between items-center p-3 bg-black/20 rounded-xl hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <div
                      onClick={() => onViewPayment && onViewPayment(pa.paymentId)}
                      className={`font-semibold flex items-center gap-1.5 ${
                        onViewPayment
                          ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer'
                          : 'text-slate-100 cursor-default'
                      }`}
                    >
                      {locale === 'tr' ? 'Ödeme No: ' : 'Payment No: '}#{pa.paymentId}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{locale === 'tr' ? 'Uygulama ID: ' : 'Application ID: '}{pa.paymentApplicationId}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right font-semibold text-emerald-400 font-mono">
                      {formatCurrency(pa.amountApplied, invoice.currencyUomId)}
                    </div>
                    {invoice.statusId !== 'INVOICE_CANCELLED' && (
                      <button
                        onClick={() => handleRemovePaymentApplication(pa.paymentApplicationId)}
                        disabled={actionLoading}
                        title={inv.removeApplication}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">
              {inv.noPaymentsApplied}
            </div>
          )}
        </div>

        {/* Status History Timeline */}
        <div className="ds-card animate-fade-in">
          <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-4">
            <Clock size={18} className="text-indigo-400" /> {inv.statusHistory}
          </h3>
          {statusHistory.length > 0 ? (
            <div className="flex flex-col gap-3">
              {statusHistory.map((sh, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 py-2 ${
                    idx < statusHistory.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(sh.statusId)}`} />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-100 text-sm">{formatStatus(sh.statusId)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {sh.statusDate}{sh.changeByUserLoginId ? ` • ${sh.changeByUserLoginId}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">
              {inv.noHistory}
            </div>
          )}
        </div>

        {/* Faz 7: Notlar & Vade Şartları */}
        {invoice.invoiceId && (
          <InvoiceNotesAndTerms invoiceId={invoice.invoiceId} />
        )}

        {/* Faz 4: Adresler, Nitelikler & Roller */}
        {invoice.invoiceId && (
          <InvoiceRolesAndAttributes
            invoiceId={invoice.invoiceId}
            roles={detail.roles}
            attributes={detail.attributes}
            contactMechs={detail.contactMechs}
            isEditable={isEditable}
            onRefresh={loadInvoice}
          />
        )}

      </div>

      {/* Invoice Print & PDF Preview Modal (Faz 2) */}
      {showPrintModal && (
        <InvoicePrintModal
          invoiceId={invoice.invoiceId}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          preloadedDetail={detail}
        />
      )}

      {/* Edit Invoice Item Modal (Faz 3) */}
      {editingItem && (
        <EditInvoiceItemModal
          isOpen={!!editingItem}
          invoiceId={invoice.invoiceId}
          currencyUomId={invoice.currencyUomId}
          item={editingItem}
          itemTypes={itemTypes}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            flashMessage(inv.itemUpdated);
            loadInvoice();
          }}
        />
      )}

      {/* Apply Payment Modal (Faz 3) */}
      {showApplyPaymentModal && (
        <ApplyPaymentModal
          isOpen={showApplyPaymentModal}
          invoiceId={invoice.invoiceId}
          currencyUomId={invoice.currencyUomId}
          outstandingAmount={totals.outstandingAmount ?? 0}
          onClose={() => setShowApplyPaymentModal(false)}
          onApplied={() => {
            flashMessage(inv.paymentApplicationSuccess);
            loadInvoice();
          }}
        />
      )}

    </div>
  );
};

export default InvoiceDetail;
