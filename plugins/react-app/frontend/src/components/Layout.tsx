import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, FileText, CreditCard, Settings, LogOut,
  Beaker, BookOpen, ScrollText, Landmark, Layers, Percent, Layers2,
  Menu, X, Globe, Calendar, TrendingUp, Target, Building2, SlidersHorizontal,
  ShieldCheck, FileCheck, BadgePercent, ChevronDown, ChevronRight,
  ShoppingCart, Factory, Warehouse, Calculator, Sparkles, Users,
  Key, User, Shield
} from 'lucide-react';
import { ViewType } from '../App';
import { useTranslation } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isPending?: boolean;
}

const isAccountingView = (view: ViewType): boolean => {
  return [
    'dashboard',
    'invoices',
    'create-invoice',
    'invoice-detail',
    'payments',
    'create-payment',
    'payment-detail',
    'payment-groups',
    'financial-accounts',
    'deposit-slips',
    'chart-of-accounts',
    'journal-entries',
    'create-journal-entry',
    'fiscal-periods',
    'reports',
    'advanced-accounting',
    'tax-and-gl-mapping',
    'fx-rates',
    'cost-centers',
    'accounting-preferences',
    'payment-gateways',
    'check-run',
    'commission-run',
  ].includes(view);
};

function isNavActive(itemView: ViewType | null, currentView: ViewType): boolean {
  if (!itemView) return false;
  if (currentView === itemView) return true;
  if (itemView === 'invoices' && ['create-invoice', 'invoice-detail'].includes(currentView)) return true;
  if (itemView === 'payments' && ['create-payment', 'payment-detail'].includes(currentView)) return true;
  if (itemView === 'journal-entries' && currentView === 'create-journal-entry') return true;
  return false;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, isPending }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { locale, setLocale, translations } = useTranslation();
  const { user, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Accordion state for expandable modules
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({
    accounting: true,
    orders: false,
    manufacturing: false,
    inventory: false,
  });

  const toggleModule = (moduleKey: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  // Dinamik Sayfa Meta Bilgileri (Memoized to prevent object re-creation on pointer events)
  const pageMetaMap: Record<ViewType, { title: string; subtitle: string }> = useMemo(() => ({
    'dashboard':              translations.pages.dashboard,
    'invoices':               translations.pages.invoices,
    'create-invoice':         translations.pages.createInvoice,
    'invoice-detail':         translations.pages.invoiceDetail,
    'payments':               translations.pages.payments,
    'create-payment':         translations.pages.createPayment,
    'payment-detail':         translations.pages.paymentDetail,
    'payment-groups':         translations.pages.paymentGroups,
    'financial-accounts':     translations.pages.financialAccounts,
    'deposit-slips':          translations.pages.depositSlips,
    'chart-of-accounts':      translations.pages.chartOfAccounts,
    'journal-entries':        translations.pages.journalEntries,
    'create-journal-entry':   translations.pages.createJournalEntry,
    'fiscal-periods':         translations.pages.fiscalPeriods,
    'reports':                translations.pages.reports,
    'advanced-accounting':    translations.pages.advancedAccounting,
    'tax-and-gl-mapping':     translations.pages.taxAndGlMapping,
    'fx-rates':               translations.pages.fxRates,
    'cost-centers':           translations.pages.costCenters,
    'accounting-preferences': translations.pages.accountingPreferences,
    'payment-gateways':       translations.pages.paymentGateways,
    'check-run':              translations.pages.checkRun,
    'commission-run':         translations.pages.commissionRun,
    'test-page':              translations.pages.testPage,
    'orders':                 translations.pages.orders,
    'manufacturing':          translations.pages.manufacturing,
    'inventory':              translations.pages.inventory,
    'parties':                translations.pages.parties,
    'users':                  translations.pages.users,
    'system-admin':           translations.pages.systemAdmin,
  }), [translations]);

  const meta = pageMetaMap[currentView] || { title: currentView, subtitle: '' };

  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  // Flag Icon Components (Pure SVG, 4:3 ratio, universal cross-platform rendering)
  const TrFlag = ({ className = "w-4 h-3 rounded-[2px] shrink-0" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className={className} aria-hidden="true">
      <g fillRule="evenodd">
        <path fill="#e30a17" d="M0 0h640v480H0z"/>
        <path fill="#fff" d="M407 247.5c0 66.2-54.6 119.9-122 119.9s-122-53.7-122-120 54.6-119.8 122-119.8 122 53.7 122 119.9"/>
        <path fill="#e30a17" d="M413 247.5c0 53-43.6 95.9-97.5 95.9s-97.6-43-97.6-96 43.7-95.8 97.6-95.8 97.6 42.9 97.6 95.9z"/>
        <path fill="#fff" d="m430.7 191.5-1 44.3-41.3 11.2 40.8 14.5-1 40.7 26.5-31.8 40.2 14-23.2-34.1 28.3-33.9-43.5 12-25.8-37z"/>
      </g>
    </svg>
  );

  const GbFlag = ({ className = "w-4 h-3 rounded-[2px] shrink-0" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className={className} aria-hidden="true">
      <path fill="#012169" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"/>
      <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"/>
      <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z"/>
      <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z"/>
    </svg>
  );

  // Dil Değiştirici Buton Bileşeni
  const LanguageToggle = ({ className = '' }: { className?: string }) => (
    <div className={`flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shadow-inner ${className}`}>
      <button
        type="button"
        onClick={() => setLocale('tr')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
          locale === 'tr'
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Türkçe"
      >
        <TrFlag className="w-4 h-3 rounded-[2px] shrink-0 shadow-xs" />
        <span>TR</span>
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
          locale === 'en'
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="English"
      >
        <GbFlag className="w-4 h-3 rounded-[2px] shrink-0 shadow-xs" />
        <span>EN</span>
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-white relative">
      {/* ── Top Progress Bar during view transition ── */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden bg-slate-800 pointer-events-none">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-400 to-indigo-500 w-full animate-pulse"></div>
        </div>
      )}

      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar (Responsive: Drawer on mobile, Sticky on desktop) ── */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-72 shrink-0 
        border-r border-slate-800 bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-xl 
        flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        {/* Logo & Mobile Close */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">{translations.nav.appName}</span>
              <p className="text-xs text-slate-500">{translations.nav.appSubtitle}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Menü Navigasyonu ── */}
        <nav className="flex-1 px-3 py-4 space-y-6">
          {/* 1. Genel Bakış / Dashboard */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1.5">
              {translations.nav.mainMenu}
            </p>
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <LayoutDashboard size={18} className={currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="truncate">{translations.nav.dashboard}</span>
            </button>
          </div>

          {/* 2. Kurumsal Modüller (ERP Modules) */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1">
              {translations.nav.modules}
            </p>

            {/* ── MODÜL: CARİ & TARAF YÖNETİMİ (Party Master Data - Aktif) ── */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
              <button
                type="button"
                onClick={() => handleNavClick('parties')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  currentView === 'parties'
                    ? 'text-indigo-300 bg-indigo-500/15 border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Users size={16} />
                  </div>
                  <span>{translations.nav.parties}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {translations.nav.activeModule}
                </span>
              </button>
            </div>

            {/* ── MODÜL 1: MUHASEBE & FİNANS (Genişletilebilir Akordiyon) ── */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
              {/* Modül Başlık Butonu */}
              <button
                type="button"
                onClick={() => toggleModule('accounting')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  isAccountingView(currentView)
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Calculator size={16} />
                  </div>
                  <span>{translations.nav.accounting}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {translations.nav.activeModule}
                  </span>
                  {expandedModules.accounting ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Muhasebe Alt Menüleri */}
              {expandedModules.accounting && (
                <div className="px-2 py-2 space-y-4 bg-slate-950/30 border-t border-slate-800/60">
                  {/* A. İşlemler */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                      {translations.nav.operations}
                    </p>
                    <div className="space-y-0.5">
                      {[
                        { icon: <FileText size={16} />, label: translations.nav.invoices, view: 'invoices' as ViewType },
                        { icon: <CreditCard size={16} />, label: translations.nav.payments, view: 'payments' as ViewType },
                        { icon: <Layers2 size={16} />, label: translations.nav.paymentGroups, view: 'payment-groups' as ViewType },
                        { icon: <Landmark size={16} />, label: translations.nav.cashAndBank, view: 'financial-accounts' as ViewType },
                        { icon: <Building2 size={16} />, label: translations.nav.depositSlips, view: 'deposit-slips' as ViewType },
                        { icon: <FileCheck size={16} />, label: translations.nav.checkRun, view: 'check-run' as ViewType },
                        { icon: <BadgePercent size={16} />, label: translations.nav.commissionRun, view: 'commission-run' as ViewType },
                        { icon: <ShieldCheck size={16} />, label: translations.nav.paymentGateways, view: 'payment-gateways' as ViewType },
                      ].map(item => {
                        const active = isNavActive(item.view, currentView);
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleNavClick(item.view)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                              active
                                ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                            }`}
                          >
                            <span className={active ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* B. Genel Muhasebe (General Ledger) */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                      {translations.nav.generalLedger}
                    </p>
                    <div className="space-y-0.5">
                      {[
                        { icon: <BookOpen size={16} />, label: translations.nav.chartOfAccounts, view: 'chart-of-accounts' as ViewType },
                        { icon: <ScrollText size={16} />, label: translations.nav.journalEntries, view: 'journal-entries' as ViewType },
                        { icon: <Calendar size={16} />, label: translations.nav.fiscalPeriods, view: 'fiscal-periods' as ViewType },
                        { icon: <TrendingUp size={16} />, label: translations.nav.reports, view: 'reports' as ViewType },
                      ].map(item => {
                        const active = isNavActive(item.view, currentView);
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleNavClick(item.view)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                              active
                                ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                            }`}
                          >
                            <span className={active ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* C. Bütçe, Varlık & Yapılandırma */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                      {translations.nav.advancedAccounting}
                    </p>
                    <div className="space-y-0.5">
                      {[
                        { icon: <Layers size={16} />, label: translations.nav.assetsAndBudget, view: 'advanced-accounting' as ViewType },
                        { icon: <Target size={16} />, label: translations.nav.costCenters, view: 'cost-centers' as ViewType },
                        { icon: <Percent size={16} />, label: translations.nav.taxAndGl, view: 'tax-and-gl-mapping' as ViewType },
                        { icon: <TrendingUp size={16} />, label: translations.nav.fxRates, view: 'fx-rates' as ViewType },
                        { icon: <SlidersHorizontal size={16} />, label: translations.nav.accountingPreferences, view: 'accounting-preferences' as ViewType },
                      ].map(item => {
                        const active = isNavActive(item.view, currentView);
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleNavClick(item.view)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                              active
                                ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                            }`}
                          >
                            <span className={active ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── MODÜL 2: SİPARİŞ YÖNETİMİ (Order Management) ── */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  toggleModule('orders');
                  handleNavClick('orders');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  currentView === 'orders'
                    ? 'text-amber-300 bg-amber-500/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <ShoppingCart size={16} />
                  </div>
                  <span>{translations.nav.orderManagement}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {translations.nav.comingSoon}
                  </span>
                  {expandedModules.orders ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </div>
              </button>

              {expandedModules.orders && (
                <div className="px-2 py-2 space-y-0.5 bg-slate-950/30 border-t border-slate-800/60">
                  {[
                    { label: translations.nav.salesOrders, view: 'orders' as ViewType },
                    { label: translations.nav.purchaseOrders, view: 'orders' as ViewType },
                    { label: translations.nav.orderQuotes, view: 'orders' as ViewType },
                  ].map(sub => (
                    <button
                      key={sub.label}
                      type="button"
                      onClick={() => handleNavClick(sub.view)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-800/50 text-left transition-all cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60"></span>
                      <span className="truncate">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── MODÜL 3: ÜRETİM YÖNETİMİ (Manufacturing) ── */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  toggleModule('manufacturing');
                  handleNavClick('manufacturing');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  currentView === 'manufacturing'
                    ? 'text-emerald-300 bg-emerald-500/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Factory size={16} />
                  </div>
                  <span>{translations.nav.manufacturing}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {translations.nav.comingSoon}
                  </span>
                  {expandedModules.manufacturing ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </div>
              </button>

              {expandedModules.manufacturing && (
                <div className="px-2 py-2 space-y-0.5 bg-slate-950/30 border-t border-slate-800/60">
                  {[
                    { label: translations.nav.productionRuns, view: 'manufacturing' as ViewType },
                    { label: translations.nav.billOfMaterials, view: 'manufacturing' as ViewType },
                    { label: translations.nav.routings, view: 'manufacturing' as ViewType },
                  ].map(sub => (
                    <button
                      key={sub.label}
                      type="button"
                      onClick={() => handleNavClick(sub.view)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 text-left transition-all cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60"></span>
                      <span className="truncate">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── MODÜL 4: DEPO & STOK (Inventory / Facility) ── */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  toggleModule('inventory');
                  handleNavClick('inventory');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  currentView === 'inventory'
                    ? 'text-cyan-300 bg-cyan-500/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Warehouse size={16} />
                  </div>
                  <span>{translations.nav.inventory}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {translations.nav.comingSoon}
                  </span>
                  {expandedModules.inventory ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </div>
              </button>

              {expandedModules.inventory && (
                <div className="px-2 py-2 space-y-0.5 bg-slate-950/30 border-t border-slate-800/60">
                  {[
                    { label: translations.nav.facilities, view: 'inventory' as ViewType },
                    { label: translations.nav.inventoryTransfers, view: 'inventory' as ViewType },
                    { label: translations.nav.physicalInventory, view: 'inventory' as ViewType },
                  ].map(sub => (
                    <button
                      key={sub.label}
                      type="button"
                      onClick={() => handleNavClick(sub.view)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50 text-left transition-all cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"></span>
                      <span className="truncate">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Sistem & Araçlar */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1.5">
              {translations.nav.system}
            </p>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleNavClick('users')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer ${
                  currentView === 'users'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Shield size={18} className={currentView === 'users' ? 'text-indigo-400' : 'text-slate-500'} />
                <span className="truncate">{translations.nav.users}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('test-page')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer ${
                  currentView === 'test-page'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Beaker size={18} className={currentView === 'test-page' ? 'text-indigo-400' : 'text-slate-500'} />
                <span className="truncate">{translations.nav.apiTest}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('system-admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer ${
                  currentView === 'system-admin'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Settings size={18} className={currentView === 'system-admin' ? 'text-indigo-400' : 'text-slate-500'} />
                <span className="truncate">{translations.nav.systemAdmin}</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Kullanıcı Profili ve Oturum Kapat */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          {user && (
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{user.userLoginId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title={translations.auth.changePassword}
                  className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Key size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700/40">
                {user.isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <Shield size={10} />
                    <span>{translations.auth.adminBadge}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300">
                    <User size={10} />
                    <span>{user.securityGroups[0]?.groupId || translations.auth.userBadge}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Dil Seçici (Mobil Drawer İçin) */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-indigo-400" />
              Dil / Language
            </span>
            <LanguageToggle />
          </div>

          {/* Oturumu Kapat */}
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-left cursor-pointer"
          >
            <LogOut size={18} className="text-rose-400" />
            <span>{translations.nav.logout}</span>
          </button>
        </div>
      </aside>

      {/* ── İçerik Alanı ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Üst Bar (Sticky & Mobile-friendly) */}
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
              aria-label={locale === 'tr' ? 'Menüyü Aç' : 'Open Menu'}
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                {meta?.title || ''}
              </h2>
              {meta?.subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{meta.subtitle}</p>
              )}
            </div>
          </div>

          {/* Sağ Alan: Dil Değiştirici ve Hızlı İşlem Butonu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Masaüstü Dil Değiştirici */}
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>

            {/* Masaüstü Kullanıcı Bilgi Çipi */}
            {user && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white leading-none">{user.displayName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">{user.userLoginId}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Sayfa İçeriği (Responsive Padding) */}
        <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>

      {/* Şifre Değiştirme Modalı */}
      {isChangePasswordOpen && user && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          username={user.userLoginId}
        />
      )}
    </div>
  );
};

export default Layout;
