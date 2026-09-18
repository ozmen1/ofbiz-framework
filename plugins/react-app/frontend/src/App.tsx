import { useState } from 'react'
import Layout from './components/Layout'
import AccountingDashboard from './components/AccountingDashboard'
import InvoiceList from './components/InvoiceList'
import CreateInvoice from './components/CreateInvoice'
import InvoiceDetail from './components/InvoiceDetail'
import TestPage from './components/TestPage'
import './index.css'

export type ViewType = 'dashboard' | 'invoices' | 'create-invoice' | 'invoice-detail' | 'test-page';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  const handleNavigate = (view: ViewType, id?: string) => {
    setCurrentView(view);
    if (id !== undefined) {
      setActiveInvoiceId(id);
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {currentView === 'dashboard' && <AccountingDashboard />}
      {currentView === 'invoices' && <InvoiceList onViewInvoice={(id) => handleNavigate('invoice-detail', id)} />}
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
        />
      )}
      {currentView === 'test-page' && <TestPage />}
    </Layout>
  )
}

export default App
