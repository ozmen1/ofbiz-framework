import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, DollarSign, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useTranslation } from '../i18n';

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
  const { translations, locale } = useTranslation();

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
          title={locale === 'tr' ? 'Toplam Fatura' : 'Total Invoices'}
          value={data?.invoiceCount?.toString() || '0'}
          accentColor="border-l-indigo-500"
        />
        <StatCard
          icon={<DollarSign size={22} className="text-purple-400" />}
          title={locale === 'tr' ? 'Toplam Ödeme' : 'Total Payments'}
          value={data?.paymentCount?.toString() || '0'}
          accentColor="border-l-purple-500"
        />
        <StatCard
          icon={<Users size={22} className="text-pink-400" />}
          title={locale === 'tr' ? 'Aktif Müşteriler' : 'Active Customers'}
          value={data?.customerCount?.toString() || '0'}
          accentColor="border-l-pink-500"
        />
        <StatCard
          icon={<Clock size={22} className="text-amber-400" />}
          title={locale === 'tr' ? 'Bekleyen Onaylar' : 'Pending Approvals'}
          value={data?.pendingApprovals?.toString() || '0'}
          accentColor="border-l-amber-500"
        />
      </div>

      {/* Recent Invoices */}
      <div className="ds-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-white text-base font-semibold m-0">{translations.dashboard.recentInvoices}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">{translations.invoices.invoiceId}</th>
                <th className="ds-th">{translations.invoices.type}</th>
                <th className="ds-th">{translations.invoices.partyFrom}</th>
                <th className="ds-th">{translations.invoices.invoiceDate}</th>
                <th className="ds-th">{translations.invoices.status}</th>
                <th className="ds-th-right">{translations.common.amount}</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentInvoices && data.recentInvoices.length > 0 ? (
                data.recentInvoices.map((inv) => (
                  <tr key={inv.invoiceId} className="ds-tbody-row">
                    <td className="ds-td-primary">{inv.invoiceId}</td>
                    <td className="ds-td">{inv.invoiceTypeId}</td>
                    <td className="ds-td">{inv.partyIdFrom}</td>
                    <td className="ds-td-muted">{inv.invoiceDate}</td>
                    <td className="ds-td">
                      <StatusBadge status={inv.statusId} locale={locale} />
                    </td>
                    <td className="ds-td-right font-mono">-</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                    {translations.dashboard.noRecentInvoices}
                  </td>
                </tr>
              )}
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

const StatusBadge = ({ status, locale }: { status: string; locale: string }) => {
  const getBadgeClass = (): string => {
    switch (status) {
      case 'INVOICE_PAID':         return 'ds-badge ds-badge-green';
      case 'INVOICE_IN_PROCESS':   return 'ds-badge ds-badge-yellow';
      case 'INVOICE_READY':        return 'ds-badge ds-badge-indigo';
      case 'INVOICE_APPROVED':     return 'ds-badge ds-badge-blue';
      case 'INVOICE_CANCELLED':    return 'ds-badge ds-badge-red';
      default:                     return 'ds-badge ds-badge-slate';
    }
  };

  const getLabel = (): string => {
    if (locale === 'tr') {
      switch (status) {
        case 'INVOICE_PAID':         return 'Ödendi';
        case 'INVOICE_IN_PROCESS':   return 'Hazırlanıyor';
        case 'INVOICE_READY':        return 'Hazır';
        case 'INVOICE_APPROVED':     return 'Onaylandı';
        case 'INVOICE_CANCELLED':    return 'İptal';
        default:                     return status.replace('INVOICE_', '');
      }
    } else {
      switch (status) {
        case 'INVOICE_PAID':         return 'Paid';
        case 'INVOICE_IN_PROCESS':   return 'In Process';
        case 'INVOICE_READY':        return 'Ready';
        case 'INVOICE_APPROVED':     return 'Approved';
        case 'INVOICE_CANCELLED':    return 'Cancelled';
        default:                     return status.replace('INVOICE_', '');
      }
    }
  };

  return (
    <span className={getBadgeClass()}>
      {getLabel()}
    </span>
  );
};

export default AccountingDashboard;
