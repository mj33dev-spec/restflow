import React from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  header?: React.ReactNode;    // Custom Header DOM
  subHeader?: React.ReactNode; // Sub Header DOM (e.g. tabs below title)
  banner?: React.ReactNode;    // Banner/Alert DOM
  body?: React.ReactNode;      // Main Content Body DOM
  children?: React.ReactNode;  // Fallback for Body DOM
  footer?: React.ReactNode;    // Action Buttons Footer DOM
  width?: string;
  maxHeight?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  header,
  subHeader,
  banner,
  body,
  children,
  footer,
  width = '440px',
  maxHeight = '85vh',
}) => {
  if (!isOpen) return null;

  const contentBody = body !== undefined ? body : children;

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
        width,
        maxHeight,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header Slot */}
        {header ? (
          header
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                {icon}
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
            {subHeader}
          </div>
        )}

        {/* Optional Banner Slot */}
        {banner}

        {/* Modal Body Slot */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contentBody}
        </div>

        {/* Modal Footer Slot */}
        {footer && (
          <div style={{
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

