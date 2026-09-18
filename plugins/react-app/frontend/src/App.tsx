import { useState } from 'react'
import Layout from './components/Layout'
import AccountingDashboard from './components/AccountingDashboard'
import InvoiceList from './components/InvoiceList'
import CreateInvoice from './components/CreateInvoice'
import InvoiceDetail from './components/InvoiceDetail'
import PaymentList from './components/PaymentList'
import CreatePayment from './components/CreatePayment'
import PaymentDetail from './components/PaymentDetail'
import FinancialReports from './components/FinancialReports'
import TestPage from './components/TestPage'
import './index.css'

export type ViewType = 
  | 'dashboard' 
  | 'invoices' 
  | 'create-invoice' 
  | 'invoice-detail' 
  | 'payments' 
  | 'create-payment' 
  | 'payment-detail' 
  | 'reports'
  | 'test-page';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  const handleNavigate = (view: ViewType, id?: string) => {
    setCurrentView(view);
    if (view === 'invoice-detail' && id !== undefined) {
      setActiveInvoiceId(id);
    } else if (view === 'payment-detail' && id !== undefined) {
      setActivePaymentId(id);
    }
  };

  return (
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

      {/* Reports View */}
      {currentView === 'reports' && <FinancialReports />}

      {currentView === 'test-page' && <TestPage />}
    </Layout>
  )
}

export default App
