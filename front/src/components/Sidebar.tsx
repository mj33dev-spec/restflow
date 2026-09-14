import React, { useState } from 'react';
import { History, Bookmark, Trash2, Clock, LogIn, FolderCheck } from 'lucide-react';
import { HistoryItem, CollectionItem } from '../types';

interface SidebarProps {
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  collections: CollectionItem[];
  onSelectCollection: (item: CollectionItem) => void;
  onDeleteCollectionItem: (id: string) => void;
  user: any;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history = [],
  onSelectHistory,
  onClearHistory,
  onDeleteHistoryItem,
  collections = [],
  onSelectCollection,
  onDeleteCollectionItem,
  user,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'collections'>('history');
  const historyList = Array.isArray(history) ? history : [];
  const collectionList = Array.isArray(collections) ? collections : [];

  return (
    <aside style={{
      width: '320px',
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
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'history' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <History size={16} /> 실행 이력 ({historyList.length})
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'collections' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'collections' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Bookmark size={16} /> 컬렉션 ({user ? collectionList.length : '🔒'})
        </button>
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
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-subtle)',
                fontSize: '0.85rem'
              }}>
                <Clock size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>저장된 요청 이력이 없습니다.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>요청을 전송하면 이곳에 기록됩니다.</p>
              </div>
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
                    <span className={`badge-method ${item.method}`}>
                      {item.method}
                    </span>
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

      {/* Collections View */}
      {activeTab === 'collections' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!user ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bookmark size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>로그인 필요</p>
              <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-subtle)' }}>
                컬렉션을 생성하고 Supabase DB에 저장하여 관리하려면 로그인이 필요합니다.
              </p>
              <button
                className="btn-primary"
                onClick={onOpenAuthModal}
                style={{ marginTop: '16px', fontSize: '0.8rem', height: '36px' }}
              >
                <LogIn size={14} /> 로그인하기
              </button>
            </div>
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
                  내 DB 컬렉션 ({collectionList.length})
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {collectionList.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                    <FolderCheck size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p>저장된 컬렉션이 없습니다.</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      상단 주소창 우측의 <strong>[★ 컬렉션에 저장]</strong> 버튼을 눌러보세요.
                    </p>
                  </div>
                ) : (
                  collectionList.map((col) => (
                    <div
                      key={col.id}
                      onClick={() => onSelectCollection(col)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                          {col.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCollectionItem(col.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-subtle)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                          title="컬렉션 삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge-method ${col.method}`}>
                          {col.method}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {col.url}
                        </span>
                      </div>
                      {col.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                          {col.description}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
