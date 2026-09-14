import React, { useState } from 'react';
import { Send, Code, Sliders, Layers, Sparkles, BookmarkPlus } from 'lucide-react';
import { RequestState, HttpMethod } from '../types';
import { KeyValueEditor } from './KeyValueEditor';

interface RequestPanelProps {
  request: RequestState;
  onChange: (req: RequestState) => void;
  onSend: () => void;
  isLoading: boolean;
  onOpenSaveCollection: () => void;
}

export const RequestPanel: React.FC<RequestPanelProps> = ({
  request,
  onChange,
  onSend,
  isLoading,
  onOpenSaveCollection,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'headers' | 'body'>('params');

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(request.body);
      onChange({
        ...request,
        body: JSON.stringify(parsed, null, 2),
      });
    } catch (e) {
      alert('올바른 JSON 형식이 아닙니다. 구문을 확인해 주세요.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSend();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '50%',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-primary)'
    }}>
      {/* Top Address Bar (Method + URL + Send) */}
      <div style={{
        padding: '16px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Method Selector */}
        <select
          value={request.method}
          onChange={(e) => {
            const newMethod = e.target.value as HttpMethod;
            onChange({ ...request, method: newMethod });
            if ((newMethod === 'GET' || newMethod === 'HEAD') && activeSubTab === 'body') {
              setActiveSubTab('params');
            }
          }}
          style={{
            height: '42px',
            background: 'var(--bg-tertiary)',
            color: '#fff',
            fontWeight: 700,
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0 14px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {methods.map((m) => (
            <option key={m} value={m} style={{ background: '#1e293b' }}>
              {m}
            </option>
          ))}
        </select>

        {/* URL Input */}
        <input
          type="text"
          placeholder="요청할 URL을 입력하세요 (예: http://localhost:3002/api/echo 또는 https://httpbin.org/get)"
          value={request.url}
          onChange={(e) => onChange({ ...request, url: e.target.value })}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            height: '42px',
            background: '#0d1117',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: '#fff',
            padding: '0 16px',
            fontSize: '0.95rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none'
          }}
        />

        {/* Send Button */}
        <button
          className="btn-primary"
          onClick={onSend}
          disabled={isLoading || !request.url.trim()}
        >
          {isLoading ? (
            <span>전송 중...</span>
          ) : (
            <>
              <Send size={16} /> 요청 전송
            </>
          )}
        </button>

        {/* Save to Collection Button */}
        <button
          className="btn-secondary"
          onClick={onOpenSaveCollection}
          style={{ height: '42px', padding: '0 14px', fontSize: '0.85rem' }}
          title="현재 API 요청을 DB 컬렉션에 저장"
        >
          <BookmarkPlus size={16} color="var(--accent-primary)" /> 컬렉션 저장
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="tab-header">
        <button
          className={`tab-btn ${activeSubTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('params')}
        >
          <Sliders size={14} /> 파라미터 (Params) ({request.params.filter(p => p.enabled && p.key).length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('headers')}
        >
          <Layers size={14} /> 헤더 (Headers) ({request.headers.filter(h => h.enabled && h.key).length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('body')}
          style={{ opacity: request.method === 'GET' || request.method === 'HEAD' ? 0.6 : 1 }}
        >
          <Code size={14} /> 바디 (Body) {request.method === 'GET' || request.method === 'HEAD' ? '(미사용)' : '(사용 중)'}
        </button>
      </div>

      {/* Tab Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeSubTab === 'params' && (
          <KeyValueEditor
            items={request.params}
            onChange={(params) => onChange({ ...request, params })}
            keyPlaceholder="파라미터 키 (예: page)"
            valuePlaceholder="값 (예: 1)"
          />
        )}

        {activeSubTab === 'headers' && (
          <KeyValueEditor
            items={request.headers}
            onChange={(headers) => onChange({ ...request, headers })}
            keyPlaceholder="헤더 이름 (예: Authorization)"
            valuePlaceholder="헤더 값 (예: Bearer token...)"
          />
        )}

        {activeSubTab === 'body' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
            {request.method === 'GET' || request.method === 'HEAD' ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '20px',
                color: '#fbbf24',
                fontSize: '0.85rem',
                lineHeight: 1.6
              }}>
                <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '6px' }}>
                  ⚠️ GET / HEAD 방식은 Request Body를 포함하지 않습니다.
                </strong>
                HTTP 표준 규격(RFC 7231)에 따라 GET 요청은 Body 데이터를 전송하지 않습니다.<br />
                서버로 데이터를 전달하시려면 <strong>파라미터(Params)</strong> 탭을 클릭하여 Query Parameter로 등록해 주세요.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="bodyType"
                        checked={request.bodyType === 'json'}
                        onChange={() => onChange({ ...request, bodyType: 'json' })}
                      />
                      JSON (application/json)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="bodyType"
                        checked={request.bodyType === 'raw'}
                        onChange={() => onChange({ ...request, bodyType: 'raw' })}
                      />
                      일반 텍스트 (Raw)
                    </label>
                  </div>

                  {request.bodyType === 'json' && (
                    <button
                      className="btn-secondary"
                      onClick={handleFormatJson}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      <Sparkles size={13} color="var(--accent-primary)" /> JSON 자동 정렬
                    </button>
                  )}
                </div>

                <textarea
                  className="code-box"
                  style={{ flex: 1, minHeight: '130px' }}
                  placeholder={'{\n  "name": "홍길동"\n}'}
                  value={request.body}
                  onChange={(e) => onChange({ ...request, body: e.target.value })}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
