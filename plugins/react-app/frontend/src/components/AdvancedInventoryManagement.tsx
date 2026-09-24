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
  ShoppingCart,
  Tag,
  History,
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
  fetchFacilityLocations,
  deleteFacilityLocation,
  fetchProductConfigItems,
  createProductConfigItem,
  updateProductConfigItem,
  deleteProductConfigItem,
} from '../services/inventoryMediaConfigService';
import {
  WmsMetadata,
  PicklistRow,
  LotRow,
  fetchWmsMetadata,
  fetchPicklists,
  fetchLots,
} from '../services/wmsService';

import { InventoryVarianceModal } from './InventoryVarianceModal';
import { CreateInventoryTransferModal } from './CreateInventoryTransferModal';
import { CreateFacilityLocationModal } from './CreateFacilityLocationModal';
import { CreateConfigItemModal } from './CreateConfigItemModal';
import { ConfigItemDetailModal } from './ConfigItemDetailModal';

import { CreatePicklistModal } from './CreatePicklistModal';
import { PicklistDetailModal } from './PicklistDetailModal';
import { CreateLotModal } from './CreateLotModal';
import { InventoryItemHistoryModal } from './InventoryItemHistoryModal';
import { EditInventoryTrackingModal } from './EditInventoryTrackingModal';

interface AdvancedInventoryManagementProps {
  initialTab?: 'inventory' | 'picklists' | 'lots' | 'transfers' | 'locations' | 'config';
}

