import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, CreditCard, PieChart, Settings, LogOut,
  Beaker, BookOpen, ScrollText, Landmark, Layers, Percent, Layers2, Plus,
  Menu, X, Globe
} from 'lucide-react';
import { ViewType } from '../App';
import { useTranslation } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
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
const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { locale, setLocale, translations } = useTranslation();

  const isPaymentView = currentView === 'payments' || currentView === 'create-payment' || currentView === 'payment-detail';

  // Dinamik Sayfa Meta Bilgileri
  const pageMetaMap: Record<ViewType, { title: string; subtitle: string }> = {
    'dashboard':            translations.pages.dashboard,
    'invoices':             translations.pages.invoices,
    'create-invoice':       translations.pages.createInvoice,
    'invoice-detail':       translations.pages.invoiceDetail,
    'payments':             translations.pages.payments,
    'create-payment':       translations.pages.createPayment,
    'payment-detail':       translations.pages.paymentDetail,
    'payment-groups':       translations.pages.paymentGroups,
    'financial-accounts':   translations.pages.financialAccounts,
    'chart-of-accounts':    translations.pages.chartOfAccounts,
    'journal-entries':      translations.pages.journalEntries,
    'create-journal-entry': translations.pages.createJournalEntry,
    'reports':              translations.pages.reports,
    'advanced-accounting':  translations.pages.advancedAccounting,
    'tax-and-gl-mapping':   translations.pages.taxAndGlMapping,
    'test-page':            translations.pages.testPage,
  };

  const meta = pageMetaMap[currentView] || { title: currentView, subtitle: '' };

  // Dinamik Menü Grupları
  const navGroups = [
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
      ]
    },
    {
      label: translations.nav.generalLedger,
      items: [
        { icon: <BookOpen   size={18} />, label: translations.nav.chartOfAccounts, view: 'chart-of-accounts'  as ViewType },
        { icon: <ScrollText size={18} />, label: translations.nav.journalEntries,   view: 'journal-entries'    as ViewType },
        { icon: <PieChart   size={18} />, label: translations.nav.reports,          view: 'reports'            as ViewType },
      ]
    },
    {
      label: translations.nav.advancedAccounting,
      items: [
        { icon: <Layers   size={18} />, label: translations.nav.assetsAndBudget, view: 'advanced-accounting' as ViewType },
        { icon: <Percent  size={18} />, label: translations.nav.taxAndGl,         view: 'tax-and-gl-mapping'  as ViewType },
      ]
    },
    {
      label: translations.nav.system,
      items: [
        { icon: <Beaker   size={18} />, label: translations.nav.apiTest, view: 'test-page' as ViewType },
        { icon: <Settings size={18} />, label: translations.nav.settings, view: null as any },
      ]
    }
  ];

  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  // Dil Değiştirici Buton Bileşeni
  const LanguageToggle = ({ className = '' }: { className?: string }) => (
    <div className={`flex items-center bg-slate-800/90 border border-slate-700/70 rounded-xl p-0.5 shadow-inner ${className}`}>
      <button
        type="button"
        onClick={() => setLocale('tr')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
          locale === 'tr'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Türkçe"
      >
        <span>🇹🇷</span>
        <span>TR</span>
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
          locale === 'en'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-white relative">
      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
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
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Grupları */}
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
                    <a
                      key={item.label}
                      href="#"
                      onClick={e => { e.preventDefault(); if (item.view) handleNavClick(item.view); }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <span className={active ? 'text-indigo-400' : 'text-slate-500'}>{item.icon}</span>
                      {item.label}
                    </a>
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

          <a href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all">
            <LogOut size={18} className="text-slate-600" />
            {translations.nav.logout}
          </a>
        </div>
      </aside>

      {/* ── İçerik Alanı ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Üst Bar (Sticky & Mobile-friendly) */}
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors shrink-0"
              aria-label="Menüyü Aç"
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
              <button className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4" onClick={() => onNavigate('create-payment')}>
                <Plus size={16} /> 
                <span className="hidden sm:inline">{translations.nav.newPayment}</span>
                <span className="sm:hidden">{translations.nav.newPayment.split(' ')[1] || 'Payment'}</span>
              </button>
            ) : (
              <button className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4" onClick={() => onNavigate('create-invoice')}>
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
