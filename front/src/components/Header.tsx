import React from 'react';
import { Zap, ShieldCheck, PlayCircle, LogIn, LogOut, User } from 'lucide-react';
import { HttpMethod } from '../types';

interface HeaderProps {
  useProxy: boolean;
  onToggleProxy: (val: boolean) => void;
  onQuickPreset: (method: HttpMethod, url: string, body?: string) => void;
  user: any;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  useProxy,
  onToggleProxy,
  onQuickPreset,
  user,
  onOpenAuthModal,
  onSignOut,
}) => {
  return (
    <header className="glass-panel" style={{
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: '1px solid var(--border-color)',
      zIndex: 10
    }}>
      {/* Logo & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)'
        }}>
          <Zap size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>
            Rest<span style={{ color: 'var(--accent-primary)' }}>Flow</span>
          </h1>
        </div>
      </div>

      {/* Quick Test Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>빠른 에코 테스트:</span>
        <button
          className="btn-secondary"
          onClick={() => onQuickPreset('GET', 'http://localhost:3002/api/echo?query=hello')}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          <PlayCircle size={14} color="#10b981" /> GET 테스트
        </button>
        <button
          className="btn-secondary"
          onClick={() => onQuickPreset('POST', 'http://localhost:3002/api/echo', JSON.stringify({ name: '홍길동', action: '데이터 생성' }, null, 2))}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          <PlayCircle size={14} color="#f59e0b" /> POST 테스트
        </button>
        <button
          className="btn-secondary"
          onClick={() => onQuickPreset('PUT', 'http://localhost:3002/api/echo', JSON.stringify({ id: 101, title: '수정된 제목' }, null, 2))}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          <PlayCircle size={14} color="#3b82f6" /> PUT 테스트
        </button>
        <button
          className="btn-secondary"
          onClick={() => onQuickPreset('DELETE', 'http://localhost:3002/api/echo?id=101')}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          <PlayCircle size={14} color="#ef4444" /> DELETE 테스트
        </button>
      </div>

      {/* Right Controls (Proxy Toggle + Auth) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Proxy Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <ShieldCheck size={16} color={useProxy ? '#10b981' : '#64748b'} />
            <span style={{ color: useProxy ? '#f1f5f9' : 'var(--text-muted)' }}>
              NestJS 프록시 (CORS 우회)
            </span>
          </div>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '44px',
            height: '24px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => onToggleProxy(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: useProxy ? 'var(--accent-primary)' : '#334155',
              borderRadius: '24px',
              transition: '0.3s'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: useProxy ? '22px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s'
              }} />
            </span>
          </label>
        </div>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />

        {/* Auth User Info / Login Button */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '4px 10px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#a5f3fc'
            }}>
              <User size={14} color="var(--accent-primary)" />
              <span>{user.email}</span>
            </div>
            <button
              className="btn-secondary"
              onClick={onSignOut}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              title="로그아웃"
            >
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        ) : (
          <button
            className="btn-primary"
            onClick={onOpenAuthModal}
            style={{ fontSize: '0.85rem', height: '36px', padding: '0 14px' }}
          >
            <LogIn size={15} /> 로그인 / 회원가입
          </button>
        )}
      </div>
    </header>
  );
};
