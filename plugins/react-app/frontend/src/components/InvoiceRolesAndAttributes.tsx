import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MapPin, Tag, Users, Plus, Trash2, Check, AlertCircle, Loader2, 
  Sparkles, X, Paperclip, FileText
} from 'lucide-react';
import { 
  api, 
  InvoiceRoleItem, 
  InvoiceAttributeItem, 
  InvoiceContactMechItem,
  InvoiceContentItem,
  InvoiceRolesAndAttributesMetadataResponse 
} from '../services/api';
import { useTranslation } from '../i18n';
import { useRouter } from '../router';

interface InvoiceRolesAndAttributesProps {
  invoiceId: string;
  roles?: InvoiceRoleItem[];
  attributes?: InvoiceAttributeItem[];
  contactMechs?: InvoiceContactMechItem[];
  contents?: InvoiceContentItem[];
  isEditable: boolean;
  onRefresh: () => void;
}

export const InvoiceRolesAndAttributes: React.FC<InvoiceRolesAndAttributesProps> = ({
  invoiceId,
  roles = [],
  attributes = [],
  contactMechs = [],
  contents = [],
  isEditable,
  onRefresh
}) => {
  const { translations, locale } = useTranslation();
  const inv = translations.invoices;
  const common = translations.common;
  const { queryParams, setQueryParam } = useRouter();

  const validTabs = ['addresses', 'attributes', 'roles', 'attachments'] as const;
  const initialTab = (queryParams.tab && (validTabs as readonly string[]).includes(queryParams.tab))
    ? (queryParams.tab as typeof validTabs[number])
    : 'addresses';

  const [activeTab, setActiveTab] = useState<'addresses' | 'attributes' | 'roles' | 'attachments'>(initialTab);

  const handleTabSelect = (tab: typeof validTabs[number]) => {
    setActiveTab(tab);
    setQueryParam('tab', tab === 'addresses' ? undefined : tab);
  };

  useEffect(() => {
    if (queryParams.tab && (validTabs as readonly string[]).includes(queryParams.tab)) {
      setActiveTab(queryParams.tab as typeof validTabs[number]);
    }
  }, [queryParams.tab]);

  const [metadata, setMetadata] = useState<InvoiceRolesAndAttributesMetadataResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Address Form State
  const [showAddAddress, setShowAddAddress] = useState<boolean>(false);
  const [addressForm, setAddressForm] = useState({
    contactMechId: '',
    contactMechPurposeTypeId: 'BILLING_LOCATION',
    manualMode: false
  });

  // Attribute Form State
  const [showAddAttribute, setShowAddAttribute] = useState<boolean>(false);
  const [attrForm, setAttrForm] = useState({
    attrName: '',
    attrValue: '',
    attrDescription: ''
  });

  // Role Form State
  const [showAddRole, setShowAddRole] = useState<boolean>(false);
  const [roleForm, setRoleForm] = useState({
    partyId: '',
    roleTypeId: 'SALES_REP',
    percentage: ''
  });

  // Attachment / Content Form State
  const [showAddContent, setShowAddContent] = useState<boolean>(false);
  const [contentForm, setContentForm] = useState({
    contentName: '',
    invoiceContentTypeId: 'INVOICE_ATTACHMENT',
    description: ''
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadMetadata = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const res = await api.getInvoiceRolesAndAttributesMetadata(invoiceId);
      setMetadata(res);
      if (res.partyContactMechs?.length > 0 && !addressForm.contactMechId) {
        setAddressForm(prev => ({ ...prev, contactMechId: res.partyContactMechs[0].contactMechId }));
      }
      if (res.partyContactMechs?.length > 0 && !roleForm.partyId) {
        setRoleForm(prev => ({ ...prev, partyId: res.partyContactMechs[0].partyId }));
      }
    } catch (err: unknown) {
      console.warn('Metadata load error:', err);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Memoized purpose types and role types for 60 FPS (Golden Invariant 2)
  const purposeOptions = useMemo(() => {
    return metadata?.purposeTypes || [
      { contactMechPurposeTypeId: 'BILLING_LOCATION', description: 'Billing Location / Fatura Adresi' },
      { contactMechPurposeTypeId: 'SHIPPING_LOCATION', description: 'Shipping Location / Sevk Adresi' },
      { contactMechPurposeTypeId: 'PAYMENT_LOCATION', description: 'Payment Location / Ödeme Adresi' },
      { contactMechPurposeTypeId: 'GENERAL_LOCATION', description: 'General Location / Genel Adres' },
      { contactMechPurposeTypeId: 'ORDER_EMAIL', description: 'Order Email / E-Posta' },
    ];
  }, [metadata]);

  const roleOptions = useMemo(() => {
    return metadata?.roleTypes || [
      { roleTypeId: 'BILL_TO_CUSTOMER', description: 'Bill To Customer' },
      { roleTypeId: 'BILL_FROM_VENDOR', description: 'Bill From Vendor' },
      { roleTypeId: 'SALES_REP', description: 'Sales Representative' },
      { roleTypeId: 'ACCOUNTING_CLERK', description: 'Accounting Clerk' },
      { roleTypeId: 'CARRIER', description: 'Carrier / Nakliyeci' },
      { roleTypeId: 'APPROVER', description: 'Approver / Onaylayan' }
    ];
  }, [metadata]);

  const contentTypeOptions = useMemo(() => {
    return metadata?.invoiceContentTypes || [
      { invoiceContentTypeId: 'INVOICE_ATTACHMENT', description: 'Invoice Attachment / Fatura Eki' },
      { invoiceContentTypeId: 'INVOICE_IMAGE', description: 'Invoice Image / Fatura Görseli' },
      { invoiceContentTypeId: 'COMMENTS', description: 'Comments / Açıklama Belgesi' },
      { invoiceContentTypeId: 'TAX_DOCUMENT', description: 'Tax Document / Vergi Belgesi' },
    ];
  }, [metadata]);

  // Handler: Add Address / Contact Mech
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.contactMechId.trim()) {
      showFeedback('error', locale === 'tr' ? 'Lütfen bir adres/iletişim seçin veya girin.' : 'Please select or enter a contact mechanism.');
      return;
    }

    setActionLoading(true);
    try {
      await api.createInvoiceContactMech({
        invoiceId,
        contactMechId: addressForm.contactMechId.trim(),
        contactMechPurposeTypeId: addressForm.contactMechPurposeTypeId
      });
      showFeedback('success', inv.addressLinked);
      setShowAddAddress(false);
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Adres bağlanamadı.' : 'Failed to link address.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Address / Contact Mech
  const handleDeleteAddress = async (contactMechId: string, contactMechPurposeTypeId: string) => {
    if (!confirm(inv.unlinkAddressConfirm)) return;
    setActionLoading(true);
    try {
      await api.deleteInvoiceContactMech({ invoiceId, contactMechId, contactMechPurposeTypeId });
      showFeedback('success', inv.addressUnlinked);
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Adres kaldırılamadı.' : 'Failed to unlink address.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Add Attribute
  const handleAddAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attrForm.attrName.trim()) {
      showFeedback('error', locale === 'tr' ? 'Nitelik adı zorunludur.' : 'Attribute name is required.');
      return;
    }

    setActionLoading(true);
    try {
      await api.createInvoiceAttribute({
        invoiceId,
        attrName: attrForm.attrName.trim().toUpperCase(),
        attrValue: attrForm.attrValue.trim(),
        attrDescription: attrForm.attrDescription.trim()
      });
      showFeedback('success', inv.attrSaved);
      setShowAddAttribute(false);
      setAttrForm({ attrName: '', attrValue: '', attrDescription: '' });
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Nitelik kaydedilemedi.' : 'Failed to save attribute.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Attribute
  const handleDeleteAttribute = async (attrName: string) => {
    if (!confirm(inv.deleteAttrConfirm)) return;
    setActionLoading(true);
    try {
      await api.deleteInvoiceAttribute({ invoiceId, attrName });
      showFeedback('success', inv.attrDeleted);
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Nitelik silinemedi.' : 'Failed to delete attribute.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Preset click helper
  const handleApplyPreset = (preset: { attrName: string; label: string; placeholder: string }) => {
    setAttrForm({
      attrName: preset.attrName,
      attrValue: '',
      attrDescription: preset.label
    });
    setShowAddAttribute(true);
  };

  // Handler: Add Role
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.partyId.trim()) {
      showFeedback('error', locale === 'tr' ? 'Cari seçimi zorunludur.' : 'Party selection is required.');
      return;
    }

    setActionLoading(true);
    try {
      await api.createInvoiceRole({
        invoiceId,
        partyId: roleForm.partyId.trim(),
        roleTypeId: roleForm.roleTypeId,
        percentage: roleForm.percentage ? parseFloat(roleForm.percentage) : undefined
      });
      showFeedback('success', inv.roleSaved);
      setShowAddRole(false);
      setRoleForm({ partyId: '', roleTypeId: 'SALES_REP', percentage: '' });
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Rol eklenemedi.' : 'Failed to add role.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Role
  const handleDeleteRole = async (partyId: string, roleTypeId: string) => {
    if (!confirm(inv.deleteRoleConfirm)) return;
    setActionLoading(true);
    try {
      await api.removeInvoiceRole({ invoiceId, partyId, roleTypeId });
      showFeedback('success', inv.roleDeleted);
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Rol silinemedi.' : 'Failed to delete role.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Add Attachment
  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentForm.contentName.trim()) {
      showFeedback('error', locale === 'tr' ? 'Belge / dosya adı zorunludur.' : 'Attachment name is required.');
      return;
    }
    setActionLoading(true);
    try {
      await api.createInvoiceContent({
        invoiceId,
        contentName: contentForm.contentName.trim(),
        invoiceContentTypeId: contentForm.invoiceContentTypeId,
        description: contentForm.description.trim() || undefined
      });
      showFeedback('success', inv.attachmentSaved);
      setShowAddContent(false);
      setContentForm({ contentName: '', invoiceContentTypeId: 'INVOICE_ATTACHMENT', description: '' });
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Belge eklenemedi.' : 'Failed to add attachment.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Attachment
  const handleDeleteContent = async (contentId: string, invoiceContentTypeId: string) => {
    if (!confirm(inv.deleteAttachmentConfirm)) return;
    setActionLoading(true);
    try {
      await api.deleteInvoiceContent({ invoiceId, contentId, invoiceContentTypeId });
      showFeedback('success', inv.attachmentDeleted);
      onRefresh();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : (locale === 'tr' ? 'Belge silinemedi.' : 'Failed to delete attachment.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="ds-card animate-fade-in col-span-full">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h3 className="text-white text-lg font-semibold flex items-center gap-2">
            <MapPin size={18} className="text-indigo-400" /> {inv.rolesAndAttributesTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {locale === 'tr' 
              ? 'Faturaya bağlı adresler, e-fatura/ETTN parametreleri ve komisyon/taraf rolleri' 
              : 'Linked addresses, e-invoice parameters, and commercial party roles'}
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-black/30 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleTabSelect('addresses')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'addresses'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <MapPin size={14} />
            <span>{inv.tabAddresses}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-indigo-200">
              {contactMechs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('attributes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'attributes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Tag size={14} />
            <span>{inv.tabAttributes}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-indigo-200">
              {attributes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('roles')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Users size={14} />
            <span>{inv.tabRoles}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-indigo-200">
              {roles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('attachments')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'attachments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Paperclip size={14} />
            <span>{inv.tabAttachments}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-indigo-200">
              {contents.length}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {feedbackMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: ADDRESSES & CONTACT MECHS                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">
              {inv.tabAddresses} ({contactMechs.length})
            </span>
            {isEditable && !showAddAddress && (
              <button
                type="button"
                onClick={() => setShowAddAddress(true)}
                className="ds-btn-secondary flex items-center gap-1 text-xs py-1 px-2.5 border-indigo-500/40 text-indigo-400 hover:text-indigo-300"
              >
                <Plus size={14} /> {inv.addAddress}
              </button>
            )}
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <div className="p-4 bg-black/30 rounded-xl border border-indigo-500/30 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Plus size={14} /> {inv.addAddress}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddAddress} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="ds-label">{inv.addressPurpose}</label>
                    <select
                      value={addressForm.contactMechPurposeTypeId}
                      onChange={(e) => setAddressForm({ ...addressForm, contactMechPurposeTypeId: e.target.value })}
                      className="ds-select w-full text-xs"
                    >
                      {purposeOptions.map((p) => (
                        <option key={p.contactMechPurposeTypeId} value={p.contactMechPurposeTypeId}>
                          {p.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="ds-label mb-0">{inv.addressDetail}</label>
                      <button
                        type="button"
                        onClick={() => setAddressForm({ ...addressForm, manualMode: !addressForm.manualMode })}
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        {addressForm.manualMode ? inv.selectRegisteredAddress : inv.manualAddress}
                      </button>
                    </div>

                    {!addressForm.manualMode && (metadata?.partyContactMechs?.length ?? 0) > 0 ? (
                      <select
                        value={addressForm.contactMechId}
                        onChange={(e) => setAddressForm({ ...addressForm, contactMechId: e.target.value })}
                        className="ds-select w-full text-xs"
                        required
                      >
                        <option value="">-- {locale === 'tr' ? 'Adres Seçin' : 'Select Address'} --</option>
                        {metadata?.partyContactMechs.map((pcm) => (
                          <option key={pcm.contactMechId} value={pcm.contactMechId}>
                            [{pcm.partyName || pcm.partyId}] {pcm.detailInfo || pcm.contactMechId}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. 9001"
                        value={addressForm.contactMechId}
                        onChange={(e) => setAddressForm({ ...addressForm, contactMechId: e.target.value })}
                        className="ds-input w-full text-xs"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="ds-btn-secondary text-xs py-1 px-3"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="ds-btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {common.save}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Contact Mechs */}
          {contactMechs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contactMechs.map((cm) => (
                <div
                  key={`${cm.contactMechId}-${cm.contactMechPurposeTypeId}`}
                  className="p-3 bg-black/20 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <MapPin size={11} /> {cm.contactMechPurposeTypeDesc || cm.contactMechPurposeTypeId}
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {cm.detailInfo || `#${cm.contactMechId}`}
                    </p>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      ID: {cm.contactMechId}
                    </span>
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(cm.contactMechId, cm.contactMechPurposeTypeId)}
                      disabled={actionLoading}
                      title={inv.unlinkAddress}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-black/20 rounded-xl border border-slate-800/60 text-center">
              <p className="text-xs text-slate-500">{inv.noAddresses}</p>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: E-INVOICE & ATTRIBUTES                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'attributes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Quick Presets */}
            {isEditable && metadata?.attributePresets && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                  <Sparkles size={12} className="text-amber-400" /> {inv.quickPresets}:
                </span>
                {metadata.attributePresets.map((pr) => (
                  <button
                    key={pr.attrName}
                    type="button"
                    onClick={() => handleApplyPreset(pr)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-950/60 hover:text-indigo-300 text-slate-300 border border-slate-700 transition-colors"
                  >
                    +{pr.attrName}
                  </button>
                ))}
              </div>
            )}

            {isEditable && !showAddAttribute && (
              <button
                type="button"
                onClick={() => setShowAddAttribute(true)}
                className="ds-btn-secondary flex items-center gap-1 text-xs py-1 px-2.5 border-indigo-500/40 text-indigo-400 hover:text-indigo-300 self-start sm:self-auto"
              >
                <Plus size={14} /> {inv.addAttribute}
              </button>
            )}
          </div>

          {/* Add Attribute Form */}
          {showAddAttribute && (
            <div className="p-4 bg-black/30 rounded-xl border border-indigo-500/30 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Plus size={14} /> {inv.addAttribute}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddAttribute(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddAttribute} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="ds-label">{inv.attrName}</label>
                    <input
                      type="text"
                      placeholder="e.g. EINVOICE_UUID"
                      value={attrForm.attrName}
                      onChange={(e) => setAttrForm({ ...attrForm, attrName: e.target.value })}
                      className="ds-input w-full text-xs font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="ds-label">{inv.attrValue}</label>
                    <input
                      type="text"
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={attrForm.attrValue}
                      onChange={(e) => setAttrForm({ ...attrForm, attrValue: e.target.value })}
                      className="ds-input w-full text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="ds-label">{inv.attrDescription}</label>
                    <input
                      type="text"
                      placeholder={locale === 'tr' ? 'Opsiyonel açıklama...' : 'Optional description...'}
                      value={attrForm.attrDescription}
                      onChange={(e) => setAttrForm({ ...attrForm, attrDescription: e.target.value })}
                      className="ds-input w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAttribute(false)}
                    className="ds-btn-secondary text-xs py-1 px-3"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="ds-btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {common.save}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Attributes */}
          {attributes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="ds-table text-xs">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{inv.attrName}</th>
                    <th className="ds-th">{inv.attrValue}</th>
                    <th className="ds-th">{inv.attrDescription}</th>
                    {isEditable && <th className="ds-th text-center w-16">{common.actions}</th>}
                  </tr>
                </thead>
                <tbody>
                  {attributes.map((att) => (
                    <tr key={att.attrName} className="ds-tbody-row">
                      <td className="ds-td font-mono font-semibold text-indigo-300">
                        {att.attrName}
                      </td>
                      <td className="ds-td font-mono text-emerald-400 max-w-xs truncate" title={att.attrValue}>
                        {att.attrValue || '-'}
                      </td>
                      <td className="ds-td text-slate-400">
                        {att.attrDescription || '-'}
                      </td>
                      {isEditable && (
                        <td className="ds-td text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteAttribute(att.attrName)}
                            disabled={actionLoading}
                            title={common.delete}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-black/20 rounded-xl border border-slate-800/60 text-center">
              <p className="text-xs text-slate-500">{inv.noAttributes}</p>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: INVOICE ROLES                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">
              {inv.tabRoles} ({roles.length})
            </span>
            {isEditable && !showAddRole && (
              <button
                type="button"
                onClick={() => setShowAddRole(true)}
                className="ds-btn-secondary flex items-center gap-1 text-xs py-1 px-2.5 border-indigo-500/40 text-indigo-400 hover:text-indigo-300"
              >
                <Plus size={14} /> {inv.addRole}
              </button>
            )}
          </div>

          {/* Add Role Form */}
          {showAddRole && (
            <div className="p-4 bg-black/30 rounded-xl border border-indigo-500/30 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Plus size={14} /> {inv.addRole}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddRole(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddRole} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="ds-label">{inv.roleParty}</label>
                    <input
                      type="text"
                      placeholder="e.g. Company or DemoCustomer"
                      value={roleForm.partyId}
                      onChange={(e) => setRoleForm({ ...roleForm, partyId: e.target.value })}
                      className="ds-input w-full text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="ds-label">{inv.roleType}</label>
                    <select
                      value={roleForm.roleTypeId}
                      onChange={(e) => setRoleForm({ ...roleForm, roleTypeId: e.target.value })}
                      className="ds-select w-full text-xs"
                    >
                      {roleOptions.map((rt) => (
                        <option key={rt.roleTypeId} value={rt.roleTypeId}>
                          {rt.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="ds-label">{inv.rolePercentage}</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="e.g. 10.0"
                      value={roleForm.percentage}
                      onChange={(e) => setRoleForm({ ...roleForm, percentage: e.target.value })}
                      className="ds-input w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRole(false)}
                    className="ds-btn-secondary text-xs py-1 px-3"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="ds-btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {common.save}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Roles */}
          {roles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="ds-table text-xs">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{inv.roleType}</th>
                    <th className="ds-th">{inv.roleParty}</th>
                    <th className="ds-th text-right">{inv.rolePercentage}</th>
                    <th className="ds-th">{common.date}</th>
                    {isEditable && <th className="ds-th text-center w-16">{common.actions}</th>}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={`${r.partyId}-${r.roleTypeId}`} className="ds-tbody-row">
                      <td className="ds-td">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {r.roleTypeDesc || r.roleTypeId}
                        </span>
                      </td>
                      <td className="ds-td font-medium text-slate-100">
                        {r.partyName || r.partyId}
                        {r.partyName && <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({r.partyId})</span>}
                      </td>
                      <td className="ds-td-mono text-right text-indigo-400 font-semibold">
                        {r.percentage != null ? `%${r.percentage}` : '-'}
                      </td>
                      <td className="ds-td text-slate-400">
                        {r.datetimePerformed ? r.datetimePerformed.substring(0, 10) : '-'}
                      </td>
                      {isEditable && (
                        <td className="ds-td text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r.partyId, r.roleTypeId)}
                            disabled={actionLoading}
                            title={common.delete}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-black/20 rounded-xl border border-slate-800/60 text-center">
              <p className="text-xs text-slate-500">{inv.noRoles}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ATTACHMENTS & DOCUMENTS */}
      {activeTab === 'attachments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {locale === 'tr'
                ? 'Faturaya eklenmiş taranmış nüshalar, sözleşmeler, sevk irsaliyeleri ve ek belgeler.'
                : 'Scanned copies, contracts, dispatch notes, and supporting documents attached to this invoice.'}
            </p>
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowAddContent(true)}
                className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus size={14} /> {inv.addAttachment}
              </button>
            )}
          </div>

          {/* Form: Add Attachment */}
          {showAddContent && (
            <div className="p-4 bg-slate-900/90 rounded-xl border border-indigo-500/30 animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Paperclip size={14} /> {inv.addAttachment}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddContent(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddContent} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">{inv.docName} *</label>
                    <input
                      type="text"
                      required
                      value={contentForm.contentName}
                      onChange={(e) => setContentForm(prev => ({ ...prev, contentName: e.target.value }))}
                      placeholder={locale === 'tr' ? 'örn. Fatura_Asli.pdf / Sevk_Irsaliyesi.jpg' : 'e.g. Signed_Invoice.pdf'}
                      className="ds-input text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">{inv.docType} *</label>
                    <select
                      value={contentForm.invoiceContentTypeId}
                      onChange={(e) => setContentForm(prev => ({ ...prev, invoiceContentTypeId: e.target.value }))}
                      className="ds-input text-xs w-full"
                    >
                      {contentTypeOptions.map((ct) => (
                        <option key={ct.invoiceContentTypeId} value={ct.invoiceContentTypeId}>
                          {ct.description || ct.invoiceContentTypeId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">{common.description}</label>
                    <input
                      type="text"
                      value={contentForm.description}
                      onChange={(e) => setContentForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={locale === 'tr' ? 'Belge açıklaması veya arşiv referans notu' : 'Document description or archive note'}
                      className="ds-input text-xs w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddContent(false)}
                    className="ds-btn-secondary text-xs py-1 px-3"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="ds-btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {common.save}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Attachments */}
          {contents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="ds-table text-xs">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{inv.docName}</th>
                    <th className="ds-th">{inv.docType}</th>
                    <th className="ds-th">{common.description}</th>
                    <th className="ds-th">{common.date}</th>
                    {isEditable && <th className="ds-th text-center w-16">{common.actions}</th>}
                  </tr>
                </thead>
                <tbody>
                  {contents.map((c) => (
                    <tr key={`${c.contentId}-${c.invoiceContentTypeId}-${c.fromDate || ''}`} className="ds-tbody-row">
                      <td className="ds-td font-medium text-slate-100 flex items-center gap-2">
                        <FileText size={14} className="text-indigo-400 shrink-0" />
                        <span>{c.contentName || c.contentId}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({c.contentId})</span>
                      </td>
                      <td className="ds-td">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {c.invoiceContentTypeDesc || c.invoiceContentTypeId}
                        </span>
                      </td>
                      <td className="ds-td text-slate-300">
                        {c.description || '-'}
                      </td>
                      <td className="ds-td text-slate-400">
                        {c.fromDate ? c.fromDate.substring(0, 10) : '-'}
                      </td>
                      {isEditable && (
                        <td className="ds-td text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteContent(c.contentId, c.invoiceContentTypeId)}
                            disabled={actionLoading}
                            title={common.delete}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-black/20 rounded-xl border border-slate-800/60 text-center">
              <p className="text-xs text-slate-500">{inv.noAttachments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceRolesAndAttributes;
