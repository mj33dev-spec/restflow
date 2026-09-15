import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Table, Folder, MoreHorizontal, Check, GripVertical } from 'lucide-react';
import { ApiTab } from '../../types';
import { MethodBadge } from './MethodBadge';

interface SpreadsheetTabBarProps {
  tabs: ApiTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCreateTab?: () => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newTitle: string) => void;
  onReorderTabs?: (newTabs: ApiTab[]) => void;
}

export const SpreadsheetTabBar: React.FC<SpreadsheetTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onReorderTabs,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // --- Drag and Drop States for Sheets ---
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.top - 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        moreBtnRef.current && !moreBtnRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleSelectFromMenu = (id: string) => {
    onSelectTab(id);
    setIsMenuOpen(false);
    if (tabRefs.current[id]) {
      tabRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  // --- Sheet Tab Drag Handlers ---
  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedTabId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTabId && draggedTabId !== targetId) {
      setDragOverTabId(targetId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTabId(null);
    const sourceId = draggedTabId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = tabs.findIndex(t => t.id === sourceId);
    const toIndex = tabs.findIndex(t => t.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const updatedTabs = [...tabs];
      const [movedTab] = updatedTabs.splice(fromIndex, 1);
      updatedTabs.splice(toIndex, 0, movedTab);

      if (onReorderTabs) {
        onReorderTabs(updatedTabs);
      }
    }
    setDraggedTabId(null);
  };

  return (
    <div style={{
      height: '38px',
      background: '#0d1117',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: '6px',
      userSelect: 'none',
      flexShrink: 0,
      zIndex: 10,
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Spreadsheet Icon Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px', borderRight: '1px solid var(--border-color)', flexShrink: 0 }}>
        <Table size={15} color="var(--accent-primary)" />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.5px' }}>
          SHEETS
        </span>
      </div>

      {/* Tabs Container */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          height: '100%',
          paddingTop: '2px',
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
            height: 0;
            width: 0;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;
          const isDragOver = dragOverTabId === tab.id;
          const isDraggingThis = draggedTabId === tab.id;

          return (
            <div
              key={tab.id}
              ref={(el) => (tabRefs.current[tab.id] = el)}
              draggable
              onDragStart={(e) => handleTabDragStart(e, tab.id)}
              onDragOver={(e) => handleTabDragOver(e, tab.id)}
              onDragLeave={() => setDragOverTabId(null)}
              onDrop={(e) => handleTabDrop(e, tab.id)}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => handleStartRename(tab)}
              style={{
                height: '34px',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isDragOver
                  ? 'rgba(99, 102, 241, 0.25)'
                  : isActive
                    ? 'var(--bg-secondary)'
                    : 'rgba(255,255,255,0.03)',
                borderTop: isDragOver
                  ? '2px solid #34d399'
                  : isActive
                    ? '2px solid var(--accent-primary)'
                    : '2px solid transparent',
                borderLeft: isDragOver
                  ? '2px solid var(--accent-primary)'
                  : isActive
                    ? '1px solid var(--border-color)'
                    : '1px solid transparent',
                borderRight: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                opacity: isDraggingThis ? 0.4 : 1,
                cursor: 'grab',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                maxWidth: '180px',
                flexShrink: 0
              }}
              title="드래그하여 시트 위치 이동 (더블클릭하여 시트 이름 변경)"
            >
              {tab.type === 'collectionConfig' ? (
                <Folder size={13} color="var(--accent-primary)" />
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
                    fontSize: '0.75rem',
                    padding: '2px 6px',
                    width: '85px',
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
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Sheets Dropdown Button (...) */}
      <button
        ref={moreBtnRef}
        type="button"
        onClick={handleToggleMenu}
        style={{
          background: isMenuOpen ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-color)',
          color: isMenuOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
          borderRadius: '6px',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.15s ease'
        }}
        title="열려있는 전체 시트 목록 보기"
      >
        <MoreHorizontal size={16} />
      </button>

      {/* Dropdown Portal */}
      {isMenuOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            bottom: '44px',
            right: menuPos.right,
            width: '240px',
            maxHeight: '280px',
            overflowY: 'auto',
            background: '#161b22',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            padding: '6px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-subtle)',
            padding: '4px 8px 6px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>열린 시트 목록 ({tabs.length})</span>
          </div>

          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => handleSelectFromMenu(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                  <div style={{ width: '14px', display: 'flex', alignItems: 'center' }}>
                    {isActive && <Check size={13} color="var(--accent-primary)" />}
                  </div>
                  {tab.type === 'collectionConfig' ? (
                    <Folder size={13} color="var(--accent-primary)" />
                  ) : (
                    <MethodBadge method={tab.request.method} fontSize="0.62rem" padding="1px 4px" />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tab.title}
                  </span>
                </div>

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
                      opacity: 0.6
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    title="시트 닫기"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
