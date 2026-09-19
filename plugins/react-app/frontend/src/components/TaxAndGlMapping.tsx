import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Percent,
  Landmark,
  Layers,
  CreditCard,
  Plus,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Globe,
  Settings
} from 'lucide-react';
import {
  api,
  TaxAuthorityItem,
  TaxRateItem,
  TaxAuthorityGlAccountItem,
  InvoiceItemTypeGlAccountItem,
  PaymentMethodTypeGlAccountItem,
  GlAccountTypeDefaultItem,
  TaxAndGlMappingMetadata,
  CreateTaxAuthorityPayload,
  CreateTaxRatePayload,
} from '../services/api';
import { useTranslation } from '../i18n';

type TabType = 'rates' | 'authorities' | 'invoice-mappings' | 'payment-defaults';

export const TaxAndGlMapping: React.FC = () => {
  const { translations, locale } = useTranslation();

  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('rates');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<TaxAndGlMappingMetadata | null>(null);

  // Data states
  const [taxAuthorities, setTaxAuthorities] = useState<TaxAuthorityItem[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateItem[]>([]);
  const [invoiceItemGlAccounts, setInvoiceItemGlAccounts] = useState<InvoiceItemTypeGlAccountItem[]>([]);
  const [paymentMethodGlAccounts, setPaymentMethodGlAccounts] = useState<PaymentMethodTypeGlAccountItem[]>([]);
  const [glAccountTypeDefaults, setGlAccountTypeDefaults] = useState<GlAccountTypeDefaultItem[]>([]);

  // Selected Authority Drawer
  const [selectedAuthority, setSelectedAuthority] = useState<TaxAuthorityItem | null>(null);
  const [authorityGlAccounts, setAuthorityGlAccounts] = useState<TaxAuthorityGlAccountItem[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeoFilter, setSelectedGeoFilter] = useState('');

  // Modals
  const [showCreateRateModal, setShowCreateRateModal] = useState(false);
  const [showCreateAuthModal, setShowCreateAuthModal] = useState(false);
  const [showInvoiceMapModal, setShowInvoiceMapModal] = useState(false);
  const [showPaymentMapModal, setShowPaymentMapModal] = useState(false);
  const [showDefaultMapModal, setShowDefaultMapModal] = useState(false);
  const [showAuthGlModal, setShowAuthGlModal] = useState(false);

  // Form states
  const [rateForm, setRateForm] = useState<CreateTaxRatePayload>({
    taxAuthGeoId: 'USA',
    taxAuthPartyId: 'USA_IRS',
    taxAuthorityRateTypeId: 'SALES_TAX',
    taxPercentage: 20,
    description: '',
    taxShipping: 'N',
  });

  const [authForm, setAuthForm] = useState<CreateTaxAuthorityPayload>({
    taxAuthGeoId: '',
    taxAuthPartyId: '',
    requireTaxIdForExemption: 'N',
    includeTaxInPrice: 'N',
    taxIdFormatPattern: '',
  });

  const [invoiceMapForm, setInvoiceMapForm] = useState({
    invoiceItemTypeId: '',
    glAccountId: '',
    organizationPartyId: 'Company',
  });

  const [paymentMapForm, setPaymentMapForm] = useState({
    paymentMethodTypeId: '',
    glAccountId: '',
    organizationPartyId: 'Company',
  });

  const [defaultMapForm, setDefaultMapForm] = useState({
    glAccountTypeId: '',
    glAccountId: '',
    organizationPartyId: 'Company',
  });

  const [authGlForm, setAuthGlForm] = useState({
    taxAuthGeoId: '',
    taxAuthPartyId: '',
    organizationPartyId: 'Company',
    glAccountId: '',
  });

  // Fetch initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, authRes, rateRes, glMapRes] = await Promise.all([
        api.getTaxAndGlMappingMetadata(),
        api.getTaxAuthorities(),
        api.getTaxRates(),
        api.getGlMappings('Company'),
      ]);

      setMetadata(metaRes);
      setTaxAuthorities(authRes.taxAuthorities || []);
      setTaxRates(rateRes.taxRates || []);
      setInvoiceItemGlAccounts(glMapRes.invoiceItemTypeGlAccounts || []);
      setPaymentMethodGlAccounts(glMapRes.paymentMethodTypeGlAccounts || []);
      setGlAccountTypeDefaults(glMapRes.glAccountTypeDefaults || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Veri yüklenirken hata oluştu.' : 'Error loading data.'));
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open Drawer for Authority
  const handleSelectAuthority = async (auth: TaxAuthorityItem) => {
    setSelectedAuthority(auth);
    setDrawerLoading(true);
    try {
      const res = await api.getTaxAuthorityGlAccounts(auth.taxAuthGeoId, auth.taxAuthPartyId);
      setAuthorityGlAccounts(res.taxAuthorityGlAccounts || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Create Tax Rate Submit
  const handleCreateTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createTaxRate(rateForm);
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.rateSaved);
      setShowCreateRateModal(false);
      const updatedRates = await api.getTaxRates();
      setTaxRates(updatedRates.taxRates || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Vergi oranı oluşturulamadı.' : 'Could not create tax rate.'));
    } finally {
      setLoading(false);
    }
  };

  // Delete Tax Rate
  const handleDeleteTaxRate = async (taxAuthorityRateSeqId: string) => {
    if (!window.confirm(locale === 'tr' ? 'Bu vergi oranı kuralını silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this tax rate rule?')) return;
    setLoading(true);
    try {
      const res = await api.deleteTaxRate(taxAuthorityRateSeqId);
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.deleteSuccess);
      const updatedRates = await api.getTaxRates();
      setTaxRates(updatedRates.taxRates || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Silme işlemi başarısız oldu.' : 'Delete operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Create Tax Authority Submit
  const handleCreateTaxAuthority = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createTaxAuthority(authForm);
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.authoritySaved);
      setShowCreateAuthModal(false);
      const updatedAuths = await api.getTaxAuthorities();
      setTaxAuthorities(updatedAuths.taxAuthorities || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Vergi dairesi oluşturulamadı.' : 'Could not create tax authority.'));
    } finally {
      setLoading(false);
    }
  };

  // Set Invoice Item Type Mapping
  const handleSetInvoiceItemMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.setInvoiceItemTypeGlAccount(
        invoiceMapForm.invoiceItemTypeId,
        invoiceMapForm.glAccountId,
        invoiceMapForm.organizationPartyId
      );
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.mappingSaved);
      setShowInvoiceMapModal(false);
      const glMapRes = await api.getGlMappings('Company');
      setInvoiceItemGlAccounts(glMapRes.invoiceItemTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Eşleme işlemi başarısız oldu.' : 'Mapping operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Remove Invoice Item Type Mapping
  const handleRemoveInvoiceItemMap = async (itemTypeId: string) => {
    if (!window.confirm(locale === 'tr' ? 'Bu fatura kalemi muhasebe eşleşmesini kaldırmak istiyor musunuz?' : 'Are you sure you want to remove this invoice item GL mapping?')) return;
    setLoading(true);
    try {
      const res = await api.removeInvoiceItemTypeGlAccount(itemTypeId, 'Company');
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.deleteSuccess);
      const glMapRes = await api.getGlMappings('Company');
      setInvoiceItemGlAccounts(glMapRes.invoiceItemTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Kaldırma işlemi başarısız oldu.' : 'Remove operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Set Payment Method Mapping
  const handleSetPaymentMethodMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.setPaymentMethodTypeGlAccount(
        paymentMapForm.paymentMethodTypeId,
        paymentMapForm.glAccountId,
        paymentMapForm.organizationPartyId
      );
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.defaultSaved);
      setShowPaymentMapModal(false);
      const glMapRes = await api.getGlMappings('Company');
      setPaymentMethodGlAccounts(glMapRes.paymentMethodTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Eşleme işlemi başarısız oldu.' : 'Mapping operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Remove Payment Method Mapping
  const handleRemovePaymentMethodMap = async (pmTypeId: string) => {
    if (!window.confirm(locale === 'tr' ? 'Bu ödeme yöntemi eşleşmesini kaldırmak istiyor musunuz?' : 'Are you sure you want to remove this payment method mapping?')) return;
    setLoading(true);
    try {
      const res = await api.removePaymentMethodTypeGlAccount(pmTypeId, 'Company');
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.deleteSuccess);
      const glMapRes = await api.getGlMappings('Company');
      setPaymentMethodGlAccounts(glMapRes.paymentMethodTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Kaldırma işlemi başarısız oldu.' : 'Remove operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Set Default Account Type Mapping
  const handleSetDefaultAccountMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.setGlAccountTypeDefault(
        defaultMapForm.glAccountTypeId,
        defaultMapForm.glAccountId,
        defaultMapForm.organizationPartyId
      );
      showNotification(res._EVENT_MESSAGE_ || (locale === 'tr' ? 'Varsayılan hesap eşleşmesi güncellendi.' : 'Default account mapping updated.'));
      setShowDefaultMapModal(false);
      const glMapRes = await api.getGlMappings('Company');
      setGlAccountTypeDefaults(glMapRes.glAccountTypeDefaults || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Eşleme işlemi başarısız oldu.' : 'Mapping operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Remove Default Account Type Mapping
  const handleRemoveDefaultAccountMap = async (glAccountTypeId: string) => {
    if (!window.confirm(locale === 'tr' ? 'Bu varsayılan hesap eşleşmesini kaldırmak istiyor musunuz?' : 'Are you sure you want to remove this default account mapping?')) return;
    setLoading(true);
    try {
      const res = await api.removeGlAccountTypeDefault(glAccountTypeId, 'Company');
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.deleteSuccess);
      const glMapRes = await api.getGlMappings('Company');
      setGlAccountTypeDefaults(glMapRes.glAccountTypeDefaults || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Kaldırma işlemi başarısız oldu.' : 'Remove operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Set Authority GL Account
  const handleSetAuthorityGlAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuthority) return;
    setLoading(true);
    try {
      const res = await api.setTaxAuthorityGlAccount({
        taxAuthGeoId: selectedAuthority.taxAuthGeoId,
        taxAuthPartyId: selectedAuthority.taxAuthPartyId,
        organizationPartyId: 'Company',
        glAccountId: authGlForm.glAccountId,
      });
      showNotification(res._EVENT_MESSAGE_ || (locale === 'tr' ? 'Vergi dairesi muhasebe hesabı eşleştirildi.' : 'Tax authority GL account mapped.'));
      setShowAuthGlModal(false);
      const updatedGl = await api.getTaxAuthorityGlAccounts(selectedAuthority.taxAuthGeoId, selectedAuthority.taxAuthPartyId);
      setAuthorityGlAccounts(updatedGl.taxAuthorityGlAccounts || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Eşleme işlemi başarısız oldu.' : 'Mapping operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Delete Authority GL Account
  const handleDeleteAuthorityGlAccount = async (_glAccountId?: string) => {
    if (!selectedAuthority) return;
    if (!window.confirm(locale === 'tr' ? 'Bu vergi hesabı eşleşmesini kaldırmak istiyor musunuz?' : 'Are you sure you want to remove this tax account mapping?')) return;
    setLoading(true);
    try {
      const res = await api.deleteTaxAuthorityGlAccount(
        selectedAuthority.taxAuthGeoId,
        selectedAuthority.taxAuthPartyId,
        'Company'
      );
      showNotification(res._EVENT_MESSAGE_ || translations.taxAndGlMapping.messages.deleteSuccess);
      const updatedGl = await api.getTaxAuthorityGlAccounts(selectedAuthority.taxAuthGeoId, selectedAuthority.taxAuthPartyId);
      setAuthorityGlAccounts(updatedGl.taxAuthorityGlAccounts || []);
    } catch (err: any) {
      setError(err.message || (locale === 'tr' ? 'Kaldırma işlemi başarısız oldu.' : 'Remove operation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered Lists
  const filteredRates = taxRates.filter((r) => {
    const matchSearch =
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.geoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.taxAuthorityRateTypeDesc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGeo = !selectedGeoFilter || r.taxAuthGeoId === selectedGeoFilter;
    return matchSearch && matchGeo;
  });

  const filteredAuthorities = taxAuthorities.filter((a) => {
    const matchSearch =
      a.geoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.taxAuthGeoId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGeo = !selectedGeoFilter || a.taxAuthGeoId === selectedGeoFilter;
    return matchSearch && matchGeo;
  });

  const filteredInvoiceMaps = invoiceItemGlAccounts.filter((i) =>
    i.itemTypeDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.accountCode.includes(searchTerm)
  );

  const filteredPaymentMaps = paymentMethodGlAccounts.filter((p) =>
    p.methodTypeDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.accountCode.includes(searchTerm)
  );

  const filteredDefaultMaps = glAccountTypeDefaults.filter((d) =>
    d.glAccountTypeDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.accountCode.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Percent className="w-7 h-7 text-indigo-400" />
            {translations.taxAndGlMapping.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {translations.taxAndGlMapping.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-600/50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {translations.common.refresh}
          </button>
          {activeTab === 'rates' && (
            <button
              onClick={() => setShowCreateRateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {translations.taxAndGlMapping.rates.newRate}
            </button>
          )}
          {activeTab === 'authorities' && (
            <button
              onClick={() => setShowCreateAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {translations.taxAndGlMapping.authorities.newAuthority}
            </button>
          )}
          {activeTab === 'invoice-mappings' && (
            <button
              onClick={() => setShowInvoiceMapModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {translations.taxAndGlMapping.invoiceMappings.newMapping}
            </button>
          )}
          {activeTab === 'payment-defaults' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentMapModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {translations.taxAndGlMapping.paymentDefaults.newDefault}
              </button>
              <button
                onClick={() => setShowDefaultMapModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold border border-slate-600 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {locale === 'tr' ? 'Varsayılan GL Hesabı' : 'Default GL Account'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {translations.taxAndGlMapping.authorities.totalAuthorities}
            </p>
            <Landmark className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{taxAuthorities.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {locale === 'tr' ? 'Tanımlı resmi vergi otoriteleri' : 'Configured official tax authorities'}
          </p>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {translations.taxAndGlMapping.rates.activeRates}
            </p>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-2">{taxRates.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {locale === 'tr' ? 'Aktif matrah ve yüzde kuralları' : 'Active tax base and percentage rules'}
          </p>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {translations.taxAndGlMapping.invoiceMappings.totalMappings}
            </p>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{invoiceItemGlAccounts.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {locale === 'tr' ? 'Otomatik yevmiye hesap kuralları' : 'Automatic journal account rules'}
          </p>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {translations.taxAndGlMapping.paymentDefaults.totalDefaults}
            </p>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {paymentMethodGlAccounts.length + glAccountTypeDefaults.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {locale === 'tr' ? 'Kasa/Banka ve sistem eşleşmeleri' : 'Cash/Bank and system mappings'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-700/60 gap-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('rates'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rates'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          {translations.taxAndGlMapping.tabs.rates} ({taxRates.length})
        </button>

        <button
          onClick={() => { setActiveTab('authorities'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'authorities'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          {translations.taxAndGlMapping.tabs.authorities} ({taxAuthorities.length})
        </button>

        <button
          onClick={() => { setActiveTab('invoice-mappings'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'invoice-mappings'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          {translations.taxAndGlMapping.tabs.invoiceMappings} ({invoiceItemGlAccounts.length})
        </button>

        <button
          onClick={() => { setActiveTab('payment-defaults'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'payment-defaults'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {translations.taxAndGlMapping.tabs.paymentDefaults} ({paymentMethodGlAccounts.length + glAccountTypeDefaults.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'rates'
                ? translations.taxAndGlMapping.rates.searchPlaceholder
                : activeTab === 'authorities'
                ? translations.taxAndGlMapping.authorities.searchPlaceholder
                : activeTab === 'invoice-mappings'
                ? translations.taxAndGlMapping.invoiceMappings.searchPlaceholder
                : translations.taxAndGlMapping.paymentDefaults.searchPlaceholder
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/40 border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {(activeTab === 'rates' || activeTab === 'authorities') && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedGeoFilter}
              onChange={(e) => setSelectedGeoFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">{locale === 'tr' ? 'Tüm Bölgeler / Ülkeler' : 'All Regions / Countries'}</option>
              {metadata?.taxAuthorities.map((ta: any) => (
                <option key={`${ta.taxAuthGeoId}-${ta.taxAuthPartyId}`} value={ta.taxAuthGeoId}>
                  {ta.geoName} ({ta.taxAuthGeoId})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: TAX RATES */}
      {activeTab === 'rates' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-800/60 text-slate-300 font-semibold">
                  <th className="py-3 px-4">{translations.taxAndGlMapping.rates.rateId}</th>
                  <th className="py-3 px-4">{translations.taxAndGlMapping.rates.authority} / {locale === 'tr' ? 'Bölge' : 'Region'}</th>
                  <th className="py-3 px-4">{translations.taxAndGlMapping.rates.rateType}</th>
                  <th className="py-3 px-4">{translations.common.description}</th>
                  <th className="py-3 px-4 text-right">{translations.taxAndGlMapping.rates.percentage}</th>
                  <th className="py-3 px-4">{locale === 'tr' ? 'Kargo Vergilendir' : 'Tax Shipping'}</th>
                  <th className="py-3 px-4 text-center">{translations.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {translations.taxAndGlMapping.rates.noRates}
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((r) => (
                    <tr key={r.taxAuthorityRateSeqId} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-indigo-400 font-medium">
                        {r.taxAuthorityRateSeqId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{r.geoName}</div>
                        <div className="text-xs text-slate-400">{r.partyName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/80 text-slate-300 border border-slate-600">
                          {r.taxAuthorityRateTypeDesc}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{r.description || '-'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        %{Number(r.taxPercentage).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            r.taxShipping === 'Y'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {r.taxShipping === 'Y' ? translations.common.yes : translations.common.no}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTaxRate(r.taxAuthorityRateSeqId)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title={locale === 'tr' ? 'Vergi Oranını Sil' : 'Delete Tax Rate'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TAX AUTHORITIES */}
      {activeTab === 'authorities' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-800/60 text-slate-300 font-semibold">
                  <th className="py-3 px-4">{translations.taxAndGlMapping.authorities.geoId}</th>
                  <th className="py-3 px-4">{translations.taxAndGlMapping.authorities.partyId}</th>
                  <th className="py-3 px-4 text-center">{locale === 'tr' ? 'Fiyata Dahil (KDV)' : 'Tax Included (VAT)'}</th>
                  <th className="py-3 px-4 text-center">{locale === 'tr' ? 'Muafiyet İçin Vergi No Şartı' : 'Tax ID Req. for Exemption'}</th>
                  <th className="py-3 px-4 text-center">{locale === 'tr' ? 'Tanımlı Oranlar' : 'Defined Rates'}</th>
                  <th className="py-3 px-4 text-center">{locale === 'tr' ? 'GL Hesapları' : 'GL Accounts'}</th>
                  <th className="py-3 px-4 text-center">{locale === 'tr' ? 'Detay & Yönetim' : 'Detail & Manage'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredAuthorities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {translations.taxAndGlMapping.authorities.noAuthorities}
                    </td>
                  </tr>
                ) : (
                  filteredAuthorities.map((a) => (
                    <tr key={`${a.taxAuthGeoId}-${a.taxAuthPartyId}`} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          {a.geoName}
                        </div>
                        <div className="text-xs font-mono text-slate-400">{a.taxAuthGeoId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{a.partyName}</div>
                        <div className="text-xs font-mono text-slate-400">{a.taxAuthPartyId}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            a.includeTaxInPrice === 'Y'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {a.includeTaxInPrice === 'Y' ? (locale === 'tr' ? 'Evet (KDV)' : 'Yes (VAT)') : translations.common.no}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            a.requireTaxIdForExemption === 'Y'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {a.requireTaxIdForExemption === 'Y' ? (locale === 'tr' ? 'Zorunlu' : 'Required') : (locale === 'tr' ? 'İsteğe Bağlı' : 'Optional')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{a.rateCount}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{a.glAccountCount}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleSelectAuthority(a)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium border border-slate-600 transition-colors cursor-pointer"
                        >
                          {locale === 'tr' ? 'İncele & GL Eşle' : 'Inspect & Map GL'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICE ITEM GL MAPPINGS */}
      {activeTab === 'invoice-mappings' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-700/60 bg-slate-800/60 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-white">
                {locale === 'tr' ? 'Fatura Kalem Tipi Otomatik Muhasebe Eşlemeleri' : 'Invoice Item Type Automatic GL Mappings'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {locale === 'tr'
                  ? 'Fatura satırında bir kalem tipi seçildiğinde arka planda otomatik yazılacak borç/alacak GL hesabı.'
                  : 'Automatic debit/credit GL account assigned when an invoice item type is selected on an invoice line.'}
              </p>
            </div>
            <button
              onClick={() => setShowInvoiceMapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {translations.taxAndGlMapping.invoiceMappings.newMapping}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-300 font-semibold">
                  <th className="py-3 px-4">{translations.taxAndGlMapping.invoiceMappings.itemType}</th>
                  <th className="py-3 px-4">{locale === 'tr' ? 'Kod' : 'Code'}</th>
                  <th className="py-3 px-4">{translations.taxAndGlMapping.invoiceMappings.glAccount}</th>
                  <th className="py-3 px-4">{locale === 'tr' ? 'Şirket' : 'Company'}</th>
                  <th className="py-3 px-4 text-center">{translations.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredInvoiceMaps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {translations.taxAndGlMapping.invoiceMappings.noMappings}
                    </td>
                  </tr>
                ) : (
                  filteredInvoiceMaps.map((item) => (
                    <tr key={item.invoiceItemTypeId} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{item.itemTypeDesc}</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-400">{item.invoiceItemTypeId}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-emerald-400">
                          {item.accountCode ? `${item.accountCode} - ` : ''}
                          {item.accountName}
                        </div>
                        <div className="text-xs font-mono text-slate-400">ID: {item.glAccountId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.organizationPartyId}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemoveInvoiceItemMap(item.invoiceItemTypeId)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title={locale === 'tr' ? 'Eşleşmeyi Kaldır' : 'Remove Mapping'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT & DEFAULT GL MAPPINGS */}
      {activeTab === 'payment-defaults' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Types */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-4 border-b border-slate-700/60 bg-slate-800/60 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-white">
                  {locale === 'tr' ? 'Ödeme Yöntemi Hesap Eşlemeleri' : 'Payment Method Account Mappings'}
                </h2>
                <p className="text-xs text-slate-400">
                  {locale === 'tr'
                    ? 'Nakit, Havale, Kredi Kartı ödemelerinin yansıtılacağı GL hesabı.'
                    : 'GL account to which Cash, Wire Transfer, Credit Card payments are posted.'}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentMapModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {translations.taxAndGlMapping.paymentDefaults.newDefault}
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-300 font-semibold text-xs">
                    <th className="py-2.5 px-3">{translations.taxAndGlMapping.paymentDefaults.paymentMethodType}</th>
                    <th className="py-2.5 px-3">{translations.taxAndGlMapping.paymentDefaults.glAccount}</th>
                    <th className="py-2.5 px-3 text-center">{translations.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-300">
                  {filteredPaymentMaps.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        {translations.taxAndGlMapping.paymentDefaults.noDefaults}
                      </td>
                    </tr>
                  ) : (
                    filteredPaymentMaps.map((pm) => (
                      <tr key={pm.paymentMethodTypeId} className="hover:bg-slate-700/30">
                        <td className="py-2.5 px-3 font-medium text-white">
                          {pm.methodTypeDesc}
                          <span className="block text-[11px] font-mono text-slate-400">{pm.paymentMethodTypeId}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-emerald-400 font-semibold text-xs">
                            {pm.accountCode ? `${pm.accountCode} - ` : ''}
                            {pm.accountName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemovePaymentMethodMap(pm.paymentMethodTypeId)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            title={translations.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Default GL Account Types */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-4 border-b border-slate-700/60 bg-slate-800/60 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-white">
                  {locale === 'tr' ? 'Varsayılan Sistem GL Hesap Eşlemeleri' : 'Default System GL Account Mappings'}
                </h2>
                <p className="text-xs text-slate-400">
                  {locale === 'tr'
                    ? 'Ticari Alacaklar, Borçlar, Satış, COGS ve Kar/Zarar varsayılanları.'
                    : 'Accounts Receivable, Payable, Sales, COGS, and Profit/Loss defaults.'}
                </p>
              </div>
              <button
                onClick={() => setShowDefaultMapModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {locale === 'tr' ? 'Ekle' : 'Add'}
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-300 font-semibold text-xs">
                    <th className="py-2.5 px-3">{locale === 'tr' ? 'Hesap Tipi' : 'Account Type'}</th>
                    <th className="py-2.5 px-3">{locale === 'tr' ? 'Varsayılan GL Hesabı' : 'Default GL Account'}</th>
                    <th className="py-2.5 px-3 text-center">{translations.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-300">
                  {filteredDefaultMaps.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        {translations.common.noData}
                      </td>
                    </tr>
                  ) : (
                    filteredDefaultMaps.map((d) => (
                      <tr key={d.glAccountTypeId} className="hover:bg-slate-700/30">
                        <td className="py-2.5 px-3 font-medium text-white">
                          {d.glAccountTypeDesc}
                          <span className="block text-[11px] font-mono text-slate-400">{d.glAccountTypeId}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-emerald-400 font-semibold text-xs">
                            {d.accountCode ? `${d.accountCode} - ` : ''}
                            {d.accountName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemoveDefaultAccountMap(d.glAccountTypeId)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            title={translations.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AUTHORITY DETAILS SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {selectedAuthority && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAuthority(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-xl bg-slate-900 border-l border-slate-700/60 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Drawer Header */}
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">{selectedAuthority.geoName}</h2>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{selectedAuthority.partyName}</p>
                    </div>
                    <button
                      onClick={() => setSelectedAuthority(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Summary Properties */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block">{translations.taxAndGlMapping.authorities.geoId}:</span>
                      <span className="font-mono text-white font-semibold">{selectedAuthority.taxAuthGeoId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{translations.taxAndGlMapping.authorities.partyId}:</span>
                      <span className="font-mono text-white font-semibold">{selectedAuthority.taxAuthPartyId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{locale === 'tr' ? 'Fiyata Dahil Vergi (KDV):' : 'Tax Included in Price (VAT):'}</span>
                      <span className="text-slate-200">{selectedAuthority.includeTaxInPrice === 'Y' ? translations.common.yes : translations.common.no}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{locale === 'tr' ? 'Muafiyet Vergi No Şartı:' : 'Tax ID Req. for Exemption:'}</span>
                      <span className="text-slate-200">{selectedAuthority.requireTaxIdForExemption === 'Y' ? translations.common.yes : translations.common.no}</span>
                    </div>
                  </div>

                  {/* Linked GL Accounts Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        {locale === 'tr' ? 'Bağlı Vergi Muhasebe Hesapları' : 'Linked Tax GL Accounts'}
                      </h3>
                      <button
                        onClick={() => {
                          setAuthGlForm({
                            taxAuthGeoId: selectedAuthority.taxAuthGeoId,
                            taxAuthPartyId: selectedAuthority.taxAuthPartyId,
                            organizationPartyId: 'Company',
                            glAccountId: '',
                          });
                          setShowAuthGlModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        {translations.taxAndGlMapping.authorities.addGlAccount}
                      </button>
                    </div>

                    {drawerLoading ? (
                      <div className="py-6 text-center text-slate-400">{translations.common.loading}</div>
                    ) : authorityGlAccounts.length === 0 ? (
                      <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 text-center text-sm text-slate-400">
                        {translations.taxAndGlMapping.authorities.noGlAccounts}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {authorityGlAccounts.map((gla) => (
                          <div
                            key={`${gla.taxAuthGeoId}-${gla.glAccountId}`}
                            className="flex justify-between items-center p-3 bg-slate-800/60 rounded-xl border border-slate-700/40 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-emerald-400">
                                {gla.accountCode ? `${gla.accountCode} - ` : ''}
                                {gla.accountName}
                              </p>
                              <p className="text-xs text-slate-400">ID: {gla.glAccountId} | {locale === 'tr' ? 'Şirket' : 'Company'}: {gla.organizationPartyId}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteAuthorityGlAccount(gla.glAccountId)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                              title={locale === 'tr' ? 'Bağlantıyı Kaldır' : 'Remove Link'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedAuthority(null)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {translations.common.close}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: CREATE TAX RATE */}
      {showCreateRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-400" />
                {translations.taxAndGlMapping.rates.newRate}
              </h2>
              <button onClick={() => setShowCreateRateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaxRate} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.rates.authority}
                </label>
                <select
                  required
                  value={`${rateForm.taxAuthGeoId}|${rateForm.taxAuthPartyId}`}
                  onChange={(e) => {
                    const [geo, party] = e.target.value.split('|');
                    setRateForm({ ...rateForm, taxAuthGeoId: geo, taxAuthPartyId: party });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  {metadata?.taxAuthorities.map((ta: any) => (
                    <option key={`${ta.taxAuthGeoId}|${ta.taxAuthPartyId}`} value={`${ta.taxAuthGeoId}|${ta.taxAuthPartyId}`}>
                      {ta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {translations.taxAndGlMapping.rates.percentage}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateForm.taxPercentage}
                    onChange={(e) => setRateForm({ ...rateForm, taxPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    placeholder={locale === 'tr' ? 'Örn: 20' : 'e.g. 20'}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {translations.taxAndGlMapping.rates.rateType}
                  </label>
                  <select
                    value={rateForm.taxAuthorityRateTypeId}
                    onChange={(e) => setRateForm({ ...rateForm, taxAuthorityRateTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    {metadata?.taxAuthorityRateTypes.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{translations.common.description}</label>
                <input
                  type="text"
                  value={rateForm.description || ''}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  placeholder={locale === 'tr' ? 'Örn: %20 Standart KDV' : 'e.g. 20% Standard VAT'}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taxShippingCheck"
                  checked={rateForm.taxShipping === 'Y'}
                  onChange={(e) => setRateForm({ ...rateForm, taxShipping: e.target.checked ? 'Y' : 'N' })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="taxShippingCheck" className="text-slate-300">
                  {locale === 'tr' ? 'Kargo / Nakliye ücretlerine de vergi uygula' : 'Apply tax to shipping / freight charges'}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateRateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE TAX AUTHORITY */}
      {showCreateAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                {translations.taxAndGlMapping.authorities.newAuthority}
              </h2>
              <button onClick={() => setShowCreateAuthModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaxAuthority} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.authorities.geoId}
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'tr' ? 'Örn: TUR, USA, DEU veya TR-34' : 'e.g. TUR, USA, DEU or TR-34'}
                  value={authForm.taxAuthGeoId}
                  onChange={(e) => setAuthForm({ ...authForm, taxAuthGeoId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.authorities.partyId}
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'tr' ? 'Örn: TUR_GIB, USA_IRS veya Şirket/Vergi No' : 'e.g. TUR_GIB, USA_IRS or Tax ID'}
                  value={authForm.taxAuthPartyId}
                  onChange={(e) => setAuthForm({ ...authForm, taxAuthPartyId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {locale === 'tr' ? 'Fiyatlara Vergi Dahil mi?' : 'Tax Included in Price?'}
                  </label>
                  <select
                    value={authForm.includeTaxInPrice}
                    onChange={(e) => setAuthForm({ ...authForm, includeTaxInPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  >
                    <option value="Y">{locale === 'tr' ? 'Evet (KDV Sistemi)' : 'Yes (VAT System)'}</option>
                    <option value="N">{locale === 'tr' ? 'Hayır (Hariç Fiyat)' : 'No (Exclusive)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {locale === 'tr' ? 'Muafiyet İçin Vergi No Şartı' : 'Tax ID Req. for Exemption'}
                  </label>
                  <select
                    value={authForm.requireTaxIdForExemption}
                    onChange={(e) => setAuthForm({ ...authForm, requireTaxIdForExemption: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  >
                    <option value="Y">{locale === 'tr' ? 'Evet, Zorunlu' : 'Yes, Required'}</option>
                    <option value="N">{translations.common.no}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAuthModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {translations.common.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE ITEM GL MAP */}
      {showInvoiceMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                {translations.taxAndGlMapping.invoiceMappings.newMapping}
              </h2>
              <button onClick={() => setShowInvoiceMapModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetInvoiceItemMap} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.invoiceMappings.itemType}
                </label>
                <select
                  required
                  value={invoiceMapForm.invoiceItemTypeId}
                  onChange={(e) => setInvoiceMapForm({ ...invoiceMapForm, invoiceItemTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.invoiceItemTypes.map((iit: any) => (
                    <option key={iit.invoiceItemTypeId} value={iit.invoiceItemTypeId}>
                      {iit.description} ({iit.invoiceItemTypeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.invoiceMappings.glAccount}
                </label>
                <select
                  required
                  value={invoiceMapForm.glAccountId}
                  onChange={(e) => setInvoiceMapForm({ ...invoiceMapForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.glAccounts.map((gla: any) => (
                    <option key={gla.glAccountId} value={gla.glAccountId}>
                      {gla.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInvoiceMapModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {locale === 'tr' ? 'Eşleştir' : 'Map'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PAYMENT METHOD GL MAP */}
      {showPaymentMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                {translations.taxAndGlMapping.paymentDefaults.newDefault}
              </h2>
              <button onClick={() => setShowPaymentMapModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetPaymentMethodMap} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.paymentDefaults.paymentMethodType}
                </label>
                <select
                  required
                  value={paymentMapForm.paymentMethodTypeId}
                  onChange={(e) => setPaymentMapForm({ ...paymentMapForm, paymentMethodTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.paymentMethodTypes.map((pmt: any) => (
                    <option key={pmt.paymentMethodTypeId} value={pmt.paymentMethodTypeId}>
                      {pmt.description} ({pmt.paymentMethodTypeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.paymentDefaults.glAccount} ({locale === 'tr' ? 'Kasa / Banka' : 'Cash / Bank'})
                </label>
                <select
                  required
                  value={paymentMapForm.glAccountId}
                  onChange={(e) => setPaymentMapForm({ ...paymentMapForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.glAccounts.map((gla: any) => (
                    <option key={gla.glAccountId} value={gla.glAccountId}>
                      {gla.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentMapModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {locale === 'tr' ? 'Eşleştir' : 'Map'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DEFAULT GL ACCOUNT MAP */}
      {showDefaultMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                {locale === 'tr' ? 'Varsayılan GL Hesabı Eşle' : 'Map Default GL Account'}
              </h2>
              <button onClick={() => setShowDefaultMapModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetDefaultAccountMap} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {locale === 'tr' ? 'Hesap Tipi' : 'Account Type'}
                </label>
                <select
                  required
                  value={defaultMapForm.glAccountTypeId}
                  onChange={(e) => setDefaultMapForm({ ...defaultMapForm, glAccountTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.glAccountTypes.map((gat: any) => (
                    <option key={gat.glAccountTypeId} value={gat.glAccountTypeId}>
                      {gat.description} ({gat.glAccountTypeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {translations.taxAndGlMapping.paymentDefaults.glAccount}
                </label>
                <select
                  required
                  value={defaultMapForm.glAccountId}
                  onChange={(e) => setDefaultMapForm({ ...defaultMapForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.glAccounts.map((gla: any) => (
                    <option key={gla.glAccountId} value={gla.glAccountId}>
                      {gla.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDefaultMapModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: AUTHORITY GL ACCOUNT MAP */}
      {showAuthGlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-400" />
                {translations.taxAndGlMapping.authorities.addGlAccount}
              </h2>
              <button onClick={() => setShowAuthGlModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetAuthorityGlAccount} className="space-y-4 text-sm">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <p className="text-xs text-slate-400">{locale === 'tr' ? 'Seçili Vergi Dairesi:' : 'Selected Tax Authority:'}</p>
                <p className="font-semibold text-white">
                  {selectedAuthority?.geoName} - {selectedAuthority?.partyName}
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {locale === 'tr' ? 'Vergi GL Muhasebe Hesabı (Örn: 391 KDV / 191 KDV)' : 'Tax GL Account (e.g. Sales Tax / Input VAT)'}
                </label>
                <select
                  required
                  value={authGlForm.glAccountId}
                  onChange={(e) => setAuthGlForm({ ...authGlForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">-- {translations.common.select} --</option>
                  {metadata?.glAccounts.map((gla: any) => (
                    <option key={gla.glAccountId} value={gla.glAccountId}>
                      {gla.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAuthGlModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {locale === 'tr' ? 'Eşleştir' : 'Map'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
