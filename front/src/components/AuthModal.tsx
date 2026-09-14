import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../services/apiService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onSuccess();
        onClose();
      } else {
        await signUpWithEmail(email, password);
        try {
          await signInWithEmail(email, password);
          onSuccess();
          onClose();
        } catch {
          alert('회원가입이 완료되었습니다! 로그인해 주세요.');
          handleSwitchMode('signin');
        }
      }
    } catch (err: any) {
      let msg = err.message || '인증 처리에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.';
      if (msg.includes('Email not confirmed')) {
        msg = '이메일 인증이 필요합니다. Supabase Authentication 설정에서 [Confirm email]을 OFF로 꺼주세요.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = '이메일 또는 비밀번호가 올바르지 않습니다. (계정이 존재하지 않거나 비밀번호 오류)';
      } else if (msg.includes('User already registered')) {
        msg = '이미 가입되어 있는 이메일 주소입니다.';
      } else if (msg.toLowerCase().includes('rate limit')) {
        msg = '이메일 발송 제한(Rate Limit)을 초과했습니다. Supabase 대시보드 (Authentication -> Providers -> Email)에서 [Confirm email]을 OFF로 끄시거나 5~10분 후 다시 시도해 주세요.';
      } else if (msg.toLowerCase().includes('signups are disabled')) {
        msg = '이메일 회원가입 기능이 꺼져있습니다. Supabase 대시보드 (Authentication -> Providers -> Email)에서 [Allow new users to sign up] 또는 [Enable Email provider] 스위치를 ON(켜짐)으로 켜주세요.';
      }
      setErrorMsg(msg);
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
        width: '400px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'signin' ? <LogIn size={18} color="var(--accent-primary)" /> : <UserPlus size={18} color="var(--accent-primary)" />}
            {mode === 'signin' ? '로그인' : '회원가입'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              color: mode === 'signin' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: mode === 'signin' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            기존 계정 로그인
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              color: mode === 'signup' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: mode === 'signup' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            새 계정 회원가입
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem',
              padding: '10px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              이메일 주소
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              비밀번호
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
              <input
                type="password"
                placeholder="6자리 이상 비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px', height: '42px' }}
          >
            {loading ? '처리 중...' : mode === 'signin' ? '로그인하기' : '회원가입하기'}
          </button>
        </form>
      </div>
    </div>
  );
};
