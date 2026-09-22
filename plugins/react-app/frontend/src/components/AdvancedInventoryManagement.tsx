import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  Boxes,
  ArrowRightLeft,
  MapPin,
  Cpu,
  RefreshCw,
  Search,
  Plus,
  SlidersHorizontal,
  CheckCircle2,
  Trash2,
  Edit2,
  ArrowUpRight,
  Check,
  XCircle,
} from 'lucide-react';
import {
  InventoryMediaConfigMetadata,
  InventoryItemRow,
  InventoryTransferRow,
  FacilityLocationItem,
  ProductConfigItemRow,
  fetchInventoryMediaConfigMetadata,
  fetchInventoryItems,
  fetchInventoryTransfers,
  updateInventoryTransferStatus,
  fetchFacilityLocations,
  deleteFacilityLocation,
  fetchProductConfigItems,
  createProductConfigItem,
  updateProductConfigItem,
  deleteProductConfigItem,
} from '../services/inventoryMediaConfigService';
import { InventoryVarianceModal } from './InventoryVarianceModal';
import { CreateInventoryTransferModal } from './CreateInventoryTransferModal';
import { CreateFacilityLocationModal } from './CreateFacilityLocationModal';
import { CreateConfigItemModal } from './CreateConfigItemModal';
import { ConfigItemDetailModal } from './ConfigItemDetailModal';

interface AdvancedInventoryManagementProps {
  initialTab?: 'inventory' | 'transfers' | 'locations' | 'config';
}

