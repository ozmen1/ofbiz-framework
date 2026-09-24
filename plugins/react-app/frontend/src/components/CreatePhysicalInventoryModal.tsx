import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  ClipboardCheck,
  AlertCircle,
  Save,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  createStockAdjustment,
  VarianceReasonItem,
} from '../services/facilityInventoryService';

interface PreselectedItem {
  inventoryItemId: string;
  productId: string;
  productName?: string;
  facilityId: string;
  facilityName?: string;
  currentQoh: number;
}

interface CreatePhysicalInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItem?: PreselectedItem | null;
  inventoryItems?: Array<{
    inventoryItemId: string;
    productId?: string;
    productName?: string;
    facilityId?: string;
    quantityOnHandTotal: number;
  }>;
  varianceReasons: VarianceReasonItem[];
}

export const CreatePhysicalInventoryModal: React.FC<CreatePhysicalInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedItem,
  inventoryItems = [],
  varianceReasons,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [varianceReasonId, setVarianceReasonId] = useState<string>('VAR_LOST');
  const [countedQty, setCountedQty] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (preselectedItem) {
        setSelectedItemId(preselectedItem.inventoryItemId);
        setCountedQty(String(preselectedItem.currentQoh));
      } else if (inventoryItems.length > 0 && !selectedItemId) {
        setSelectedItemId(inventoryItems[0].inventoryItemId);
        setCountedQty(String(inventoryItems[0].quantityOnHandTotal));
      }
    } else {
      document.body.style.overflow = '';
      setError(null);
      setComments('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, preselectedItem, inventoryItems]);

  // Selected item details
  const activeItem = useMemo(() => {
    if (preselectedItem && preselectedItem.inventoryItemId === selectedItemId) {
      return preselectedItem;
    }
    const found = inventoryItems.find((i) => i.inventoryItemId === selectedItemId);
    if (found) {
      return {
        inventoryItemId: found.inventoryItemId,
        productId: found.productId,
        productName: found.productName,
        facilityId: found.facilityId,
        currentQoh: found.quantityOnHandTotal,
      };
    }
    return null;
  }, [selectedItemId, preselectedItem, inventoryItems]);

  // Update counted quantity when user changes selected item
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = inventoryItems.find((i) => i.inventoryItemId === itemId);
    if (item) {
      setCountedQty(String(item.quantityOnHandTotal));
    }
  };

  // Difference calculation
  const calculatedDiff = useMemo(() => {
    if (!activeItem) return 0;
    const counted = parseFloat(countedQty);
    if (isNaN(counted)) return 0;
    return counted - activeItem.currentQoh;
  }, [activeItem, countedQty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError('Lütfen stok kartı seçin.');
      return;
    }

    const countedNum = parseFloat(countedQty);
    if (isNaN(countedNum) || countedNum < 0) {
      setError(t.invalidCountedQty || 'Geçerli bir sayım miktarı giriniz (0 veya daha büyük).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createStockAdjustment({
        inventoryItemId: selectedItemId,
        varianceReasonId,
        countedQuantity: countedNum,
        comments: comments || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Sayım düzeltmesi işlenirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-3 sm:p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t.physicalInventoryTitle || 'Stok Sayımı & Varyans Düzeltmesi'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.physicalInventoryDesc || 'Fiziki sayım farkını ve muhasebe düzeltmesini kaydedin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Select Inventory Item (if not preselected) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.inventoryItemId || 'Stok Kartı'} <span className="text-rose-500">*</span>
            </label>
            {preselectedItem ? (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {preselectedItem.productName || preselectedItem.productId}
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-2">
                  <span>ID: #{preselectedItem.inventoryItemId}</span>
                  <span>•</span>
                  <span>Tesis: {preselectedItem.facilityName || preselectedItem.facilityId}</span>
                </div>
              </div>
            ) : (
              <select
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="ds-select text-xs w-full"
                required
              >
                {inventoryItems.map((item) => (
                  <option key={item.inventoryItemId} value={item.inventoryItemId}>
                    #{item.inventoryItemId} - {item.productName || item.productId} ({item.facilityId}) - Mevcut: {item.quantityOnHandTotal}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Current Stock vs Counted Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="ds-card p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {t.systemQoh || 'Sistem Stoğu (QOH)'}
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {activeItem ? activeItem.currentQoh : '-'}
              </div>
            </div>

            <div className="ds-card p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {t.countVariance || 'Sayım Farkı'}
              </span>
              <div
                className={`text-lg font-bold font-mono flex items-center gap-1.5 ${
                  calculatedDiff === 0
                    ? 'text-slate-500'
                    : calculatedDiff > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {calculatedDiff > 0 ? (
                  <TrendingUp size={18} />
                ) : calculatedDiff < 0 ? (
                  <TrendingDown size={18} />
                ) : null}
                <span>
                  {calculatedDiff > 0 ? `+${calculatedDiff}` : calculatedDiff}
                </span>
              </div>
            </div>
          </div>

          {/* Actual Counted Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.countedQuantity || 'Fiili Sayılan Miktar'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
              className="ds-input text-xs font-mono"
              placeholder="Örn: 20"
              required
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {t.countedQtyHelp || 'Depo sayımında fiilen tespit edilen toplam fiziksel adedi giriniz.'}
            </p>
          </div>

          {/* Variance Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.varianceReason || 'Varyans / Fark Nedeni'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={varianceReasonId}
              onChange={(e) => setVarianceReasonId(e.target.value)}
              className="ds-select text-xs w-full"
              required
            >
              {varianceReasons.map((r) => (
                <option key={r.varianceReasonId} value={r.varianceReasonId}>
                  {r.description} ({r.varianceReasonId})
                </option>
              ))}
            </select>
          </div>

          {/* Audit Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.comments || 'Denetim / Sayım Notu'}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              className="ds-input text-xs"
              placeholder={t.commentsPlaceholder || 'Örn: Yıl sonu fiziksel sayım farkı veya raf hasarı tespiti'}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ds-btn-secondary px-4 py-2 text-xs"
            >
              {common?.cancel || 'İptal'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{common?.saving || 'İşleniyor...'}</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{t.saveAdjustment || 'Sayımı Kaydet & Düzelt'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
