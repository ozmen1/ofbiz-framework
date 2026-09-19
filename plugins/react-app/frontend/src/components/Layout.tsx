import React from 'react';
import {
  LayoutDashboard, FileText, CreditCard, PieChart, Settings, LogOut,
  Beaker, BookOpen, ScrollText, Landmark, Layers, Percent, Layers2, Plus
} from 'lucide-react';
import { ViewType } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

// ─── Sayfa meta bilgileri ────────────────────────────────────────────────────
const PAGE_META: Partial<Record<ViewType, { title: string; subtitle: string }>> = {
  'dashboard':            { title: 'Dashboard',                subtitle: "Today's financial activity at a glance." },
  'invoices':             { title: 'Faturalar',                subtitle: 'Tüm satış ve alış faturalarınızı görüntüleyin.' },
  'create-invoice':       { title: 'Yeni Fatura',              subtitle: 'Yeni bir satış veya alış faturası oluşturun.' },
  'invoice-detail':       { title: 'Fatura Detayı',            subtitle: 'Fatura başlık bilgilerini görüntüleyin ve düzenleyin.' },
  'payments':             { title: 'Ödemeler',                  subtitle: 'Tahsilat ve tediye kayıtlarını yönetin.' },
  'create-payment':       { title: 'Yeni Ödeme',               subtitle: 'Yeni bir tahsilat veya tediye kaydı oluşturun.' },
  'payment-detail':       { title: 'Ödeme Detayı',             subtitle: 'Ödeme detaylarını görüntüleyin ve faturalarla eşleştirin.' },
  'payment-groups':       { title: 'Ödeme Grupları',           subtitle: 'Toplu tahsilat fişleri ve EFT bordrolarını yönetin.' },
  'financial-accounts':   { title: 'Kasa & Banka',             subtitle: 'Finansal hesaplar, virman ve banka mutabakatı.' },
  'chart-of-accounts':    { title: 'Hesap Planı',              subtitle: 'GL hesapları ve muhasebe ağacını yönetin.' },
  'journal-entries':      { title: 'Yevmiye Fişleri',          subtitle: 'Muhasebe kayıtlarını görüntüleyin ve oluşturun.' },
  'create-journal-entry': { title: 'Yeni Yevmiye Fişi',        subtitle: 'Manuel muhasebe kaydı oluşturun.' },
  'reports':              { title: 'Mali Raporlar',             subtitle: 'Mizan, Bilanço, Gelir Tablosu ve Yaşlandırma.' },
  'advanced-accounting':  { title: 'Varlık & Bütçe',           subtitle: 'Cari hesaplar, sabit varlıklar ve bütçe yönetimi.' },
  'tax-and-gl-mapping':   { title: 'Vergi & GL Eşlemeleri',    subtitle: 'Vergi otoriteler, oranları ve otomatik GL hesap eşlemeleri.' },
  'test-page':            { title: 'API Test',                  subtitle: 'OFBiz REST API entegrasyonu test sayfası.' },
};

// ─── Navigasyon grupları ─────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Ana Menü',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard',      view: 'dashboard'          as ViewType },
    ]
  },
  {
    label: 'Muhasebe',
    items: [
      { icon: <FileText   size={18} />, label: 'Faturalar',       view: 'invoices'           as ViewType },
      { icon: <CreditCard size={18} />, label: 'Ödemeler',         view: 'payments'           as ViewType },
      { icon: <Layers2    size={18} />, label: 'Ödeme Grupları',   view: 'payment-groups'     as ViewType },
      { icon: <Landmark   size={18} />, label: 'Kasa & Banka',     view: 'financial-accounts' as ViewType },
    ]
  },
  {
    label: 'Genel Muhasebe',
    items: [
      { icon: <BookOpen   size={18} />, label: 'Hesap Planı',      view: 'chart-of-accounts'  as ViewType },
      { icon: <ScrollText size={18} />, label: 'Yevmiye Fişleri',  view: 'journal-entries'    as ViewType },
      { icon: <PieChart   size={18} />, label: 'Raporlar',         view: 'reports'            as ViewType },
    ]
  },
  {
    label: 'İleri Muhasebe',
    items: [
      { icon: <Layers   size={18} />, label: 'Varlık & Bütçe',  view: 'advanced-accounting' as ViewType },
      { icon: <Percent  size={18} />, label: 'Vergi & GL',       view: 'tax-and-gl-mapping'  as ViewType },
    ]
  },
  {
    label: 'Sistem',
    items: [
      { icon: <Beaker   size={18} />, label: 'API Test', view: 'test-page' as ViewType },
      { icon: <Settings size={18} />, label: 'Ayarlar',  view: null as any },
    ]
  }
];

// Hangi view'ın hangi nav item'ını aktif ettiğini belirle
function isNavActive(itemView: ViewType | null, currentView: ViewType): boolean {
  if (!itemView) return false;
  if (currentView === itemView) return true;
  // Gruplar
  if (itemView === 'invoices' && ['create-invoice', 'invoice-detail'].includes(currentView)) return true;
  if (itemView === 'payments' && ['create-payment', 'payment-detail'].includes(currentView)) return true;
  if (itemView === 'journal-entries' && currentView === 'create-journal-entry') return true;
  return false;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const meta = PAGE_META[currentView];
  const isPaymentView = currentView === 'payments' || currentView === 'create-payment' || currentView === 'payment-detail';

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-col sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <PieChart size={20} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">OFBiz Accounting</span>
            <p className="text-xs text-slate-500">Finansal Yönetim</p>
          </div>
        </div>

        {/* Nav Grupları */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {NAV_GROUPS.map(group => (
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
                      onClick={e => { e.preventDefault(); if (item.view) onNavigate(item.view); }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-medium'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <span className={active ? 'text-indigo-400' : 'text-slate-600'}>{item.icon}</span>
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <a href="#"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all">
            <LogOut size={18} className="text-slate-600" />
            Çıkış Yap
          </a>
        </div>
      </aside>

      {/* ── İçerik Alanı ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Üst Bar */}
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white leading-none">
              {meta?.title || ''}
            </h2>
            {meta?.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
            )}
          </div>
          <div className="flex gap-3">
            {isPaymentView ? (
              <button className="ds-btn-primary" onClick={() => onNavigate('create-payment')}>
                <Plus size={16} /> Yeni Ödeme
              </button>
            ) : (
              <button className="ds-btn-primary" onClick={() => onNavigate('create-invoice')}>
                <Plus size={16} /> Yeni Fatura
              </button>
            )}
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