export const AdvancedInventoryManagement: React.FC<AdvancedInventoryManagementProps> = ({
  initialTab = 'inventory',
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'picklists' | 'lots' | 'transfers' | 'locations' | 'config'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Data states
  const [metadata, setMetadata] = useState<InventoryMediaConfigMetadata | null>(null);
  const [wmsMetadata, setWmsMetadata] = useState<WmsMetadata | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransferRow[]>([]);
  const [locations, setLocations] = useState<FacilityLocationItem[]>([]);
  const [configItems, setConfigItems] = useState<ProductConfigItemRow[]>([]);

  // WMS Picklists & Lots states
  const [picklists, setPicklists] = useState<PicklistRow[]>([]);
  const [picklistMetrics, setPicklistMetrics] = useState({
    total: 0,
    input: 0,
    assigned: 0,
    printed: 0,
    picked: 0,
    cancelled: 0,
  });

  const [lots, setLots] = useState<LotRow[]>([]);
  const [lotMetrics, setLotMetrics] = useState({
    totalLots: 0,
    expiringCount: 0,
  });

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
  const [searchPicklist, setSearchPicklist] = useState('');
  const [selectedPicklistStatusFilter, setSelectedPicklistStatusFilter] = useState('');
  const [searchLot, setSearchLot] = useState('');

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

  // Phase 3 WMS Modals
  const [isCreatePicklistModalOpen, setIsCreatePicklistModalOpen] = useState(false);
  const [selectedPicklistIdForDetail, setSelectedPicklistIdForDetail] = useState<string | null>(null);
  const [isCreateLotModalOpen, setIsCreateLotModalOpen] = useState(false);
  const [selectedInventoryItemIdForHistory, setSelectedInventoryItemIdForHistory] = useState<string | null>(null);
  const [itemForTrackingEdit, setItemForTrackingEdit] = useState<InventoryItemRow | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Metadata Loaders
  const loadMetadata = useCallback(async () => {
    try {
      const [meta, wmsMeta] = await Promise.all([
        fetchInventoryMediaConfigMetadata(),
        fetchWmsMetadata().catch(() => null),
      ]);
      setMetadata(meta);
      if (wmsMeta) setWmsMetadata(wmsMeta);
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
      const locs = await fetchFacilityLocations(selectedFacilityFilter || undefined);
      setLocations(locs?.locations || []);
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
      const res = await fetchProductConfigItems({ searchKeyword: searchConfig || undefined });
      setConfigItems(res?.configItems || []);
    } catch (err: unknown) {
      console.error('Error loading config items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchConfig]);

  // 6. Picklists Loader (WMS)
  const loadPicklists = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchPicklists({
        facilityId: selectedFacilityFilter || undefined,
        statusId: selectedPicklistStatusFilter || undefined,
        search: searchPicklist || undefined,
      });
      setPicklists(res.picklists || []);
      if (res.metrics) setPicklistMetrics(res.metrics);
    } catch (err: unknown) {
      console.error('Error loading picklists:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFacilityFilter, selectedPicklistStatusFilter, searchPicklist]);

  // 7. Lots Loader
  const loadLots = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchLots({
        search: searchLot || undefined,
      });
      setLots(res.lots || []);
      if (res.metrics) setLotMetrics(res.metrics);
    } catch (err: unknown) {
      console.error('Error loading lots:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchLot]);

  // Initial Load
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Load active tab data
  useEffect(() => {
    switch (activeTab) {
      case 'inventory':
        loadInventory();
        break;
      case 'picklists':
        loadPicklists();
        break;
      case 'lots':
        loadLots();
        break;
      case 'transfers':
        loadTransfers();
        break;
      case 'locations':
        loadLocations();
        break;
      case 'config':
        loadConfigItems();
        break;
      default:
        break;
    }
  }, [activeTab, loadInventory, loadPicklists, loadLots, loadTransfers, loadLocations, loadConfigItems]);

  const refreshAll = () => {
    loadMetadata();
    switch (activeTab) {
      case 'inventory':
        loadInventory();
        break;
      case 'picklists':
        loadPicklists();
        break;
      case 'lots':
        loadLots();
        break;
      case 'transfers':
        loadTransfers();
        break;
      case 'locations':
        loadLocations();
        break;
      case 'config':
        loadConfigItems();
        break;
      default:
        break;
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

  const getPicklistStatusBadgeClass = (statusId: string) => {
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
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === 'picklists'
                ? (t.picklistsTab || 'Toplama Listeleri & WMS')
                : activeTab === 'lots'
                ? (t.lotsTab || 'Lot, Parti & SKT Takibi')
                : activeTab === 'config'
                ? t.configItemsTitle
                : t.advancedInventoryTitle}
            </h1>
            <p className="text-sm text-slate-400">
              OFBiz çoklu depo yönetimi, WMS toplama/paketleme, lot/seri takibi ve ürün konfigüratörü.
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

          {activeTab === 'picklists' && (
            <button
              type="button"
              onClick={() => setIsCreatePicklistModalOpen(true)}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-cyan-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createPicklist || 'Yeni Toplama Listesi'}</span>
            </button>
          )}

          {activeTab === 'lots' && (
            <button
              type="button"
              onClick={() => setIsCreateLotModalOpen(true)}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createLot || 'Yeni Lot Tanımla'}</span>
            </button>
          )}

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

      {/* KPI Cards (Dynamic according to Active Tab) */}
      {activeTab === 'picklists' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Toplam Liste</span>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
              {picklistMetrics.total}
            </p>
          </div>
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hazırlanıyor (Giriş)</span>
            <p className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1 font-mono">
              {picklistMetrics.input}
            </p>
          </div>
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Atandı / Yazdırıldı</span>
            <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1 font-mono">
              {picklistMetrics.assigned + picklistMetrics.printed}
            </p>
          </div>
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Toplandı (Tamam)</span>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1 font-mono">
              {picklistMetrics.picked}
            </p>
          </div>
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">İptal Edilenler</span>
            <p className="text-xl sm:text-2xl font-bold text-rose-500 mt-1 font-mono">
              {picklistMetrics.cancelled}
            </p>
          </div>
        </div>
      ) : activeTab === 'lots' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalLots || 'Toplam Lot / Parti'}</span>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
              {lotMetrics.totalLots}
            </p>
          </div>
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.expiringLots || 'SKT Yaklaşanlar (30 Gün)'}</span>
            <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1 font-mono">
              {lotMetrics.expiringCount}
            </p>
          </div>
          <div className="ds-stat-card">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aktif Lot Stoğu</span>
            <p className="text-xl sm:text-2xl font-bold text-cyan-500 mt-1 font-mono">
              {lots.reduce((acc, l) => acc + (l.totalQoh || 0), 0)}
            </p>
          </div>
        </div>
      ) : (
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
      )}

      {/* Tabs */}
      <div className="ds-tab-bar">
        {[
          { id: 'inventory', label: t.inventoryTab, icon: <Boxes size={15} />, count: inventoryItems.length },
          { id: 'picklists', label: t.picklistsTab || 'Toplama (WMS)', icon: <ShoppingCart size={15} />, count: picklists.length },
          { id: 'lots', label: t.lotsTab || 'Lot & SKT', icon: <Tag size={15} />, count: lots.length },
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
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: INVENTORY ITEMS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search bar & Facility Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              <div className="relative flex-1 w-full">
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
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>{item.productId}</span>
                          {item.lotId && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 text-[10px] font-semibold">
                              Lot: {item.lotId}
                            </span>
                          )}
                          {item.serialNumber && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-500 text-[10px] font-semibold">
                              SN: {item.serialNumber}
                            </span>
                          )}
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
                            onClick={() => setSelectedInventoryItemIdForHistory(item.inventoryItemId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Stok Hareket Geçmişi (Audit Trail)"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemForTrackingEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Lot, Seri No & Lokasyon Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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

      {/* TAB 2: WMS PICKLISTS */}
      {activeTab === 'picklists' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchPicklistsPlaceholder || 'Liste ID veya açıklama ile ara...'}
                  value={searchPicklist}
                  onChange={(e) => setSearchPicklist(e.target.value)}
                  className="ds-input pl-10"
                />
              </div>

              <select
                value={selectedPicklistStatusFilter}
                onChange={(e) => setSelectedPicklistStatusFilter(e.target.value)}
                className="ds-select text-xs w-full sm:w-48"
              >
                <option value="">Tüm Durumlar</option>
                {wmsMetadata?.picklistStatuses?.map((st) => (
                  <option key={st.statusId} value={st.statusId}>
                    {st.description || st.statusId}
                  </option>
                ))}
              </select>

              <select
                value={selectedFacilityFilter}
                onChange={(e) => setSelectedFacilityFilter(e.target.value)}
                className="ds-select text-xs w-full sm:w-48"
              >
                <option value="">Tüm Depolar</option>
                {metadata?.facilities?.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.facilityName || f.facilityId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">Liste ID</th>
                  <th className="ds-th">Depo</th>
                  <th className="ds-th">Açıklama</th>
                  <th className="ds-th">Tarih</th>
                  <th className="ds-th text-center">Sepetler</th>
                  <th className="ds-th text-center">Toplama Durumu</th>
                  <th className="ds-th">Durum</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {picklists.length > 0 ? (
                  picklists.map((p) => {
                    return (
                      <tr
                        key={p.picklistId}
                        className="ds-tbody-row cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        onClick={() => setSelectedPicklistIdForDetail(p.picklistId)}
                      >
                        <td className="ds-td-mono font-bold text-cyan-600 dark:text-cyan-400">
                          #{p.picklistId}
                        </td>
                        <td className="ds-td text-xs font-medium text-slate-800 dark:text-slate-200">
                          {p.facilityName || p.facilityId}
                        </td>
                        <td className="ds-td text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {p.description || '-'}
                        </td>
                        <td className="ds-td text-xs text-slate-500">
                          {p.picklistDate ? new Date(p.picklistDate).toLocaleString() : '-'}
                        </td>
                        <td className="ds-td text-center font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {p.binCount} Sepet
                        </td>
                        <td className="ds-td text-center text-xs">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {p.completedItemCount}/{p.itemCount} Kalem
                          </span>
                        </td>
                        <td className="ds-td text-xs">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPicklistStatusBadgeClass(p.statusId)}`}>
                            {p.statusDescription || p.statusId}
                          </span>
                        </td>
                        <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedPicklistIdForDetail(p.picklistId)}
                            className="ds-btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1.5"
                          >
                            <ShoppingCart size={13} className="text-cyan-500" />
                            <span>İncele / Topla</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="ds-empty">
                      Kayıtlı toplama listesi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOTS & EXPIRATION */}
      {activeTab === 'lots' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchLotsPlaceholder || 'Lot no ile ara...'}
                value={searchLot}
                onChange={(e) => setSearchLot(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {lots.length} lot listelendi
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">Lot / Parti No</th>
                  <th className="ds-th">Oluşturma Tarihi</th>
                  <th className="ds-th">Son Kullanma Tarihi (SKT)</th>
                  <th className="ds-th text-center">Parti Büyüklüğü</th>
                  <th className="ds-th text-center">Mevcut Stok (QOH)</th>
                  <th className="ds-th text-center">Kullanılabilir (ATP)</th>
                  <th className="ds-th text-center">İlişkili Ürün</th>
                </tr>
              </thead>
              <tbody>
                {lots.length > 0 ? (
                  lots.map((l) => (
                    <tr key={l.lotId} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {l.lotId}
                      </td>
                      <td className="ds-td text-xs text-slate-500">
                        {l.creationDate ? new Date(l.creationDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="ds-td text-xs font-medium">
                        {l.expirationDate ? (
                          <span className="text-amber-600 dark:text-amber-400 font-mono">
                            {new Date(l.expirationDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="ds-td text-center font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {l.quantity || '-'}
                      </td>
                      <td className="ds-td text-center font-bold text-slate-900 dark:text-white text-xs">
                        {l.totalQoh}
                      </td>
                      <td className="ds-td text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {l.totalAtp}
                      </td>
                      <td className="ds-td text-center text-xs text-slate-500">
                        {l.productCount} ürün ({l.itemCount} stok kalemi)
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="ds-empty">
                      {t.noLotsFound || 'Kayıtlı lot/parti bulunamadı'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
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

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.transferId}</th>
                  <th className="ds-th">{t.inventoryItemId} / Ürün</th>
                  <th className="ds-th">{t.fromFacility}</th>
                  <th className="ds-th">{t.toFacility}</th>
                  <th className="ds-th-right">{t.transferQty}</th>
                  <th className="ds-th">{t.transferStatus}</th>
                  <th className="ds-th">{t.sendDate}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length > 0 ? (
                  filteredTransfers.map((xfer) => (
                    <tr key={xfer.inventoryTransferId} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold text-cyan-600 dark:text-cyan-400">
                        #{xfer.inventoryTransferId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {xfer.productName || xfer.productId || `#${xfer.inventoryItemId}`}
                        </div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          Stok: #{xfer.inventoryItemId}
                        </div>
                      </td>
                      <td className="ds-td">
                        {xfer.facilityName || xfer.facilityId}
                        {xfer.locationSeqId && ` (${xfer.locationSeqId})`}
                      </td>
                      <td className="ds-td font-semibold text-slate-800 dark:text-slate-200">
                        {xfer.facilityNameTo || xfer.facilityIdTo}
                        {xfer.locationSeqIdTo && ` (${xfer.locationSeqIdTo})`}
                      </td>
                      <td className="ds-td-right font-bold text-slate-900 dark:text-white">
                        {xfer.xferQty}
                      </td>
                      <td className="ds-td">
                        <span
                          className={`ds-badge ${
                            xfer.statusId === 'IXF_COMPLETE'
                              ? 'ds-badge-emerald'
                              : xfer.statusId === 'IXF_CANCELLED'
                              ? 'ds-badge-rose'
                              : 'ds-badge-amber'
                          }`}
                        >
                          {xfer.statusId}
                        </span>
                      </td>
                      <td className="ds-td text-xs text-slate-500 dark:text-slate-400">
                        {xfer.sendDate ? new Date(xfer.sendDate).toLocaleDateString() : '-'}
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

      {/* TAB 5: WAREHOUSE LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchLocationsPlaceholder}
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
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
              {filteredLocations.length} {t.locationsTab} listelendi
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.locationId}</th>
                  <th className="ds-th">{t.facility}</th>
                  <th className="ds-th">{t.area}</th>
                  <th className="ds-th">{t.aisle}</th>
                  <th className="ds-th">{t.section}</th>
                  <th className="ds-th">{t.level}</th>
                  <th className="ds-th">{t.position}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((loc) => (
                    <tr key={`${loc.facilityId}-${loc.locationSeqId}`} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold text-amber-500 dark:text-amber-400">
                        {loc.locationSeqId}
                      </td>
                      <td className="ds-td font-semibold text-slate-800 dark:text-slate-200">
                        {loc.facilityId}
                      </td>
                      <td className="ds-td text-xs text-slate-500">{loc.areaId || '-'}</td>
                      <td className="ds-td text-xs text-slate-500">{loc.aisleId || '-'}</td>
                      <td className="ds-td text-xs text-slate-500">{loc.sectionId || '-'}</td>
                      <td className="ds-td text-xs text-slate-500">{loc.levelId || '-'}</td>
                      <td className="ds-td text-xs text-slate-500">{loc.positionId || '-'}</td>
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

      {/* TAB 6: CONFIG ITEMS */}
      {activeTab === 'config' && (
        <div className="space-y-4">
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

      {/* PHASE 3 WMS MODALS */}
      {/* 6. Create Picklist Modal */}
      {isCreatePicklistModalOpen && (
        <CreatePicklistModal
          isOpen={isCreatePicklistModalOpen}
          onClose={() => setIsCreatePicklistModalOpen(false)}
          onCreated={(newPicklistId) => {
            showToast(`Toplama listesi #${newPicklistId} başarıyla oluşturuldu`);
            loadPicklists();
            setSelectedPicklistIdForDetail(newPicklistId);
          }}
          metadata={wmsMetadata}
        />
      )}

      {/* 7. Picklist Detail Modal */}
      {selectedPicklistIdForDetail && (
        <PicklistDetailModal
          isOpen={!!selectedPicklistIdForDetail}
          onClose={() => setSelectedPicklistIdForDetail(null)}
          picklistId={selectedPicklistIdForDetail}
          onStatusChanged={() => {
            loadPicklists();
          }}
        />
      )}

      {/* 8. Create Lot Modal */}
      {isCreateLotModalOpen && (
        <CreateLotModal
          isOpen={isCreateLotModalOpen}
          onClose={() => setIsCreateLotModalOpen(false)}
          onCreated={(newLotId) => {
            showToast(`Lot #${newLotId} başarıyla kaydedildi`);
            loadLots();
          }}
        />
      )}

      {/* 9. Inventory Item History Modal */}
      {selectedInventoryItemIdForHistory && (
        <InventoryItemHistoryModal
          isOpen={!!selectedInventoryItemIdForHistory}
          onClose={() => setSelectedInventoryItemIdForHistory(null)}
          inventoryItemId={selectedInventoryItemIdForHistory}
        />
      )}

      {/* 10. Edit Inventory Tracking Modal */}
      {itemForTrackingEdit && (
        <EditInventoryTrackingModal
          isOpen={!!itemForTrackingEdit}
          onClose={() => setItemForTrackingEdit(null)}
          item={itemForTrackingEdit}
          onUpdated={() => {
            showToast('Stok takip bilgileri güncellendi');
            loadInventory();
          }}
        />
      )}
    </div>
  );
};
