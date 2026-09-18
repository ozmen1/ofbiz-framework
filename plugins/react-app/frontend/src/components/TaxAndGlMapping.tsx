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

type TabType = 'rates' | 'authorities' | 'invoice-mappings' | 'payment-defaults';

export const TaxAndGlMapping: React.FC = () => {
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
      setError(err.message || 'Veri yüklenirken hata oluştu.');
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
      showNotification(res._EVENT_MESSAGE_ || 'Vergi oranı başarıyla oluşturuldu.');
      setShowCreateRateModal(false);
      const updatedRates = await api.getTaxRates();
      setTaxRates(updatedRates.taxRates || []);
    } catch (err: any) {
      setError(err.message || 'Vergi oranı oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Tax Rate
  const handleDeleteTaxRate = async (taxAuthorityRateSeqId: string) => {
    if (!window.confirm('Bu vergi oranı kuralını silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    try {
      const res = await api.deleteTaxRate(taxAuthorityRateSeqId);
      showNotification(res._EVENT_MESSAGE_ || 'Vergi oranı silindi.');
      const updatedRates = await api.getTaxRates();
      setTaxRates(updatedRates.taxRates || []);
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız oldu.');
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
      showNotification(res._EVENT_MESSAGE_ || 'Vergi dairesi başarıyla oluşturuldu.');
      setShowCreateAuthModal(false);
      const updatedAuths = await api.getTaxAuthorities();
      setTaxAuthorities(updatedAuths.taxAuthorities || []);
    } catch (err: any) {
      setError(err.message || 'Vergi dairesi oluşturulamadı.');
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
      showNotification(res._EVENT_MESSAGE_ || 'Fatura kalemi eşleşmesi güncellendi.');
      setShowInvoiceMapModal(false);
      const glMapRes = await api.getGlMappings('Company');
      setInvoiceItemGlAccounts(glMapRes.invoiceItemTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || 'Eşleme işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // Remove Invoice Item Type Mapping
  const handleRemoveInvoiceItemMap = async (itemTypeId: string) => {
    if (!window.confirm('Bu fatura kalemi muhasebe eşleşmesini kaldırmak istiyor musunuz?')) return;
    setLoading(true);
    try {
      const res = await api.removeInvoiceItemTypeGlAccount(itemTypeId, 'Company');
      showNotification(res._EVENT_MESSAGE_ || 'Eşleşme kaldırıldı.');
      const glMapRes = await api.getGlMappings('Company');
      setInvoiceItemGlAccounts(glMapRes.invoiceItemTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || 'Kaldırma işlemi başarısız oldu.');
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
      showNotification(res._EVENT_MESSAGE_ || 'Ödeme yöntemi eşleşmesi güncellendi.');
      setShowPaymentMapModal(false);
      const glMapRes = await api.getGlMappings('Company');
      setPaymentMethodGlAccounts(glMapRes.paymentMethodTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || 'Eşleme işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // Remove Payment Method Mapping
  const handleRemovePaymentMethodMap = async (pmTypeId: string) => {
    if (!window.confirm('Bu ödeme yöntemi eşleşmesini kaldırmak istiyor musunuz?')) return;
    setLoading(true);
    try {
      const res = await api.removePaymentMethodTypeGlAccount(pmTypeId, 'Company');
      showNotification(res._EVENT_MESSAGE_ || 'Eşleşme kaldırıldı.');
      const glMapRes = await api.getGlMappings('Company');
      setPaymentMethodGlAccounts(glMapRes.paymentMethodTypeGlAccounts || []);
    } catch (err: any) {
      setError(err.message || 'Kaldırma işlemi başarısız oldu.');
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
      showNotification(res._EVENT_MESSAGE_ || 'Varsayılan hesap eşleşmesi güncellendi.');
      setShowDefaultMapModal(false);
      const glMapRes = await api.getGlMappings('Company');
      setGlAccountTypeDefaults(glMapRes.glAccountTypeDefaults || []);
    } catch (err: any) {
      setError(err.message || 'Eşleme işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // Remove Default Account Type Mapping
  const handleRemoveDefaultAccountMap = async (glAccountTypeId: string) => {
    if (!window.confirm('Bu varsayılan hesap eşleşmesini kaldırmak istiyor musunuz?')) return;
    setLoading(true);
    try {
      const res = await api.removeGlAccountTypeDefault(glAccountTypeId, 'Company');
      showNotification(res._EVENT_MESSAGE_ || 'Eşleşme kaldırıldı.');
      const glMapRes = await api.getGlMappings('Company');
      setGlAccountTypeDefaults(glMapRes.glAccountTypeDefaults || []);
    } catch (err: any) {
      setError(err.message || 'Kaldırma işlemi başarısız oldu.');
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
      showNotification(res._EVENT_MESSAGE_ || 'Vergi dairesi muhasebe hesabı eşleştirildi.');
      setShowAuthGlModal(false);
      const updatedGl = await api.getTaxAuthorityGlAccounts(selectedAuthority.taxAuthGeoId, selectedAuthority.taxAuthPartyId);
      setAuthorityGlAccounts(updatedGl.taxAuthorityGlAccounts || []);
    } catch (err: any) {
      setError(err.message || 'Eşleme işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Authority GL Account
  const handleDeleteAuthorityGlAccount = async (_glAccountId?: string) => {
    if (!selectedAuthority) return;
    if (!window.confirm('Bu vergi hesabı eşleşmesini kaldırmak istiyor musunuz?')) return;
    setLoading(true);
    try {
      const res = await api.deleteTaxAuthorityGlAccount(
        selectedAuthority.taxAuthGeoId,
        selectedAuthority.taxAuthPartyId,
        'Company'
      );
      showNotification(res._EVENT_MESSAGE_ || 'Hesap eşleşmesi kaldırıldı.');
      const updatedGl = await api.getTaxAuthorityGlAccounts(selectedAuthority.taxAuthGeoId, selectedAuthority.taxAuthPartyId);
      setAuthorityGlAccounts(updatedGl.taxAuthorityGlAccounts || []);
    } catch (err: any) {
      setError(err.message || 'Kaldırma işlemi başarısız oldu.');
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
            Vergi Motoru & Otomatik Muhasebe Eşlemeleri
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Vergi daireleri, KDV/ÖTV oran kuralları, fatura kalemi ve ödeme yöntemi otomatik muhasebe eşleşmeleri.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-600/50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          {activeTab === 'rates' && (
            <button
              onClick={() => setShowCreateRateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Vergi Oranı
            </button>
          )}
          {activeTab === 'authorities' && (
            <button
              onClick={() => setShowCreateAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Vergi Dairesi Ekle
            </button>
          )}
          {activeTab === 'invoice-mappings' && (
            <button
              onClick={() => setShowInvoiceMapModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Fatura Kalemi Eşle
            </button>
          )}
          {activeTab === 'payment-defaults' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentMapModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Ödeme Yöntemi Eşle
              </button>
              <button
                onClick={() => setShowDefaultMapModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold border border-slate-600 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Varsayılan GL Hesabı
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
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Vergi Daireleri</p>
            <Landmark className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{taxAuthorities.length}</p>
          <p className="text-xs text-slate-400 mt-1">Tanımlı resmi vergi otoriteleri</p>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">KDV & Vergi Oranları</p>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-2">{taxRates.length}</p>
          <p className="text-xs text-slate-400 mt-1">Aktif matrah ve yüzde kuralları</p>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Fatura Kalem Eşlemeleri</p>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{invoiceItemGlAccounts.length}</p>
          <p className="text-xs text-slate-400 mt-1">Otomatik yevmiye hesap kuralları</p>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ödeme & Varsayılan GL</p>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {paymentMethodGlAccounts.length + glAccountTypeDefaults.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Kasa/Banka ve sistem eşleşmeleri</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-700/60 gap-2">
        <button
          onClick={() => { setActiveTab('rates'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'rates'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          KDV & Vergi Oranları ({taxRates.length})
        </button>

        <button
          onClick={() => { setActiveTab('authorities'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'authorities'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Vergi Daireleri ({taxAuthorities.length})
        </button>

        <button
          onClick={() => { setActiveTab('invoice-mappings'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'invoice-mappings'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Fatura Kalemi GL Eşlemeleri ({invoiceItemGlAccounts.length})
        </button>

        <button
          onClick={() => { setActiveTab('payment-defaults'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'payment-defaults'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Ödeme & Varsayılan GL Eşlemeleri ({paymentMethodGlAccounts.length + glAccountTypeDefaults.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Açıklama, bölge veya hesap adı ile filtrele..."
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
              <option value="">Tüm Bölgeler / Ülkeler</option>
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
                  <th className="py-3 px-4">Kural No</th>
                  <th className="py-3 px-4">Vergi Dairesi / Bölge</th>
                  <th className="py-3 px-4">Vergi Türü</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4 text-right">Oran (%)</th>
                  <th className="py-3 px-4">Kargo Vergilendir</th>
                  <th className="py-3 px-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Kayıtlı vergi oranı bulunamadı.
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
                          {r.taxShipping === 'Y' ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTaxRate(r.taxAuthorityRateSeqId)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Vergi Oranını Sil"
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
                  <th className="py-3 px-4">Bölge (Geo)</th>
                  <th className="py-3 px-4">Vergi Dairesi Tarafı (Party)</th>
                  <th className="py-3 px-4 text-center">Fiyata Dahil (KDV)</th>
                  <th className="py-3 px-4 text-center">Muafiyet İçin Vergi No Şartı</th>
                  <th className="py-3 px-4 text-center">Tanımlı Oranlar</th>
                  <th className="py-3 px-4 text-center">GL Hesapları</th>
                  <th className="py-3 px-4 text-center">Detay & Yönetim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredAuthorities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Kayıtlı vergi dairesi bulunamadı.
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
                          {a.includeTaxInPrice === 'Y' ? 'Evet (KDV)' : 'Hayır'}
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
                          {a.requireTaxIdForExemption === 'Y' ? 'Zorunlu' : 'İsteğe Bağlı'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{a.rateCount}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{a.glAccountCount}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleSelectAuthority(a)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium border border-slate-600 transition-colors cursor-pointer"
                        >
                          İncele & GL Eşle
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
              <h2 className="font-semibold text-white">Fatura Kalem Tipi Otomatik Muhasebe Eşlemeleri</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fatura satırında bir kalem tipi seçildiğinde arka planda otomatik yazılacak borç/alacak GL hesabı.
              </p>
            </div>
            <button
              onClick={() => setShowInvoiceMapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Eşleme
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-300 font-semibold">
                  <th className="py-3 px-4">Fatura Kalem Tipi (Item Type)</th>
                  <th className="py-3 px-4">Kod</th>
                  <th className="py-3 px-4">Eşleşen Muhasebe Hesabı (GL Account)</th>
                  <th className="py-3 px-4">Şirket</th>
                  <th className="py-3 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filteredInvoiceMaps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tanımlı fatura kalemi muhasebe eşleşmesi bulunamadı.
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
                          title="Eşleşmeyi Kaldır"
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
                <h2 className="font-semibold text-white">Ödeme Yöntemi Hesap Eşlemeleri</h2>
                <p className="text-xs text-slate-400">Nakit, Havale, Kredi Kartı ödemelerinin yansıtılacağı GL hesabı.</p>
              </div>
              <button
                onClick={() => setShowPaymentMapModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ekle
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-300 font-semibold text-xs">
                    <th className="py-2.5 px-3">Ödeme Yöntemi</th>
                    <th className="py-2.5 px-3">GL Hesabı</th>
                    <th className="py-2.5 px-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-300">
                  {filteredPaymentMaps.map((pm) => (
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
                          title="Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Default GL Account Types */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-4 border-b border-slate-700/60 bg-slate-800/60 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-white">Varsayılan Sistem GL Hesap Eşlemeleri</h2>
                <p className="text-xs text-slate-400">Ticari Alacaklar, Borçlar, Satış, COGS ve Kar/Zarar varsayılanları.</p>
              </div>
              <button
                onClick={() => setShowDefaultMapModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ekle
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-300 font-semibold text-xs">
                    <th className="py-2.5 px-3">Hesap Tipi</th>
                    <th className="py-2.5 px-3">Varsayılan GL Hesabı</th>
                    <th className="py-2.5 px-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-300">
                  {filteredDefaultMaps.map((d) => (
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
                          title="Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
                      <span className="text-xs text-slate-400 block">Bölge Kodu (GeoId):</span>
                      <span className="font-mono text-white font-semibold">{selectedAuthority.taxAuthGeoId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Taraf ID (PartyId):</span>
                      <span className="font-mono text-white font-semibold">{selectedAuthority.taxAuthPartyId}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Fiyata Dahil Vergi (KDV):</span>
                      <span className="text-slate-200">{selectedAuthority.includeTaxInPrice === 'Y' ? 'Evet' : 'Hayır'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Muafiyet Vergi No Şartı:</span>
                      <span className="text-slate-200">{selectedAuthority.requireTaxIdForExemption === 'Y' ? 'Evet' : 'Hayır'}</span>
                    </div>
                  </div>

                  {/* Linked GL Accounts Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        Bağlı Vergi Muhasebe Hesapları
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
                        Hesap Eşle
                      </button>
                    </div>

                    {drawerLoading ? (
                      <div className="py-6 text-center text-slate-400">Yükleniyor...</div>
                    ) : authorityGlAccounts.length === 0 ? (
                      <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 text-center text-sm text-slate-400">
                        Bu vergi dairesine bağlı GL hesabı bulunmuyor.
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
                              <p className="text-xs text-slate-400">ID: {gla.glAccountId} | Şirket: {gla.organizationPartyId}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteAuthorityGlAccount(gla.glAccountId)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                              title="Bağlantıyı Kaldır"
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
                    Kapat
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
                Yeni Vergi / KDV Oranı Tanımla
              </h2>
              <button onClick={() => setShowCreateRateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaxRate} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Vergi Dairesi (Authority)</label>
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
                  <label className="block text-slate-300 font-medium mb-1">Vergi Yüzdesi (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateForm.taxPercentage}
                    onChange={(e) => setRateForm({ ...rateForm, taxPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Örn: 20"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vergi Türü</label>
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
                <label className="block text-slate-300 font-medium mb-1">Açıklama</label>
                <input
                  type="text"
                  value={rateForm.description || ''}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  placeholder="Örn: %20 Standart KDV"
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
                  Kargo / Nakliye ücretlerine de vergi uygula
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateRateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Kaydet
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
                Yeni Vergi Dairesi Ekle
              </h2>
              <button onClick={() => setShowCreateAuthModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaxAuthority} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Bölge / Ülke Kodu (GeoId)</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: TUR, USA, DEU veya TR-34"
                  value={authForm.taxAuthGeoId}
                  onChange={(e) => setAuthForm({ ...authForm, taxAuthGeoId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Vergi Dairesi Taraf ID (PartyId)</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: TUR_GIB, USA_IRS veya Şirket/Vergi No"
                  value={authForm.taxAuthPartyId}
                  onChange={(e) => setAuthForm({ ...authForm, taxAuthPartyId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fiyatlara Vergi Dahil mi?</label>
                  <select
                    value={authForm.includeTaxInPrice}
                    onChange={(e) => setAuthForm({ ...authForm, includeTaxInPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  >
                    <option value="Y">Evet (KDV Sistemi)</option>
                    <option value="N">Hayır (Hariç Fiyat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Muafiyet İçin Vergi No Şartı</label>
                  <select
                    value={authForm.requireTaxIdForExemption}
                    onChange={(e) => setAuthForm({ ...authForm, requireTaxIdForExemption: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  >
                    <option value="Y">Evet, Zorunlu</option>
                    <option value="N">Hayır</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAuthModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Oluştur
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
                Fatura Kalem Tipi GL Hesabı Eşle
              </h2>
              <button onClick={() => setShowInvoiceMapModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetInvoiceItemMap} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Fatura Kalem Tipi</label>
                <select
                  required
                  value={invoiceMapForm.invoiceItemTypeId}
                  onChange={(e) => setInvoiceMapForm({ ...invoiceMapForm, invoiceItemTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Seçiniz...</option>
                  {metadata?.invoiceItemTypes.map((iit: any) => (
                    <option key={iit.invoiceItemTypeId} value={iit.invoiceItemTypeId}>
                      {iit.description} ({iit.invoiceItemTypeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Eşlenecek GL Muhasebe Hesabı</label>
                <select
                  required
                  value={invoiceMapForm.glAccountId}
                  onChange={(e) => setInvoiceMapForm({ ...invoiceMapForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Hesap Seçiniz...</option>
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
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Eşleştir
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
                Ödeme Yöntemi GL Hesabı Eşle
              </h2>
              <button onClick={() => setShowPaymentMapModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetPaymentMethodMap} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Ödeme Yöntemi</label>
                <select
                  required
                  value={paymentMapForm.paymentMethodTypeId}
                  onChange={(e) => setPaymentMapForm({ ...paymentMapForm, paymentMethodTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Seçiniz...</option>
                  {metadata?.paymentMethodTypes.map((pmt: any) => (
                    <option key={pmt.paymentMethodTypeId} value={pmt.paymentMethodTypeId}>
                      {pmt.description} ({pmt.paymentMethodTypeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">GL Muhasebe Hesabı (Kasa / Banka)</label>
                <select
                  required
                  value={paymentMapForm.glAccountId}
                  onChange={(e) => setPaymentMapForm({ ...paymentMapForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Hesap Seçiniz...</option>
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
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Eşleştir
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
                Varsayılan GL Hesabı Eşle
              </h2>
              <button onClick={() => setShowDefaultMapModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetDefaultAccountMap} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Hesap Tipi</label>
                <select
                  required
                  value={defaultMapForm.glAccountTypeId}
                  onChange={(e) => setDefaultMapForm({ ...defaultMapForm, glAccountTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Seçiniz...</option>
                  {metadata?.glAccountTypes.map((gat: any) => (
                    <option key={gat.glAccountTypeId} value={gat.glAccountTypeId}>
                      {gat.description} ({gat.glAccountTypeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Varsayılan GL Muhasebe Hesabı</label>
                <select
                  required
                  value={defaultMapForm.glAccountId}
                  onChange={(e) => setDefaultMapForm({ ...defaultMapForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Hesap Seçiniz...</option>
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
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Kaydet
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
                Vergi Dairesi Muhasebe Hesabı Eşle
              </h2>
              <button onClick={() => setShowAuthGlModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetAuthorityGlAccount} className="space-y-4 text-sm">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <p className="text-xs text-slate-400">Seçili Vergi Dairesi:</p>
                <p className="font-semibold text-white">
                  {selectedAuthority?.geoName} - {selectedAuthority?.partyName}
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Vergi GL Muhasebe Hesabı (Örn: 391 KDV / 191 KDV)</label>
                <select
                  required
                  value={authGlForm.glAccountId}
                  onChange={(e) => setAuthGlForm({ ...authGlForm, glAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  <option value="">Hesap Seçiniz...</option>
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
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Eşleştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
