import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import './DAlert.css';

const ALERT_TRANSITION_DURATION_MS = 200;

export type DAlertType = 'info' | 'success' | 'warn' | 'error';
export type DAlertButtonType = 'yesOnly' | 'yesNo' | 'okOnly' | 'okCancel' | 'custom';
export type DAlertDirection = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface DAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: DAlertType;
  buttonType?: DAlertButtonType;
  onConfirm?: () => void;
  onCancel?: () => void;
  customButtons?: React.ReactNode;
  direction?: DAlertDirection;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
  onPromptSubmit?: (value: string) => void;
}

export const DAlertComponent: React.FC<DAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonType = 'okOnly',
  onConfirm,
  onCancel,
  customButtons,
  direction = 'center',
  isPrompt = false,
  promptPlaceholder = '',
  promptDefaultValue = '',
  onPromptSubmit,
}) => {
  const [inputValue, setInputValue] = useState(promptDefaultValue);
  const [isRetained, setIsRetained] = useState(isOpen);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue(promptDefaultValue || '');
      const frameId = window.requestAnimationFrame(() => {
        setIsRetained(true);
        setHasEntered(true);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const frameId = window.requestAnimationFrame(() => setHasEntered(false));
    const timerId = window.setTimeout(
      () => setIsRetained(false),
      ALERT_TRANSITION_DURATION_MS
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [isOpen, promptDefaultValue]);

  const shouldRender = isOpen || isRetained;
  const animate = isOpen && hasEntered;

  if (!shouldRender) return null;

  const handleConfirm = () => {
    if (isPrompt && onPromptSubmit) {
      onPromptSubmit(inputValue);
    } else if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'success': return 'd-btn-success';
      case 'warn': return 'd-btn-warn';
      case 'error': return 'd-btn-error';
      case 'info':
      default: return 'd-btn-primary';
    }
  };

  const renderButtons = () => {
    const confirmClass = getConfirmButtonClass();

    switch (buttonType) {
      case 'yesOnly':
        return (
          <button type="button" className={confirmClass} onClick={handleConfirm}>
            예
          </button>
        );
      case 'yesNo':
        return (
          <div className="d-alert-button-group">
            <button type="button" className="d-btn-neutral" onClick={handleCancel}>
              아니오
            </button>
            <button type="button" className={confirmClass} onClick={handleConfirm}>
              예
            </button>
          </div>
        );
      case 'okOnly':
        return (
          <button type="button" className={confirmClass} onClick={handleConfirm}>
            확인
          </button>
        );
      case 'okCancel':
        return (
          <div className="d-alert-button-group">
            <button type="button" className="d-btn-neutral" onClick={handleCancel}>
              취소
            </button>
            <button type="button" className={confirmClass} onClick={handleConfirm}>
              확인
            </button>
          </div>
        );
      case 'custom':
        return customButtons;
      default:
        return null;
    }
  };

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="d-alert-icon-wrapper success">
            <CheckCircle2 size={22} />
          </div>
        );
      case 'warn':
        return (
          <div className="d-alert-icon-wrapper warn">
            <AlertTriangle size={22} />
          </div>
        );
      case 'error':
        return (
          <div className="d-alert-icon-wrapper error">
            <XCircle size={22} />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="d-alert-icon-wrapper info">
            <Info size={22} />
          </div>
        );
    }
  };

  return createPortal(
    <div
      className={`d-alert-overlay ${direction} ${animate ? 'active' : ''}`}
      onClick={handleCancel}
    >
      <div
        className={`d-alert-box ${direction} ${animate ? 'active' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-alert-content">
          {renderIcon()}
          <div className="d-alert-text-details">
            {title && <h4 className="d-alert-title">{title}</h4>}
            <p className="d-alert-message">{message}</p>
            {isPrompt && (
              <input
                className="d-alert-input"
                type="text"
                autoFocus
                placeholder={promptPlaceholder || '입력하세요...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                  if (e.key === 'Escape') {
                    handleCancel();
                  }
                }}
              />
            )}
          </div>
        </div>
        <div className="d-alert-footer">{renderButtons()}</div>
      </div>
    </div>,
    document.body
  );
};