export const AdvancedInventoryManagement: React.FC<AdvancedInventoryManagementProps> = ({
  initialTab = 'inventory',
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers' | 'locations' | 'config'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Data states
  const [metadata, setMetadata] = useState<InventoryMediaConfigMetadata | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransferRow[]>([]);
  const [locations, setLocations] = useState<FacilityLocationItem[]>([]);
  const [configItems, setConfigItems] = useState<ProductConfigItemRow[]>([]);

  const [metrics, setMetrics] = useState({
    totalInventoryItems: 0,
    totalQoh: 0,
    totalAtp: 0,
    totalInventoryValue: 0,
  });

  // Filters & Search
  const [searchInventory, setSearchInventory] = useState('');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState('');
  const [searchTransfer, setSearchTransfer] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchConfig, setSearchConfig] = useState('');

  // Loading & Toast
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [itemForVariance, setItemForVariance] = useState<InventoryItemRow | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [itemForTransfer, setItemForTransfer] = useState<InventoryItemRow | null>(null);

  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);

  const [isCreateConfigModalOpen, setIsCreateConfigModalOpen] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<ProductConfigItemRow | null>(null);
  const [selectedConfigIdForDetail, setSelectedConfigIdForDetail] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Metadata Loader
  const loadMetadata = useCallback(async () => {
    try {
      const meta = await fetchInventoryMediaConfigMetadata();
      setMetadata(meta);
    } catch (err: unknown) {
      console.error('Error loading metadata:', err);
    }
  }, []);

  // 2. Inventory Items Loader
  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchInventoryItems({
        facilityId: selectedFacilityFilter || undefined,
        searchKeyword: searchInventory || undefined,
      });
      setInventoryItems(res.items || []);
      setMetrics(res.metrics || {
        totalInventoryItems: res.totalCount || 0,
        totalQoh: 0,
        totalAtp: 0,
        totalInventoryValue: 0,
      });
    } catch (err: unknown) {
      console.error('Error loading inventory items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFacilityFilter, searchInventory]);

  // 3. Transfers Loader
  const loadTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchInventoryTransfers();
      setTransfers(res.transfers || []);
    } catch (err: unknown) {
      console.error('Error loading transfers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. Locations Loader
  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchFacilityLocations(selectedFacilityFilter || undefined);
      setLocations(res.locations || []);
    } catch (err: unknown) {
      console.error('Error loading locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFacilityFilter]);

  // 5. Config Items Loader
  const loadConfigItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchProductConfigItems({ searchKeyword: searchConfig });
      setConfigItems(res.configItems || []);
    } catch (err: unknown) {
      console.error('Error loading config items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchConfig]);

  // Initial load
  useEffect(() => {
    loadMetadata();
    loadInventory();
    loadTransfers();
    loadLocations();
    loadConfigItems();
  }, [loadMetadata, loadInventory, loadTransfers, loadLocations, loadConfigItems]);

  const refreshAll = () => {
    loadMetadata();
    loadInventory();
    loadTransfers();
    loadLocations();
    loadConfigItems();
  };

  // Transfer status handler
  const handleUpdateTransferStatus = async (transferId: string, statusId: string) => {
    try {
      await updateInventoryTransferStatus({
        inventoryTransferId: transferId,
        statusId,
      });
      showToast(t.transferStatusUpdatedSuccess);
      loadTransfers();
      loadInventory();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Location delete handler
  const handleDeleteLocation = async (facilityId: string, locationSeqId: string) => {
    if (!window.confirm(t.confirmDeleteLocation)) return;
    try {
      await deleteFacilityLocation({ facilityId, locationSeqId });
      showToast(t.locationDeletedSuccess);
      loadLocations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Config item handlers
  const handleSaveConfigItem = async (payload: {
    configItemId?: string;
    configItemTypeId?: string;
    configItemName: string;
    description?: string;
    longDescription?: string;
    imageUrl?: string;
  }) => {
    if (configToEdit) {
      await updateProductConfigItem({
        configItemId: configToEdit.configItemId,
        ...payload,
      });
      showToast(t.configItemUpdatedSuccess);
    } else {
      await createProductConfigItem(payload);
      showToast(t.configItemCreatedSuccess);
    }
    loadConfigItems();
  };

  const handleDeleteConfigItem = async (configItemId: string) => {
    if (!window.confirm(t.confirmDeleteConfigItem)) return;
    try {
      await deleteProductConfigItem(configItemId);
      showToast(t.configItemDeletedSuccess);
      loadConfigItems();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Filtered transfers for table
  const filteredTransfers = useMemo(() => {
    if (!searchTransfer) return transfers;
    const kw = searchTransfer.toLowerCase();
    return transfers.filter(
      (x) =>
        x.inventoryTransferId.toLowerCase().includes(kw) ||
        (x.productName && x.productName.toLowerCase().includes(kw)) ||
        (x.facilityName && x.facilityName.toLowerCase().includes(kw)) ||
        (x.facilityNameTo && x.facilityNameTo.toLowerCase().includes(kw))
    );
  }, [transfers, searchTransfer]);

  // Filtered locations for table
  const filteredLocations = useMemo(() => {
    if (!searchLocation) return locations;
    const kw = searchLocation.toLowerCase();
    return locations.filter(
      (l) =>
        l.facilityId.toLowerCase().includes(kw) ||
        l.locationSeqId.toLowerCase().includes(kw) ||
        (l.aisleId && l.aisleId.toLowerCase().includes(kw))
    );
  }, [locations, searchLocation]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[90] flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl shadow-emerald-600/30">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 text-amber-400 border border-amber-500/30">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === 'config' ? t.configItemsTitle : t.advancedInventoryTitle}
            </h1>
            <p className="text-sm text-slate-400">
              OFBiz çoklu depo lokasyonları, seri/lot stok hareketleri ve modüler ürün konfigüratörü.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoading}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
            title={common.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{common.refresh}</span>
          </button>

          {activeTab === 'transfers' && (
            <button
              type="button"
              onClick={() => {
                setItemForTransfer(null);
                setIsTransferModalOpen(true);
              }}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createTransfer}</span>
            </button>
          )}

          {activeTab === 'locations' && (
            <button
              type="button"
              onClick={() => setIsCreateLocationModalOpen(true)}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createLocation}</span>
            </button>
          )}

          {activeTab === 'config' && (
            <button
              type="button"
              onClick={() => {
                setConfigToEdit(null);
                setIsCreateConfigModalOpen(true);
              }}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createConfigItem}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalInventoryItems}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Boxes size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.totalInventoryItems}
          </p>
        </div>

        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalQoh}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <SlidersHorizontal size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.totalQoh}
          </p>
        </div>

        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalAtp}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.totalAtp}
          </p>
        </div>

        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalInventoryValue}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <span className="text-sm font-bold">$</span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            ${Number(metrics.totalInventoryValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="ds-tab-bar">
        {[
          { id: 'inventory', label: t.inventoryTab, icon: <Boxes size={15} />, count: inventoryItems.length },
          { id: 'transfers', label: t.transfersTab, icon: <ArrowRightLeft size={15} />, count: transfers.length },
          { id: 'locations', label: t.locationsTab, icon: <MapPin size={15} />, count: locations.length },
          { id: 'config', label: t.configItemsTab, icon: <Cpu size={15} />, count: configItems.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`ds-tab ${activeTab === tab.id ? 'ds-tab-active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: INVENTORY ITEMS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchInventoryPlaceholder}
                  value={searchInventory}
                  onChange={(e) => setSearchInventory(e.target.value)}
                  className="ds-input pl-10"
                />
              </div>

              <select
                value={selectedFacilityFilter}
                onChange={(e) => setSelectedFacilityFilter(e.target.value)}
                className="ds-select text-xs w-full sm:w-60"
              >
                <option value="">Tüm Depolar ({metadata?.facilities?.length || 0})</option>
                {metadata?.facilities?.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.facilityName || f.facilityId}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {inventoryItems.length} {t.inventoryTab} listelendi
            </span>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.inventoryItemId}</th>
                  <th className="ds-th">Ürün</th>
                  <th className="ds-th">{t.facility}</th>
                  <th className="ds-th">{t.location}</th>
                  <th className="ds-th-right">{t.qoh}</th>
                  <th className="ds-th-right">{t.atp}</th>
                  <th className="ds-th-right">{t.unitCost}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => (
                    <tr key={item.inventoryItemId} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold text-amber-500 dark:text-amber-400">
                        #{item.inventoryItemId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.productName || item.productId}
                        </div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {item.productId}
                          {item.lotId && ` • Lot: ${item.lotId}`}
                          {item.serialNumber && ` • SN: ${item.serialNumber}`}
                        </div>
                      </td>
                      <td className="ds-td">
                        {item.facilityName || item.facilityId}
                      </td>
                      <td className="ds-td font-mono text-slate-500 dark:text-slate-400">
                        {item.locationSeqId || '-'}
                      </td>
                      <td className="ds-td-right font-bold text-slate-900 dark:text-white">
                        {item.quantityOnHandTotal}
                      </td>
                      <td className="ds-td-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.availableToPromiseTotal}
                      </td>
                      <td className="ds-td-right text-slate-700 dark:text-slate-300">
                        {item.unitCost ? `$${item.unitCost}` : '-'}
                      </td>
                      <td className="ds-td-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setItemForVariance(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t.adjustStock}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setItemForTransfer(item);
                              setIsTransferModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t.createTransfer}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="ds-empty">
                      {t.noInventoryFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchTransfersPlaceholder}
                value={searchTransfer}
                onChange={(e) => setSearchTransfer(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredTransfers.length} {t.transfersTab} listelendi
            </span>
          </div>

          {/* Transfers Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.transferId}</th>
                  <th className="ds-th">Ürün</th>
                  <th className="ds-th">{t.fromFacility}</th>
                  <th className="ds-th">{t.toFacility}</th>
                  <th className="ds-th-right">{t.transferQty}</th>
                  <th className="ds-th">{t.transferStatus}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length > 0 ? (
                  filteredTransfers.map((x) => (
                    <tr key={x.inventoryTransferId} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold text-cyan-600 dark:text-cyan-400">
                        #{x.inventoryTransferId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {x.productName || x.productId}
                        </div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          Item #{x.inventoryItemId}
                        </div>
                      </td>
                      <td className="ds-td">
                        {x.facilityName || x.facilityId}
                      </td>
                      <td className="ds-td font-medium text-slate-900 dark:text-white">
                        {x.facilityNameTo || x.facilityIdTo}
                      </td>
                      <td className="ds-td-right font-bold text-cyan-600 dark:text-cyan-300">
                        {x.xferQty}
                      </td>
                      <td className="ds-td">
                        <span
                          className={`ds-badge ${
                            x.statusId === 'IXF_COMPLETE'
                              ? 'ds-badge-green'
                              : x.statusId === 'IXF_CANCELLED'
                              ? 'ds-badge-red'
                              : 'ds-badge-yellow'
                          }`}
                        >
                          {x.statusId}
                        </span>
                      </td>
                      <td className="ds-td-right">
                        {x.statusId !== 'IXF_COMPLETE' && x.statusId !== 'IXF_CANCELLED' && (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateTransferStatus(x.inventoryTransferId, 'IXF_COMPLETE')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title={t.completeTransfer}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTransferStatus(x.inventoryTransferId, 'IXF_CANCELLED')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title={t.cancelTransfer}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="ds-empty">
                      {t.noTransfersFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FACILITY LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchLocationsPlaceholder}
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredLocations.length} {t.locationsTab} listelendi
            </span>
          </div>

          {/* Locations Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.facility}</th>
                  <th className="ds-th">{t.locationId}</th>
                  <th className="ds-th">{t.area}</th>
                  <th className="ds-th">{t.aisle}</th>
                  <th className="ds-th">{t.section}</th>
                  <th className="ds-th">{t.level}</th>
                  <th className="ds-th">{t.itemsInLocation}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((loc) => (
                    <tr key={`${loc.facilityId}-${loc.locationSeqId}`} className="ds-tbody-row">
                      <td className="ds-td font-semibold text-slate-900 dark:text-white">
                        {loc.facilityId}
                      </td>
                      <td className="ds-td-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {loc.locationSeqId}
                      </td>
                      <td className="ds-td">{loc.areaId || '-'}</td>
                      <td className="ds-td">{loc.aisleId || '-'}</td>
                      <td className="ds-td">{loc.sectionId || '-'}</td>
                      <td className="ds-td">{loc.levelId || '-'}</td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-green font-mono">
                          {loc.itemCount || 0} Kalem
                        </span>
                      </td>
                      <td className="ds-td-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.facilityId, loc.locationSeqId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="ds-empty">
                      {t.noLocationsFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCT CONFIGURATOR */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchConfigPlaceholder}
                value={searchConfig}
                onChange={(e) => setSearchConfig(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {configItems.length} {t.configItemsTab} listelendi
            </span>
          </div>

          {/* Config Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.configItemId}</th>
                  <th className="ds-th">{t.configItemName}</th>
                  <th className="ds-th">{t.configType}</th>
                  <th className="ds-th">{t.optionsCount}</th>
                  <th className="ds-th">{common.description}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {configItems.length > 0 ? (
                  configItems.map((ci) => (
                    <tr
                      key={ci.configItemId}
                      className="ds-tbody-row cursor-pointer group"
                      onClick={() => setSelectedConfigIdForDetail(ci.configItemId)}
                    >
                      <td className="ds-td-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {ci.configItemId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
                          {ci.configItemName}
                        </div>
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-indigo">
                          {ci.configItemTypeId}
                        </span>
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-slate font-mono">
                          {ci.optionCount} Seçenek
                        </span>
                      </td>
                      <td className="ds-td-muted max-w-sm truncate">
                        {ci.description || '-'}
                      </td>
                      <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedConfigIdForDetail(ci.configItemId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t.configItemDetail}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfigToEdit(ci);
                              setIsCreateConfigModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConfigItem(ci.configItemId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="ds-empty">
                      {t.noConfigItemsFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Inventory Variance Modal */}
      {itemForVariance && (
        <InventoryVarianceModal
          isOpen={!!itemForVariance}
          onClose={() => setItemForVariance(null)}
          onSuccess={() => {
            showToast(t.adjustSuccess);
            loadInventory();
          }}
          item={itemForVariance}
          reasons={metadata?.varianceReasons || []}
        />
      )}

      {/* 2. Create Inventory Transfer Modal */}
      {isTransferModalOpen && (
        <CreateInventoryTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setItemForTransfer(null);
          }}
          onSuccess={() => {
            showToast(t.transferCreatedSuccess);
            loadTransfers();
            loadInventory();
          }}
          selectedItem={itemForTransfer}
          items={inventoryItems}
          facilities={metadata?.facilities || []}
          locations={metadata?.locations || []}
        />
      )}

      {/* 3. Create Facility Location Modal */}
      {isCreateLocationModalOpen && (
        <CreateFacilityLocationModal
          isOpen={isCreateLocationModalOpen}
          onClose={() => setIsCreateLocationModalOpen(false)}
          onSuccess={() => {
            showToast(t.locationCreatedSuccess);
            loadLocations();
          }}
          facilities={metadata?.facilities || []}
          defaultFacilityId={selectedFacilityFilter}
        />
      )}

      {/* 4. Create/Edit Config Item Modal */}
      {isCreateConfigModalOpen && (
        <CreateConfigItemModal
          isOpen={isCreateConfigModalOpen}
          onClose={() => {
            setIsCreateConfigModalOpen(false);
            setConfigToEdit(null);
          }}
          onSuccess={() => {}}
          itemToEdit={configToEdit}
          onSave={handleSaveConfigItem}
        />
      )}

      {/* 5. Config Item Detail Modal */}
      {selectedConfigIdForDetail && (
        <ConfigItemDetailModal
          isOpen={!!selectedConfigIdForDetail}
          onClose={() => setSelectedConfigIdForDetail(null)}
          configItemId={selectedConfigIdForDetail}
          onConfigChanged={loadConfigItems}
        />
      )}
    </div>
  );
};
