import { useState } from 'react'
import Layout from './components/Layout'
import AccountingDashboard from './components/AccountingDashboard'
import InvoiceList from './components/InvoiceList'
import CreateInvoice from './components/CreateInvoice'
import InvoiceDetail from './components/InvoiceDetail'
import PaymentList from './components/PaymentList'
import CreatePayment from './components/CreatePayment'
import PaymentDetail from './components/PaymentDetail'
import PaymentGroups from './components/PaymentGroups'
import FinancialReports from './components/FinancialReports'
import ChartOfAccounts from './components/ChartOfAccounts'
import JournalEntries from './components/JournalEntries'
import CreateJournalEntry from './components/CreateJournalEntry'
import FinancialAccounts from './components/FinancialAccounts'
import AdvancedAccounting from './components/AdvancedAccounting'
import { TaxAndGlMapping } from './components/TaxAndGlMapping'
import { FiscalPeriods } from './components/FiscalPeriods'
import { FxManagement } from './components/FxManagement'
import { CostCenters } from './components/CostCenters'
import { DepositSlips } from './components/DepositSlips'
import { AccountingPreferences } from './components/AccountingPreferences'
import { PaymentGateways } from './components/PaymentGateways'
import TestPage from './components/TestPage'
import { I18nProvider } from './i18n'
import './index.css'
import './design-system.css'



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
  | 'test-page';


function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [activeJournalTransId, setActiveJournalTransId] = useState<string | null>(null);

  const handleNavigate = (view: ViewType, id?: string) => {
    setCurrentView(view);
    if (view === 'invoice-detail' && id !== undefined) {
      setActiveInvoiceId(id);
    } else if (view === 'payment-detail' && id !== undefined) {
      setActivePaymentId(id);
    } else if (view === 'journal-entries' && id !== undefined) {
      setActiveJournalTransId(id);
    }
  };

  return (
    <I18nProvider>
      <Layout currentView={currentView} onNavigate={handleNavigate}>
        {currentView === 'dashboard' && <AccountingDashboard />}
      
      {/* Invoices Views */}
      {currentView === 'invoices' && (
        <InvoiceList onViewInvoice={(id) => handleNavigate('invoice-detail', id)} />
      )}
      {currentView === 'create-invoice' && (
        <CreateInvoice 
          onCancel={() => handleNavigate('invoices')} 
          onSave={(newId) => newId ? handleNavigate('invoice-detail', newId) : handleNavigate('invoices')} 
        />
      )}
      {currentView === 'invoice-detail' && (
        <InvoiceDetail 
          invoiceId={activeInvoiceId} 
          onBack={() => handleNavigate('invoices')} 
          onViewInvoice={(newId) => handleNavigate('invoice-detail', newId)}
          onViewPayment={(paymentId) => handleNavigate('payment-detail', paymentId)}
        />
      )}

      {/* Payments Views */}
      {currentView === 'payments' && (
        <PaymentList 
          onViewPayment={(id) => handleNavigate('payment-detail', id)} 
          onCreatePayment={() => handleNavigate('create-payment')}
        />
      )}
      {currentView === 'create-payment' && (
        <CreatePayment 
          onCancel={() => handleNavigate('payments')} 
          onSave={(newId) => newId ? handleNavigate('payment-detail', newId) : handleNavigate('payments')} 
        />
      )}
      {currentView === 'payment-detail' && (
        <PaymentDetail 
          paymentId={activePaymentId} 
          onBack={() => handleNavigate('payments')} 
          onViewInvoice={(invoiceId) => handleNavigate('invoice-detail', invoiceId)}
        />
      )}

      {/* Financial Accounts (Kasa & Banka) View */}
      {currentView === 'financial-accounts' && <FinancialAccounts />}

      {/* Bank Deposit Slips (Banka Mevduat Fişleri) View */}
      {currentView === 'deposit-slips' && <DepositSlips />}

      {/* General Ledger & Chart of Accounts Views */}
      {currentView === 'chart-of-accounts' && (
        <ChartOfAccounts 
          onSelectTransaction={(id) => handleNavigate('journal-entries', id)} 
        />
      )}
      {currentView === 'journal-entries' && (
        <JournalEntries 
          onCreateNew={() => handleNavigate('create-journal-entry')}
          initialSelectedId={activeJournalTransId}
        />
      )}
      {currentView === 'create-journal-entry' && (
        <CreateJournalEntry 
          onBack={() => handleNavigate('journal-entries')}
          onSuccess={(newId) => handleNavigate('journal-entries', newId)}
        />
      )}

      {/* Reports View */}
      {currentView === 'reports' && <FinancialReports />}

      {/* Fiscal Periods & Year-End Closing */}
      {currentView === 'fiscal-periods' && <FiscalPeriods />}

      {/* FX Rates & Currency Matrix */}
      {currentView === 'fx-rates' && <FxManagement />}

      {/* Cost Centers & Gl Category Allocations */}
      {currentView === 'cost-centers' && <CostCenters />}

      {/* Advanced Accounting (Billing Accounts, Fixed Assets, Budgets, Agreements) */}
      {currentView === 'advanced-accounting' && <AdvancedAccounting />}

      {/* Tax & Automated GL Mappings (Faz 6) */}
      {currentView === 'tax-and-gl-mapping' && <TaxAndGlMapping />}

      {/* Payment Groups & Batches (Faz 7) */}
      {currentView === 'payment-groups' && <PaymentGroups />}

      {/* Accounting Preferences & GL Journals (Faz 2) */}
      {currentView === 'accounting-preferences' && <AccountingPreferences />}

      {/* Payment Gateways & Transaction Logs (Faz 3) */}
      {currentView === 'payment-gateways' && <PaymentGateways />}

      {currentView === 'test-page' && <TestPage />}
      </Layout>
    </I18nProvider>
  )
}

export default App
