import React, { useState } from 'react';
import { Beaker } from 'lucide-react';

const TestPage: React.FC = () => {
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
        throw new Error(`API isteği başarısız oldu: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-card p-6 space-y-5 max-w-4xl">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Beaker size={22} className="text-indigo-400" />
          API Test Sayfası
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Bu sayfa <code className="bg-slate-700/60 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">AGENT_INSTRUCTIONS.md</code> kurallarına uygun olarak oluşturulmuştur. 
          OFBiz REST API entegrasyonunu test etmek için kullanılabilir.
        </p>
      </div>

      <div>
        <button 
          className="ds-btn-primary" 
          onClick={fetchTestData} 
          disabled={loading}
        >
          {loading ? 'Yükleniyor...' : 'Test API İsteği Gönder'}
        </button>
      </div>

      {error && (
        <div className="ds-alert-error space-y-1">
          <strong>Hata:</strong> {error}
          <div className="text-xs opacity-80">
            Not: Eğer OFBiz çalışmıyorsa veya <code className="bg-red-500/20 px-1 py-0.5 rounded">/api/example-endpoint</code> tanımlı değilse bu hatayı almanız normaldir.
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white">API Yanıtı:</h4>
          <pre className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl overflow-x-auto text-indigo-300 font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestPage;
