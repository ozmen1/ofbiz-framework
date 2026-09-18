import React from 'react';
import { LayoutDashboard, FileText, CreditCard, PieChart, Settings, LogOut, Beaker, BookOpen, ScrollText, Landmark } from 'lucide-react';
import { ViewType } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const isInvoiceView = currentView === 'invoices' || currentView === 'create-invoice' || currentView === 'invoice-detail';
  const isPaymentView = currentView === 'payments' || currentView === 'create-payment' || currentView === 'payment-detail';
  const isFinAccountView = currentView === 'financial-accounts';
  const isJournalView = currentView === 'journal-entries' || currentView === 'create-journal-entry';
  const isAccountsView = currentView === 'chart-of-accounts';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        borderRight: '1px solid var(--glass-border)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, var(--primary), #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <PieChart size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>OFBiz Accounting</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
          />
          <SidebarItem 
            icon={<FileText size={20} />} 
            label="Invoices" 
            active={isInvoiceView} 
            onClick={() => onNavigate('invoices')} 
          />
          <SidebarItem 
            icon={<CreditCard size={20} />} 
            label="Payments" 
            active={isPaymentView} 
            onClick={() => onNavigate('payments')} 
          />
          <SidebarItem 
            icon={<Landmark size={20} />} 
            label="Kasa & Banka" 
            active={isFinAccountView} 
            onClick={() => onNavigate('financial-accounts')} 
          />
          <SidebarItem 
            icon={<BookOpen size={20} />} 
            label="Hesap Planı" 
            active={isAccountsView} 
            onClick={() => onNavigate('chart-of-accounts')} 
          />
          <SidebarItem 
            icon={<ScrollText size={20} />} 
            label="Yevmiye Fişleri" 
            active={isJournalView} 
            onClick={() => onNavigate('journal-entries')} 
          />
          <SidebarItem 
            icon={<PieChart size={20} />} 
            label="Reports" 
            active={currentView === 'reports'}
            onClick={() => onNavigate('reports')}
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Settings" 
          />
          <SidebarItem 
            icon={<Beaker size={20} />} 
            label="API Test" 
            active={currentView === 'test-page'} 
            onClick={() => onNavigate('test-page')} 
          />
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
          <SidebarItem icon={<LogOut size={20} />} label="Logout" />
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '3rem' 
        }}>
          <div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>
              {currentView === 'dashboard' && 'Welcome back'}
              {currentView === 'invoices' && 'Invoices'}
              {currentView === 'create-invoice' && 'Create New Invoice'}
              {currentView === 'invoice-detail' && 'Invoice Details'}
              {currentView === 'payments' && 'Payments'}
              {currentView === 'create-payment' && 'Create New Payment'}
              {currentView === 'payment-detail' && 'Payment Details'}
              {currentView === 'reports' && 'Mali Raporlar ve Tablolar'}
              {currentView === 'test-page' && 'API Test Sayfası'}
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {currentView === 'dashboard' && "Here's what's happening with your accounts today."}
              {currentView === 'invoices' && "Search and manage your invoices."}
              {currentView === 'create-invoice' && "Enter details for a new sales or purchase invoice."}
              {currentView === 'invoice-detail' && "View and edit invoice header information."}
              {currentView === 'payments' && "Manage customer receipts, vendor disbursements, and payment applications."}
              {currentView === 'create-payment' && "Record a new customer receipt or vendor disbursement."}
              {currentView === 'payment-detail' && "View payment details and match with invoices."}
              {currentView === 'reports' && "Mizan (Trial Balance), Bilanço, Gelir Tablosu ve Yaşlandırma Analizleri."}
              {currentView === 'test-page' && "OFBiz REST API entegrasyonu test sayfası."}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {isPaymentView ? (
              <button 
                className="btn-primary" 
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }} 
                onClick={() => onNavigate('create-payment')}
              >
                + New Payment
              </button>
            ) : (
              <button 
                className="btn-primary" 
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }} 
                onClick={() => onNavigate('create-invoice')}
              >
                + New Invoice
              </button>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <a href="#" onClick={(e) => { e.preventDefault(); if (onClick) onClick(); }} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    textDecoration: 'none',
    color: active ? 'white' : 'var(--text-muted)',
    background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
    fontWeight: active ? 600 : 400,
    border: active ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
  }}>
    <span style={{ color: active ? 'var(--primary)' : 'inherit' }}>{icon}</span>
    {label}
  </a>
);

export default Layout;
