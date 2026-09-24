import { lazy, Suspense, useTransition, useCallback } from 'react'
import Layout from './components/Layout'
import ViewLoader from './components/ViewLoader'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './components/LoginPage'
import { I18nProvider } from './i18n'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { RouterProvider, useRouter } from './router'
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
const ProductManagement = lazy(() => import('./components/ProductManagement').then(m => ({ default: m.ProductManagement })))
const CatalogCategoryManagement = lazy(() => import('./components/CatalogCategoryManagement').then(m => ({ default: m.CatalogCategoryManagement })))
const VariantAssocManagement = lazy(() => import('./components/VariantAssocManagement').then(m => ({ default: m.VariantAssocManagement })))
const PricePromoStoreManagement = lazy(() => import('./components/PricePromoStoreManagement').then(m => ({ default: m.PricePromoStoreManagement })))
const AdvancedInventoryManagement = lazy(() => import('./components/AdvancedInventoryManagement').then(m => ({ default: m.AdvancedInventoryManagement })))
const OrderManagement = lazy(() => import('./components/OrderManagement').then(m => ({ default: m.OrderManagement })))
const ShipmentManagement = lazy(() => import('./components/ShipmentManagement').then(m => ({ default: m.ShipmentManagement })))

export type ViewType = 
  | 'dashboard' 
  | 'products'
  | 'catalogs'
  | 'variants-assocs'
  | 'pricing-promos'
  | 'stores'
  | 'advanced-inventory'
  | 'config-items'
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
  | 'sales-orders'
  | 'purchase-orders'
  | 'order-quotes'
  | 'order-returns'
  | 'shipments'
  | 'manufacturing'
  | 'inventory'
  | 'parties'
  | 'users'
  | 'system-admin';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentView, currentId, navigate } = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleNavigate = useCallback((view: ViewType, id?: string) => {
    startTransition(() => {
      navigate(view, id);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [navigate]);

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
            invoiceId={currentId} 
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
            paymentId={currentId} 
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
            initialSelectedId={currentId}
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

      case 'products':
        return <ProductManagement />;

      case 'catalogs':
        return <CatalogCategoryManagement />;

      case 'variants-assocs':
        return <VariantAssocManagement />;

      case 'pricing-promos':
        return <PricePromoStoreManagement initialTab="rules" />;

      case 'stores':
        return <PricePromoStoreManagement initialTab="stores" />;

      case 'advanced-inventory':
        return <AdvancedInventoryManagement initialTab="inventory" />;

      case 'config-items':
        return <AdvancedInventoryManagement initialTab="config" />;

      case 'orders':
        return <OrderManagement onNavigate={handleNavigate} />;

      case 'sales-orders':
        return <OrderManagement initialTab="sales" onNavigate={handleNavigate} />;

      case 'purchase-orders':
        return <OrderManagement initialTab="purchase" onNavigate={handleNavigate} />;

      case 'order-quotes':
        return <OrderManagement initialTab="quotes" onNavigate={handleNavigate} />;

      case 'order-returns':
        return <OrderManagement initialTab="returns" onNavigate={handleNavigate} />;

      case 'shipments':
        return <ShipmentManagement onNavigate={handleNavigate} />;

      case 'manufacturing':
        return <ModulePlaceholder moduleKey="manufacturing" onNavigate={handleNavigate} />;

      case 'inventory':
        return <AdvancedInventoryManagement initialTab="inventory" />;

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
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider>
            <AppContent />
          </RouterProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App

