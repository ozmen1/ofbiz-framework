import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, DollarSign, Clock } from 'lucide-react';
import { api } from '../services/api';

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
    api.getAccountingSummary()
      .then(json => {
        setData(json.accountingData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Dashboard veri çekme hatası:", err);
        setLoading(false);
      });
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="ds-spinner"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={22} className="text-indigo-400" />}
          title="Total Invoices"
          value={data?.invoiceCount?.toString() || '0'}
          accentColor="border-l-indigo-500"
        />
        <StatCard
          icon={<DollarSign size={22} className="text-purple-400" />}
          title="Total Payments"
          value={data?.paymentCount?.toString() || '0'}
          accentColor="border-l-purple-500"
        />
        <StatCard
          icon={<Users size={22} className="text-pink-400" />}
          title="Active Customers"
          value={data?.customerCount?.toString() || '0'}
          accentColor="border-l-pink-500"
        />
        <StatCard
          icon={<Clock size={22} className="text-amber-400" />}
          title="Pending Approvals"
          value={data?.pendingApprovals?.toString() || '0'}
          accentColor="border-l-amber-500"
        />
      </div>

      {/* Recent Invoices */}
      <div className="ds-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-white text-base font-semibold m-0">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">ID</th>
                <th className="ds-th">Type</th>
                <th className="ds-th">Party From</th>
                <th className="ds-th">Date</th>
                <th className="ds-th">Status</th>
                <th className="ds-th">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentInvoices.map((inv) => (
                <tr key={inv.invoiceId} className="ds-tbody-row">
                  <td className="ds-td-primary">{inv.invoiceId}</td>
                  <td className="ds-td">{inv.invoiceTypeId}</td>
                  <td className="ds-td">{inv.partyIdFrom}</td>
                  <td className="ds-td-muted">{inv.invoiceDate}</td>
                  <td className="ds-td">
                    <StatusBadge status={inv.statusId} />
                  </td>
                  <td className="ds-td-primary">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({
  icon,
  title,
  value,
  trend,
  accentColor = 'border-l-indigo-500',
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: string;
  accentColor?: string;
}) => (
  <div className={`ds-stat-card border-l-4 ${accentColor}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="p-2 rounded-xl bg-slate-700/60 flex items-center justify-center">
        {icon}
      </div>
      {trend && <span className="text-xs text-emerald-400 font-medium">{trend}</span>}
    </div>
    <div className="ds-stat-label">{title}</div>
    <div className="ds-stat-value">{value}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeClass = (): string => {
    switch (status) {
      case 'INVOICE_PAID':         return 'ds-badge ds-badge-green';
      case 'INVOICE_IN_PROCESS':   return 'ds-badge ds-badge-yellow';
      case 'INVOICE_READY':        return 'ds-badge ds-badge-indigo';
      default:                     return 'ds-badge ds-badge-slate';
    }
  };
  return (
    <span className={getBadgeClass()}>
      {status.replace('INVOICE_', '')}
    </span>
  );
};


export default AccountingDashboard;
