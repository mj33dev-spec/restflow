import React, { useState } from 'react';
import { Plus, X, Table, Edit3, Folder } from 'lucide-react';
import { ApiTab } from '../../types';
import { MethodBadge } from './MethodBadge';

interface SpreadsheetTabBarProps {
  tabs: ApiTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCreateTab: () => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newTitle: string) => void;
}

export const SpreadsheetTabBar: React.FC<SpreadsheetTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onCloseTab,
  onRenameTab,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const handleStartRename = (tab: ApiTab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleSaveRename = (id: string) => {
    const currentTab = tabs.find((t) => t.id === id);
    const trimmed = editingTitle.trim();
    if (trimmed && currentTab && currentTab.title !== trimmed) {
      onRenameTab(id, trimmed);
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div style={{
      height: '40px',
      background: '#0d1117',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      gap: '8px',
      userSelect: 'none',
      flexShrink: 0,
      zIndex: 10
    }}>
      {/* Spreadsheet Icon Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px', borderRight: '1px solid var(--border-color)' }}>
        <Table size={16} color="var(--accent-primary)" />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.5px' }}>
          SHEETS
        </span>
      </div>

      {/* Tabs Container */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flex: 1,
        overflowX: 'auto',
        height: '100%',
        paddingTop: '4px'
      }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => handleStartRename(tab)}
              style={{
                height: '36px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.03)',
                borderTop: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                borderLeft: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                borderRight: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                maxWidth: '200px'
              }}
              title="더블클릭하여 시트 이름 변경"
            >
              {tab.type === 'collectionConfig' ? (
                <Folder size={14} color="var(--accent-primary)" />
              ) : (
                <MethodBadge method={tab.request.method} fontSize="0.65rem" padding="1px 5px" />
              )}

              {isEditing ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleSaveRename(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, tab.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#1e293b',
                    border: '1px solid var(--accent-primary)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.78rem',
                    padding: '2px 6px',
                    width: '90px',
                    outline: 'none'
                  }}
                />
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(tab.title || '').replace(new RegExp(`^${tab.request.method}\\s+`, 'i'), '').trim() || tab.title}
                </span>
              )}

              {/* Close Button (If more than 1 tab) */}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-subtle)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '50%',
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                  title="시트 닫기"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Sheet Button */}
      <button
        type="button"
        onClick={onCreateTab}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-color)',
          color: 'var(--accent-primary)',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          height: '28px',
          transition: 'all 0.15s ease'
        }}
        title="새 API 시트 생성"
      >
        <Plus size={14} /> 새 시트
      </button>
    </div>
  );
};
