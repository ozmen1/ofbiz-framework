import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Users, FileText, DollarSign, Clock } from 'lucide-react';

interface Invoice {
  invoiceId: string;
  invoiceTypeId: string;
  partyIdFrom: string;
  partyId: string;
  invoiceDate: string;
  statusId: string;
  description: string;
  currencyUomId: string;
}

interface AccountingData {
  invoiceCount: number;
  paymentCount: number;
  customerCount: number;
  pendingApprovals: number;
  revenueData: { name: string; revenue: number }[];
  recentInvoices: Invoice[];
  statusDistribution: { name: string; value: number }[];
}



const AccountingDashboard: React.FC = () => {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/react-app/control/getAccountingSummary')
      .then(res => res.text())
      .then(text => {
        console.log("Gelen Ham Veri:", text); // BURASI ÇOK ÖNEMLİ: Gelen HTML'in ne olduğunu göreceğiz.
        console.log("Gelen Ham Veri:", text);
        
        if (text.trim().startsWith('<!DOCTYPE')) {
          console.error("Dikkat: JSON yerine HTML sayfası geldi!");
          return;
        }
        
        const cleanJson = text.startsWith('//') ? text.substring(2) : text;
        const json = JSON.parse(cleanJson);
        setData(json.accountingData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Yakalanamayan Hata:", err);
        setLoading(false);
      });
  }, []);


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="animate-spin" style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid var(--glass-border)', 
          borderTopColor: 'var(--primary)', 
          borderRadius: '50%' 
        }}></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <StatCard 
          icon={<FileText color="#6366f1" />} 
          title="Total Invoices" 
          value={data?.invoiceCount?.toString() || '0'} 
        />
        <StatCard 
          icon={<DollarSign color="#a855f7" />} 
          title="Total Payments" 
          value={data?.paymentCount?.toString() || '0'} 
        />
        <StatCard 
          icon={<Users color="#ec4899" />} 
          title="Active Customers" 
          value={data?.customerCount?.toString() || '0'} 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} 
          title="Pending Approvals" 
          value={data?.pendingApprovals?.toString() || '0'} 
        />
      </div>



      {/* Recent Invoices */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Recent Invoices</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>ID</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Type</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Party From</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Date</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data?.recentInvoices.map((inv) => (
              <tr key={inv.invoiceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.invoiceId}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{inv.invoiceTypeId}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{inv.partyIdFrom}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{inv.invoiceDate}</td>
                <td style={{ padding: '1rem' }}>
                  <StatusBadge status={inv.statusId} />
                </td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

const StatCard = ({ icon, title, value, trend }: { icon: React.ReactNode, title: string, value: string, trend?: string }) => (
  <div className="glass-card" style={{ padding: '1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <div style={{ 
        padding: '0.5rem', 
        borderRadius: '10px', 
        background: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      {trend && <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 500 }}>{trend}</span>}
    </div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{title}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const getColors = () => {
    switch (status) {
      case 'INVOICE_PAID': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' };
      case 'INVOICE_IN_PROCESS': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
      case 'INVOICE_READY': return { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' };
    }
  };
  const colors = getColors();
  return (
    <span style={{ 
      padding: '0.25rem 0.75rem', 
      borderRadius: '20px', 
      fontSize: '0.75rem', 
      fontWeight: 600,
      background: colors.bg,
      color: colors.text,
      textTransform: 'uppercase'
    }}>
      {status.replace('INVOICE_', '')}
    </span>
  );
};


export default AccountingDashboard;
