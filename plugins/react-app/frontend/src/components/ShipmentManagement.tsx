import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Warehouse,
  Boxes,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import {
  ShipmentListItem,
  ShipmentKPIs,
  fetchShipments,
} from '../services/shipmentService';
import { ShipmentDetailModal } from './ShipmentDetailModal';
import { CreateShipmentModal } from './CreateShipmentModal';
import { ViewType } from '../App';

interface ShipmentManagementProps {
  onNavigate?: (view: ViewType, id?: string) => void;
  embedded?: boolean;
}

export const ShipmentManagement: React.FC<ShipmentManagementProps> = ({ onNavigate, embedded = false }) => {
  const { translations, locale } = useTranslation();
  const common = translations.common;
  const sTrans = translations.shipments;

  // Filter & Pagination State
  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'purchase' | 'inTransit'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusIdFilter, setStatusIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');
  const [viewIndex, setViewIndex] = useState(0);
  const viewSize = 20;

  // Data State
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState<ShipmentKPIs>({
    totalShipments: 0,
    salesShipments: 0,
    purchaseShipments: 0,
    inTransitCount: 0,
    deliveredCount: 0,
    pendingCount: 0,
  });

  // Modal State
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      let typeFilter: string | undefined = undefined;
      let statusFilter: string | undefined = statusIdFilter || undefined;

      if (activeTab === 'sales') typeFilter = 'SALES_SHIPMENT';
      if (activeTab === 'purchase') typeFilter = 'PURCHASE_SHIPMENT';
      if (activeTab === 'inTransit') {
        statusFilter = 'SHIPMENT_SHIPPED';
      }

      const res = await fetchShipments({
        shipmentTypeId: typeFilter,
        statusId: statusFilter,
        searchKeyword: searchKeyword.trim() || undefined,
        fromDate: fromDate || undefined,
        thruDate: thruDate || undefined,
        viewIndex,
        viewSize,
      });

      setShipments(res.shipments || []);
      setTotalCount(res.totalCount || 0);
      if (res.kpis) setKpis(res.kpis);
    } catch (err: unknown) {
      console.error('Error fetching shipments:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusIdFilter, searchKeyword, fromDate, thruDate, viewIndex, viewSize]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const handleTabChange = (tab: 'all' | 'sales' | 'purchase' | 'inTransit') => {
    setActiveTab(tab);
    setViewIndex(0);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedShipmentId(id);
    setIsDetailOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr.substring(0, 10);
    }
  };

  const getStatusBadge = (sId: string, desc?: string) => {
    const text = desc || sId;
    switch (sId) {
      case 'SHIPMENT_DELIVERED':
      case 'PURCH_SHIP_RECEIVED':
        return <span className="ds-badge ds-badge-green">{text}</span>;
      case 'SHIPMENT_SHIPPED':
      case 'PURCH_SHIP_SHIPPED':
        return <span className="ds-badge ds-badge-blue">{text}</span>;
      case 'SHIPMENT_PACKED':
      case 'SHIPMENT_PICKED':
      case 'SHIPMENT_SCHEDULED':
        return <span className="ds-badge ds-badge-yellow">{text}</span>;
      case 'SHIPMENT_CANCELLED':
        return <span className="ds-badge ds-badge-red">{text}</span>;
      case 'SHIPMENT_INPUT':
      case 'PURCH_SHIP_CREATED':
        return <span className="ds-badge ds-badge-indigo">{text}</span>;
      default:
        return <span className="ds-badge ds-badge-slate">{text}</span>;
    }
  };

  const totalPages = Math.ceil(totalCount / viewSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions (Rendered only when standalone) */}
      {!embedded ? (
        <div className="ds-page-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="ds-page-title">{sTrans.title || 'Sevkiyat & İrsaliye Yönetimi'}</h1>
              <p className="ds-page-subtitle">
                {sTrans.subtitle || 'Depo mal kabulü, sevkiyat irsaliyeleri, taşıyıcı kargo takibi ve teslimat operasyonları'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => loadShipments()}
              disabled={loading}
              className="ds-btn-secondary text-xs"
              title={common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{common.refresh}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="ds-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{sTrans.newShipment || 'Yeni İrsaliye Oluştur'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {sTrans.title || 'Sevkiyat & İrsaliye'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadShipments()}
              disabled={loading}
              className="ds-btn-secondary text-xs"
              title={common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{common.refresh}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="ds-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{sTrans.newShipment || 'Yeni İrsaliye Oluştur'}</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="ds-stat-card">
          <div className="ds-stat-label">
            <Boxes className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>{sTrans.kpiTotal || 'Toplam İrsaliye'}</span>
          </div>
          <div className="ds-stat-value">{kpis.totalShipments}</div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-label">
            <Truck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>{sTrans.kpiSales || 'Giden (Satış)'}</span>
          </div>
          <div className="ds-stat-value text-blue-600 dark:text-blue-400">{kpis.salesShipments}</div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-label">
            <Warehouse className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>{sTrans.kpiPurchase || 'Gelen (Satın Alma)'}</span>
          </div>
          <div className="ds-stat-value text-emerald-600 dark:text-emerald-400">{kpis.purchaseShipments}</div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-label">
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{sTrans.kpiInTransit || 'Yoldaki Sevkiyat'}</span>
          </div>
          <div className="ds-stat-value text-amber-600 dark:text-amber-400">{kpis.inTransitCount}</div>
        </div>

        <div className="ds-stat-card col-span-2 sm:col-span-1">
          <div className="ds-stat-label">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>{sTrans.kpiDelivered || 'Teslim / Mal Kabul'}</span>
          </div>
          <div className="ds-stat-value text-emerald-600 dark:text-emerald-400">{kpis.deliveredCount}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ds-tab-bar">
        {[
          { key: 'all', label: sTrans.tabAll || 'Tüm İrsaliyeler', count: kpis.totalShipments },
          { key: 'sales', label: sTrans.tabSales || 'Giden (Satış)', count: kpis.salesShipments },
          { key: 'purchase', label: sTrans.tabPurchase || 'Gelen (Satın Alma)', count: kpis.purchaseShipments },
          { key: 'inTransit', label: sTrans.tabInTransit || 'Yoldakiler', count: kpis.inTransitCount },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key as any)}
            className={`ds-tab ${activeTab === tab.key ? 'ds-tab-active' : ''}`}
          >
            <span>{tab.label}</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="ds-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => {
                setSearchKeyword(e.target.value);
                setViewIndex(0);
              }}
              placeholder={sTrans.searchPlaceholder || 'İrsaliye no, sipariş, taraf...'}
              className="ds-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value);
                setViewIndex(0);
              }}
              className="ds-input min-w-[140px]"
              title="Başlangıç Tarihi"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={thruDate}
              onChange={e => {
                setThruDate(e.target.value);
                setViewIndex(0);
              }}
              className="ds-input min-w-[140px]"
              title="Bitiş Tarihi"
            />
          </div>

          <div className="min-w-[180px]">
            <select
              value={statusIdFilter}
              onChange={e => {
                setStatusIdFilter(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select"
            >
              <option value="">{common.all} ({sTrans.status})</option>
              <option value="SHIPMENT_INPUT">Girdi / Hazırlık</option>
              <option value="SHIPMENT_SCHEDULED">Planlandı</option>
              <option value="SHIPMENT_PICKED">Toplandı</option>
              <option value="SHIPMENT_PACKED">Paketlendi</option>
              <option value="SHIPMENT_SHIPPED">Sevk Edildi</option>
              <option value="SHIPMENT_DELIVERED">Teslim Edildi</option>
              <option value="PURCH_SHIP_RECEIVED">Mal Kabul Edildi</option>
            </select>
          </div>

          {(searchKeyword || fromDate || thruDate || statusIdFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchKeyword('');
                setFromDate('');
                setThruDate('');
                setStatusIdFilter('');
                setViewIndex(0);
              }}
              className="ds-btn-ghost text-xs"
            >
              {common.reset}
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="ds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">{sTrans.shipmentId || 'İrsaliye No'}</th>
                <th className="ds-th">{sTrans.type || 'Tür'}</th>
                <th className="ds-th">{sTrans.orderId || 'Sipariş No'}</th>
                <th className="ds-th">{sTrans.route || 'Güzergah (Çıkış -> Varış)'}</th>
                <th className="ds-th">{sTrans.carrierTracking || 'Kargo / Takip'}</th>
                <th className="ds-th">{sTrans.shipDate || 'Sevk Tarihi'}</th>
                <th className="ds-th">{sTrans.status || 'Durum'}</th>
                <th className="ds-th-right">{common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="ds-spinner-sm" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{common.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400 italic text-sm">
                    {sTrans.noShipmentsFound || 'Kayıtlı sevkiyat veya irsaliye bulunamadı.'}
                  </td>
                </tr>
              ) : (
                shipments.map(s => (
                  <tr key={s.shipmentId} className="ds-tbody-row">
                    <td className="ds-td-mono font-bold">
                      {s.shipmentId}
                    </td>
                    <td className="ds-td font-medium text-slate-900 dark:text-white">
                      {s.shipmentTypeDesc || s.shipmentTypeId}
                    </td>
                    <td className="ds-td">
                      {s.primaryOrderId ? (
                        <button
                          type="button"
                          onClick={() => onNavigate?.('orders', s.primaryOrderId)}
                          className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {s.primaryOrderId}
                          <ExternalLink size={11} />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="ds-td">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">{s.originFacilityName || s.partyIdFrom || '-'}</span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white">{s.destinationFacilityName || s.partyIdTo || '-'}</span>
                      </div>
                    </td>
                    <td className="ds-td">
                      {s.carrierPartyId && s.carrierPartyId !== '_NA_' ? (
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{s.carrierPartyId}</div>
                          {s.trackingIdNumber && (
                            <div className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">{s.trackingIdNumber}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Özel / Mağaza</span>
                      )}
                    </td>
                    <td className="ds-td text-slate-600 dark:text-slate-400">
                      {formatDate(s.estimatedShipDate || s.createdDate)}
                    </td>
                    <td className="ds-td">
                      {getStatusBadge(s.statusId, s.statusDesc)}
                    </td>
                    <td className="ds-td-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(s.shipmentId)}
                        className="ds-btn-secondary py-1 px-2.5 text-xs inline-flex cursor-pointer"
                        title={common.details}
                      >
                        <Eye size={13} />
                        <span>{common.details}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {common.page || 'Sayfa'} {viewIndex + 1} / {totalPages} ({totalCount} {sTrans.records || 'kayıt'})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={viewIndex === 0}
                onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
                className="ds-btn-secondary py-1 px-2 text-xs disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={viewIndex >= totalPages - 1}
                onClick={() => setViewIndex(prev => prev + 1)}
                className="ds-btn-secondary py-1 px-2 text-xs disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isDetailOpen && (
        <ShipmentDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          shipmentId={selectedShipmentId}
          onShipmentUpdated={loadShipments}
          onViewOrder={orderId => onNavigate?.('orders', orderId)}
        />
      )}

      {isCreateOpen && (
        <CreateShipmentModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={newId => {
            loadShipments();
            handleOpenDetail(newId);
          }}
        />
      )}
    </div>
  );
};
