import React from 'react';
import { useTranslation } from '../i18n';

export const ViewLoader: React.FC = () => {
  const { locale } = useTranslation();
  const loadingText = locale === 'tr' ? 'Modül yükleniyor...' : 'Loading module...';

  return (
    <div className="space-y-5 animate-pulse">
      {/* Top Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ds-stat-card h-24 flex flex-col justify-between">
            <div className="h-3 w-24 bg-slate-700/60 rounded"></div>
            <div className="h-6 w-32 bg-slate-700/80 rounded"></div>
            <div className="h-2 w-16 bg-slate-700/40 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton with Centered Spinner */}
      <div className="ds-card p-8 min-h-[380px] flex flex-col items-center justify-center space-y-4">
        <div className="ds-spinner"></div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">{loadingText}</p>
        <div className="w-48 h-1.5 bg-slate-700/40 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full animate-indeterminate"></div>
        </div>
      </div>
    </div>
  );
};

export default ViewLoader;
