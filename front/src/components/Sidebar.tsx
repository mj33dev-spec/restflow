import React, { useState } from 'react';
import { History, Bookmark, Trash2, Clock, LogIn, Folder, ChevronDown, ChevronRight, Settings, Plus } from 'lucide-react';
import { HistoryItem, CollectionGroup, CollectionRequestItem } from '../types';
import { MethodBadge } from './common/MethodBadge';
import { EmptyState } from './common/EmptyState';
import { TabButton } from './common/TabButton';

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
  user: any;
  onOpenAuthModal: () => void;
  onCreateFolderClick: () => void;
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
  user,
  onOpenAuthModal,
  onCreateFolderClick,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'collections'>('history');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const historyList = Array.isArray(history) ? history : [];
  const collectionList = Array.isArray(collections) ? collections : [];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? true : !prev[folderId]
    }));
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
      {/* Sidebar Header Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(0,0,0,0.15)'
      }}>
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
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
          active={activeTab === 'collections'}
          onClick={() => setActiveTab('collections')}
          icon={<Bookmark size={16} />}
          label={`컬렉션 (${user ? collectionList.length : '🔒'})`}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 0,
            justifyContent: 'center'
          }}
        />
      </div>

      {/* History List View */}
      {activeTab === 'history' && (
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
      {activeTab === 'collections' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!user ? (
            <EmptyState
              icon={<Bookmark size={36} />}
              title="로그인 필요"
              description="컬렉션 폴더를 생성하고 API 요청 그룹을 저장하려면 로그인이 필요합니다."
              action={
                <button
                  className="btn-primary"
                  onClick={onOpenAuthModal}
                  style={{ fontSize: '0.8rem', height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <LogIn size={14} /> 로그인하기
                </button>
              }
            />
          ) : (
            <>
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
                        우측 상단 <strong>[+ 새 폴더]</strong> 버튼을 누르시거나 주소창 옆의 <strong>[컬렉션 저장]</strong>을 눌러보세요.
                      </>
                    }
                  />
                ) : (
                  collectionList.map((colGroup) => {
                    const isExpanded = expandedFolders[colGroup.id] !== false; // Default expanded
                    const items = colGroup.items || [];

                    return (
                      <div
                        key={colGroup.id}
                        style={{
                          marginBottom: '8px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'rgba(99, 102, 241, 0.03)'
                        }}
                      >
                        {/* Folder Header */}
                        <div
                          onClick={() => toggleFolder(colGroup.id)}
                          style={{
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.03)',
                            borderBottom: isExpanded && items.length > 0 ? '1px solid var(--border-color)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                            {isExpanded ? <ChevronDown size={15} color="var(--accent-primary)" /> : <ChevronRight size={15} color="var(--text-subtle)" />}
                            <Folder size={16} color="var(--accent-primary)" />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {colGroup.name}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                              ({items.length})
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Collection Settings Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCollectionConfig(colGroup);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: (colGroup.variables?.length || colGroup.headers?.length) ? 'var(--accent-primary)' : 'var(--text-subtle)',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="컬렉션 공통 설정 (변수 / 헤더)"
                            >
                              <Settings size={14} />
                            </button>

                            {/* Delete Folder Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`'${colGroup.name}' 컬렉션 폴더 및 하위 요청 항목을 삭제하시겠습니까?`)) {
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

                        {/* Child Request Items */}
                        {isExpanded && (
                          <div style={{ padding: '4px 6px 6px 12px' }}>
                            {items.length === 0 ? (
                              <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                                하위 요청 항목이 없습니다.
                              </div>
                            ) : (
                              items.map((reqItem) => (
                                <div
                                  key={reqItem.id}
                                  onClick={() => onSelectCollectionItem(reqItem, colGroup)}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    marginTop: '4px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.8rem',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                                    <MethodBadge method={reqItem.method} fontSize="0.68rem" padding="2px 6px" />
                                    <span style={{ color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {reqItem.name}
                                    </span>
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
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};


