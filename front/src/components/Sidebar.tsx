import React, { useState, useRef, useEffect } from 'react';
import { History, Bookmark, Trash2, Clock, Folder, ChevronDown, ChevronRight, Plus, Pencil, GripVertical } from 'lucide-react';
import { HistoryItem, CollectionGroup, CollectionRequestItem } from '../types';
import { MethodBadge } from './common/MethodBadge';
import { EmptyState } from './common/EmptyState';
import { TabButton } from './common/TabButton';
import { DAlert } from '../services/DAlert';

interface SidebarProps {
  width?: number;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  collections: CollectionGroup[];
  onSelectCollectionItem: (item: CollectionRequestItem, collection: CollectionGroup) => void;
  onDeleteCollectionGroup: (id: string) => void;
  onDeleteCollectionItem: (id: string) => void;
  onOpenCollectionConfig: (collection: CollectionGroup) => void;
  onRenameCollectionGroup?: (id: string, newName: string) => Promise<void>;
  onRenameCollectionItem?: (id: string, newName: string) => Promise<void>;
  onAddRequestToCollection?: (collection: CollectionGroup) => void;
  onMoveFolderToParent?: (folderId: string, parentId: string | null, targetBeforeFolderId?: string | null) => void;
  onMoveItemToFolder?: (itemId: string, targetFolderId: string, targetBeforeItemId?: string | null) => void;
  user: any;
  onOpenAuthModal: () => void;
  onCreateFolderClick: () => void;
  activeCollectionItemId?: string;
  activeConfigCollectionId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  width,
  history = [],
  onSelectHistory,
  onClearHistory,
  onDeleteHistoryItem,
  collections = [],
  onSelectCollectionItem,
  onDeleteCollectionGroup,
  onDeleteCollectionItem,
  onOpenCollectionConfig,
  onRenameCollectionGroup,
  onRenameCollectionItem,
  onAddRequestToCollection,
  onMoveFolderToParent,
  onMoveItemToFolder,
  user,
  onOpenAuthModal,
  onCreateFolderClick,
  activeCollectionItemId,
  activeConfigCollectionId,
}) => {
  const [activeTabType, setActiveTabType] = useState<'collections' | 'history'>('collections');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Custom Mouse Dragging State & Ref (Bypasses Chrome Native DnD Engine Lockups 100%)
  const dragItemRef = useRef<{ type: 'folder' | 'item'; id: string; sourceFolderId?: string; name: string } | null>(null);
  const [activeDragInfo, setActiveDragInfo] = useState<{ name: string; x: number; y: number } | null>(null);
  const [dropTargetInfo, setDropTargetInfo] = useState<{ type?: 'folder' | 'item'; id: string; folderId?: string; position: 'before' | 'inside' } | null>(null);

  const historyList = Array.isArray(history) ? history : [];
  const collectionList = Array.isArray(collections) ? collections : [];

  const handleGripMouseDown = (
    e: React.MouseEvent,
    item: { type: 'folder' | 'item'; id: string; sourceFolderId?: string; name: string }
  ) => {
    if (e.button !== 0) return; // Primary left click only
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    dragItemRef.current = item;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (dist > 4) {
        isDragging = true;
        setActiveDragInfo({
          name: item.name,
          x: moveEvent.clientX + 12,
          y: moveEvent.clientY + 12,
        });

        const hoveredEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const targetItemEl = hoveredEl?.closest('[data-item-id]') as HTMLElement | null;
        const targetFolderEl = hoveredEl?.closest('[data-folder-id]') as HTMLElement | null;

        if (targetItemEl) {
          const targetItemId = targetItemEl.getAttribute('data-item-id')!;
          const targetFolderId = targetItemEl.getAttribute('data-folder-id')!;

          if (item.type === 'item' && targetItemId === item.id) {
            setDropTargetInfo(null);
            return;
          }

          setDropTargetInfo((prev) => {
            if (prev?.type === 'item' && prev?.id === targetItemId && prev?.position === 'before') return prev;
            return { type: 'item', id: targetItemId, folderId: targetFolderId, position: 'before' };
          });
        } else if (targetFolderEl) {
          const targetFolderId = targetFolderEl.getAttribute('data-folder-id')!;

          if (item.type === 'folder' && targetFolderId === item.id) {
            setDropTargetInfo(null);
            return;
          }

          const rect = targetFolderEl.getBoundingClientRect();
          const relY = moveEvent.clientY - rect.top;
          const position: 'before' | 'inside' = (item.type === 'folder' && relY < 14) ? 'before' : 'inside';

          setDropTargetInfo((prev) => {
            if (prev?.type === 'folder' && prev?.id === targetFolderId && prev?.position === position) return prev;
            return { type: 'folder', id: targetFolderId, position };
          });
        } else {
          setDropTargetInfo(null);
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      setActiveDragInfo(null);
      setDropTargetInfo(null);

      if (isDragging && dragItemRef.current) {
        const hoveredEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetItemEl = hoveredEl?.closest('[data-item-id]') as HTMLElement | null;
        const targetFolderEl = hoveredEl?.closest('[data-folder-id]') as HTMLElement | null;

        if (targetItemEl && item.type === 'item') {
          const targetItemId = targetItemEl.getAttribute('data-item-id')!;
          const targetFolderId = targetItemEl.getAttribute('data-folder-id')!;
          if (targetItemId !== item.id && onMoveItemToFolder) {
            onMoveItemToFolder(item.id, targetFolderId, targetItemId);
          }
        } else if (targetFolderEl) {
          const targetFolderId = targetFolderEl.getAttribute('data-folder-id')!;
          const targetFolder = collectionList.find((c) => c.id === targetFolderId);
          const rect = targetFolderEl.getBoundingClientRect();
          const relY = upEvent.clientY - rect.top;

          if (item.type === 'folder') {
            const position: 'before' | 'inside' = relY < 14 ? 'before' : 'inside';
            if (position === 'before' && targetFolder) {
              if (onMoveFolderToParent) {
                onMoveFolderToParent(item.id, targetFolder.parentId || null, targetFolder.id);
              }
            } else if (position === 'inside') {
              if (item.id !== targetFolderId && onMoveFolderToParent) {
                onMoveFolderToParent(item.id, targetFolderId, null);
              }
            }
          } else if (item.type === 'item') {
            if (onMoveItemToFolder) {
              onMoveItemToFolder(item.id, targetFolderId, null);
            }
          }
        }
      }

      dragItemRef.current = null;
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? true : !prev[folderId]
    }));
  };

  const handleFinishRename = async (folderId: string, currentName: string) => {
    const trimmed = editingFolderName.trim();
    if (!trimmed || trimmed === currentName) {
      setEditingFolderId(null);
      return;
    }
    if (onRenameCollectionGroup) {
      await onRenameCollectionGroup(folderId, trimmed);
    }
    setEditingFolderId(null);
  };

  const handleFinishRenameItem = async (itemId: string, currentName: string) => {
    const trimmed = editingItemName.trim();
    if (!trimmed || trimmed === currentName) {
      setEditingItemId(null);
      return;
    }
    if (onRenameCollectionItem) {
      await onRenameCollectionItem(itemId, trimmed);
    }
    setEditingItemId(null);
  };

  const renderFolderTree = (parentId: string | null = null, depth: number = 0) => {
    const currentFolders = collectionList.filter((col) => {
      if (parentId === null) {
        return !col.parentId || !collectionList.some((p) => p.id === col.parentId);
      }
      return col.parentId === parentId;
    });

    return currentFolders.map((colGroup) => {
      const isExpanded = expandedFolders[colGroup.id] !== false; // Default expanded
      const items = colGroup.items || [];
      const isConfigSelected = activeConfigCollectionId === colGroup.id;
      const subFolders = collectionList.filter((c) => c.parentId === colGroup.id);
      const isDropBefore = dropTargetInfo?.type === 'folder' && dropTargetInfo?.id === colGroup.id && dropTargetInfo?.position === 'before';
      const isDropInside = dropTargetInfo?.id === colGroup.id && dropTargetInfo?.position === 'inside';

      return (
        <React.Fragment key={colGroup.id}>
          {isDropBefore && (
            <hr
              style={{
                border: 'none',
                height: '3px',
                background: '#6366f1',
                margin: '4px 0',
                borderRadius: '2px',
                marginLeft: depth > 0 ? `${depth * 10}px` : '0px',
              }}
            />
          )}
          <div
            data-folder-id={colGroup.id}
            style={{
              marginBottom: '6px',
              border: isDropInside ? '2px dashed var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
              background: isDropInside ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.03)',
              boxShadow: isDropInside ? '0 0 12px rgba(99, 102, 241, 0.35)' : 'none',
              transition: 'all 0.15s ease',
              marginLeft: depth > 0 ? `${depth * 10}px` : '0px',
            }}
          >
          {/* Folder Header */}
          <div
            onClick={() => onOpenCollectionConfig(colGroup)}
            title="클릭 시 컬렉션 공통 설정(변수/헤더) 열기"
            style={{
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: isConfigSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.03)',
              borderBottom: (isExpanded && (items.length > 0 || subFolders.length > 0)) ? '1px solid var(--border-color)' : 'none',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isConfigSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              if (!isConfigSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
              {/* Drag Handle Icon - Triggers Custom Mouse Drag */}
              <div
                onMouseDown={(e) => handleGripMouseDown(e, { type: 'folder', id: colGroup.id, name: colGroup.name })}
                onClick={(e) => e.stopPropagation()}
                style={{
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-subtle)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
                title="드래그하여 폴더 위치 변경"
              >
                <GripVertical size={14} />
              </div>

              {/* Expand Toggle & Icon */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(colGroup.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)'
                }}
                title={isExpanded ? '폴더 접기' : '폴더 펼치기'}
              >
                {isExpanded ? <ChevronDown size={14} color="var(--accent-primary)" /> : <ChevronRight size={14} color="var(--text-subtle)" />}
                <Folder size={15} color="var(--accent-primary)" />
              </div>

              {/* Inline Name Editor */}
              {editingFolderId === colGroup.id ? (
                <input
                  type="text"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename(colGroup.id, colGroup.name);
                    if (e.key === 'Escape') setEditingFolderId(null);
                  }}
                  onBlur={() => handleFinishRename(colGroup.id, colGroup.name)}
                  autoFocus
                  style={{
                    background: '#0d1117',
                    border: '1px solid var(--accent-primary)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    outline: 'none',
                    width: '110px'
                  }}
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(colGroup.id);
                    setEditingFolderName(colGroup.name);
                  }}
                  onMouseEnter={() => setHoveredFolderId(colGroup.id)}
                  onMouseLeave={() => setHoveredFolderId(null)}
                  style={{
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderBottom: hoveredFolderId === colGroup.id ? '1px dashed var(--accent-primary)' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                  title="클릭하여 컬렉션 이름 수정"
                >
                  {colGroup.name}
                  <Pencil
                    size={11}
                    style={{
                      opacity: hoveredFolderId === colGroup.id ? 1 : 0,
                      transition: 'opacity 0.15s ease',
                      color: 'var(--accent-primary)'
                    }}
                  />
                </span>
              )}

              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                ({items.length})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddRequestToCollection) {
                    onAddRequestToCollection(colGroup);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="이 폴더에 새 API 요청 추가"
              >
                <Plus size={14} />
              </button>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const confirmed = await DAlert.confirmAsync(`'${colGroup.name}' 컬렉션 폴더 및 하위 요청 항목을 삭제하시겠습니까?`, {
                    title: '컬렉션 폴더 삭제',
                    type: 'error',
                  });
                  if (confirmed) {
                    onDeleteCollectionGroup(colGroup.id);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="컬렉션 폴더 삭제"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Child Items & Recursive Sub-folders */}
          {isExpanded && (
            <div style={{ padding: '4px 4px 6px 6px' }}>
              {/* Recursive Sub-folders */}
              {renderFolderTree(colGroup.id, depth + 1)}

              {/* Request Items */}
              {items.length > 0 && items.map((reqItem) => {
                const isItemSelected = activeCollectionItemId === reqItem.id;
                const isItemDropBefore =
                  dropTargetInfo?.type === 'item' &&
                  dropTargetInfo?.id === reqItem.id &&
                  dropTargetInfo?.position === 'before';

                return (
                  <React.Fragment key={reqItem.id}>
                    {isItemDropBefore && (
                      <hr
                        style={{
                          border: 'none',
                          height: '3px',
                          background: '#6366f1',
                          margin: '4px 0',
                          borderRadius: '2px',
                        }}
                      />
                    )}
                    <div
                      data-item-id={reqItem.id}
                      data-folder-id={colGroup.id}
                      onClick={() => onSelectCollectionItem(reqItem, colGroup)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        marginTop: '4px',
                        background: isItemSelected ? 'rgba(99, 102, 241, 0.28)' : 'rgba(0,0,0,0.2)',
                        border: isItemSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isItemSelected ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        transition: 'all 0.15s ease'
                      }}
                    onMouseEnter={(e) => {
                      if (!isItemSelected) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isItemSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                      {/* Drag Handle Icon for Item */}
                      <div
                        onMouseDown={(e) => handleGripMouseDown(e, { type: 'item', id: reqItem.id, sourceFolderId: colGroup.id, name: reqItem.name })}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          cursor: 'grab',
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--text-subtle)',
                          padding: '2px 4px',
                          borderRadius: '3px',
                        }}
                        title="드래그하여 다른 폴더로 이동"
                      >
                        <GripVertical size={13} />
                      </div>

                      <div style={{ width: '56px', minWidth: '56px', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0 }}>
                        <MethodBadge method={reqItem.method} fontSize="0.65rem" padding="2px 5px" />
                      </div>
                      {editingItemId === reqItem.id ? (
                        <input
                          type="text"
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRenameItem(reqItem.id, reqItem.name);
                            if (e.key === 'Escape') setEditingItemId(null);
                          }}
                          onBlur={() => handleFinishRenameItem(reqItem.id, reqItem.name)}
                          autoFocus
                          style={{
                            background: '#0d1117',
                            border: '1px solid var(--accent-primary)',
                            color: '#fff',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            outline: 'none',
                            width: '100px'
                          }}
                        />
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItemId(reqItem.id);
                            setEditingItemName(reqItem.name);
                          }}
                          onMouseEnter={() => setHoveredItemId(reqItem.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          style={{
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderBottom: hoveredItemId === reqItem.id ? '1px dashed var(--accent-primary)' : '1px solid transparent',
                            transition: 'all 0.15s ease'
                          }}
                          title="클릭하여 요청 이름 수정"
                        >
                          {reqItem.name}
                          <Pencil
                            size={10}
                            style={{
                              opacity: hoveredItemId === reqItem.id ? 1 : 0,
                              transition: 'opacity 0.15s ease',
                              color: 'var(--accent-primary)',
                              flexShrink: 0
                            }}
                          />
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCollectionItem(reqItem.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-subtle)',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                      title="요청 항목 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </React.Fragment>
              );
            })}

              {items.length === 0 && subFolders.length === 0 && (
                <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                  하위 항목이 없습니다. (드래그하여 이동 가능)
                </div>
              )}
            </div>
          )}
        </div>
      </React.Fragment>
    );
  });
};

  return (
    <aside style={{
      width: width !== undefined ? `${width}px` : '320px',
      flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      userSelect: 'none'
    }}>
      {/* Floating Drag Avatar Badge */}
      {activeDragInfo && (
        <div
          style={{
            position: 'fixed',
            left: activeDragInfo.x,
            top: activeDragInfo.y,
            pointerEvents: 'none',
            zIndex: 99999,
            background: '#6366f1',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Folder size={14} />
          <span>이동 중: {activeDragInfo.name}</span>
        </div>
      )}

      {/* Sidebar Header Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(0,0,0,0.15)'
      }}>
        <TabButton
          active={activeTabType === 'history'}
          onClick={() => setActiveTabType('history')}
          icon={<History size={16} />}
          label={`실행 이력 (${historyList.length})`}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 0,
            justifyContent: 'center'
          }}
        />
        <TabButton
          active={activeTabType === 'collections'}
          onClick={() => setActiveTabType('collections')}
          icon={<Bookmark size={16} />}
          label={`컬렉션 (${collectionList.length})`}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 0,
            justifyContent: 'center'
          }}
        />
      </div>

      {/* History List View */}
      {activeTabType === 'history' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              최근 요청 이력
            </span>
            {historyList.length > 0 && (
              <button
                onClick={onClearHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="전체 삭제"
              >
                <Trash2 size={13} /> 전체 삭제
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {historyList.length === 0 ? (
              <EmptyState
                icon={<Clock size={32} />}
                title="저장된 요청 이력이 없습니다."
                description="요청을 전송하면 이곳에 기록됩니다."
              />
            ) : (
              historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <MethodBadge method={item.method} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.status !== undefined && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: item.status >= 400 ? '#f87171' : '#34d399'
                        }}>
                          {item.status}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHistoryItem(item.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-subtle)',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        title="항목 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-mono)',
                    wordBreak: 'break-all',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.url}
                  </div>
                  {item.timeMs !== undefined && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', textAlign: 'right' }}>
                      {item.timeMs} ms
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Collections Folder Tree View */}
      {activeTabType === 'collections' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!user && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderBottom: '1px solid var(--border-color)',
              color: '#818cf8',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>💡 로그인 시 DB에 영구 보존됩니다</span>
              <button
                onClick={onOpenAuthModal}
                style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              >
                로그인
              </button>
            </div>
          )}
          <div style={{
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              내 컬렉션 폴더 ({collectionList.length})
            </span>
            <button
              onClick={onCreateFolderClick}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="새 컬렉션 폴더 생성"
            >
              <Plus size={14} /> 새 폴더
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {collectionList.length === 0 ? (
              <EmptyState
                icon={<Folder size={36} />}
                title="저장된 컬렉션 폴더가 없습니다."
                description={
                  <>
                    상단 <strong>[+ 새 폴더]</strong> 버튼을 눌러 새 컬렉션 폴더를 생성해 보세요.
                  </>
                }
              />
            ) : (
              <>
                {renderFolderTree(null, 0)}

                {dropTargetInfo?.id === 'root' && (
                  <hr
                    style={{
                      border: 'none',
                      height: '3px',
                      background: '#6366f1',
                      margin: '6px 0',
                      borderRadius: '2px',
                    }}
                  />
                )}

              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};


