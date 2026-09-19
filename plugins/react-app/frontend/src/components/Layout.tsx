import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, FileText, CreditCard, PieChart, Settings, LogOut,
  Beaker, BookOpen, ScrollText, Landmark, Layers, Percent, Layers2, Plus,
  Menu, X, Globe, Calendar, TrendingUp, Target, Building2, SlidersHorizontal, ShieldCheck, FileCheck, BadgePercent
} from 'lucide-react';
import { ViewType } from '../App';
import { useTranslation } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isPending?: boolean;
}

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

  const isPaymentView = currentView === 'payments' || currentView === 'create-payment' || currentView === 'payment-detail';

  // Dinamik Sayfa Meta Bilgileri (Memoized to prevent object re-creation on pointer events)
  const pageMetaMap: Record<ViewType, { title: string; subtitle: string }> = useMemo(() => ({
    'dashboard':            translations.pages.dashboard,
    'invoices':             translations.pages.invoices,
    'create-invoice':       translations.pages.createInvoice,
    'invoice-detail':       translations.pages.invoiceDetail,
    'payments':             translations.pages.payments,
    'create-payment':       translations.pages.createPayment,
    'payment-detail':       translations.pages.paymentDetail,
    'payment-groups':       translations.pages.paymentGroups,
    'financial-accounts':   translations.pages.financialAccounts,
    'deposit-slips':        translations.pages.depositSlips,
    'chart-of-accounts':    translations.pages.chartOfAccounts,
    'journal-entries':      translations.pages.journalEntries,
    'create-journal-entry': translations.pages.createJournalEntry,
    'fiscal-periods':       translations.pages.fiscalPeriods,
    'reports':              translations.pages.reports,
    'advanced-accounting':  translations.pages.advancedAccounting,
    'tax-and-gl-mapping':   translations.pages.taxAndGlMapping,
    'fx-rates':             translations.pages.fxRates,
    'cost-centers':         translations.pages.costCenters,
    'accounting-preferences': translations.pages.accountingPreferences,
    'payment-gateways':     translations.pages.paymentGateways,
    'check-run':            translations.pages.checkRun,
    'commission-run':       translations.pages.commissionRun,
    'test-page':            translations.pages.testPage,
  }), [translations]);

  const meta = pageMetaMap[currentView] || { title: currentView, subtitle: '' };

  // Dinamik Menü Grupları (Memoized)
  const navGroups = useMemo(() => [
    {
      label: translations.nav.mainMenu,
      items: [
        { icon: <LayoutDashboard size={18} />, label: translations.nav.dashboard, view: 'dashboard' as ViewType },
      ]
    },
    {
      label: translations.nav.accounting,
      items: [
        { icon: <FileText   size={18} />, label: translations.nav.invoices,       view: 'invoices'           as ViewType },
        { icon: <CreditCard size={18} />, label: translations.nav.payments,       view: 'payments'           as ViewType },
        { icon: <Layers2    size={18} />, label: translations.nav.paymentGroups,   view: 'payment-groups'     as ViewType },
        { icon: <Landmark   size={18} />, label: translations.nav.cashAndBank,     view: 'financial-accounts' as ViewType },
        { icon: <Building2  size={18} />, label: translations.nav.depositSlips,    view: 'deposit-slips'      as ViewType },
        { icon: <FileCheck  size={18} />, label: translations.nav.checkRun,        view: 'check-run'          as ViewType },
        { icon: <BadgePercent size={18} />, label: translations.nav.commissionRun, view: 'commission-run'     as ViewType },
        { icon: <ShieldCheck size={18} />, label: translations.nav.paymentGateways, view: 'payment-gateways' as ViewType },
      ]
    },
    {
      label: translations.nav.generalLedger,
      items: [
        { icon: <BookOpen   size={18} />, label: translations.nav.chartOfAccounts, view: 'chart-of-accounts'  as ViewType },
        { icon: <ScrollText size={18} />, label: translations.nav.journalEntries,   view: 'journal-entries'    as ViewType },
        { icon: <Calendar   size={18} />, label: translations.nav.fiscalPeriods,    view: 'fiscal-periods'     as ViewType },
        { icon: <PieChart   size={18} />, label: translations.nav.reports,          view: 'reports'            as ViewType },
      ]
    },
    {
      label: translations.nav.advancedAccounting,
      items: [
        { icon: <Layers     size={18} />, label: translations.nav.assetsAndBudget, view: 'advanced-accounting' as ViewType },
        { icon: <Percent    size={18} />, label: translations.nav.taxAndGl,         view: 'tax-and-gl-mapping'  as ViewType },
        { icon: <TrendingUp size={18} />, label: translations.nav.fxRates,          view: 'fx-rates'            as ViewType },
        { icon: <Target     size={18} />, label: translations.nav.costCenters,      view: 'cost-centers'        as ViewType },
        { icon: <SlidersHorizontal size={18} />, label: translations.nav.accountingPreferences, view: 'accounting-preferences' as ViewType },
      ]
    },
    {
      label: translations.nav.system,
      items: [
        { icon: <Beaker   size={18} />, label: translations.nav.apiTest, view: 'test-page' as ViewType },
        { icon: <Settings size={18} />, label: translations.nav.settings, view: null as any },
      ]
    }
  ], [translations]);

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
    <div className={`flex items-center bg-slate-800/90 border border-slate-700/70 rounded-xl p-0.5 shadow-inner ${className}`}>
      <button
        type="button"
        onClick={() => setLocale('tr')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
          locale === 'tr'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white'
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
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white'
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <PieChart size={20} className="text-white" />
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

        {/* Nav Grupları (Rendered as semantic button elements for sub-16ms pointer response) */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = isNavActive(item.view, currentView);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { if (item.view) handleNavClick(item.view); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <span className={active ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Dil Seçici (Mobil Drawer İçin) ve Logout */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-indigo-400" />
              Dil / Language
            </span>
            <LanguageToggle />
          </div>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all text-left cursor-pointer"
          >
            <LogOut size={18} className="text-slate-600" />
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

            {/* Quick Action Button */}
            {isPaymentView ? (
              <button type="button" className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4" onClick={() => onNavigate('create-payment')}>
                <Plus size={16} /> 
                <span className="hidden sm:inline">{translations.nav.newPayment}</span>
                <span className="sm:hidden">{translations.nav.newPayment.split(' ')[1] || 'Payment'}</span>
              </button>
            ) : (
              <button type="button" className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4" onClick={() => onNavigate('create-invoice')}>
                <Plus size={16} /> 
                <span className="hidden sm:inline">{translations.nav.newInvoice}</span>
                <span className="sm:hidden">{translations.nav.newInvoice.split(' ')[1] || 'Invoice'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Sayfa İçeriği (Responsive Padding) */}
        <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
