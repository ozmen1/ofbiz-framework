import React, { useState } from 'react';

const TestPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTestData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Örnek bir API isteği (OFBiz entegrasyonu proxy üzerinden yapılandırıldığında bu çalışacaktır)
      // proxy: /api -> https://localhost:8443
      const response = await fetch('/api/example-endpoint', {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer ' + token
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
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '16px',
      padding: '2rem',
      border: '1px solid var(--glass-border)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'white' }}>API Test Sayfası</h3>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Bu sayfa <code>AGENT_INSTRUCTIONS.md</code> kurallarına uygun olarak oluşturulmuştur. 
        OFBiz REST API entegrasyonunu test etmek için kullanılabilir.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          className="btn-primary" 
          onClick={fetchTestData} 
          disabled={loading}
          style={{ padding: '0.75rem 1.5rem' }}
        >
          {loading ? 'Yükleniyor...' : 'Test API İsteği Gönder'}
        </button>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          padding: '1rem', 
          borderRadius: '8px',
          color: '#fca5a5',
          marginBottom: '1.5rem'
        }}>
          <strong>Hata:</strong> {error}
          <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>
            Not: Eğer OFBiz çalışmıyorsa veya `/api/example-endpoint` tanımlı değilse bu hatayı almanız normaldir.
          </div>
        </div>
      )}

      {data && (
        <div>
          <h4 style={{ color: 'white', marginBottom: '1rem' }}>API Yanıtı:</h4>
          <pre style={{
            background: '#0f172a',
            padding: '1rem',
            borderRadius: '8px',
            overflowX: 'auto',
            color: '#a5b4fc',
            fontSize: '0.9rem'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestPage;
