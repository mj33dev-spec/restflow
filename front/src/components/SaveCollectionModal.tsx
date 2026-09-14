import React, { useState } from 'react';
import { X, BookmarkPlus, Tag } from 'lucide-react';

interface SaveCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  defaultUrl: string;
  defaultMethod: string;
}

export const SaveCollectionModal: React.FC<SaveCollectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultUrl,
  defaultMethod,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave(name.trim(), description.trim());
      setName('');
      setDescription('');
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
        width: '420px',
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
            컬렉션에 저장하기
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              요청 이름 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Tag size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                placeholder="예: 사용자 정보 조회 API"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              설명 (선택)
            </label>
            <textarea
              placeholder="API에 대한 간단한 설명을 입력하세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                height: '70px',
                background: '#0d1117',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#fff',
                padding: '10px',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none'
              }}
            />
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
              disabled={loading || !name.trim()}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {loading ? '저장 중...' : 'DB에 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
