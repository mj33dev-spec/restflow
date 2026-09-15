import React, { useState } from 'react';
import { Send, Code, Sliders, Layers, Sparkles, Braces } from 'lucide-react';
import { RequestState, HttpMethod, CollectionGroup, KeyValueItem } from '../types';
import { KeyValueEditor } from './KeyValueEditor';
import { TabButton } from './common/TabButton';
import { MethodBadge } from './common/MethodBadge';
import { CDropdown } from './common/CDropdown';

interface RequestPanelProps {
  height?: number;
  request: RequestState;
  onChange: (req: RequestState) => void;
  onSend: () => void;
  isLoading: boolean;
  onOpenSaveCollection: () => void;
  activeCollection?: CollectionGroup | null;
  onUpdateCollectionConfig?: (collectionId: string, variables: KeyValueItem[], headers: KeyValueItem[]) => void;
  onBlurUrl?: () => void;
}

export const RequestPanel: React.FC<RequestPanelProps> = ({
  height,
  request,
  onChange,
  onSend,
  isLoading,
  onOpenSaveCollection,
  activeCollection,
  onUpdateCollectionConfig,
  onBlurUrl,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'headers' | 'body' | 'variables'>('params');

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

  // Combine collection level variables/headers with request level variables/headers for display
  const colVars = activeCollection?.variables || [];
  const reqVars = request.variables || [];
  const colVarKeys = new Set(colVars.filter(v => v.key && v.key.trim()).map(v => v.key.trim()));
  const displayVariables = [
    ...colVars,
    ...reqVars.filter(v => !colVarKeys.has(v.key.trim())),
  ];

  const colHeaders = activeCollection?.headers || [];
  const reqHeaders = request.headers || [];
  const colHeaderKeys = new Set(colHeaders.filter(h => h.key && h.key.trim()).map(h => h.key.trim()));
  const displayHeaders = [
    ...colHeaders,
    ...reqHeaders.filter(h => !colHeaderKeys.has(h.key.trim())),
  ];

  const handleVariablesChange = (newVars: KeyValueItem[]) => {
    if (activeCollection && onUpdateCollectionConfig) {
      // Separate variables belonging to collection vs request specific vars
      const updatedColVars: KeyValueItem[] = [];
      const updatedReqVars: KeyValueItem[] = [];

      newVars.forEach(v => {
        if (colVarKeys.has(v.key.trim()) || (activeCollection && colVars.length === 0 && updatedColVars.length === 0)) {
          updatedColVars.push(v);
        } else {
          updatedReqVars.push(v);
        }
      });

      onUpdateCollectionConfig(activeCollection.id, updatedColVars, activeCollection.headers || []);
      onChange({ ...request, variables: updatedReqVars });
    } else {
      onChange({ ...request, variables: newVars });
    }
  };

  const handleHeadersChange = (newHeaders: KeyValueItem[]) => {
    if (activeCollection && onUpdateCollectionConfig) {
      const updatedColHeaders: KeyValueItem[] = [];
      const updatedReqHeaders: KeyValueItem[] = [];

      newHeaders.forEach(h => {
        if (colHeaderKeys.has(h.key.trim())) {
          updatedColHeaders.push(h);
        } else {
          updatedReqHeaders.push(h);
        }
      });

      onUpdateCollectionConfig(activeCollection.id, activeCollection.variables || [], updatedColHeaders);
      onChange({ ...request, headers: updatedReqHeaders });
    } else {
      onChange({ ...request, headers: newHeaders });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: height !== undefined ? `${height}%` : '50%',
      flexShrink: 0,
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
        {/* Method Selector using common CDropdown */}
        <CDropdown.fill
          value={<MethodBadge method={request.method} />}
          minWidth="125px"
          options={methods.map((m) => ({
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <MethodBadge method={m} />
              </span>
            ),
            active: request.method === m,
            onClick: () => {
              onChange({ ...request, method: m });
              if ((m === 'GET' || m === 'HEAD') && activeSubTab === 'body') {
                setActiveSubTab('params');
              }
            },
          }))}
        />

        {/* URL Input */}
        <input
          type="text"
          placeholder="요청할 URL을 입력하세요 (예: {{baseUrl}}/api/users 또는 https://api.example.com/users)"
          value={request.url}
          onChange={(e) => onChange({ ...request, url: e.target.value })}
          onBlur={() => {
            if (onBlurUrl) onBlurUrl();
          }}
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
      </div>

      {/* Sub Tabs */}
      <div className="tab-header">
        <TabButton
          active={activeSubTab === 'params'}
          onClick={() => setActiveSubTab('params')}
          icon={<Sliders size={14} />}
          label="파라미터 (Params)"
          badge={request.params.filter(p => p.enabled && p.key).length}
        />
        <TabButton
          active={activeSubTab === 'headers'}
          onClick={() => setActiveSubTab('headers')}
          icon={<Layers size={14} />}
          label="헤더 (Headers)"
          badge={displayHeaders.filter(h => h.enabled && h.key).length}
        />
        <TabButton
          active={activeSubTab === 'body'}
          onClick={() => setActiveSubTab('body')}
          icon={<Code size={14} />}
          label={`바디 (Body) ${request.method === 'GET' || request.method === 'HEAD' ? '(미사용)' : '(사용 중)'}`}
          opacity={request.method === 'GET' || request.method === 'HEAD' ? 0.6 : 1}
        />
        <TabButton
          active={activeSubTab === 'variables'}
          onClick={() => setActiveSubTab('variables')}
          icon={<Braces size={14} />}
          label="변수 (Variables)"
          badge={displayVariables.filter(v => v.enabled && v.key).length}
        />
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
            items={displayHeaders}
            onChange={handleHeadersChange}
            keyPlaceholder="헤더 이름 (예: Authorization)"
            valuePlaceholder="헤더 값 (예: Bearer token...)"
          />
        )}

        {activeSubTab === 'variables' && (
          <KeyValueEditor
            items={displayVariables}
            onChange={handleVariablesChange}
            keyPlaceholder="변수 이름 (예: baseUrl, token)"
            valuePlaceholder="변수 값 (예: https://api.example.com 또는 http://localhost:포트)"
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
