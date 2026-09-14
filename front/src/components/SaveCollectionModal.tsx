import React, { useState, useEffect } from 'react';
import { X, BookmarkPlus, Tag, Folder, Plus } from 'lucide-react';
import { CollectionGroup } from '../types';

interface SaveCollectionModalProps {
  isOpen: boolean;
  collections: CollectionGroup[];
  onClose: () => void;
  onSaveToFolder: (collectionId: string, requestName: string) => Promise<void>;
  onCreateFolderAndSave: (folderName: string, requestName: string) => Promise<void>;
  defaultUrl: string;
  defaultMethod: string;
}

export const SaveCollectionModal: React.FC<SaveCollectionModalProps> = ({
  isOpen,
  collections,
  onClose,
  onSaveToFolder,
  onCreateFolderAndSave,
  defaultUrl,
  defaultMethod,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('new');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [requestName, setRequestName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (collections && collections.length > 0) {
      setSelectedFolderId(collections[0].id);
    } else {
      setSelectedFolderId('new');
    }
  }, [collections, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim()) return;

    setLoading(true);
    try {
      if (selectedFolderId === 'new') {
        if (!newFolderName.trim()) {
          alert('새 컬렉션 폴더 이름을 입력해 주세요.');
          setLoading(false);
          return;
        }
        await onCreateFolderAndSave(newFolderName.trim(), requestName.trim());
      } else {
        await onSaveToFolder(selectedFolderId, requestName.trim());
      }
      setRequestName('');
      setNewFolderName('');
      onClose();
    } catch (e) {
      alert('컬렉션 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
        width: '440px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookmarkPlus size={18} color="var(--accent-primary)" />
            컬렉션 폴더에 저장하기
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Endpoint Badge Preview */}
          <div style={{
            background: '#0d1117',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem'
          }}>
            <span className={`badge-method ${defaultMethod}`}>
              {defaultMethod}
            </span>
            <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {defaultUrl}
            </span>
          </div>

          {/* Collection Folder Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              컬렉션 폴더 (그룹) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Folder size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: '#0d1117',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  paddingLeft: '38px',
                  paddingRight: '12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id} style={{ background: '#1e293b' }}>
                    📁 {col.name} ({col.items.length}개 요청)
                  </option>
                ))}
                <option value="new" style={{ background: '#1e293b' }}>
                  ➕ 새 컬렉션 폴더 생성...
                </option>
              </select>
            </div>
          </div>

          {/* New Folder Name Input */}
          {selectedFolderId === 'new' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                새 폴더 이름 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Plus size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  placeholder="예: Auth API 프로젝트"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Request Name Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              요청 항목 이름 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Tag size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                placeholder="예: 회원가입 API 요청"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '40px',
                  background: '#0d1117',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  paddingLeft: '38px',
                  paddingRight: '12px',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !requestName.trim()}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {loading ? '저장 중...' : '폴더에 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
