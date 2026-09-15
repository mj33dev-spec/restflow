import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, HardDrive, Copy, Check } from 'lucide-react';
import { ResponseResult } from '../types';

interface ResponsePanelProps {
  response: ResponseResult | null;
  isLoading: boolean;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw' | 'headers'>('pretty');
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div style={{
        flex: 1,
        minHeight: '250px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        background: 'var(--bg-primary)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '12px'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>HTTP 요청 처리 중...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div style={{
        flex: 1,
        minHeight: '250px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-subtle)',
        background: 'var(--bg-primary)',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Clock size={32} opacity={0.4} />
        </div>
        <h3 style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1rem' }}>수신된 응답이 없습니다</h3>
        <p style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '380px' }}>
          상단에 요청 URL을 입력하고 <strong>[요청 전송]</strong> 버튼(또는 빠른 테스트 버튼)을 눌러 서버 응답을 확인하세요.
        </p>
      </div>
    );
  }

  const jsonString = typeof response.data === 'object'
    ? JSON.stringify(response.data, null, 2)
    : String(response.data || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'client-error';
    return 'error';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div style={{
      flex: 1,
      minHeight: '250px',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Response Header Status Bar */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={`status-badge ${getStatusClass(response.status)}`}>
            {response.status >= 200 && response.status < 300 ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{response.status} {response.statusText}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Clock size={15} />
            <span>소요 시간: <strong>{response.timeMs} ms</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <HardDrive size={15} />
            <span>크기: <strong>{formatSize(response.sizeBytes)}</strong></span>
          </div>
        </div>

        {/* Copy Button */}
        <button
          className="btn-secondary"
          onClick={handleCopy}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          {copied ? '복사 완료!' : '응답 복사'}
        </button>
      </div>

      {/* Response Sub-tabs */}
      <div className="tab-header">
        <button
          className={`tab-btn ${activeTab === 'pretty' ? 'active' : ''}`}
          onClick={() => setActiveTab('pretty')}
        >
          JSON 보기 (Pretty)
        </button>
        <button
          className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          원본 텍스트 (Raw)
        </button>
        <button
          className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          응답 헤더 ({Object.keys(response.headers || {}).length})
        </button>
      </div>

      {/* Response Viewer */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {activeTab === 'pretty' && (
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: '#a5f3fc',
            background: '#0a0d14',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {jsonString}
          </pre>
        )}

        {activeTab === 'raw' && (
          <textarea
            readOnly
            className="code-box"
            style={{ height: '100%', minHeight: '200px' }}
            value={jsonString}
          />
        )}

        {activeTab === 'headers' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>헤더 이름</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>헤더 값</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(response.headers || {}).map(([key, val]) => (
                <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--accent-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{key}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{String(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
