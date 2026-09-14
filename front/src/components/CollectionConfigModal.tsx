import React, { useState, useEffect } from 'react';
import { X, Folder, Layers, Braces, Save } from 'lucide-react';
import { CollectionGroup, KeyValueItem } from '../types';
import { KeyValueEditor } from './KeyValueEditor';

interface CollectionConfigModalProps {
  isOpen: boolean;
  collection: CollectionGroup | null;
  onClose: () => void;
  onSave: (collectionId: string, variables: KeyValueItem[], headers: KeyValueItem[]) => void;
}

export const CollectionConfigModal: React.FC<CollectionConfigModalProps> = ({
  isOpen,
  collection,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'headers'>('variables');
  const [variables, setVariables] = useState<KeyValueItem[]>([]);
  const [headers, setHeaders] = useState<KeyValueItem[]>([]);

  useEffect(() => {
    if (collection) {
      setVariables(collection.variables || []);
      setHeaders(collection.headers || []);
    }
  }, [collection]);

  if (!isOpen || !collection) return null;

  const handleSaveConfirm = () => {
    onSave(collection.id, variables, headers);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: '560px',
        maxHeight: '85vh',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folder size={18} color="var(--accent-primary)" />
              {collection.name} (컬렉션 공통 설정)
            </h3>
            {collection.description && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {collection.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info banner */}
        <div style={{
          padding: '10px 16px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
          color: '#60a5fa',
          fontSize: '0.78rem',
          lineHeight: 1.5
        }}>
          💡 <strong>컬렉션 공통 상속:</strong> 등록된 공통 변수 및 헤더(Authorization/Bearer 토큰 등)는 이 컬렉션 하위의 모든 API 요청 실행 시 자동으로 적용됩니다.
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('variables')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'variables' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'variables' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Braces size={14} /> 공통 변수 (Variables) ({variables.filter(v => v.enabled && v.key).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'headers' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'headers' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Layers size={14} /> 공통 헤더 (Headers / Auth) ({headers.filter(h => h.enabled && h.key).length})
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '220px' }}>
          {activeTab === 'variables' && (
            <KeyValueEditor
              items={variables}
              onChange={setVariables}
              keyPlaceholder="공통 변수명 (예: baseUrl)"
              valuePlaceholder="변수 값 (예: http://localhost:3002)"
            />
          )}

          {activeTab === 'headers' && (
            <KeyValueEditor
              items={headers}
              onChange={setHeaders}
              keyPlaceholder="공통 헤더명 (예: Authorization)"
              valuePlaceholder="헤더 값 (예: Bearer token...)"
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" onClick={handleSaveConfirm}>
            <Save size={15} /> 설정 저장하기
          </button>
        </div>
      </div>
    </div>
  );
};
