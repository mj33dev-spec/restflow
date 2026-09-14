import React, { useRef, useState, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MoreVertical, X } from 'lucide-react';
import './CDropdown.css';

export interface CDropdownOption {
  /** 드롭다운에 표시될 텍스트 또는 React 엘리먼트 (구분선일 경우 생략 가능) */
  label?: ReactNode;
  /** (선택 사항) 항목 좌측에 표시될 아이콘 컴포넌트 */
  icon?: ReactNode;
  /** (선택 사항) 해당 항목 클릭 시 실행할 함수 */
  onClick?: () => void;
  /** (선택 사항) 항목 비활성화 여부 */
  disabled?: boolean;
  /** (선택 사항) 구분선 등 특별한 역할을 위한 속성 ('divider' | 'item') */
  type?: 'divider' | 'item';
  /** (선택 사항) 현재 선택/활성화된 항목인지 여부 */
  active?: boolean;
}

export interface CDropdownProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** (선택 사항) 드롭다운 열림 여부를 외부에서 제어할 때 사용합니다. */
  isOpen?: boolean;
  /** (선택 사항) 버튼에 표시될 값입니다. 이 값이 주어지면 내부적으로 버튼을 렌더링합니다. */
  value?: ReactNode;
  /** 드롭다운이 열리는 방향 (기본값: 'down') */
  direction?: 'up' | 'down';
  /** 드롭다운의 가로 정렬 방향 (기본값: 'left') */
  align?: 'left' | 'right';
  /** 드롭다운에 렌더링될 옵션 목록입니다. */
  options: (CDropdownOption | ReactNode)[];
  /** (선택 사항) 내부 래퍼에 적용할 커스텀 클래스 */
  className?: string;
  /** (선택 사항) 비활성화할 옵션들의 label(또는 텍스트) 배열입니다. */
  disabledList?: ReactNode[];
  /** (선택 사항) 드롭다운의 넓이를 강제로 지정할 때 사용합니다. */
  width?: string;
  /** (선택 사항) 최소 너비를 지정할 때 사용합니다. */
  minWidth?: string;
  /** (선택 사항) multi variant일 때 칩(Chip)으로 렌더링될 선택된 값들의 배열입니다. */
  selectedValues?: string[];
  /** (선택 사항) multi variant일 때 칩의 삭제(X) 버튼을 누르면 호출됩니다. */
  onRemoveValue?: (value: string) => void;
  /** 드롭다운 컴포넌트 디자인 변형 ('outlined' | 'fill' | 'more' | 'multi') */
  variant?: 'outlined' | 'fill' | 'more' | 'multi';
}

interface CDropdownRendererProps {
  props: CDropdownProps;
  variant: 'outlined' | 'fill' | 'more' | 'multi';
}

