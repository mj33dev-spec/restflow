import React from 'react';
import { Zap, ShieldCheck, PlayCircle, LogIn, LogOut, User } from 'lucide-react';
import { HttpMethod } from '../types';

interface HeaderProps {
  onQuickPreset?: (method: HttpMethod, url: string, body?: string) => void;
  user: any;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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



      {/* Right Controls (Auth) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

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
