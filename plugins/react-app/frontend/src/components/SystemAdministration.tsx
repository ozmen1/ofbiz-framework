import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Server, Cpu, Activity, RefreshCw, Trash2, Play, AlertCircle,
  CheckCircle2, Search, Zap, Layers, Clock, ShieldCheck, X,
  ChevronLeft, ChevronRight, Loader2, Database, Info, RotateCcw
} from 'lucide-react';
import {
  fetchCacheStatus,
  clearCacheByName,
  clearAllCaches,
  forceGarbageCollection,
  fetchScheduledJobs,
  cancelJob,
  resetJob,
  triggerServiceNow,
  fetchSystemDiagnostics,
  CacheItem,
  MemoryInfo,
  JobItem,
  JobStats,
  SystemDiagnosticsResponse
} from '../services/api';
import { useTranslation } from '../i18n';

type AdminTab = 'cache' | 'jobs' | 'diagnostics';

export const SystemAdministration: React.FC = () => {
  const { translations } = useTranslation();
  const t = translations.systemAdmin;
  const common = translations.common;

  const [activeTab, setActiveTab] = useState<AdminTab>('cache');

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  // =========================================================
  // 1. Cache Management State
  // =========================================================
  const [cacheList, setCacheList] = useState<CacheItem[]>([]);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loadingCache, setLoadingCache] = useState<boolean>(true);
  const [cacheSearch, setCacheSearch] = useState<string>('');
  const [clearingCacheName, setClearingCacheName] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [isRunningGc, setIsRunningGc] = useState<boolean>(false);

  const loadCache = useCallback(async (query?: string) => {
    setLoadingCache(true);
    try {
      const res = await fetchCacheStatus(query);
      setCacheList(res.cacheList || []);
      setMemoryInfo(res.memoryInfo || null);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Önbellek bilgileri yüklenemedi.');
    } finally {
      setLoadingCache(false);
    }
  }, []);

  const handleClearSingleCache = async (cacheName: string) => {
    setClearingCacheName(cacheName);
    try {
      const res = await clearCacheByName(cacheName);
      showFeedback('success', res.message || `${cacheName} ${t.clearCacheSuccess}`);
      loadCache(cacheSearch);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Önbellek temizlenemedi.');
    } finally {
      setClearingCacheName(null);
    }
  };

  const handleClearAllCaches = async () => {
    setIsClearingAll(true);
    try {
      const res = await clearAllCaches();
      showFeedback('success', res.message || 'Tüm önbellekler başarıyla temizlendi.');
      setShowClearAllModal(false);
      loadCache(cacheSearch);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Önbellekler temizlenemedi.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleForceGc = async () => {
    setIsRunningGc(true);
    try {
      const res = await forceGarbageCollection();
      showFeedback('success', res.message || t.forceGcSuccess);
      if (res.memoryInfo) {
        setMemoryInfo((prev) => ({ ...prev, ...res.memoryInfo }));
      }
      loadCache(cacheSearch);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'GC tetiklenemedi.');
    } finally {
      setIsRunningGc(false);
    }
  };

  // Format bytes into readable KB / MB
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtered caches
  const filteredCaches = useMemo(() => {
    if (!cacheSearch.trim()) return cacheList;
    const q = cacheSearch.toLowerCase().trim();
    return cacheList.filter((c) => c.cacheName.toLowerCase().includes(q));
  }, [cacheList, cacheSearch]);

  // Aggregate stats
  const totalCacheHits = useMemo(() => cacheList.reduce((acc, c) => acc + (c.hitCount || 0), 0), [cacheList]);
  const totalCacheMisses = useMemo(() => cacheList.reduce((acc, c) => acc + (c.missCountTot || 0), 0), [cacheList]);
  const hitRatio = useMemo(() => {
    const total = totalCacheHits + totalCacheMisses;
    return total > 0 ? ((totalCacheHits / total) * 100).toFixed(1) : '100.0';
  }, [totalCacheHits, totalCacheMisses]);

  // =========================================================
  // 2. Job Scheduler State
  // =========================================================
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobStats, setJobStats] = useState<JobStats>({ pending: 0, running: 0, finished: 0, failed: 0 });
  const [jobTotalCount, setJobTotalCount] = useState<number>(0);
  const [jobViewIndex, setJobViewIndex] = useState<number>(0);
  const [jobViewSize] = useState<number>(15);
  const [jobSearch, setJobSearch] = useState<string>('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('ALL');
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false);

  // Trigger service modal
  const [showTriggerModal, setShowTriggerModal] = useState<boolean>(false);
  const [triggerServiceName, setTriggerServiceName] = useState<string>('');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  const loadJobs = useCallback(async (index: number) => {
    setLoadingJobs(true);
    try {
      const res = await fetchScheduledJobs({
        statusId: jobStatusFilter,
        searchQuery: jobSearch,
        viewIndex: index,
        viewSize: jobViewSize
      });
      setJobs(res.jobs || []);
      setJobTotalCount(res.totalCount || 0);
      setJobViewIndex(res.viewIndex || 0);
      if (res.stats) setJobStats(res.stats);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Görevler yüklenemedi.');
    } finally {
      setLoadingJobs(false);
    }
  }, [jobStatusFilter, jobSearch, jobViewSize]);

  const handleCancelJob = async (jobId: string) => {
    try {
      const res = await cancelJob(jobId);
      showFeedback('success', res.message || t.jobCancelledSuccess);
      loadJobs(jobViewIndex);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Görev iptal edilemedi.');
    }
  };

  const handleResetJob = async (jobId: string) => {
    try {
      const res = await resetJob(jobId);
      showFeedback('success', res.message || t.jobResetSuccess);
      loadJobs(jobViewIndex);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Görev sıfırlanamadı.');
    }
  };

  const handleTriggerServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerServiceName.trim()) return;
    setIsTriggering(true);
    try {
      const res = await triggerServiceNow(triggerServiceName.trim());
      showFeedback('success', res.message || t.serviceTriggeredSuccess);
      setShowTriggerModal(false);
      setTriggerServiceName('');
      loadJobs(0);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Servis tetiklenemedi.');
    } finally {
      setIsTriggering(false);
    }
  };

  // Helper for status badge
  const renderJobStatusBadge = (statusId: string) => {
    switch (statusId) {
      case 'SERVICE_PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <Clock size={11} />
            <span>Pending</span>
          </span>
        );
      case 'SERVICE_RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 animate-pulse">
            <Loader2 size={11} className="animate-spin" />
            <span>Running</span>
          </span>
        );
      case 'SERVICE_FINISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 size={11} />
            <span>Finished</span>
          </span>
        );
      case 'SERVICE_FAILED':
      case 'SERVICE_CRASHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle size={11} />
            <span>{statusId === 'SERVICE_CRASHED' ? 'Crashed' : 'Failed'}</span>
          </span>
        );
      case 'SERVICE_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <X size={11} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400">
            {statusId}
          </span>
        );
    }
  };

  // =========================================================
  // 3. Diagnostics State
  // =========================================================
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsResponse['diagnostics'] | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState<boolean>(false);

  const loadDiagnostics = useCallback(async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetchSystemDiagnostics();
      setDiagnostics(res.diagnostics);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Tanılama bilgileri yüklenemedi.');
    } finally {
      setLoadingDiagnostics(false);
    }
  }, []);

  // Initial tab loading
  useEffect(() => {
    if (activeTab === 'cache') {
      loadCache();
    } else if (activeTab === 'jobs') {
      loadJobs(0);
    } else if (activeTab === 'diagnostics') {
      loadDiagnostics();
    }
  }, [activeTab, loadCache, loadJobs, loadDiagnostics]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold shadow-lg transition-all animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-slate-800/60 rounded-md transition-colors text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Top Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-4 flex-wrap">
        <div className="ds-pill-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab('cache')}
            className={`ds-pill-tab ${activeTab === 'cache' ? 'ds-pill-tab-active' : ''}`}
          >
            <Database size={15} />
            <span>{t.tabCache}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`ds-pill-tab ${activeTab === 'jobs' ? 'ds-pill-tab-active' : ''}`}
          >
            <Clock size={15} />
            <span>{t.tabJobs}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`ds-pill-tab ${activeTab === 'diagnostics' ? 'ds-pill-tab-active' : ''}`}
          >
            <Cpu size={15} />
            <span>{t.tabDiagnostics}</span>
          </button>
        </div>

        {/* Global Tab Refresh */}
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'cache') loadCache(cacheSearch);
            else if (activeTab === 'jobs') loadJobs(jobViewIndex);
            else loadDiagnostics();
          }}
          disabled={loadingCache || loadingJobs || loadingDiagnostics}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={loadingCache || loadingJobs || loadingDiagnostics ? 'animate-spin text-indigo-400' : ''}
          />
          <span>{common.refresh}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. CACHE MANAGEMENT TAB CONTENT                           */}
      {/* ========================================================= */}
      {activeTab === 'cache' && (
        <div className="space-y-6">
          {/* Cache Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ds-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Database size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.totalCaches}</p>
                <p className="text-xl font-bold text-white tracking-tight">{cacheList.length}</p>
              </div>
            </div>

            <div className="ds-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Layers size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.totalCacheMemory}</p>
                <p className="text-xl font-bold text-cyan-300 tracking-tight">
                  {memoryInfo ? formatBytes(memoryInfo.totalCacheMemory || 0) : '--'}
                </p>
              </div>
            </div>

            <div className="ds-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Zap size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.hitRatio}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-purple-300 tracking-tight">%{hitRatio}</p>
                  <span className="text-[10px] text-slate-500">
                    ({totalCacheHits.toLocaleString()} / {totalCacheMisses.toLocaleString()})
                  </span>
                </div>
              </div>
            </div>

            <div className="ds-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Activity size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.jvmMemoryUsage}</p>
                <p className="text-sm font-bold text-white tracking-tight">
                  {memoryInfo ? `${formatBytes(memoryInfo.usedMemory)} / ${formatBytes(memoryInfo.maxMemory)}` : '--'}
                </p>
                {memoryInfo && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((memoryInfo.usedMemory / memoryInfo.maxMemory) * 100))}%`
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar & Search */}
          <div className="ds-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={cacheSearch}
                onChange={(e) => setCacheSearch(e.target.value)}
                placeholder={t.searchCachePlaceholder}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleForceGc}
                disabled={isRunningGc}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunningGc ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>{t.forceGc}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                disabled={isClearingAll}
                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{t.clearAllCaches}</span>
              </button>
            </div>
          </div>

          {/* Cache Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">{t.cacheName}</th>
                    <th className="py-3 px-4">{t.cacheSize}</th>
                    <th className="py-3 px-4">{t.hitCount} / {t.missCount}</th>
                    <th className="py-3 px-4">{t.maxInMemory}</th>
                    <th className="py-3 px-4">{t.expireTime}</th>
                    <th className="py-3 px-4">{t.memoryBytes}</th>
                    <th className="py-3 px-4 text-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loadingCache ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                        <span>{common.loading}</span>
                      </td>
                    </tr>
                  ) : filteredCaches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                        {t.noCachesFound}
                      </td>
                    </tr>
                  ) : (
                    filteredCaches.map((cache) => {
                      const isClearingThis = clearingCacheName === cache.cacheName;
                      return (
                        <tr key={cache.cacheName} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white font-sans">{cache.cacheName}</td>
                          <td className="py-3 px-4 text-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold border border-slate-700/60">
                              {cache.cacheSize.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-emerald-400 font-semibold">{cache.hitCount.toLocaleString()}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-rose-400 font-semibold">{cache.missCountTot.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {cache.maxInMemory === 0 ? 'Sınırsız' : cache.maxInMemory.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {cache.expireTime === 0 ? 'Kalıcı' : `${cache.expireTime.toLocaleString()} ms`}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{formatBytes(cache.cacheMemory)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleClearSingleCache(cache.cacheName)}
                              disabled={isClearingThis}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isClearingThis ? (
                                <Loader2 size={12} className="animate-spin text-rose-400" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              <span>{t.clearCache}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. JOB SCHEDULER TAB CONTENT                              */}
      {/* ========================================================= */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* Job Stats Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => { setJobStatusFilter('SERVICE_PENDING'); loadJobs(0); }}
              className={`ds-card p-4 text-left transition-all cursor-pointer ${
                jobStatusFilter === 'SERVICE_PENDING' ? 'border-amber-500/50 bg-amber-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.pendingJobs}</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-300 mt-1">{jobStats.pending}</p>
            </button>

            <button
              type="button"
              onClick={() => { setJobStatusFilter('SERVICE_RUNNING'); loadJobs(0); }}
              className={`ds-card p-4 text-left transition-all cursor-pointer ${
                jobStatusFilter === 'SERVICE_RUNNING' ? 'border-indigo-500/50 bg-indigo-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.runningJobs}</span>
                <Loader2 size={16} className="text-indigo-400 animate-spin" />
              </div>
              <p className="text-2xl font-bold text-indigo-300 mt-1">{jobStats.running}</p>
            </button>

            <button
              type="button"
              onClick={() => { setJobStatusFilter('SERVICE_FINISHED'); loadJobs(0); }}
              className={`ds-card p-4 text-left transition-all cursor-pointer ${
                jobStatusFilter === 'SERVICE_FINISHED' ? 'border-emerald-500/50 bg-emerald-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.finishedJobs}</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-300 mt-1">{jobStats.finished}</p>
            </button>

            <button
              type="button"
              onClick={() => { setJobStatusFilter('SERVICE_FAILED'); loadJobs(0); }}
              className={`ds-card p-4 text-left transition-all cursor-pointer ${
                jobStatusFilter === 'SERVICE_FAILED' ? 'border-rose-500/50 bg-rose-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.failedJobs}</span>
                <AlertCircle size={16} className="text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-rose-300 mt-1">{jobStats.failed}</p>
            </button>
          </div>

          {/* Job Filter & Trigger Service Bar */}
          <div className="ds-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="relative w-full md:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadJobs(0)}
                  placeholder={t.searchJobsPlaceholder}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <select
                value={jobStatusFilter}
                onChange={(e) => { setJobStatusFilter(e.target.value); }}
                className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">{t.filterAll}</option>
                <option value="SERVICE_PENDING">{t.filterPending}</option>
                <option value="SERVICE_RUNNING">{t.filterRunning}</option>
                <option value="SERVICE_FINISHED">{t.filterFinished}</option>
                <option value="SERVICE_FAILED">{t.filterFailed}</option>
                <option value="SERVICE_CANCELLED">{t.filterCancelled}</option>
              </select>

              <button
                type="button"
                onClick={() => loadJobs(0)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {common.filter}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTriggerModal(true)}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-indigo-100 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Play size={14} />
              <span>{t.triggerService}</span>
            </button>
          </div>

          {/* Jobs Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">{t.jobId}</th>
                    <th className="py-3 px-4">{t.jobName}</th>
                    <th className="py-3 px-4">{common.status}</th>
                    <th className="py-3 px-4">{t.runTime}</th>
                    <th className="py-3 px-4">{t.startDateTime} / {t.finishDateTime}</th>
                    <th className="py-3 px-4">{t.retryCount}</th>
                    <th className="py-3 px-4 text-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loadingJobs ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                        <span>{common.loading}</span>
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic font-sans">
                        {t.noJobsFound}
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const canCancel = job.statusId === 'SERVICE_PENDING' || job.statusId === 'SERVICE_RUNNING';
                      const canReset = job.statusId === 'SERVICE_FAILED' || job.statusId === 'SERVICE_CRASHED';

                      return (
                        <tr key={job.jobId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-indigo-300">#{job.jobId}</td>
                          <td className="py-3 px-4 text-white font-sans">
                            <p className="font-semibold">{job.jobName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{job.serviceName}</p>
                          </td>
                          <td className="py-3 px-4 font-sans">{renderJobStatusBadge(job.statusId)}</td>
                          <td className="py-3 px-4 text-slate-300">{job.runTime || '--'}</td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            <div>B: {job.startDateTime || '--'}</div>
                            <div>S: {job.finishDateTime || '--'}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {job.currentRetryCount} / {job.maxRetry}
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelJob(job.jobId)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <X size={12} />
                                  <span>{t.cancelJob}</span>
                                </button>
                              )}

                              {canReset && (
                                <button
                                  type="button"
                                  onClick={() => handleResetJob(job.jobId)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw size={12} />
                                  <span>{t.resetJob}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {jobTotalCount > jobViewSize && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Toplam {jobTotalCount} kayıt ({jobViewIndex * jobViewSize + 1} -{' '}
                  {Math.min((jobViewIndex + 1) * jobViewSize, jobTotalCount)})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadJobs(jobViewIndex - 1)}
                    disabled={jobViewIndex === 0 || loadingJobs}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-semibold text-slate-200">
                    {jobViewIndex + 1} / {Math.ceil(jobTotalCount / jobViewSize)}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadJobs(jobViewIndex + 1)}
                    disabled={(jobViewIndex + 1) * jobViewSize >= jobTotalCount || loadingJobs}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DIAGNOSTICS & SYSTEM METRICS TAB                       */}
      {/* ========================================================= */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {loadingDiagnostics ? (
            <div className="ds-card p-12 text-center text-slate-500">
              <Loader2 size={28} className="animate-spin mx-auto text-indigo-400 mb-2" />
              <span>{common.loading}</span>
            </div>
          ) : diagnostics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: JVM & Runtime */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Server size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.jvmTitle}</h3>
                    <p className="text-xs text-slate-400">{diagnostics.jvm.vmName}</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.vmVendor}</span>
                    <span className="font-mono text-white">{diagnostics.jvm.vmVendor}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.vmVersion}</span>
                    <span className="font-mono text-indigo-300 font-semibold">{diagnostics.jvm.vmVersion}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.uptime}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono font-bold border border-indigo-500/20">
                      {diagnostics.jvm.uptimeFormatted}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.startTime}</span>
                    <span className="font-mono text-slate-300">{diagnostics.jvm.startTime}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: OS & CPU */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.osTitle}</h3>
                    <p className="text-xs text-slate-400">{diagnostics.os.name} {diagnostics.os.version}</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.osArch}</span>
                    <span className="font-mono text-white">{diagnostics.os.arch}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.processors}</span>
                    <span className="font-mono text-cyan-300 font-bold">{diagnostics.os.availableProcessors} Çekirdek</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.systemLoad}</span>
                    <span className="font-mono text-white font-semibold">
                      {diagnostics.os.systemLoadAverage >= 0 ? diagnostics.os.systemLoadAverage.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.ofbizTitle}</span>
                    <span className="font-mono text-emerald-400 font-bold">{diagnostics.ofbiz.frameworkVersion}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Memory Architecture */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.memoryTitle}</h3>
                    <p className="text-xs text-slate-400">Heap & Non-Heap Bellek Dağılımı</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 font-mono mb-1">
                      <span>{t.heapMemory}</span>
                      <span className="font-bold text-emerald-300">
                        {formatBytes(diagnostics.memory.heapUsed)} / {formatBytes(diagnostics.memory.heapMax)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((diagnostics.memory.heapUsed / diagnostics.memory.heapMax) * 100))}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.nonHeapMemory}</span>
                    <span className="font-mono text-white font-semibold">
                      {formatBytes(diagnostics.memory.nonHeapUsed)} (Kommit: {formatBytes(diagnostics.memory.nonHeapCommitted)})
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">JVM Total / Free</span>
                    <span className="font-mono text-slate-300">
                      {formatBytes(diagnostics.memory.totalMemory)} / {formatBytes(diagnostics.memory.freeMemory)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Concurrency & OFBiz Delegator */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.threadsTitle}</h3>
                    <p className="text-xs text-slate-400">Çoklu İş Parçacığı & Veri Delegator</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.liveThreads}</span>
                    <span className="font-mono text-purple-300 font-bold">{diagnostics.threads.threadCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.peakThreads}</span>
                    <span className="font-mono text-white">{diagnostics.threads.peakThreadCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.daemonThreads}</span>
                    <span className="font-mono text-slate-400">{diagnostics.threads.daemonThreadCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.delegator}</span>
                    <span className="font-mono font-bold text-amber-300">{diagnostics.ofbiz.delegatorName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">{t.serverTime}</span>
                    <span className="font-mono text-slate-300">{diagnostics.ofbiz.currentTime}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLEAR ALL CACHES CONFIRMATION                      */}
      {/* ========================================================= */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t.clearAllCaches}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t.clearAllConfirm}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                disabled={isClearingAll}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                {common.cancel}
              </button>

              <button
                type="button"
                onClick={handleClearAllCaches}
                disabled={isClearingAll}
                className="px-4 py-2 rounded-xl bg-rose-600/85 hover:bg-rose-600 text-rose-100 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isClearingAll ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{common.confirm}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TRIGGER ASYNC SERVICE                              */}
      {/* ========================================================= */}
      {showTriggerModal && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Play size={18} />
                </div>
                <h3 className="text-sm font-bold text-white">{t.triggerService}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTriggerModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.triggerServicePrompt}
                </label>
                <input
                  type="text"
                  required
                  value={triggerServiceName}
                  onChange={(e) => setTriggerServiceName(e.target.value)}
                  placeholder="örn: purgeOldJobs, runServiceOnSubscriptionExpiry"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  Servis OFBiz Service Dispatcher üzerinden arka planda asenkron olarak başlatılacaktır. Sonucu Görevler sekmesinden takip edebilirsiniz.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTriggerModal(false)}
                  disabled={isTriggering}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {common.cancel}
                </button>

                <button
                  type="submit"
                  disabled={isTriggering || !triggerServiceName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-indigo-100 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTriggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>{t.triggerService}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdministration;
