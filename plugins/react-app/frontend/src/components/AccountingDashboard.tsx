import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  RefreshCw, 
  Server, 
  Shield, 
  ArrowRight, 
  Activity, 
  Cpu, 
  ChevronRight,
  Boxes,
  Briefcase
} from 'lucide-react';
import { 
  api, 
  fetchSystemDiagnostics, 
  fetchScheduledJobs, 
  fetchUserLogins, 
  JobItem, 
  SystemDiagnosticsResponse 
} from '../services/api';
import { useTranslation } from '../i18n';
import { ViewType } from '../App';

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

interface AccountingDashboardProps {
  onNavigate?: (view: ViewType, id?: string) => void;
}

export const AccountingDashboard: React.FC<AccountingDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<AccountingData | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsResponse['diagnostics'] | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { translations, locale } = useTranslation();

  const loadAllDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [accountingRes, diagRes, userRes, jobRes] = await Promise.allSettled([
        api.getAccountingSummary(),
        fetchSystemDiagnostics(),
        fetchUserLogins({ viewIndex: 0, viewSize: 1 }),
        fetchScheduledJobs({ viewIndex: 0, viewSize: 4 })
      ]);

      if (accountingRes.status === 'fulfilled' && accountingRes.value?.accountingData) {
        setData(accountingRes.value.accountingData);
      }

      if (diagRes.status === 'fulfilled' && diagRes.value?.diagnostics) {
        setDiagnostics(diagRes.value.diagnostics);
      }

      if (userRes.status === 'fulfilled' && typeof userRes.value?.totalCount === 'number') {
        setUserCount(userRes.value.totalCount);
      }

      if (jobRes.status === 'fulfilled' && Array.isArray(jobRes.value?.jobs)) {
        setJobs(jobRes.value.jobs);
      }
    } catch (err) {
      console.error('Dashboard data aggregation error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllDashboardData();
  }, [loadAllDashboardData]);

  const usedMemMb = diagnostics?.memory?.usedMemory ? Math.round(diagnostics.memory.usedMemory / (1024 * 1024)) : 0;
  const maxMemMb = diagnostics?.memory?.maxMemory ? Math.round(diagnostics.memory.maxMemory / (1024 * 1024)) : 1024;
  const memPercent = maxMemMb > 0 ? Math.min(100, Math.round((usedMemMb / maxMemMb) * 100)) : 0;

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-20 bg-slate-900/60 border border-slate-800 rounded-2xl"></div>

        {/* 4 Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="ds-stat-card border-l-4 border-l-slate-700 h-28 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-20 bg-slate-800 rounded"></div>
                <div className="h-6 w-6 bg-slate-800 rounded-lg"></div>
              </div>
              <div className="h-7 w-24 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>

        {/* Big Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 ds-card p-6 min-h-[300px] flex flex-col items-center justify-center space-y-3">
            <div className="ds-spinner"></div>
            <p className="text-xs text-slate-500 font-medium">
              {locale === 'tr' ? 'ERP göstergeleri yükleniyor...' : 'Loading ERP metrics...'}
            </p>
          </div>
          <div className="ds-card p-6 min-h-[300px]"></div>
        </div>
      </div>
    );
  }

  const d = translations.dashboard;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Banner: Enterprise System Operational Status */}
      <div className="border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Server size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200 tracking-tight">Apache OFBiz® 18.12</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {d.systemOnline}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{d.databaseEngine}: PostgreSQL</span>
              <span className="text-slate-600">•</span>
              <span>{d.delegator}: default</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => loadAllDashboardData(true)}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-xs font-medium text-slate-300 hover:text-slate-100 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
            <span>{d.refreshDashboard}</span>
          </button>
        </div>
      </div>

      {/* 4 Domain KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Financials / Invoices */}
        <div 
          onClick={() => onNavigate?.('invoices')}
          className="ds-stat-card border-l-4 border-l-indigo-500 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText size={20} />
            </div>
            <span className="text-xs text-slate-500 group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
              <ChevronRight size={14} />
            </span>
          </div>
          <div className="ds-stat-label">{translations.nav.invoices}</div>
          <div className="ds-stat-value text-slate-200">{data?.invoiceCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {data?.paymentCount ?? 0} {translations.nav.payments} • {data?.pendingApprovals ?? 0} {d.pendingInvoices}
          </div>
        </div>

        {/* Parties / Customers */}
        <div 
          onClick={() => onNavigate?.('parties')}
          className="ds-stat-card border-l-4 border-l-pink-500 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Users size={20} />
            </div>
            <span className="text-xs text-slate-500 group-hover:text-pink-400 transition-colors flex items-center gap-0.5">
              <ChevronRight size={14} />
            </span>
          </div>
          <div className="ds-stat-label">{translations.nav.parties}</div>
          <div className="ds-stat-value text-slate-200">{data?.customerCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {d.activeCustomers} & {locale === 'tr' ? 'İş Ortakları' : 'Business Partners'}
          </div>
        </div>

        {/* Users & RBAC */}
        <div 
          onClick={() => onNavigate?.('users')}
          className="ds-stat-card border-l-4 border-l-amber-500 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Shield size={20} />
            </div>
            <span className="text-xs text-slate-500 group-hover:text-amber-400 transition-colors flex items-center gap-0.5">
              <ChevronRight size={14} />
            </span>
          </div>
          <div className="ds-stat-label">{translations.nav.users}</div>
          <div className="ds-stat-value text-slate-200">{userCount !== null ? userCount : '—'}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {d.activeUsers} & RBAC {d.securityGroups}
          </div>
        </div>

        {/* System & JVM Resource */}
        <div 
          onClick={() => onNavigate?.('system-admin')}
          className="ds-stat-card border-l-4 border-l-emerald-500 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu size={20} />
            </div>
            <span className="text-xs text-slate-500 group-hover:text-emerald-400 transition-colors flex items-center gap-0.5">
              <ChevronRight size={14} />
            </span>
          </div>
          <div className="ds-stat-label">{d.jvmMemory}</div>
          <div className="ds-stat-value text-slate-200">{usedMemMb ? `${usedMemMb} MB` : '—'}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {diagnostics?.jvm.uptimeFormatted ? `${diagnostics.jvm.uptimeFormatted}` : d.systemOnline}
          </div>
        </div>
      </div>

      {/* Module Launchers: Core ERP Navigators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
            {d.moduleLaunchers}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Launcher: Muhasebe & Finans */}
          <div 
            onClick={() => onNavigate?.('invoices')}
            className="ds-card p-4 hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <DollarSign size={17} />
                </div>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                {translations.nav.accounting}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {d.accountingModuleDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {translations.nav.invoices}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {translations.nav.payments}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {translations.nav.journalEntries}
              </span>
            </div>
          </div>

          {/* Launcher: Cari Yönetimi */}
          <div 
            onClick={() => onNavigate?.('parties')}
            className="ds-card p-4 hover:border-pink-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Briefcase size={17} />
                </div>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 group-hover:text-pink-300 transition-colors">
                {translations.nav.parties}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {d.partiesModuleDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {locale === 'tr' ? 'Müşteriler' : 'Customers'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {locale === 'tr' ? 'Tedarikçiler' : 'Vendors'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {locale === 'tr' ? 'Ödeme Metotları' : 'EFT / Card'}
              </span>
            </div>
          </div>

          {/* Launcher: Kullanıcı & Yetki */}
          <div 
            onClick={() => onNavigate?.('users')}
            className="ds-card p-4 hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield size={17} />
                </div>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                {translations.nav.users}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {d.usersModuleDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {locale === 'tr' ? 'Kullanıcılar' : 'Logins'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {locale === 'tr' ? 'Güvenlik Grupları' : 'Security Groups'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {locale === 'tr' ? 'Şifre Sıfırlama' : 'Password Reset'}
              </span>
            </div>
          </div>

          {/* Launcher: Sistem & Yönetim */}
          <div 
            onClick={() => onNavigate?.('system-admin')}
            className="ds-card p-4 hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Activity size={17} />
                </div>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                {translations.nav.systemAdmin}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {d.systemAdminModuleDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                UtilCache
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                Job Sandbox
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                JVM Diagnostics
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Column Operational Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2-Cols: Recent Invoices Table */}
        <div className="lg:col-span-2 ds-card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200 m-0">
                  {d.recentInvoices}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('invoices')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{d.viewAllInvoices}</span>
                <ChevronRight size={14} />
              </button>
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
                  </tr>
                </thead>
                <tbody>
                  {data?.recentInvoices && data.recentInvoices.length > 0 ? (
                    data.recentInvoices.map((inv) => (
                      <tr 
                        key={inv.invoiceId} 
                        className="ds-tbody-row hover:bg-slate-800/40 cursor-pointer"
                        onClick={() => onNavigate?.('invoice-detail', inv.invoiceId)}
                      >
                        <td className="ds-td-primary font-mono">{inv.invoiceId}</td>
                        <td className="ds-td text-xs text-slate-400">{inv.invoiceTypeId}</td>
                        <td className="ds-td text-xs">{inv.partyIdFrom}</td>
                        <td className="ds-td-muted text-xs font-mono">{inv.invoiceDate}</td>
                        <td className="ds-td">
                          <StatusBadge status={inv.statusId} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                        {d.noRecentInvoices}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
            <span>{locale === 'tr' ? 'Toplam Fatura Adedi' : 'Total Invoices'}: <strong className="text-slate-300 font-mono">{data?.invoiceCount ?? 0}</strong></span>
            <span>{d.pendingInvoices}: <strong className="text-amber-400 font-mono">{data?.pendingApprovals ?? 0}</strong></span>
          </div>
        </div>

        {/* Right 1-Col: Live System & Job Queue Monitor */}
        <div className="space-y-4">
          {/* JVM Memory Gauge Card */}
          <div className="ds-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider m-0">
                  {d.jvmMemory}
                </h4>
              </div>
              <span className="text-xs font-mono text-indigo-300 font-semibold">{memPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  memPercent > 85 ? 'bg-rose-500' : memPercent > 65 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${memPercent}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400 font-mono border-t border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">{d.heapMemoryUsed}</span>
                <span className="text-slate-300">{usedMemMb} MB</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Max Heap</span>
                <span className="text-slate-300">{maxMemMb} MB</span>
              </div>
            </div>
          </div>

          {/* Background Worker Jobs Card */}
          <div className="ds-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider m-0">
                  {d.scheduledJobs}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('system-admin')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                {locale === 'tr' ? 'Tüm İşler' : 'All Jobs'}
              </button>
            </div>

            <div className="space-y-2">
              {jobs.length > 0 ? (
                jobs.slice(0, 4).map(job => (
                  <div 
                    key={job.jobId}
                    className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-300 font-mono truncate">
                        {job.jobName || job.serviceName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        ID: {job.jobId}
                      </div>
                    </div>
                    <JobStatusBadge status={job.statusId} />
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">
                  {locale === 'tr' ? 'Kuyrukta bekleyen iş bulunmuyor.' : 'No queued jobs.'}
                </p>
              )}
            </div>
          </div>

          {/* Planned Modules Roadmap Card */}
          <div className="border border-dashed border-slate-800/80 bg-slate-900/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Boxes size={15} className="text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300">
                  {d.plannedModules}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Faz 4+
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {d.plannedModulesDesc}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const JobStatusBadge = ({ status }: { status?: string | null }) => {
  const s = status ? String(status) : '';
  switch (s) {
    case 'SERVICE_RUNNING':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
          RUNNING
        </span>
      );
    case 'SERVICE_QUEUED':
    case 'SERVICE_PENDING':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
          QUEUED
        </span>
      );
    case 'SERVICE_FINISHED':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
          FINISHED
        </span>
      );
    case 'SERVICE_FAILED':
    case 'SERVICE_CRASHED':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
          FAILED
        </span>
      );
    default:
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
          {s ? s.replace('SERVICE_', '') : '—'}
        </span>
      );
  }
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const { translations } = useTranslation();
  const inv = translations.invoices;
  const s = status ? String(status) : '';

  const getBadgeClass = (): string => {
    switch (s) {
      case 'INVOICE_PAID':         return 'ds-badge ds-badge-green';
      case 'INVOICE_IN_PROCESS':   return 'ds-badge ds-badge-yellow';
      case 'INVOICE_READY':        return 'ds-badge ds-badge-indigo';
      case 'INVOICE_APPROVED':     return 'ds-badge ds-badge-blue';
      case 'INVOICE_CANCELLED':    return 'ds-badge ds-badge-red';
      default:                     return 'ds-badge ds-badge-slate';
    }
  };

  const getLabel = (): string => {
    switch (s) {
      case 'INVOICE_PAID':         return inv.statusPaid;
      case 'INVOICE_IN_PROCESS':   return inv.statusInProcess;
      case 'INVOICE_READY':        return inv.statusReady;
      case 'INVOICE_APPROVED':     return inv.statusApproved;
      case 'INVOICE_CANCELLED':    return inv.statusCancelled;
      default:                     return s ? s.replace('INVOICE_', '') : '—';
    }
  };

  return (
    <span className={getBadgeClass()}>
      {getLabel()}
    </span>
  );
};

export default AccountingDashboard;
