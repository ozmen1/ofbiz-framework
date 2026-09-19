import React, { useState } from 'react';
import { Beaker } from 'lucide-react';
import { useTranslation } from '../i18n';

const TestPage: React.FC = () => {
  const { translations } = useTranslation();
  const t = translations.testPage;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTestData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/example-endpoint', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || translations.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-card p-6 space-y-5 max-w-4xl">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Beaker size={22} className="text-indigo-400" />
          {t.title}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {t.description}
        </p>
      </div>

      <div>
        <button 
          className="ds-btn-primary" 
          onClick={fetchTestData} 
          disabled={loading}
        >
          {loading ? t.loading : t.sendRequest}
        </button>
      </div>

      {error && (
        <div className="ds-alert-error space-y-1">
          <strong>{t.errorTitle}</strong> {error}
          <div className="text-xs opacity-80">
            {t.errorNote}
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white">{t.responseTitle}</h4>
          <pre className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl overflow-x-auto text-indigo-300 font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestPage;
