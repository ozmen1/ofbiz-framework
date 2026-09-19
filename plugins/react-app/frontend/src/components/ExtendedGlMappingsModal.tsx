import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  Scale,
  Users,
  CreditCard,
  Building2,
  Landmark,
  FolderTree,
} from 'lucide-react';
import {
  api,
  VarianceReasonGlAccountItem,
  PartyGlAccountItem,
  CreditCardTypeGlAccountItem,
  FixedAssetTypeGlAccountItem,
  FinAccountTypeGlAccountItem,
  ProductCategoryGlAccountItem,
  ExtendedGlMetadataResponse,
  GlAccountMetaItem,
} from '../services/api';
import { useTranslation } from '../i18n';

interface ExtendedGlMappingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  glAccounts?: GlAccountMetaItem[];
}

type TabType = 'variance' | 'party' | 'creditCard' | 'fixedAsset' | 'finAccount' | 'categoryGl';

export const ExtendedGlMappingsModal: React.FC<ExtendedGlMappingsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  glAccounts = [],
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.extendedGl;
  const tc = translations.common;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<TabType>('variance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [varianceList, setVarianceList] = useState<VarianceReasonGlAccountItem[]>([]);
  const [partyList, setPartyList] = useState<PartyGlAccountItem[]>([]);
  const [cardList, setCardList] = useState<CreditCardTypeGlAccountItem[]>([]);
  const [fixedAssetList, setFixedAssetList] = useState<FixedAssetTypeGlAccountItem[]>([]);
  const [finAccountList, setFinAccountList] = useState<FinAccountTypeGlAccountItem[]>([]);
  const [categoryGlList, setCategoryGlList] = useState<ProductCategoryGlAccountItem[]>([]);
  const [metadata, setMetadata] = useState<ExtendedGlMetadataResponse['metadata'] | null>(null);

  // Modals for adding mappings
  const [showAddVarianceModal, setShowAddVarianceModal] = useState(false);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddFixedAssetModal, setShowAddFixedAssetModal] = useState(false);
  const [showAddFinAccountModal, setShowAddFinAccountModal] = useState(false);
  const [showAddCategoryGlModal, setShowAddCategoryGlModal] = useState(false);

  // Form states
  const [varianceForm, setVarianceForm] = useState({ varianceReasonId: '', glAccountId: '' });
  const [partyForm, setPartyForm] = useState({ partyId: '', roleTypeId: '_NA_', glAccountTypeId: '', glAccountId: '' });
  const [cardForm, setCardForm] = useState({ cardType: 'CCT_VISA', glAccountId: '' });
  const [fixedAssetForm, setFixedAssetForm] = useState({
    fixedAssetTypeId: '',
    assetGlAccountId: '',
    accDepGlAccountId: '',
    depGlAccountId: '',
    profitGlAccountId: '',
    lossGlAccountId: '',
  });
  const [finAccountForm, setFinAccountForm] = useState({ finAccountTypeId: '', glAccountId: '' });
  const [categoryGlForm, setCategoryGlForm] = useState({ productCategoryId: '', glAccountTypeId: '', glAccountId: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, pRes, cRes, faRes, fnaRes, pcRes, mRes] = await Promise.all([
        api.getVarianceReasonGlAccounts(),
        api.getPartyGlAccounts(),
        api.getCreditCardTypeGlAccounts(),
        api.getFixedAssetTypeGlAccounts(),
        api.getFinAccountTypeGlAccounts(),
        api.getProductCategoryGlAccounts(),
        api.getExtendedGlMetadata(),
      ]);
      setVarianceList(vRes.varianceReasonGlAccounts || []);
      setPartyList(pRes.partyGlAccounts || []);
      setCardList(cRes.creditCardTypeGlAccounts || []);
      setFixedAssetList(faRes.fixedAssetTypeGlAccounts || []);
      setFinAccountList(fnaRes.finAccountTypeGlAccounts || []);
      setCategoryGlList(pcRes.productCategoryGlAccounts || []);
      setMetadata(mRes.metadata || null);
    } catch (err: any) {
      console.error('Failed to load extended GL mappings:', err);
      setError(err?.message || (isTr ? 'Gelişmiş eşlemeler yüklenemedi.' : 'Failed to load mappings.'));
    } finally {
      setLoading(false);
    }
  }, [isTr]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  // Handlers for Variance Reason
  const handleSaveVariance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianceForm.varianceReasonId || !varianceForm.glAccountId) return;
    try {
      setLoading(true);
      await api.createVarianceReasonGlAccount(varianceForm);
      setSuccessMsg(isTr ? 'Sayım farkı eşlemesi kaydedildi.' : 'Variance mapping saved.');
      setShowAddVarianceModal(false);
      setVarianceForm({ varianceReasonId: '', glAccountId: '' });
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error saving variance mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariance = async (varianceReasonId: string) => {
    if (!window.confirm(t.variance.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deleteVarianceReasonGlAccount(varianceReasonId);
      setSuccessMsg(isTr ? 'Eşleme silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting variance mapping');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Party GL Account
  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyForm.partyId || !partyForm.glAccountTypeId || !partyForm.glAccountId) return;
    try {
      setLoading(true);
      await api.createPartyGlAccount(partyForm);
      setSuccessMsg(isTr ? 'Taraf özel muhasebe hesabı kaydedildi.' : 'Party GL mapping saved.');
      setShowAddPartyModal(false);
      setPartyForm({ partyId: '', roleTypeId: '_NA_', glAccountTypeId: '', glAccountId: '' });
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error saving party mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParty = async (item: PartyGlAccountItem) => {
    if (!window.confirm(t.party.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deletePartyGlAccount(item.partyId, item.glAccountTypeId, item.roleTypeId);
      setSuccessMsg(isTr ? 'Eşleme silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting party mapping');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Credit Card GL Account
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.cardType || !cardForm.glAccountId) return;
    try {
      setLoading(true);
      await api.createCreditCardTypeGlAccount(cardForm);
      setSuccessMsg(isTr ? 'Kredi kartı tipi eşlemesi kaydedildi.' : 'Credit card mapping saved.');
      setShowAddCardModal(false);
      setCardForm({ cardType: 'CCT_VISA', glAccountId: '' });
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error saving card mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardType: string) => {
    if (!window.confirm(t.creditCard.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deleteCreditCardTypeGlAccount(cardType);
      setSuccessMsg(isTr ? 'Eşleme silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting card mapping');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Fixed Asset Type GL
  const handleSaveFixedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedAssetForm.fixedAssetTypeId) return;
    try {
      setLoading(true);
      await api.createFixedAssetTypeGlAccount(fixedAssetForm);
      setSuccessMsg(isTr ? 'Sabit kıymet türü GL hesabı kaydedildi.' : 'Fixed asset GL mapping saved.');
      setShowAddFixedAssetModal(false);
      setFixedAssetForm({
        fixedAssetTypeId: '',
        assetGlAccountId: '',
        accDepGlAccountId: '',
        depGlAccountId: '',
        profitGlAccountId: '',
        lossGlAccountId: '',
      });
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error saving fixed asset mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFixedAsset = async (item: FixedAssetTypeGlAccountItem) => {
    if (!window.confirm(t.fixedAsset.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deleteFixedAssetTypeGlAccount({
        fixedAssetTypeId: item.fixedAssetTypeId,
        fixedAssetId: item.fixedAssetId,
      });
      setSuccessMsg(isTr ? 'Sabit kıymet GL eşlemesi silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting fixed asset mapping');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Fin Account Type GL
  const handleSaveFinAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finAccountForm.finAccountTypeId || !finAccountForm.glAccountId) return;
    try {
      setLoading(true);
      await api.createFinAccountTypeGlAccount(finAccountForm);
      setSuccessMsg(isTr ? 'Kasa/Banka türü GL eşlemesi kaydedildi.' : 'Fin account type mapping saved.');
      setShowAddFinAccountModal(false);
      setFinAccountForm({ finAccountTypeId: '', glAccountId: '' });
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error saving fin account mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFinAccount = async (finAccountTypeId: string) => {
    if (!window.confirm(t.finAccountType.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deleteFinAccountTypeGlAccount({ finAccountTypeId });
      setSuccessMsg(isTr ? 'Kasa/Banka türü GL eşlemesi silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting fin account mapping');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Product Category GL
  const handleSaveCategoryGl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryGlForm.productCategoryId || !categoryGlForm.glAccountTypeId || !categoryGlForm.glAccountId) return;
    try {
      setLoading(true);
      await api.createProductCategoryGlAccount(categoryGlForm);
      setSuccessMsg(isTr ? 'Ürün kategorisi GL eşlemesi kaydedildi.' : 'Product category GL mapping saved.');
      setShowAddCategoryGlModal(false);
      setCategoryGlForm({ productCategoryId: '', glAccountTypeId: '', glAccountId: '' });
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error saving category mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategoryGl = async (item: ProductCategoryGlAccountItem) => {
    if (!window.confirm(t.categoryGl.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deleteProductCategoryGlAccount({
        productCategoryId: item.productCategoryId,
        glAccountTypeId: item.glAccountTypeId,
      });
      setSuccessMsg(isTr ? 'Ürün kategorisi GL eşlemesi silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting category mapping');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm isolate">
      <div className="ds-card max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={tc.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('variance')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'variance'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{t.tabs.varianceReasons}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {varianceList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('party')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'party'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.tabs.partyGl}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {partyList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('creditCard')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'creditCard'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{t.tabs.creditCardGl}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {cardList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('fixedAsset')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'fixedAsset'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t.tabs.fixedAssetGl}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {fixedAssetList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('finAccount')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'finAccount'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>{t.tabs.finAccountGl}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {finAccountList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('categoryGl')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'categoryGl'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>{t.tabs.categoryGl}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {categoryGlList.length}
            </span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Variance Reason */}
          {activeTab === 'variance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{t.variance.reason}</p>
                <button
                  onClick={() => setShowAddVarianceModal(true)}
                  className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.variance.newMapping}
                </button>
              </div>

              {varianceList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {t.variance.noMappings}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="ds-table w-full text-xs">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.variance.reason}</th>
                        <th className="ds-th">ID</th>
                        <th className="ds-th">{t.variance.glAccount}</th>
                        <th className="ds-th text-right">{tc.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianceList.map((item) => (
                        <tr key={item.varianceReasonId} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-medium text-slate-200">
                            {item.varianceReasonDesc}
                          </td>
                          <td className="ds-td font-mono text-slate-400">{item.varianceReasonId}</td>
                          <td className="ds-td">
                            <span className="font-mono text-indigo-400">{item.accountCode || item.glAccountId}</span>
                            {item.accountName && <span className="ml-2 text-slate-400">({item.accountName})</span>}
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleDeleteVariance(item.varianceReasonId)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Party GL Account */}
          {activeTab === 'party' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{t.party.party}</p>
                <button
                  onClick={() => setShowAddPartyModal(true)}
                  className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.party.newMapping}
                </button>
              </div>

              {partyList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {t.party.noMappings}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="ds-table w-full text-xs">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.party.party}</th>
                        <th className="ds-th">{t.party.role}</th>
                        <th className="ds-th">{t.party.accountType}</th>
                        <th className="ds-th">{t.party.glAccount}</th>
                        <th className="ds-th text-right">{tc.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyList.map((item, idx) => (
                        <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-medium text-slate-200">
                            {item.partyName || item.partyId}
                            <span className="block text-[11px] text-slate-400 font-mono">{item.partyId}</span>
                          </td>
                          <td className="ds-td text-slate-300">{item.roleTypeDesc || item.roleTypeId}</td>
                          <td className="ds-td text-slate-300">{item.glAccountTypeDesc || item.glAccountTypeId}</td>
                          <td className="ds-td">
                            <span className="font-mono text-indigo-400">{item.accountCode || item.glAccountId}</span>
                            {item.accountName && <span className="ml-2 text-slate-400">({item.accountName})</span>}
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleDeleteParty(item)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Credit Card Types */}
          {activeTab === 'creditCard' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{t.creditCard.cardType}</p>
                <button
                  onClick={() => setShowAddCardModal(true)}
                  className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.creditCard.newMapping}
                </button>
              </div>

              {cardList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {t.creditCard.noMappings}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="ds-table w-full text-xs">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.creditCard.cardType}</th>
                        <th className="ds-th">{t.creditCard.glAccount}</th>
                        <th className="ds-th text-right">{tc.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardList.map((item) => (
                        <tr key={item.cardType} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-medium text-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px]">
                              {item.cardType}
                            </span>
                          </td>
                          <td className="ds-td">
                            <span className="font-mono text-indigo-400">{item.accountCode || item.glAccountId}</span>
                            {item.accountName && <span className="ml-2 text-slate-400">({item.accountName})</span>}
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleDeleteCard(item.cardType)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Fixed Asset Type GL */}
          {activeTab === 'fixedAsset' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{t.fixedAsset.assetType}</p>
                <button
                  onClick={() => setShowAddFixedAssetModal(true)}
                  className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.fixedAsset.newMapping}
                </button>
              </div>

              {fixedAssetList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {t.fixedAsset.noMappings}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="ds-table w-full text-xs">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.fixedAsset.assetType}</th>
                        <th className="ds-th">{t.fixedAsset.assetGl}</th>
                        <th className="ds-th">{t.fixedAsset.accDepGl}</th>
                        <th className="ds-th">{t.fixedAsset.depGl}</th>
                        <th className="ds-th">{t.fixedAsset.profitGl} / {t.fixedAsset.lossGl}</th>
                        <th className="ds-th text-right">{tc.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixedAssetList.map((item, idx) => (
                        <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-medium text-slate-200">
                            {item.fixedAssetTypeDesc}
                            <span className="block text-[11px] text-slate-400 font-mono">{item.fixedAssetTypeId}</span>
                          </td>
                          <td className="ds-td font-mono text-indigo-400">
                            {item.assetAccountCode || item.assetGlAccountId || '-'}
                          </td>
                          <td className="ds-td font-mono text-emerald-400">
                            {item.accDepAccountCode || item.accDepGlAccountId || '-'}
                          </td>
                          <td className="ds-td font-mono text-amber-400">
                            {item.depAccountCode || item.depGlAccountId || '-'}
                          </td>
                          <td className="ds-td font-mono text-slate-300">
                            <span className="text-teal-400">{item.profitAccountCode || item.profitGlAccountId || '-'}</span>
                            <span className="mx-1 text-slate-500">/</span>
                            <span className="text-rose-400">{item.lossAccountCode || item.lossGlAccountId || '-'}</span>
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleDeleteFixedAsset(item)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Fin Account Type GL */}
          {activeTab === 'finAccount' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{t.finAccountType.finAccountType}</p>
                <button
                  onClick={() => setShowAddFinAccountModal(true)}
                  className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.finAccountType.newMapping}
                </button>
              </div>

              {finAccountList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {t.finAccountType.noMappings}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="ds-table w-full text-xs">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.finAccountType.finAccountType}</th>
                        <th className="ds-th">{t.finAccountType.glAccount}</th>
                        <th className="ds-th text-right">{tc.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finAccountList.map((item) => (
                        <tr key={item.finAccountTypeId} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-medium text-slate-200">
                            {item.finAccountTypeDesc}
                            <span className="block text-[11px] text-slate-400 font-mono">{item.finAccountTypeId}</span>
                          </td>
                          <td className="ds-td">
                            <span className="font-mono text-indigo-400">{item.accountCode || item.glAccountId}</span>
                            {item.accountName && <span className="ml-2 text-slate-400">({item.accountName})</span>}
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleDeleteFinAccount(item.finAccountTypeId)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Product Category GL */}
          {activeTab === 'categoryGl' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{t.categoryGl.category}</p>
                <button
                  onClick={() => setShowAddCategoryGlModal(true)}
                  className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.categoryGl.newMapping}
                </button>
              </div>

              {categoryGlList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {t.categoryGl.noMappings}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="ds-table w-full text-xs">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.categoryGl.category}</th>
                        <th className="ds-th">{t.categoryGl.glAccountType}</th>
                        <th className="ds-th">{t.categoryGl.glAccount}</th>
                        <th className="ds-th text-right">{tc.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryGlList.map((item, idx) => (
                        <tr key={idx} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-medium text-slate-200">
                            {item.categoryName}
                            <span className="block text-[11px] text-slate-400 font-mono">{item.productCategoryId}</span>
                          </td>
                          <td className="ds-td text-slate-300">{item.glAccountTypeDesc || item.glAccountTypeId}</td>
                          <td className="ds-td">
                            <span className="font-mono text-indigo-400">{item.accountCode || item.glAccountId}</span>
                            {item.accountName && <span className="ml-2 text-slate-400">({item.accountName})</span>}
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleDeleteCategoryGl(item)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button onClick={onClose} className="ds-btn-secondary text-xs">
            {tc.close}
          </button>
        </div>
      </div>

      {/* MODAL 1: Add Variance Reason GL */}
      {showAddVarianceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="ds-card max-w-md w-full p-6 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">{t.variance.newMapping}</h3>
            <form onSubmit={handleSaveVariance} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{t.variance.reason} *</label>
                <select
                  value={varianceForm.varianceReasonId}
                  onChange={(e) => setVarianceForm({ ...varianceForm, varianceReasonId: e.target.value })}
                  className="ds-select w-full"
                  required
                >
                  <option value="">{tc.select}</option>
                  {metadata?.varianceReasons?.map((vr) => (
                    <option key={vr.id} value={vr.id}>
                      {vr.description} ({vr.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.variance.glAccount} *</label>
                <select
                  value={varianceForm.glAccountId}
                  onChange={(e) => setVarianceForm({ ...varianceForm, glAccountId: e.target.value })}
                  className="ds-select w-full font-mono text-xs"
                  required
                >
                  <option value="">{tc.select}</option>
                  {glAccounts.map((acc) => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVarianceModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary text-xs">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Party GL */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="ds-card max-w-md w-full p-6 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">{t.party.newMapping}</h3>
            <form onSubmit={handleSaveParty} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{t.party.partyId} *</label>
                <input
                  type="text"
                  placeholder="DemoCustomer, DemoSupplier, vb."
                  value={partyForm.partyId}
                  onChange={(e) => setPartyForm({ ...partyForm, partyId: e.target.value })}
                  className="ds-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.party.role}</label>
                <select
                  value={partyForm.roleTypeId}
                  onChange={(e) => setPartyForm({ ...partyForm, roleTypeId: e.target.value })}
                  className="ds-select w-full"
                >
                  {metadata?.roleTypes?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.description} ({r.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.party.accountType} *</label>
                <select
                  value={partyForm.glAccountTypeId}
                  onChange={(e) => setPartyForm({ ...partyForm, glAccountTypeId: e.target.value })}
                  className="ds-select w-full"
                  required
                >
                  <option value="">{tc.select}</option>
                  {metadata?.glAccountTypes?.map((gat) => (
                    <option key={gat.id} value={gat.id}>
                      {gat.description} ({gat.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.party.glAccount} *</label>
                <select
                  value={partyForm.glAccountId}
                  onChange={(e) => setPartyForm({ ...partyForm, glAccountId: e.target.value })}
                  className="ds-select w-full font-mono text-xs"
                  required
                >
                  <option value="">{tc.select}</option>
                  {glAccounts.map((acc) => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary text-xs">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Credit Card GL */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="ds-card max-w-md w-full p-6 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">{t.creditCard.newMapping}</h3>
            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{t.creditCard.cardType} *</label>
                <select
                  value={cardForm.cardType}
                  onChange={(e) => setCardForm({ ...cardForm, cardType: e.target.value })}
                  className="ds-select w-full font-mono"
                  required
                >
                  {metadata?.cardTypes?.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.creditCard.glAccount} *</label>
                <select
                  value={cardForm.glAccountId}
                  onChange={(e) => setCardForm({ ...cardForm, glAccountId: e.target.value })}
                  className="ds-select w-full font-mono text-xs"
                  required
                >
                  <option value="">{tc.select}</option>
                  {glAccounts.map((acc) => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary text-xs">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Fixed Asset GL */}
      {showAddFixedAssetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="ds-card max-w-lg w-full p-6 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">{t.fixedAsset.newMapping}</h3>
            <form onSubmit={handleSaveFixedAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{t.fixedAsset.assetType} *</label>
                <select
                  value={fixedAssetForm.fixedAssetTypeId}
                  onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, fixedAssetTypeId: e.target.value })}
                  className="ds-select w-full"
                  required
                >
                  <option value="">{tc.select}</option>
                  {metadata?.fixedAssetTypes?.map((fat) => (
                    <option key={fat.id} value={fat.id}>
                      {fat.description} ({fat.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t.fixedAsset.assetGl}</label>
                  <select
                    value={fixedAssetForm.assetGlAccountId}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, assetGlAccountId: e.target.value })}
                    className="ds-select w-full font-mono text-[11px]"
                  >
                    <option value="">{tc.select}</option>
                    {glAccounts.map((acc) => (
                      <option key={acc.glAccountId} value={acc.glAccountId}>
                        {acc.accountCode} - {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t.fixedAsset.accDepGl}</label>
                  <select
                    value={fixedAssetForm.accDepGlAccountId}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, accDepGlAccountId: e.target.value })}
                    className="ds-select w-full font-mono text-[11px]"
                  >
                    <option value="">{tc.select}</option>
                    {glAccounts.map((acc) => (
                      <option key={acc.glAccountId} value={acc.glAccountId}>
                        {acc.accountCode} - {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t.fixedAsset.depGl}</label>
                  <select
                    value={fixedAssetForm.depGlAccountId}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, depGlAccountId: e.target.value })}
                    className="ds-select w-full font-mono text-[11px]"
                  >
                    <option value="">{tc.select}</option>
                    {glAccounts.map((acc) => (
                      <option key={acc.glAccountId} value={acc.glAccountId}>
                        {acc.accountCode} - {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t.fixedAsset.profitGl}</label>
                  <select
                    value={fixedAssetForm.profitGlAccountId}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, profitGlAccountId: e.target.value })}
                    className="ds-select w-full font-mono text-[11px]"
                  >
                    <option value="">{tc.select}</option>
                    {glAccounts.map((acc) => (
                      <option key={acc.glAccountId} value={acc.glAccountId}>
                        {acc.accountCode} - {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.fixedAsset.lossGl}</label>
                <select
                  value={fixedAssetForm.lossGlAccountId}
                  onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, lossGlAccountId: e.target.value })}
                  className="ds-select w-full font-mono text-[11px]"
                >
                  <option value="">{tc.select}</option>
                  {glAccounts.map((acc) => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFixedAssetModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary text-xs">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Add Fin Account Type GL */}
      {showAddFinAccountModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="ds-card max-w-md w-full p-6 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">{t.finAccountType.newMapping}</h3>
            <form onSubmit={handleSaveFinAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{t.finAccountType.finAccountType} *</label>
                <select
                  value={finAccountForm.finAccountTypeId}
                  onChange={(e) => setFinAccountForm({ ...finAccountForm, finAccountTypeId: e.target.value })}
                  className="ds-select w-full"
                  required
                >
                  <option value="">{tc.select}</option>
                  {metadata?.finAccountTypes?.map((fat) => (
                    <option key={fat.id} value={fat.id}>
                      {fat.description} ({fat.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.finAccountType.glAccount} *</label>
                <select
                  value={finAccountForm.glAccountId}
                  onChange={(e) => setFinAccountForm({ ...finAccountForm, glAccountId: e.target.value })}
                  className="ds-select w-full font-mono text-xs"
                  required
                >
                  <option value="">{tc.select}</option>
                  {glAccounts.map((acc) => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFinAccountModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary text-xs">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Add Product Category GL */}
      {showAddCategoryGlModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="ds-card max-w-md w-full p-6 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">{t.categoryGl.newMapping}</h3>
            <form onSubmit={handleSaveCategoryGl} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{t.categoryGl.category} *</label>
                <select
                  value={categoryGlForm.productCategoryId}
                  onChange={(e) => setCategoryGlForm({ ...categoryGlForm, productCategoryId: e.target.value })}
                  className="ds-select w-full"
                  required
                >
                  <option value="">{tc.select}</option>
                  {metadata?.productCategories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.description} ({cat.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.categoryGl.glAccountType} *</label>
                <select
                  value={categoryGlForm.glAccountTypeId}
                  onChange={(e) => setCategoryGlForm({ ...categoryGlForm, glAccountTypeId: e.target.value })}
                  className="ds-select w-full"
                  required
                >
                  <option value="">{tc.select}</option>
                  {metadata?.glAccountTypes?.map((gat) => (
                    <option key={gat.id} value={gat.id}>
                      {gat.description} ({gat.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t.categoryGl.glAccount} *</label>
                <select
                  value={categoryGlForm.glAccountId}
                  onChange={(e) => setCategoryGlForm({ ...categoryGlForm, glAccountId: e.target.value })}
                  className="ds-select w-full font-mono text-xs"
                  required
                >
                  <option value="">{tc.select}</option>
                  {glAccounts.map((acc) => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryGlModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary text-xs">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
