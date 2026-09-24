import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Clock,
  Printer,
  Ban,
  UserCheck,
  Check,
  MapPin,
  Layers,
} from 'lucide-react';
import {
  PicklistDetailResponse,
  fetchPicklistDetails,
  updatePicklistStatus,
  completePicklistItem,
} from '../services/wmsService';

interface PicklistDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  picklistId: string | null;
  onStatusChanged: () => void;
}

export const PicklistDetailModal: React.FC<PicklistDetailModalProps> = ({
  isOpen,
  onClose,
  picklistId,
  onStatusChanged,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [activeTab, setActiveTab] = useState<'items' | 'bins' | 'history' | 'print'>('items');
  const [data, setData] = useState<PicklistDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadDetails = async () => {
    if (!picklistId) return;
    try {
      setIsLoading(true);
      setError(null);
      const detail = await fetchPicklistDetails(picklistId);
      setData(detail);
    } catch (err: any) {
      setError(err?.message || 'Toplama listesi detayları alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  // Body scroll lock
  useEffect(() => {
    if (isOpen && picklistId) {
      document.body.style.overflow = 'hidden';
      loadDetails();
    } else {
      document.body.style.overflow = '';
      setData(null);
      setError(null);
      setActiveTab('items');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, picklistId]);

  const handleStatusChange = async (newStatusId: string) => {
    if (!picklistId) return;
    try {
      setIsUpdating(true);
      await updatePicklistStatus(picklistId, newStatusId);
      showToast(t.statusUpdated || 'Durum başarıyla güncellendi');
      await loadDetails();
      onStatusChanged();
    } catch (err: any) {
      setError(err?.message || 'Durum güncellenirken hata oluştu');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteItem = async (item: PicklistDetailResponse['items'][0]) => {
    try {
      setIsUpdating(true);
      await completePicklistItem({
        picklistBinId: item.picklistBinId,
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        shipGroupSeqId: item.shipGroupSeqId,
        inventoryItemId: item.inventoryItemId,
      });
      showToast(t.itemPickedSuccess || 'Kalem toplandı olarak işaretlendi');
      await loadDetails();
      onStatusChanged();
    } catch (err: any) {
      setError(err?.message || 'Kalem güncellenirken hata oluştu');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !picklistId) return null;

  const picklist = data?.picklist;
  const isCancelled = picklist?.statusId === 'PICKLIST_CANCELLED';
  const isPicked = picklist?.statusId === 'PICKLIST_PICKED';

  const getStatusBadgeClass = (statusId?: string) => {
    switch (statusId) {
      case 'PICKLIST_INPUT':
        return 'ds-badge-neutral';
      case 'PICKLIST_ASSIGNED':
        return 'ds-badge-info';
      case 'PICKLIST_PRINTED':
        return 'ds-badge-warning';
      case 'PICKLIST_PICKED':
        return 'ds-badge-success';
      case 'PICKLIST_CANCELLED':
        return 'ds-badge-danger';
      default:
        return 'ds-badge-neutral';
    }
  };

  const totalItems = data?.items?.length || 0;
  const pickedItems = data?.items?.filter(it => it.itemStatusId === 'PICKITEM_COMPLETED').length || 0;
  const pendingItems = Math.max(0, totalItems - pickedItems);
  const binsCount = data?.bins?.length || 0;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-3 sm:p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              <Boxes size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t.picklistDetail || 'Toplama Listesi'} #{picklistId}
                </h2>
                {picklist && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadgeClass(picklist.statusId)}`}>
                    {picklist.statusDescription || picklist.statusId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {picklist?.facilityName} ({picklist?.facilityId}) • {picklist?.picklistDate ? new Date(picklist.picklistDate).toLocaleString() : ''}
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

        {/* Content Body - Single Unified Vertical Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {toast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{toast}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Toolbar (Scrollable Tab / Pill format) */}
          {picklist && (
            <div className="ds-card p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.actions || 'Aksiyonlar'}:
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(picklist.statusId)}`}>
                  {picklist.statusDescription || picklist.statusId}
                </span>
              </div>

              {/* Kaydırılabilir Tab / Buton Formatında Aksiyon Çubuğu */}
              <div className="overflow-x-auto pb-1 md:pb-0 scrollbar-none -mx-1 px-1">
                <div className="flex items-center gap-2 min-w-max">
                  {!isCancelled && !isPicked && (
                    <>
                      {picklist.statusId === 'PICKLIST_INPUT' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusChange('PICKLIST_ASSIGNED')}
                          className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <UserCheck size={14} />
                          <span>{t.markAssigned || 'Atandı Yap'}</span>
                        </button>
                      )}

                      {(picklist.statusId === 'PICKLIST_INPUT' || picklist.statusId === 'PICKLIST_ASSIGNED') && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusChange('PICKLIST_PRINTED')}
                          className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Printer size={14} />
                          <span>{t.markPrinted || 'Yazdırıldı'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange('PICKLIST_PICKED')}
                        className="ds-btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 size={14} />
                        <span>{t.markAllPicked || 'Tümünü Toplandı Yap'}</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('print')}
                    className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Printer size={14} className="text-indigo-500 dark:text-indigo-400" />
                    <span>{t.printSheet || 'Toplama Fişi'}</span>
                  </button>

                  {!isCancelled && !isPicked && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('PICKLIST_CANCELLED')}
                      className="ds-btn-danger text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Ban size={14} />
                      <span>{common?.cancel || 'İptal Et'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* KPI / Summary Cards */}
          {picklist && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="ds-card p-3.5 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes size={14} className="text-indigo-500" />
                  <span>{t.totalItems}</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {totalItems}
                </div>
              </div>

              <div className="ds-card p-3.5 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>{t.pickedItems}</span>
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {pickedItems}
                </div>
              </div>

              <div className="ds-card p-3.5 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-500" />
                  <span>{t.pendingItems}</span>
                </div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {pendingItems}
                </div>
              </div>

              <div className="ds-card p-3.5 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-500" />
                  <span>{t.binsCount}</span>
                </div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                  {binsCount}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs (Scrollable with ds-tab-bar) */}
          <div className="ds-tab-bar mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`ds-tab ${activeTab === 'items' ? 'ds-tab-active' : ''}`}
            >
              <Boxes size={15} />
              <span>{t.pickItems || 'Toplama Kalemleri'}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 font-mono">
                {totalItems}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bins')}
              className={`ds-tab ${activeTab === 'bins' ? 'ds-tab-active' : ''}`}
            >
              <Layers size={15} />
              <span>{t.binsAndOrders || 'Sepetler / Siparişler'}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 font-mono">
                {binsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`ds-tab ${activeTab === 'history' ? 'ds-tab-active' : ''}`}
            >
              <Clock size={15} />
              <span>{t.statusHistory || 'Durum Geçmişi'}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 font-mono">
                {data?.statusHistory?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`ds-tab ${activeTab === 'print' ? 'ds-tab-active' : ''}`}
            >
              <Printer size={15} />
              <span>{t.printSheet || 'Toplama Fişi'}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {common?.loading || 'Yükleniyor...'}
            </div>
          ) : (
            <>
              {/* TAB 1: ITEMS */}
              {activeTab === 'items' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <table className="ds-table w-full text-left">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th w-14 text-center">Sepet</th>
                          <th className="ds-th">Ürün & Sipariş</th>
                          <th className="ds-th">Depo Lokasyonu</th>
                          <th className="ds-th">Lot / Seri No</th>
                          <th className="ds-th text-center">Adet</th>
                          <th className="ds-th">Durum</th>
                          <th className="ds-th text-right">Eylem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!data?.items || data.items.length === 0) ? (
                          <tr>
                            <td colSpan={7} className="ds-td text-center text-slate-400 py-8">
                              {t.noItemsInPicklist || 'Toplama listesinde henüz kalem bulunmuyor'}
                            </td>
                          </tr>
                        ) : (
                          data.items.map((item, idx) => {
                            const isItemDone = item.itemStatusId === 'PICKITEM_COMPLETED';
                            return (
                              <tr
                                key={`${item.picklistBinId}-${item.orderId}-${item.orderItemSeqId}-${idx}`}
                                className={`ds-tbody-row ${isItemDone ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                              >
                                <td className="ds-td text-center font-bold text-slate-800 dark:text-slate-200">
                                  #{item.picklistBinId}
                                </td>
                                <td className="ds-td">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                    {item.productName || item.productId}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono">{item.productId}</span>
                                    <span>•</span>
                                    <span>Sipariş: #{item.orderId}</span>
                                  </div>
                                </td>
                                <td className="ds-td text-xs">
                                  {item.locationSeqId ? (
                                    <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                                      <MapPin size={13} className="text-indigo-500" />
                                      <span>{item.locationSeqId}</span>
                                      {(item.aisleId || item.sectionId) && (
                                        <span className="text-[10px] text-slate-400">
                                          ({item.aisleId}-{item.sectionId}-{item.levelId})
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Lokasyon Atanmamış</span>
                                  )}
                                </td>
                                <td className="ds-td text-xs">
                                  {item.lotId ? (
                                    <div className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">
                                      Lot: {item.lotId}
                                    </div>
                                  ) : null}
                                  {item.serialNumber ? (
                                    <div className="font-mono text-purple-600 dark:text-purple-400 text-[11px]">
                                      SN: {item.serialNumber}
                                    </div>
                                  ) : null}
                                  {!item.lotId && !item.serialNumber && (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="ds-td text-center font-bold text-slate-900 dark:text-slate-100 text-sm">
                                  {item.quantity}
                                </td>
                                <td className="ds-td text-xs">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                                      isItemDone
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {item.itemStatusDescription || item.itemStatusId}
                                  </span>
                                </td>
                                <td className="ds-td text-right">
                                  {!isItemDone && !isCancelled && (
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleCompleteItem(item)}
                                      className="ds-btn-primary px-2.5 py-1 text-[11px] inline-flex items-center gap-1"
                                    >
                                      <Check size={12} />
                                      <span>Topla</span>
                                    </button>
                                  )}
                                  {isItemDone && (
                                    <span className="text-emerald-500 inline-flex items-center gap-1 text-xs font-semibold">
                                      <CheckCircle2 size={14} />
                                      Toplandı
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: BINS */}
              {activeTab === 'bins' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(!data?.bins || data.bins.length === 0) ? (
                    <div className="col-span-2 text-center text-slate-400 py-8">
                      {t.noBinsDefined || 'Henüz sepet tanımı yok'}
                    </div>
                  ) : (
                    data.bins.map(b => (
                      <div
                        key={b.picklistBinId}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Sepet #{b.binLocationNumber} (ID: {b.picklistBinId})
                          </span>
                          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                            Sipariş: #{b.primaryOrderId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Sevkiyat Grubu: {b.primaryShipGroupSeqId || '00001'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: STATUS HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {(!data?.statusHistory || data.statusHistory.length === 0) ? (
                    <div className="text-center text-slate-400 py-8">
                      {t.noHistory || 'Durum tarihçesi bulunamadı'}
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {data.statusHistory.map((h, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900" />
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {h.fromDescription} ➔ {h.toDescription}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {h.statusDate ? new Date(h.statusDate).toLocaleString() : ''} • Kullanıcı: {h.changeByUserLoginId || 'admin'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PRINT SHEET VIEW */}
              {activeTab === 'print' && (
                <div className="p-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-6">
                  <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-bold">WMS TOPLAMA FORMU (PICK SHEET)</h3>
                      <p className="text-xs text-slate-500">Liste No: #{picklist?.picklistId}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p><span className="font-semibold">Tesis:</span> {picklist?.facilityName}</p>
                      <p><span className="font-semibold">Tarih:</span> {picklist?.picklistDate ? new Date(picklist.picklistDate).toLocaleDateString() : ''}</p>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 font-bold">
                        <th className="py-2">Sepet #</th>
                        <th className="py-2">Lokasyon</th>
                        <th className="py-2">Ürün Kodu</th>
                        <th className="py-2">Ürün Adı</th>
                        <th className="py-2 text-center">İstenen</th>
                        <th className="py-2 text-center">Toplanan</th>
                        <th className="py-2">Lot / Seri</th>
                        <th className="py-2 text-center">İmza / Kontrol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data?.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 font-mono">#{it.picklistBinId}</td>
                          <td className="py-2 font-bold">{it.locationSeqId || '-'}</td>
                          <td className="py-2 font-mono">{it.productId}</td>
                          <td className="py-2">{it.productName}</td>
                          <td className="py-2 text-center font-bold">{it.quantity}</td>
                          <td className="py-2 text-center">
                            <span className="inline-block w-8 border-b border-slate-400" />
                          </td>
                          <td className="py-2 font-mono text-[11px]">{it.lotId || it.serialNumber || '-'}</td>
                          <td className="py-2 text-center">
                            <span className="inline-block w-6 h-6 border border-slate-300 dark:border-slate-700 rounded" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="ds-btn-primary px-4 py-2 text-xs flex items-center gap-2"
                    >
                      <Printer size={16} />
                      <span>Yazdır (Print)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
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
