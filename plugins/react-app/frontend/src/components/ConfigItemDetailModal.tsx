import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { X, Cpu, Plus, Trash2 } from 'lucide-react';
import {
  ProductConfigItemDetailResponse,
  fetchProductConfigItemDetail,
  createProductConfigOption,
  deleteProductConfigOption,
} from '../services/inventoryMediaConfigService';

interface ConfigItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  configItemId: string;
  onConfigChanged?: () => void;
}

export const ConfigItemDetailModal: React.FC<ConfigItemDetailModalProps> = ({
  isOpen,
  onClose,
  configItemId,
  onConfigChanged,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductConfigItemDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for new option
  const [newOptionId, setNewOptionId] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSequenceNum, setNewSequenceNum] = useState<number | ''>('');
  const [isAddingOption, setIsAddingOption] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProductConfigItemDetail(configItemId);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [configItemId, common.error]);

  useEffect(() => {
    if (isOpen && configItemId) {
      document.body.style.overflow = 'hidden';
      loadDetail();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, configItemId, loadDetail]);

  if (!isOpen) return null;

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionName.trim()) return;

    try {
      setIsAddingOption(true);
      setError(null);
      await createProductConfigOption({
        configItemId,
        configOptionId: newOptionId.trim() || undefined,
        configOptionName: newOptionName.trim(),
        description: newDescription.trim() || undefined,
        sequenceNum: newSequenceNum === '' ? undefined : Number(newSequenceNum),
      });
      setNewOptionId('');
      setNewOptionName('');
      setNewDescription('');
      setNewSequenceNum('');
      await loadDetail();
      onConfigChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleDeleteOption = async (configOptionId: string) => {
    if (!window.confirm(t.confirmDeleteConfigOption)) return;
    try {
      setError(null);
      await deleteProductConfigOption({ configItemId, configOptionId });
      await loadDetail();
      onConfigChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 60fps rule: solid overlay */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">
                  {detail?.configItem?.configItemName || configItemId}
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {detail?.configItem?.configItemTypeId || 'MULTIPLE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.configItemId}: <span className="font-mono text-indigo-300">{configItemId}</span>
                {detail?.configItem?.description && ` • ${detail.configItem.description}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  {t.options} ({detail?.options?.length || 0})
                </h3>
              </div>

              {/* Add Option Inline Form */}
              <form
                onSubmit={handleAddOption}
                className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="ds-label">
                    {t.optionName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 16 GB DDR5 RAM"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    className="ds-input py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {common.description}
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 5600 MHz Dual Channel"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="ds-input py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    Sıra No (Sequence)
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newSequenceNum}
                    onChange={(e) => setNewSequenceNum(e.target.value === '' ? '' : Number(e.target.value))}
                    className="ds-input py-1.5 text-xs"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isAddingOption}
                    className="ds-btn-primary w-full py-1.5 text-xs flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addOption}</span>
                  </button>
                </div>
              </form>

              {/* Options Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="ds-table">
                  <thead className="sticky top-0 z-10">
                    <tr className="ds-thead-row bg-slate-900">
                      <th className="ds-th">Seçenek Kodu</th>
                      <th className="ds-th">{t.optionName}</th>
                      <th className="ds-th">{common.description}</th>
                      <th className="ds-th">Sıra</th>
                      <th className="ds-th-right">{common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail?.options && detail.options.length > 0 ? (
                      detail.options.map((opt) => (
                        <tr key={opt.configOptionId} className="ds-tbody-row">
                          <td className="ds-td-mono text-indigo-300">
                            {opt.configOptionId}
                          </td>
                          <td className="ds-td font-semibold text-white">
                            {opt.configOptionName}
                          </td>
                          <td className="ds-td text-slate-300">
                            {opt.description || '-'}
                          </td>
                          <td className="ds-td-mono text-slate-400">
                            {opt.sequenceNum ?? '-'}
                          </td>
                          <td className="ds-td-right">
                            <button
                              onClick={() => handleDeleteOption(opt.configOptionId)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">
                          Bu bileşen için henüz bir seçenek tanımlanmamış.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-900">
          <button
            onClick={onClose}
            className="ds-btn-secondary"
          >
            {common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