/** 내부 렌더러 컴포넌트 */
function CDropdownRenderer({ props, variant }: CDropdownRendererProps) {
  const {
    direction = 'down',
    align = 'left',
    options,
    className = '',
    value,
    isOpen: controlledOpen,
    disabledList = [],
    width: propWidth,
    minWidth: propMinWidth,
    selectedValues = [],
    onRemoveValue,
    style: customStyle,
    ...restProps
  } = props;

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (isOpen && anchorRef.current) {
      const updatePosition = () => {
        if (anchorRef.current) {
          setRect(anchorRef.current.getBoundingClientRect());
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // Click outside to close (only for internal state)
  useLayoutEffect(() => {
    if (isOpen && controlledOpen === undefined) {
      const handleClickOutside = (e: MouseEvent) => {
        const isOutsideAnchor = anchorRef.current && !anchorRef.current.contains(e.target as Node);
        const isOutsideMenu = menuRef.current && !menuRef.current.contains(e.target as Node);

        if (isOutsideAnchor && isOutsideMenu) {
          setInternalOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [controlledOpen, isOpen]);

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
  };

  if (variant === 'more') {
    style.minWidth = propMinWidth || '180px';
    style.width = propWidth || 'max-content';
  } else {
    style.width = rect ? rect.width : (propWidth || 'auto');
    if (propMinWidth) style.minWidth = propMinWidth;
  }

  if (rect) {
    if (direction === 'up') {
      style.bottom = window.innerHeight - rect.top + 6;
      style.top = 'auto';
    } else {
      style.top = rect.bottom + 6;
      style.bottom = 'auto';
    }

    if (align === 'right') {
      style.right = window.innerWidth - rect.right;
      style.left = 'auto';
    } else {
      style.left = rect.left;
      style.right = 'auto';
    }
  }

  const dropdownMenu = isOpen ? (
    <div ref={menuRef} className={`c-dropdown-menu ${className}`} style={style}>
      {options.map((opt, index) => {
        const isObject = opt && typeof opt === 'object' && ('label' in opt || 'type' in opt);

        if (isObject && (opt as CDropdownOption).type === 'divider') {
          return <hr key={`divider-${index}`} />;
        }

        const label = isObject ? (opt as CDropdownOption).label : (opt as ReactNode);
        const icon = isObject ? (opt as CDropdownOption).icon : undefined;
        const onClick = isObject ? (opt as CDropdownOption).onClick : undefined;
        const active = isObject ? (opt as CDropdownOption).active : false;
        const disabled =
          (isObject && (opt as CDropdownOption).disabled) ||
          disabledList.includes(label);

        const handleItemClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (disabled) return;
          if (onClick) onClick();
          if (controlledOpen === undefined && variant !== 'multi') setInternalOpen(false);
        };

        return (
          <button
            type="button"
            key={index}
            className={`c-dropdown-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={handleItemClick}
            disabled={disabled}
          >
            {label}
            {icon && <span className="c-dropdown-icon">{icon}</span>}
          </button>
        );
      })}
    </div>
  ) : null;

  if (variant === 'more') {
    return (
      <div ref={anchorRef} className={`c-dropdown-wrapper ${isOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="c-dropdown-btn outlined"
          onClick={() => setInternalOpen(!isOpen)}
          style={{ width: '36px', padding: 0, justifyContent: 'center', ...customStyle }}
          {...restProps}
        >
          <MoreVertical size={16} />
        </button>
        {isOpen && createPortal(dropdownMenu, document.body)}
      </div>
    );
  }

  if (value !== undefined || variant === 'multi') {
    const anchorStyle: React.CSSProperties = propWidth ? { width: propWidth } : {};
    const buttonStyle: React.CSSProperties = {
      width: propWidth ? '100%' : 'auto',
      minWidth: propMinWidth,
      ...customStyle,
    };

    const buttonContent = (
      <div ref={anchorRef} className={`c-dropdown-wrapper ${isOpen ? 'open' : ''}`} style={anchorStyle}>
        <button
          type="button"
          className={`c-dropdown-btn ${variant}`}
          onClick={() => setInternalOpen(!isOpen)}
          style={buttonStyle}
          {...restProps}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {value}
          </span>
          <ChevronDown size={14} className="c-dropdown-chevron" />
        </button>
        {isOpen && createPortal(dropdownMenu, document.body)}
      </div>
    );

    if (variant === 'multi') {
      return (
        <div className="c-multi-container">
          {buttonContent}
          {selectedValues.map((val) => (
            <span key={val} className="c-multi-chip">
              {val}
              {onRemoveValue && (
                <X
                  size={13}
                  className="c-multi-chip-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveValue(val);
                  }}
                />
              )}
            </span>
          ))}
        </div>
      );
    }

    return buttonContent;
  }

  return (
    <>
      <div ref={anchorRef} style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }} />
      {isOpen && createPortal(dropdownMenu, document.body)}
    </>
  );
}

/**
 * 아웃라인 테마 드롭다운 컴포넌트입니다.
 */
export function CDropdown(props: CDropdownProps) {
  return <CDropdownRenderer props={props} variant={props.variant || 'outlined'} />;
}

function Fill(props: CDropdownProps) {
  return <CDropdownRenderer props={props} variant="fill" />;
}

function More(props: CDropdownProps) {
  return <CDropdownRenderer props={props} variant="more" />;
}

function Multi(props: CDropdownProps) {
  return <CDropdownRenderer props={props} variant="multi" />;
}

interface CDropdownChipProps {
  label: ReactNode;
  onRemove?: () => void;
}

function Chip({ label, onRemove }: CDropdownChipProps) {
  return (
    <span className="c-multi-chip">
      {label}
      {onRemove && (
        <X size={13} className="c-multi-chip-remove" onClick={onRemove} />
      )}
    </span>
  );
}

function ChipGroup({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{children}</div>;
}

CDropdown.outlined = CDropdown;
CDropdown.fill = Fill;
CDropdown.more = More;
CDropdown.multi = Multi;
CDropdown.Chip = Chip;
CDropdown.ChipGroup = ChipGroup;
