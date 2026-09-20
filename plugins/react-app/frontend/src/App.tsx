import { useState, lazy, Suspense, useTransition, useCallback } from 'react'
import Layout from './components/Layout'
import ViewLoader from './components/ViewLoader'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './components/LoginPage'
import { I18nProvider } from './i18n'
import { AuthProvider, useAuth } from './context/AuthContext'
import './index.css'
import './design-system.css'

// Dynamic lazy loaded screen components
const AccountingDashboard = lazy(() => import('./components/AccountingDashboard'))
const InvoiceList = lazy(() => import('./components/InvoiceList'))
const CreateInvoice = lazy(() => import('./components/CreateInvoice'))
const InvoiceDetail = lazy(() => import('./components/InvoiceDetail'))
const PaymentList = lazy(() => import('./components/PaymentList'))
const CreatePayment = lazy(() => import('./components/CreatePayment'))
const PaymentDetail = lazy(() => import('./components/PaymentDetail'))
const PaymentGroups = lazy(() => import('./components/PaymentGroups'))
const FinancialReports = lazy(() => import('./components/FinancialReports'))
const ChartOfAccounts = lazy(() => import('./components/ChartOfAccounts'))
const JournalEntries = lazy(() => import('./components/JournalEntries'))
const CreateJournalEntry = lazy(() => import('./components/CreateJournalEntry'))
const FinancialAccounts = lazy(() => import('./components/FinancialAccounts'))
const AdvancedAccounting = lazy(() => import('./components/AdvancedAccounting'))
const TaxAndGlMapping = lazy(() => import('./components/TaxAndGlMapping').then(m => ({ default: m.TaxAndGlMapping })))
const FiscalPeriods = lazy(() => import('./components/FiscalPeriods').then(m => ({ default: m.FiscalPeriods })))
const FxManagement = lazy(() => import('./components/FxManagement').then(m => ({ default: m.FxManagement })))
const CostCenters = lazy(() => import('./components/CostCenters').then(m => ({ default: m.CostCenters })))
const DepositSlips = lazy(() => import('./components/DepositSlips').then(m => ({ default: m.DepositSlips })))
const AccountingPreferences = lazy(() => import('./components/AccountingPreferences').then(m => ({ default: m.AccountingPreferences })))
const PaymentGateways = lazy(() => import('./components/PaymentGateways').then(m => ({ default: m.PaymentGateways })))
const CheckRun = lazy(() => import('./components/CheckRun').then(m => ({ default: m.CheckRun })))
const CommissionRun = lazy(() => import('./components/CommissionRun').then(m => ({ default: m.CommissionRun })))
const TestPage = lazy(() => import('./components/TestPage'))
const ModulePlaceholder = lazy(() => import('./components/ModulePlaceholder'))
const PartyManagement = lazy(() => import('./components/PartyManagement').then(m => ({ default: m.PartyManagement })))
const UserManagement = lazy(() => import('./components/UserManagement'))
const SystemAdministration = lazy(() => import('./components/SystemAdministration'))

