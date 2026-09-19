import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  api,
  VarianceReasonGlAccountItem,
  PartyGlAccountItem,
  CreditCardTypeGlAccountItem,
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

type TabType = 'variance' | 'party' | 'creditCard';

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
  const [metadata, setMetadata] = useState<ExtendedGlMetadataResponse['metadata'] | null>(null);

  // Modals for adding mappings
  const [showAddVarianceModal, setShowAddVarianceModal] = useState(false);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // Form states
  const [varianceForm, setVarianceForm] = useState({ varianceReasonId: '', glAccountId: '' });
  const [partyForm, setPartyForm] = useState({ partyId: '', roleTypeId: '_NA_', glAccountTypeId: '', glAccountId: '' });
  const [cardForm, setCardForm] = useState({ cardType: 'CCT_VISA', glAccountId: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, pRes, cRes, mRes] = await Promise.all([
        api.getVarianceReasonGlAccounts(),
        api.getPartyGlAccounts(),
        api.getCreditCardTypeGlAccounts(),
        api.getExtendedGlMetadata(),
      ]);
      setVarianceList(vRes.varianceReasonGlAccounts || []);
      setPartyList(pRes.partyGlAccounts || []);
      setCardList(cRes.creditCardTypeGlAccounts || []);
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

  const handleDeleteParty = async (partyId: string, glAccountTypeId: string, roleTypeId: string) => {
    if (!window.confirm(t.party.deleteConfirm)) return;
    try {
      setLoading(true);
      await api.deletePartyGlAccount(partyId, glAccountTypeId, roleTypeId);
      setSuccessMsg(isTr ? 'Eşleme silindi.' : 'Mapping deleted.');
      await fetchData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Error deleting party mapping');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Credit Card Type
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.cardType || !cardForm.glAccountId) return;
    try {
      setLoading(true);
      await api.createCreditCardTypeGlAccount(cardForm);
      setSuccessMsg(isTr ? 'Kredi kartı tipi eşlemesi kaydedildi.' : 'Card type mapping saved.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="ds-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
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
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('variance')}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
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
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
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
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
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
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && !varianceList.length && !partyList.length && !cardList.length ? (
            <div className="flex items-center justify-center py-20">
              <div className="ds-spinner" />
            </div>
          ) : (
            <>
              {/* TAB 1: VARIANCE REASONS */}
              {activeTab === 'variance' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      {isTr
                        ? 'Fiziksel stok sayım farklarında (hasar, fire, sayım fazlası vb.) otomatik işlenecek yevmiye hesabı.'
                        : 'Automatic GL accounts posted upon inventory adjustments (shrinkage, damaged, excess, etc.).'}
                    </p>
                    <button
                      onClick={() => setShowAddVarianceModal(true)}
                      className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.variance.newMapping}</span>
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden border border-slate-800">
                    <table className="ds-table w-full">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.variance.reason}</th>
                          <th className="ds-th">{t.variance.glAccount}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {varianceList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="ds-td text-center py-8 text-slate-500">
                              {t.variance.noMappings}
                            </td>
                          </tr>
                        ) : (
                          varianceList.map((item) => (
                            <tr key={`${item.varianceReasonId}-${item.organizationPartyId}`} className="ds-tbody-row hover:bg-slate-800/40">
                              <td className="ds-td text-xs text-white">
                                <span className="font-semibold">{item.varianceReasonDesc}</span>
                                <span className="block text-[10px] font-mono text-slate-400">{item.varianceReasonId}</span>
                              </td>
                              <td className="ds-td text-xs">
                                <span className="font-mono text-emerald-400 font-semibold">{item.accountCode}</span>
                                <span className="text-slate-300 ml-2">{item.accountName}</span>
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleDeleteVariance(item.varianceReasonId)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                                  title={tc.delete}
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

              {/* TAB 2: PARTY GL ACCOUNTS */}
              {activeTab === 'party' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      {isTr
                        ? 'Belirli müşterilere veya tedarikçilere özel tanımlanan defter-i kebir alt hesapları (Örn: Özel Alıcı/Satıcı Cari Hesabı).'
                        : 'Dedicated GL accounts designated for specific customers or vendors (e.g. specialized AP/AR sub-ledgers).'}
                    </p>
                    <button
                      onClick={() => setShowAddPartyModal(true)}
                      className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.party.newMapping}</span>
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden border border-slate-800">
                    <table className="ds-table w-full">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.party.party}</th>
                          <th className="ds-th">{t.party.role}</th>
                          <th className="ds-th">{t.party.accountType}</th>
                          <th className="ds-th">{t.party.glAccount}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partyList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="ds-td text-center py-8 text-slate-500">
                              {t.party.noMappings}
                            </td>
                          </tr>
                        ) : (
                          partyList.map((item, idx) => (
                            <tr key={`${item.partyId}-${item.glAccountTypeId}-${idx}`} className="ds-tbody-row hover:bg-slate-800/40">
                              <td className="ds-td text-xs text-white">
                                <span className="font-semibold">{item.partyName}</span>
                                <span className="block text-[10px] font-mono text-slate-400">#{item.partyId}</span>
                              </td>
                              <td className="ds-td text-xs">
                                <span className="ds-badge ds-badge-slate text-[10px]">{item.roleTypeDesc}</span>
                              </td>
                              <td className="ds-td text-xs text-indigo-300">
                                {item.glAccountTypeDesc}
                              </td>
                              <td className="ds-td text-xs">
                                <span className="font-mono text-emerald-400 font-semibold">{item.accountCode}</span>
                                <span className="text-slate-300 ml-2">{item.accountName}</span>
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleDeleteParty(item.partyId, item.glAccountTypeId, item.roleTypeId)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                                  title={tc.delete}
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

              {/* TAB 3: CREDIT CARD GL ACCOUNTS */}
              {activeTab === 'creditCard' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      {isTr
                        ? 'Kredi kartı markalarına göre (Visa, MasterCard, Amex) takas ve tahsilat muhasebe hesapları.'
                        : 'Settlement and clearing GL accounts mapped by credit card card brand.'}
                    </p>
                    <button
                      onClick={() => setShowAddCardModal(true)}
                      className="ds-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.creditCard.newMapping}</span>
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden border border-slate-800">
                    <table className="ds-table w-full">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.creditCard.cardType}</th>
                          <th className="ds-th">{t.creditCard.glAccount}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="ds-td text-center py-8 text-slate-500">
                              {t.creditCard.noMappings}
                            </td>
                          </tr>
                        ) : (
                          cardList.map((item) => (
                            <tr key={item.cardType} className="ds-tbody-row hover:bg-slate-800/40">
                              <td className="ds-td text-xs text-white font-semibold">
                                <span className="ds-badge ds-badge-blue text-xs font-mono">{item.cardType}</span>
                              </td>
                              <td className="ds-td text-xs">
                                <span className="font-mono text-emerald-400 font-semibold">{item.accountCode}</span>
                                <span className="text-slate-300 ml-2">{item.accountName}</span>
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleDeleteCard(item.cardType)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                                  title={tc.delete}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="ds-btn-secondary text-xs py-1.5 px-4"
          >
            {tc.close}
          </button>
        </div>
      </div>

      {/* MODAL 1: ADD VARIANCE REASON GL */}
      {showAddVarianceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="ds-card max-w-md w-full p-6 space-y-4 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-semibold text-white">{t.variance.newMapping}</h3>
            <form onSubmit={handleSaveVariance} className="space-y-4">
              <div>
                <label className="ds-label">{t.variance.reason}</label>
                <select
                  required
                  value={varianceForm.varianceReasonId}
                  onChange={(e) => setVarianceForm({ ...varianceForm, varianceReasonId: e.target.value })}
                  className="ds-select w-full"
                >
                  <option value="">-- {tc.select} --</option>
                  {metadata?.varianceReasons.map((vr) => (
                    <option key={vr.id} value={vr.id}>
                      {vr.description} ({vr.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">{t.variance.glAccount}</label>
                <select
                  required
                  value={varianceForm.glAccountId}
                  onChange={(e) => setVarianceForm({ ...varianceForm, glAccountId: e.target.value })}
                  className="ds-select w-full"
                >
                  <option value="">-- {tc.select} --</option>
                  {glAccounts.map((ga) => (
                    <option key={ga.glAccountId} value={ga.glAccountId}>
                      {ga.accountCode} - {ga.accountName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVarianceModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary text-xs"
                >
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PARTY GL */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="ds-card max-w-md w-full p-6 space-y-4 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-semibold text-white">{t.party.newMapping}</h3>
            <form onSubmit={handleSaveParty} className="space-y-4">
              <div>
                <label className="ds-label">{t.party.partyId}</label>
                <input
                  required
                  type="text"
                  placeholder="DemoCustomer, DemoSupplier vb."
                  value={partyForm.partyId}
                  onChange={(e) => setPartyForm({ ...partyForm, partyId: e.target.value })}
                  className="ds-input w-full"
                />
              </div>
              <div>
                <label className="ds-label">{t.party.role}</label>
                <select
                  value={partyForm.roleTypeId}
                  onChange={(e) => setPartyForm({ ...partyForm, roleTypeId: e.target.value })}
                  className="ds-select w-full"
                >
                  {metadata?.roleTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">{t.party.accountType}</label>
                <select
                  required
                  value={partyForm.glAccountTypeId}
                  onChange={(e) => setPartyForm({ ...partyForm, glAccountTypeId: e.target.value })}
                  className="ds-select w-full"
                >
                  <option value="">-- {tc.select} --</option>
                  {metadata?.glAccountTypes.map((gat) => (
                    <option key={gat.id} value={gat.id}>
                      {gat.description} ({gat.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">{t.party.glAccount}</label>
                <select
                  required
                  value={partyForm.glAccountId}
                  onChange={(e) => setPartyForm({ ...partyForm, glAccountId: e.target.value })}
                  className="ds-select w-full"
                >
                  <option value="">-- {tc.select} --</option>
                  {glAccounts.map((ga) => (
                    <option key={ga.glAccountId} value={ga.glAccountId}>
                      {ga.accountCode} - {ga.accountName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary text-xs"
                >
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CREDIT CARD GL */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="ds-card max-w-md w-full p-6 space-y-4 border border-slate-700 bg-slate-900 shadow-2xl">
            <h3 className="text-base font-semibold text-white">{t.creditCard.newMapping}</h3>
            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="ds-label">{t.creditCard.cardType}</label>
                <select
                  required
                  value={cardForm.cardType}
                  onChange={(e) => setCardForm({ ...cardForm, cardType: e.target.value })}
                  className="ds-select w-full"
                >
                  {metadata?.cardTypes.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">{t.creditCard.glAccount}</label>
                <select
                  required
                  value={cardForm.glAccountId}
                  onChange={(e) => setCardForm({ ...cardForm, glAccountId: e.target.value })}
                  className="ds-select w-full"
                >
                  <option value="">-- {tc.select} --</option>
                  {glAccounts.map((ga) => (
                    <option key={ga.glAccountId} value={ga.glAccountId}>
                      {ga.accountCode} - {ga.accountName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="ds-btn-secondary text-xs"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary text-xs"
                >
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
