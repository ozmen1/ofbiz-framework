import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import {
  InventoryItemHistoryResponse,
  fetchInventoryItemHistory,
} from '../services/wmsService';

interface InventoryItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItemId: string | null;
}

export const InventoryItemHistoryModal: React.FC<InventoryItemHistoryModalProps> = ({
  isOpen,
  onClose,
  inventoryItemId,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [data, setData] = useState<InventoryItemHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && inventoryItemId) {
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      setError(null);
      fetchInventoryItemHistory(inventoryItemId)
        .then(res => setData(res))
        .catch(err => setError(err?.message || 'Stok hareket geçmişi alınamadı'))
        .finally(() => setIsLoading(false));
    } else {
      document.body.style.overflow = '';
      setData(null);
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, inventoryItemId]);

  if (!isOpen || !inventoryItemId) return null;

  const item = data?.item;

  const getDocBadge = (row: InventoryItemHistoryResponse['history'][0]) => {
    if (row.receiptId) {
      return (
        <span className="ds-badge-success text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
          <FileText size={11} />
          Mal Kabul #{row.receiptId}
        </span>
      );
    }
    if (row.shipmentId) {
      return (
        <span className="ds-badge-info text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
          <FileText size={11} />
          Sevkiyat #{row.shipmentId}
        </span>
      );
    }
    if (row.orderId) {
      return (
        <span className="ds-badge-neutral text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
          <FileText size={11} />
          Sipariş #{row.orderId}
        </span>
      );
    }
    if (row.workEffortId) {
      return (
        <span className="ds-badge-warning text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
          <FileText size={11} />
          Üretim #{row.workEffortId}
        </span>
      );
    }
    if (row.physicalInventoryId) {
      return (
        <span className="ds-badge-danger text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
          <FileText size={11} />
          Sayım / Varyans #{row.physicalInventoryId}
        </span>
      );
    }
    return <span className="text-slate-400 text-xs">-</span>;
  };

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {t.inventoryItemHistory || 'Stok Kalemi Hareket Geçmişi'}
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                  #{inventoryItemId}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.inventoryHistoryDesc || 'Giriş, çıkış, rezervasyon ve sayım düzeltmelerine ait denetim izi'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Item Summary Bar */}
        {item && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Ürün:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {item.productName || item.productId}
              </span>
              <span className="font-mono text-[10px] text-slate-400 block">{item.productId}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Depo & Lokasyon:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin size={12} className="text-cyan-500" />
                {item.facilityId} {item.locationSeqId ? `(${item.locationSeqId})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Parti / Seri / SKT:</span>
              <div className="space-y-0.5">
                {item.lotId && <span className="font-mono text-[11px] text-indigo-500 block">Lot: {item.lotId}</span>}
                {item.serialNumber && <span className="font-mono text-[11px] text-purple-500 block">SN: {item.serialNumber}</span>}
                {item.expireDate && <span className="text-[10px] text-slate-400 block">SKT: {item.expireDate}</span>}
                {!item.lotId && !item.serialNumber && !item.expireDate && <span className="text-slate-400">-</span>}
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Mevcut Bakiye:</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  QOH: {item.quantityOnHandTotal}
                </span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  ATP: {item.availableToPromiseTotal}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {common?.loading || 'Hareketler yükleniyor...'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
              <table className="ds-table w-full text-left">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th w-14">Seq</th>
                    <th className="ds-th">İşlem Tarihi</th>
                    <th className="ds-th">İlgili Belge</th>
                    <th className="ds-th text-center">Fiziki Değişim (QOH)</th>
                    <th className="ds-th text-center">Kullanılabilir (ATP)</th>
                    <th className="ds-th">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {(!data?.history || data.history.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="ds-td text-center text-slate-400 py-8">
                        {t.noHistoryRows || 'Kayıtlı stok hareketi bulunamadı'}
                      </td>
                    </tr>
                  ) : (
                    data.history.map((row, idx) => {
                      const isQohPos = row.quantityOnHandDiff > 0;
                      const isQohNeg = row.quantityOnHandDiff < 0;
                      return (
                        <tr key={row.inventoryItemDetailSeqId || idx} className="ds-tbody-row">
                          <td className="ds-td font-mono text-xs text-slate-500">
                            #{row.inventoryItemDetailSeqId}
                          </td>
                          <td className="ds-td text-xs text-slate-800 dark:text-slate-200">
                            {row.effectiveDate ? new Date(row.effectiveDate).toLocaleString() : '-'}
                          </td>
                          <td className="ds-td">
                            {getDocBadge(row)}
                          </td>
                          <td className="ds-td text-center font-bold text-xs">
                            {isQohPos && (
                              <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                                <TrendingUp size={13} />
                                +{row.quantityOnHandDiff}
                              </span>
                            )}
                            {isQohNeg && (
                              <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                                <TrendingDown size={13} />
                                {row.quantityOnHandDiff}
                              </span>
                            )}
                            {!isQohPos && !isQohNeg && (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="ds-td text-center font-semibold text-xs">
                            {row.availableToPromiseDiff > 0 ? `+${row.availableToPromiseDiff}` : row.availableToPromiseDiff}
                          </td>
                          <td className="ds-td text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {row.description || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="ds-btn-secondary px-4 py-2 text-xs"
          >
            {common?.close || 'Kapat'}
          </button>
        </div>
      </div>
    </div>
  );
};