export type ViewType = 
  | 'dashboard' 
  | 'invoices' 
  | 'create-invoice' 
  | 'invoice-detail' 
  | 'payments' 
  | 'create-payment' 
  | 'payment-detail'
  | 'payment-groups'
  | 'financial-accounts'
  | 'deposit-slips'
  | 'reports'
  | 'advanced-accounting'
  | 'tax-and-gl-mapping'
  | 'chart-of-accounts'
  | 'journal-entries'
  | 'create-journal-entry'
  | 'fiscal-periods'
  | 'fx-rates'
  | 'cost-centers'
  | 'accounting-preferences'
  | 'payment-gateways'
  | 'check-run'
  | 'commission-run'
  | 'test-page'
  | 'orders'
  | 'manufacturing'
  | 'inventory'
  | 'parties'
  | 'users'
  | 'system-admin';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [activeJournalTransId, setActiveJournalTransId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleNavigate = useCallback((view: ViewType, id?: string) => {
    startTransition(() => {
      setCurrentView(view);
      if (view === 'invoice-detail' && id !== undefined) {
        setActiveInvoiceId(id);
      } else if (view === 'payment-detail' && id !== undefined) {
        setActivePaymentId(id);
      } else if (view === 'journal-entries' && id !== undefined) {
        setActiveJournalTransId(id);
      }
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (isLoading) {
    return <ViewLoader />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AccountingDashboard onNavigate={handleNavigate} />;

      case 'invoices':
        return <InvoiceList onViewInvoice={(id) => handleNavigate('invoice-detail', id)} />;

      case 'create-invoice':
        return (
          <CreateInvoice 
            onCancel={() => handleNavigate('invoices')} 
            onSave={(newId) => newId ? handleNavigate('invoice-detail', newId) : handleNavigate('invoices')} 
          />
        );

      case 'invoice-detail':
        return (
          <InvoiceDetail 
            invoiceId={activeInvoiceId} 
            onBack={() => handleNavigate('invoices')} 
            onViewInvoice={(newId) => handleNavigate('invoice-detail', newId)}
            onViewPayment={(paymentId) => handleNavigate('payment-detail', paymentId)}
          />
        );

      case 'payments':
        return (
          <PaymentList 
            onViewPayment={(id) => handleNavigate('payment-detail', id)} 
            onCreatePayment={() => handleNavigate('create-payment')}
          />
        );

      case 'create-payment':
        return (
          <CreatePayment 
            onCancel={() => handleNavigate('payments')} 
            onSave={(newId) => newId ? handleNavigate('payment-detail', newId) : handleNavigate('payments')} 
          />
        );

      case 'payment-detail':
        return (
          <PaymentDetail 
            paymentId={activePaymentId} 
            onBack={() => handleNavigate('payments')} 
            onViewInvoice={(invoiceId) => handleNavigate('invoice-detail', invoiceId)}
          />
        );

      case 'financial-accounts':
        return <FinancialAccounts />;

      case 'deposit-slips':
        return <DepositSlips />;

      case 'chart-of-accounts':
        return (
          <ChartOfAccounts 
            onSelectTransaction={(id) => handleNavigate('journal-entries', id)} 
          />
        );

      case 'journal-entries':
        return (
          <JournalEntries 
            onCreateNew={() => handleNavigate('create-journal-entry')}
            initialSelectedId={activeJournalTransId}
          />
        );

      case 'create-journal-entry':
        return (
          <CreateJournalEntry 
            onBack={() => handleNavigate('journal-entries')}
            onSuccess={(newId) => handleNavigate('journal-entries', newId)}
          />
        );

      case 'reports':
        return <FinancialReports />;

      case 'fiscal-periods':
        return <FiscalPeriods />;

      case 'fx-rates':
        return <FxManagement />;

      case 'cost-centers':
        return <CostCenters />;

      case 'advanced-accounting':
        return <AdvancedAccounting />;

      case 'tax-and-gl-mapping':
        return <TaxAndGlMapping />;

      case 'payment-groups':
        return <PaymentGroups />;

      case 'accounting-preferences':
        return <AccountingPreferences />;

      case 'payment-gateways':
        return <PaymentGateways />;

      case 'check-run':
        return <CheckRun />;

      case 'commission-run':
        return <CommissionRun />;

      case 'test-page':
        return <TestPage />;

      case 'parties':
        return <PartyManagement />;

      case 'users':
        return <UserManagement />;

      case 'system-admin':
        return <SystemAdministration />;

      case 'orders':
        return <ModulePlaceholder moduleKey="orders" onNavigate={handleNavigate} />;

      case 'manufacturing':
        return <ModulePlaceholder moduleKey="manufacturing" onNavigate={handleNavigate} />;

      case 'inventory':
        return <ModulePlaceholder moduleKey="inventory" onNavigate={handleNavigate} />;

      default:
        return <AccountingDashboard />;
    }
  };

  return (
    <ErrorBoundary onReset={() => handleNavigate('dashboard')}>
      <Layout currentView={currentView} onNavigate={handleNavigate} isPending={isPending}>
        <Suspense fallback={<ViewLoader />}>
          {renderCurrentView()}
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}

export default App

