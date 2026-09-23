import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { ViewType } from '../App';
import {
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Eye,
  Building,
  FileText,
  Plus,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import {
  OrderListItem,
  OrderKPIs,
  OrderMetadata,
  fetchOrders,
  fetchOrderMetadata,
  QuoteListItem,
  QuoteKPIs,
  QuoteMetadata,
  fetchQuotes,
  fetchQuoteMetadata,
  ReturnListItem,
  ReturnKPIs,
  ReturnMetadata,
  fetchReturns,
  fetchReturnMetadata,
} from '../services/orderService';
import { OrderDetailModal } from './OrderDetailModal';
import { CreateOrderModal } from './CreateOrderModal';
import { CreateQuoteModal } from './CreateQuoteModal';
import { QuoteDetailModal } from './QuoteDetailModal';
import { CreateReturnModal } from './CreateReturnModal';
import { ReturnDetailModal } from './ReturnDetailModal';

type MainTab = 'orders' | 'quotes' | 'returns';
type OrderSubTab = 'all' | 'sales' | 'purchase';
export type OrderTabOption = OrderSubTab | 'quotes' | 'returns';

interface OrderManagementProps {
  initialTab?: OrderTabOption;
  onNavigate?: (view: ViewType, id?: string) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  initialTab = 'all',
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  // Active Main Tab
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    if (initialTab === 'quotes') return 'quotes';
    if (initialTab === 'returns') return 'returns';
    return 'orders';
  });

  // Sub Tab for Orders
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTab>(() => {
    if (initialTab === 'sales') return 'sales';
    if (initialTab === 'purchase') return 'purchase';
    return 'all';
  });

  // Sync with initialTab prop changes
  useEffect(() => {
    if (initialTab === 'quotes') {
      setMainTab('quotes');
      setViewIndex(0);
    } else if (initialTab === 'returns') {
      setMainTab('returns');
      setViewIndex(0);
    } else if (initialTab === 'sales') {
      setMainTab('orders');
      setOrderSubTab('sales');
      setViewIndex(0);
    } else if (initialTab === 'purchase') {
      setMainTab('orders');
      setOrderSubTab('purchase');
      setViewIndex(0);
    } else {
      setMainTab('orders');
      setOrderSubTab('all');
      setViewIndex(0);
    }
  }, [initialTab]);

  // Common Pagination
  const [viewIndex, setViewIndex] = useState(0);
  const viewSize = 50;

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedHeaderTypeId, setSelectedHeaderTypeId] = useState('');

  // ─── ORDERS STATE ───
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [orderKPIs, setOrderKPIs] = useState<OrderKPIs>({
    totalCount: 0,
    totalAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    completedCount: 0,
    completedAmount: 0,
  });
  const [orderMetadata, setOrderMetadata] = useState<OrderMetadata | null>(null);

  // ─── QUOTES STATE ───
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [totalQuotesCount, setTotalQuotesCount] = useState(0);
  const [quoteKPIs, setQuoteKPIs] = useState<QuoteKPIs>({
    totalQuotes: 0,
    createdQuotes: 0,
    approvedQuotes: 0,
    orderedQuotes: 0,
  });
  const [quoteMetadata, setQuoteMetadata] = useState<QuoteMetadata | null>(null);

  // ─── RETURNS STATE ───
  const [returnsList, setReturnsList] = useState<ReturnListItem[]>([]);
  const [totalReturnsCount, setTotalReturnsCount] = useState(0);
  const [returnKPIs, setReturnKPIs] = useState<ReturnKPIs>({
    totalReturns: 0,
    requestedCount: 0,
    acceptedCount: 0,
    completedCount: 0,
  });
  const [returnMetadata, setReturnMetadata] = useState<ReturnMetadata | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isQuoteDetailOpen, setIsQuoteDetailOpen] = useState(false);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);

  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [isReturnDetailOpen, setIsReturnDetailOpen] = useState(false);
  const [isCreateReturnOpen, setIsCreateReturnOpen] = useState(false);

  // Load Initial Metadata
  useEffect(() => {
    fetchOrderMetadata()
      .then(setOrderMetadata)
      .catch((err) => console.error('Error fetching order metadata:', err));

    fetchQuoteMetadata()
      .then(setQuoteMetadata)
      .catch((err) => console.error('Error fetching quote metadata:', err));

    fetchReturnMetadata()
      .then(setReturnMetadata)
      .catch((err) => console.error('Error fetching return metadata:', err));
  }, []);

  // Determine orderTypeId from sub-tab
  const getOrderTypeId = useCallback(() => {
    if (orderSubTab === 'sales') return 'SALES_ORDER';
    if (orderSubTab === 'purchase') return 'PURCHASE_ORDER';
    return undefined;
  }, [orderSubTab]);

  // Load Orders
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOrders({
        orderTypeId: getOrderTypeId(),
        statusId: selectedStatusId || undefined,
        searchKeyword: searchKeyword.trim() || undefined,
        partyId: selectedPartyId || undefined,
        viewIndex,
        viewSize,
      });
      setOrders(res.orders || []);
      setTotalOrdersCount(res.totalCount || 0);
      setOrderKPIs(res.kpis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [getOrderTypeId, selectedStatusId, searchKeyword, selectedPartyId, viewIndex, viewSize, common.error]);

  // Load Quotes
  const loadQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchQuotes({
        statusId: selectedStatusId || undefined,
        partyId: selectedPartyId || undefined,
        searchKeyword: searchKeyword.trim() || undefined,
        viewIndex,
        viewSize,
      });
      setQuotes(res.quotes || []);
      setTotalQuotesCount(res.totalCount || 0);
      setQuoteKPIs(res.kpis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatusId, selectedPartyId, searchKeyword, viewIndex, viewSize, common.error]);

  // Load Returns
  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchReturns({
        returnHeaderTypeId: selectedHeaderTypeId || undefined,
        statusId: selectedStatusId || undefined,
        searchKeyword: searchKeyword.trim() || undefined,
        viewIndex,
        viewSize,
      });
      setReturnsList(res.returns || []);
      setTotalReturnsCount(res.totalCount || 0);
      setReturnKPIs(res.kpis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [selectedHeaderTypeId, selectedStatusId, searchKeyword, viewIndex, viewSize, common.error]);

  // Dispatch Loader depending on active mainTab
  const refreshActiveData = useCallback(() => {
    if (mainTab === 'orders') {
      loadOrders();
    } else if (mainTab === 'quotes') {
      loadQuotes();
    } else if (mainTab === 'returns') {
      loadReturns();
    }
  }, [mainTab, loadOrders, loadQuotes, loadReturns]);

  useEffect(() => {
    refreshActiveData();
  }, [refreshActiveData]);

  // Tab switch handler
  const handleMainTabChange = (tab: MainTab) => {
    setMainTab(tab);
    setViewIndex(0);
    setSearchKeyword('');
    setSelectedStatusId('');
    setSelectedPartyId('');
    setSelectedHeaderTypeId('');
  };

  const handleOrderSubTabChange = (sub: OrderSubTab) => {
    setOrderSubTab(sub);
    setViewIndex(0);
  };

  // Formatters
  const formatCurrency = (val: number, uom = 'USD') => {
    try {
      return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
        style: 'currency',
        currency: uom || 'USD',
      }).format(val || 0);
    } catch {
      return `${(val || 0).toFixed(2)} ${uom}`;
    }
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

  // Memoized Options
  const partyOptions = useMemo(() => orderMetadata?.parties || [], [orderMetadata?.parties]);

  const getStatusBadge = (statusId: string, desc?: string) => {
    const text = desc || statusId;
    switch (statusId) {
      case 'ORDER_COMPLETED':
      case 'QUO_ORDERED':
      case 'RETURN_COMPLETED':
        return <span className="ds-badge ds-badge-green">{text}</span>;
      case 'ORDER_APPROVED':
      case 'QUO_APPROVED':
      case 'RETURN_ACCEPTED':
        return <span className="ds-badge ds-badge-blue">{text}</span>;
      case 'ORDER_CREATED':
      case 'ORDER_PROCESSING':
      case 'QUO_CREATED':
      case 'RETURN_REQUESTED':
        return <span className="ds-badge ds-badge-yellow">{text}</span>;
      case 'ORDER_CANCELLED':
      case 'ORDER_REJECTED':
      case 'QUO_REJECTED':
      case 'RETURN_CANCELLED':
        return <span className="ds-badge ds-badge-red">{text}</span>;
      case 'ORDER_HOLD':
        return <span className="ds-badge ds-badge-purple">{text}</span>;
      default:
        return <span className="ds-badge ds-badge-slate">{text}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="ds-page-header">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="ds-page-title">{t.title}</h1>
            <p className="ds-page-subtitle">
              OFBiz Kurumsal Sipariş, Teklif ve İade (OMS / RMA) Yönetim Merkezi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refreshActiveData}
            disabled={loading}
            className="ds-btn-secondary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{common.refresh}</span>
          </button>

          {mainTab === 'orders' && (
            <button
              onClick={() => setIsCreateOrderOpen(true)}
              className="ds-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createNewOrder}</span>
            </button>
          )}

          {mainTab === 'quotes' && (
            <button
              onClick={() => setIsCreateQuoteOpen(true)}
              className="ds-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createNewQuote}</span>
            </button>
          )}

          {mainTab === 'returns' && (
            <button
              onClick={() => setIsCreateReturnOpen(true)}
              className="ds-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createNewReturn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs (Siparişler / Teklifler / İadeler) */}
      <div className="ds-tab-bar">
        <button
          onClick={() => handleMainTabChange('orders')}
          className={`ds-tab ${mainTab === 'orders' ? 'ds-tab-active' : ''}`}
        >
          <ShoppingCart className="w-4 h-4 inline mr-2 text-indigo-400" />
          {t.ordersTab}
        </button>

        <button
          onClick={() => handleMainTabChange('quotes')}
          className={`ds-tab ${mainTab === 'quotes' ? 'ds-tab-active' : ''}`}
        >
          <FileCheck className="w-4 h-4 inline mr-2 text-sky-400" />
          {t.quotesTab}
        </button>

        <button
          onClick={() => handleMainTabChange('returns')}
          className={`ds-tab ${mainTab === 'returns' ? 'ds-tab-active' : ''}`}
        >
          <RotateCcw className="w-4 h-4 inline mr-2 text-amber-400" />
          {t.returnsTab}
        </button>
      </div>

      {/* KPI Cards based on mainTab */}
      {mainTab === 'orders' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ds-stat-card">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.totalOrdersCount}</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value mt-2">{orderKPIs.totalCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiTotal}: <span className="font-semibold text-slate-200">{formatCurrency(orderKPIs.totalAmount)}</span>
            </div>
          </div>

          <div className="ds-stat-card border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.pendingOrders}</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-amber-400 mt-2">{orderKPIs.pendingCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiPending}: <span className="font-semibold text-amber-300">{formatCurrency(orderKPIs.pendingAmount)}</span>
            </div>
          </div>

          <div className="ds-stat-card border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.approvedOrders}</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-blue-400 mt-2">{orderKPIs.approvedCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiApproved}: <span className="font-semibold text-blue-300">{formatCurrency(orderKPIs.approvedAmount)}</span>
            </div>
          </div>

          <div className="ds-stat-card border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.completedOrders}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-emerald-400 mt-2">{orderKPIs.completedCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiCompleted}: <span className="font-semibold text-emerald-300">{formatCurrency(orderKPIs.completedAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {mainTab === 'quotes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ds-stat-card">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.quotes}</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value mt-2">{quoteKPIs.totalQuotes}</div>
            <div className="ds-stat-sub mt-1">
              {t.quotesTab}
            </div>
          </div>

          <div className="ds-stat-card border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.initialStatus}</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-amber-400 mt-2">{quoteKPIs.createdQuotes}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiPending}
            </div>
          </div>

          <div className="ds-stat-card border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.kpiApproved}</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-blue-400 mt-2">{quoteKPIs.approvedQuotes}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiApproved}
            </div>
          </div>

          <div className="ds-stat-card border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.convertToOrder}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-emerald-400 mt-2">{quoteKPIs.orderedQuotes}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiCompleted}
            </div>
          </div>
        </div>
      )}

      {mainTab === 'returns' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ds-stat-card">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.returns}</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value mt-2">{returnKPIs.totalReturns}</div>
            <div className="ds-stat-sub mt-1">
              {t.returnsTab}
            </div>
          </div>

          <div className="ds-stat-card border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.kpiPending}</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-amber-400 mt-2">{returnKPIs.requestedCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiPending}
            </div>
          </div>

          <div className="ds-stat-card border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.kpiApproved}</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-blue-400 mt-2">{returnKPIs.acceptedCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiApproved}
            </div>
          </div>

          <div className="ds-stat-card border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="ds-stat-label">{t.kpiCompleted}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="ds-stat-value text-emerald-400 mt-2">{returnKPIs.completedCount}</div>
            <div className="ds-stat-sub mt-1">
              {t.kpiCompleted}
            </div>
          </div>
        </div>
      )}

      {/* Orders Sub-tabs (All / Sales / Purchase) */}
      {mainTab === 'orders' && (
        <div className="ds-pill-tab-bar mb-4 inline-flex">
          <button
            onClick={() => handleOrderSubTabChange('all')}
            className={`ds-pill-tab ${orderSubTab === 'all' ? 'ds-pill-tab-active' : ''}`}
          >
            {t.allOrders}
          </button>
          <button
            onClick={() => handleOrderSubTabChange('sales')}
            className={`ds-pill-tab ${orderSubTab === 'sales' ? 'ds-pill-tab-active' : ''}`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.salesOrders}</span>
          </button>
          <button
            onClick={() => handleOrderSubTabChange('purchase')}
            className={`ds-pill-tab ${orderSubTab === 'purchase' ? 'ds-pill-tab-active' : ''}`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.purchaseOrders}</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="ds-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), refreshActiveData())}
            placeholder={
              mainTab === 'orders'
                ? t.searchOrdersPlaceholder
                : mainTab === 'quotes'
                ? t.searchQuotesPlaceholder
                : t.searchReturnsPlaceholder
            }
            className="ds-input pl-9"
          />
        </div>

        {/* Status Dropdown */}
        <div>
          <select
            value={selectedStatusId}
            onChange={(e) => {
              setSelectedStatusId(e.target.value);
              setViewIndex(0);
            }}
            className="ds-select"
          >
            <option value="">-- {t.status} ({common.all}) --</option>
            {mainTab === 'orders' &&
              (orderMetadata?.orderStatuses || []).map((st) => (
                <option key={st.statusId} value={st.statusId}>
                  {st.description || st.statusId}
                </option>
              ))}
            {mainTab === 'quotes' &&
              (quoteMetadata?.quoteStatuses || []).map((st) => (
                <option key={st.statusId} value={st.statusId}>
                  {st.description || st.statusId}
                </option>
              ))}
            {mainTab === 'returns' &&
              (returnMetadata?.returnStatuses || []).map((st) => (
                <option key={st.statusId} value={st.statusId}>
                  {st.description || st.statusId}
                </option>
              ))}
          </select>
        </div>

        {/* Party / Type Dropdown */}
        {mainTab !== 'returns' ? (
          <div>
            <select
              value={selectedPartyId}
              onChange={(e) => {
                setSelectedPartyId(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select"
            >
              <option value="">-- {t.customerOrVendor} ({common.all}) --</option>
              {partyOptions.map((p) => (
                <option key={p.partyId} value={p.partyId}>
                  {p.name} ({p.partyId})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <select
              value={selectedHeaderTypeId}
              onChange={(e) => {
                setSelectedHeaderTypeId(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select"
            >
              <option value="">-- {t.returnHeaderType} ({common.all}) --</option>
              {(returnMetadata?.returnHeaderTypes || []).map((rt) => (
                <option key={rt.returnHeaderTypeId} value={rt.returnHeaderTypeId}>
                  {rt.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Button */}
        <div>
          <button
            type="button"
            onClick={refreshActiveData}
            className="ds-btn-primary w-full flex items-center justify-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>{common.filter}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="ds-alert-error flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: ORDERS TABLE */}
      {mainTab === 'orders' && (
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.orderId}</th>
                  <th className="ds-th">{t.orderType}</th>
                  <th className="ds-th">{t.orderName}</th>
                  <th className="ds-th">{t.customerOrVendor}</th>
                  <th className="ds-th">{t.orderDate}</th>
                  <th className="ds-th-right">{t.itemCount}</th>
                  <th className="ds-th-right">{t.totalAmount}</th>
                  <th className="ds-th">{t.status}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                      <div className="ds-spinner mx-auto mb-2" />
                      <span>{common.loading}</span>
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                orders.map((ord) => (
                  <tr
                    key={ord.orderId}
                    onClick={() => {
                      setSelectedOrderId(ord.orderId);
                      setIsOrderDetailOpen(true);
                    }}
                    className="ds-tbody-row cursor-pointer"
                  >
                    <td className="ds-td-mono font-bold text-indigo-400">{ord.orderId}</td>
                    <td className="ds-td">
                      <span
                        className={`inline-flex items-center space-x-1 text-xs font-semibold ${
                          ord.orderTypeId === 'SALES_ORDER' ? 'text-emerald-400' : 'text-blue-400'
                        }`}
                      >
                        {ord.orderTypeId === 'SALES_ORDER' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        )}
                        <span>{ord.orderTypeDesc || ord.orderTypeId}</span>
                      </span>
                    </td>
                    <td className="ds-td text-white font-medium">{ord.orderName || '-'}</td>
                    <td className="ds-td text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={ord.partyName || ord.partyId}>
                          {ord.partyName || ord.partyId || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="ds-td-mono text-slate-400">{formatDate(ord.orderDate)}</td>
                    <td className="ds-td-right font-mono text-slate-300">{ord.itemCount}</td>
                    <td className="ds-td-right font-mono font-bold text-emerald-400">
                      {formatCurrency(ord.grandTotal, ord.currencyUom)}
                    </td>
                    <td className="ds-td">{getStatusBadge(ord.statusId, ord.statusDesc)}</td>
                    <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(ord.orderId);
                          setIsOrderDetailOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={t.orderDetail}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500 italic">
                    {t.noOrdersFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTES TABLE */}
      {mainTab === 'quotes' && (
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.quoteId}</th>
                  <th className="ds-th">{t.quoteName}</th>
                  <th className="ds-th">{t.quoteType}</th>
                  <th className="ds-th">{t.party}</th>
                  <th className="ds-th">{t.issueDate}</th>
                  <th className="ds-th">{t.validThru}</th>
                  <th className="ds-th-right">{t.itemCount}</th>
                  <th className="ds-th-right">{t.totalAmount}</th>
                  <th className="ds-th">{t.status}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                      <div className="ds-spinner mx-auto mb-2" />
                      <span>{common.loading}</span>
                    </td>
                  </tr>
                ) : quotes.length > 0 ? (
                  quotes.map((q) => (
                    <tr
                      key={q.quoteId}
                      onClick={() => {
                        setSelectedQuoteId(q.quoteId);
                        setIsQuoteDetailOpen(true);
                      }}
                      className="ds-tbody-row cursor-pointer"
                    >
                      <td className="ds-td-mono font-bold text-sky-400">{q.quoteId}</td>
                      <td className="ds-td text-white font-medium">{q.quoteName || '-'}</td>
                      <td className="ds-td text-slate-300">{q.quoteTypeDesc || q.quoteTypeId}</td>
                      <td className="ds-td text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={q.partyName || q.partyId}>
                            {q.partyName || q.partyId || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="ds-td-mono text-slate-400">{formatDate(q.issueDate)}</td>
                      <td className="ds-td-mono text-slate-400">{formatDate(q.validThruDate)}</td>
                      <td className="ds-td-right font-mono text-slate-300">{q.itemCount}</td>
                      <td className="ds-td-right font-mono font-bold text-emerald-400">
                        {formatCurrency(q.totalAmount, q.currencyUomId)}
                      </td>
                      <td className="ds-td">{getStatusBadge(q.statusId, q.statusDesc)}</td>
                      <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuoteId(q.quoteId);
                            setIsQuoteDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title={t.quoteDetail}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-500 italic">
                      {t.noQuotesFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RETURNS TABLE */}
      {mainTab === 'returns' && (
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.returnId}</th>
                  <th className="ds-th">{t.returnHeaderType}</th>
                  <th className="ds-th">{t.party}</th>
                  <th className="ds-th">{t.orderDate}</th>
                  <th className="ds-th-right">{t.itemCount}</th>
                  <th className="ds-th-right">{t.totalAmount}</th>
                  <th className="ds-th">{t.status}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                      <div className="ds-spinner mx-auto mb-2" />
                      <span>{common.loading}</span>
                    </td>
                  </tr>
                ) : returnsList.length > 0 ? (
                  returnsList.map((ret) => (
                    <tr
                      key={ret.returnId}
                      onClick={() => {
                        setSelectedReturnId(ret.returnId);
                        setIsReturnDetailOpen(true);
                      }}
                      className="ds-tbody-row cursor-pointer"
                    >
                      <td className="ds-td-mono font-bold text-amber-400">{ret.returnId}</td>
                      <td className="ds-td text-slate-300">
                        <span className="font-medium text-white">
                          {ret.returnHeaderTypeId === 'CUSTOMER_RETURN' ? t.customerReturn : t.vendorReturn}
                        </span>
                      </td>
                      <td className="ds-td text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={ret.fromPartyName || ret.fromPartyId}>
                            {ret.fromPartyName || ret.fromPartyId || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="ds-td-mono text-slate-400">{formatDate(ret.entryDate)}</td>
                      <td className="ds-td-right font-mono text-slate-300">{ret.itemCount}</td>
                      <td className="ds-td-right font-mono font-bold text-emerald-400">
                        {formatCurrency(ret.totalAmount, ret.currencyUomId)}
                      </td>
                      <td className="ds-td">{getStatusBadge(ret.statusId, ret.statusDesc)}</td>
                      <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReturnId(ret.returnId);
                            setIsReturnDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title={t.returnDetail}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500 italic">
                      {t.noReturnsFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {((mainTab === 'orders' && totalOrdersCount > viewSize) ||
        (mainTab === 'quotes' && totalQuotesCount > viewSize) ||
        (mainTab === 'returns' && totalReturnsCount > viewSize)) && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-400">
          <div>
            {viewIndex * viewSize + 1} -{' '}
            {Math.min(
              (viewIndex + 1) * viewSize,
              mainTab === 'orders'
                ? totalOrdersCount
                : mainTab === 'quotes'
                ? totalQuotesCount
                : totalReturnsCount
            )}{' '}
            /{' '}
            {mainTab === 'orders'
              ? totalOrdersCount
              : mainTab === 'quotes'
              ? totalQuotesCount
              : totalReturnsCount}
          </div>
          <div className="flex space-x-2">
            <button
              disabled={viewIndex === 0}
              onClick={() => setViewIndex((v) => Math.max(0, v - 1))}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40"
            >
              {common.previous}
            </button>
            <button
              disabled={
                (viewIndex + 1) * viewSize >=
                (mainTab === 'orders'
                  ? totalOrdersCount
                  : mainTab === 'quotes'
                  ? totalQuotesCount
                  : totalReturnsCount)
              }
              onClick={() => setViewIndex((v) => v + 1)}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40"
            >
              {common.next}
            </button>
          </div>
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* 1. Create Order Modal */}
      {isCreateOrderOpen && (
        <CreateOrderModal
          isOpen={isCreateOrderOpen}
          onClose={() => setIsCreateOrderOpen(false)}
          onSuccess={(newOrderId) => {
            setIsCreateOrderOpen(false);
            loadOrders();
            setSelectedOrderId(newOrderId);
            setIsOrderDetailOpen(true);
          }}
          metadata={orderMetadata}
          initialOrderType={orderSubTab === 'purchase' ? 'PURCHASE_ORDER' : 'SALES_ORDER'}
        />
      )}

      {/* 2. Order Detail Modal */}
      {isOrderDetailOpen && (
        <OrderDetailModal
          isOpen={isOrderDetailOpen}
          onClose={() => {
            setIsOrderDetailOpen(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
          onOrderChanged={loadOrders}
        />
      )}

      {/* 3. Create Quote Modal */}
      {isCreateQuoteOpen && (
        <CreateQuoteModal
          isOpen={isCreateQuoteOpen}
          onClose={() => setIsCreateQuoteOpen(false)}
          onSuccess={(newQuoteId) => {
            setIsCreateQuoteOpen(false);
            loadQuotes();
            setSelectedQuoteId(newQuoteId);
            setIsQuoteDetailOpen(true);
          }}
          metadata={quoteMetadata}
        />
      )}

      {/* 4. Quote Detail Modal */}
      {isQuoteDetailOpen && (
        <QuoteDetailModal
          isOpen={isQuoteDetailOpen}
          onClose={() => {
            setIsQuoteDetailOpen(false);
            setSelectedQuoteId(null);
          }}
          quoteId={selectedQuoteId}
          onQuoteChanged={loadQuotes}
          onOrderCreated={(newOrderId) => {
            setIsQuoteDetailOpen(false);
            setMainTab('orders');
            loadOrders();
            setSelectedOrderId(newOrderId);
            setIsOrderDetailOpen(true);
          }}
        />
      )}

      {/* 5. Create Return Modal */}
      {isCreateReturnOpen && (
        <CreateReturnModal
          isOpen={isCreateReturnOpen}
          onClose={() => setIsCreateReturnOpen(false)}
          onSuccess={(newReturnId) => {
            setIsCreateReturnOpen(false);
            loadReturns();
            setSelectedReturnId(newReturnId);
            setIsReturnDetailOpen(true);
          }}
          metadata={returnMetadata}
          orderMetadata={orderMetadata}
        />
      )}

      {/* 6. Return Detail Modal */}
      {isReturnDetailOpen && (
        <ReturnDetailModal
          isOpen={isReturnDetailOpen}
          onClose={() => {
            setIsReturnDetailOpen(false);
            setSelectedReturnId(null);
          }}
          returnId={selectedReturnId}
          onReturnChanged={loadReturns}
        />
      )}
    </div>
  );
};
