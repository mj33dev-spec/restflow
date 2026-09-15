import React, { useState, useEffect } from 'react';
import { Folder, Braces, Layers, Save, CheckCircle, AlertCircle, Link } from 'lucide-react';
import { CollectionGroup, KeyValueItem } from '../types';
import { KeyValueEditor } from './KeyValueEditor';
import { TabButton } from './common/TabButton';
import { DLoading } from '../services/DLoading';
import { getRootCollectionId } from '../services/apiService';

interface CollectionConfigPanelProps {
  collection: CollectionGroup;
  allCollections?: CollectionGroup[];
  onSaveConfig: (collectionId: string, variables: KeyValueItem[], headers: KeyValueItem[]) => Promise<void>;
}

const ensureBaseVar = (vars: KeyValueItem[] = []) => {
  const hasBase = (vars || []).some((v) => v && v.key && v.key.trim().toLowerCase() === 'base');
  if (!hasBase) {
    return [{ id: 'var-default-base', key: 'base', value: 'http://localhost:3000', enabled: true }, ...(vars || [])];
  }
  return vars;
};

export const CollectionConfigPanel: React.FC<CollectionConfigPanelProps> = ({
  collection,
  allCollections = [],
  onSaveConfig,
}) => {
  // Resolve effective root collection for variables and headers if nested under a parent
  const getEffectiveCol = () => {
    if (collection.parentId && allCollections.length > 0) {
      const rootId = getRootCollectionId(collection.id, allCollections);
      const rootCol = allCollections.find((c) => c.id === rootId);
      if (rootCol) return rootCol;
    }
    return collection;
  };

  const effectiveCol = getEffectiveCol();

  // Common Headers on left (first), Common Variables on right (second)
  const [activeTab, setActiveTab] = useState<'headers' | 'variables'>('headers');
  const [variables, setVariables] = useState<KeyValueItem[]>(ensureBaseVar(effectiveCol.variables));
  const [headers, setHeaders] = useState<KeyValueItem[]>(effectiveCol.headers || []);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const eff = getEffectiveCol();
    setVariables(ensureBaseVar(eff.variables));
    setHeaders(eff.headers || []);
    setIsSaved(false);
  }, [collection, allCollections]);

  // Compute parent hierarchy path if this collection is a sub-folder
  const getParentPath = (): string => {
    if (!collection.parentId || !allCollections.length) return '';
    const chain: string[] = [];
    let curr = allCollections.find(c => c.id === collection.parentId);
    const visited = new Set<string>();

    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      chain.unshift(curr.name);
      if (curr.parentId) {
        curr = allCollections.find(c => c.id === curr!.parentId);
      } else {
        break;
      }
    }
    return chain.join(' > ');
  };

  const parentPath = getParentPath();

  const handleVariablesChange = (newVars: KeyValueItem[]) => {
    setVariables(newVars);
    onSaveConfig(collection.id, newVars, headers);
  };

  const handleHeadersChange = (newHeaders: KeyValueItem[]) => {
    setHeaders(newHeaders);
    onSaveConfig(collection.id, variables, newHeaders);
  };

  const handleSave = async () => {
    DLoading('컬렉션 공통 설정 저장 중...');
    try {
      await onSaveConfig(collection.id, variables, headers);
      setIsSaved(true);
      DLoading.dismiss('컬렉션 설정이 DB 및 로컬 저장소에 저장되었습니다!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      DLoading.dismiss('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
      color: '#fff',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <Folder size={22} color="var(--accent-primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {collection.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 400 }}>(컬렉션 공통 설정)</span>
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              이 컬렉션 및 하위 폴더의 모든 API 요청에 자동으로 적용될 공통 헤더 및 변수를 설정합니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ height: '38px', padding: '0 16px', fontSize: '0.85rem' }}
        >
          {isSaved ? (
            <>
              <CheckCircle size={16} /> 저장 완료
            </>
          ) : (
            <>
              <Save size={16} /> 설정 저장
            </>
          )}
        </button>
      </div>

      {/* Sub Tabs: Headers (Left) & Variables (Right) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(0,0,0,0.15)',
        padding: '0 16px'
      }}>
        <TabButton
          active={activeTab === 'headers'}
          onClick={() => setActiveTab('headers')}
          icon={<Layers size={15} />}
          label="공통 헤더 (Headers / Auth)"
          badge={headers.filter(h => h.enabled && h.key).length}
          style={{ padding: '12px 18px', fontSize: '0.85rem' }}
        />
        <TabButton
          active={activeTab === 'variables'}
          onClick={() => setActiveTab('variables')}
          icon={<Braces size={15} />}
          label="공통 변수 (Variables)"
          badge={variables.filter(v => v.enabled && v.key).length}
          style={{ padding: '12px 18px', fontSize: '0.85rem' }}
        />
      </div>

      {/* Parent Hierarchy Inheritance Notice Banner */}
      {parentPath && (
        <div style={{
          padding: '9px 24px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
          color: '#60a5fa',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Link size={15} />
          <span>
            🔗 <strong>상위 그룹 연동 상속:</strong> 이 폴더는 상위 컬렉션 (<strong>{parentPath}</strong>)의 공통 헤더 및 변수와 자동 연동·상속됩니다.
          </span>
        </div>
      )}

      {/* Inheritance Notice Banner */}
      <div style={{
        padding: '10px 24px',
        background: 'rgba(99, 102, 241, 0.08)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        color: '#a5b4fc',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <AlertCircle size={15} />
        <span>
          💡 <strong>자동 실시간 계층 상속:</strong> 이 컬렉션에 설정한 공통 헤더 및 변수는 모든 하위 폴더와 API 요청 시트에 실시간으로 계층 연동되어 자동 적용됩니다.
        </span>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
        {activeTab === 'headers' && (
          <div>
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 600 }}>
              컬렉션 공통 헤더 목록 (Authorization / Bearer 토큰 등)
            </h3>
            <KeyValueEditor
              items={headers}
              onChange={handleHeadersChange}
              keyPlaceholder="공통 헤더명 (예: Authorization)"
              valuePlaceholder="헤더 값 (예: Bearer {{token}})"
            />
          </div>
        )}

        {activeTab === 'variables' && (
          <div>
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 600 }}>
              컬렉션 공통 변수 목록
            </h3>
            <KeyValueEditor
              items={variables}
              onChange={handleVariablesChange}
              keyPlaceholder="공통 변수명 (예: baseUrl)"
              valuePlaceholder="변수 값 (예: https://api.example.com)"
            />
          </div>
        )}
      </div>
    </div>
  );
};
