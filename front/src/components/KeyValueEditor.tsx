import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { KeyValueItem } from '../types';

interface KeyValueEditorProps {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  items = [],
  onChange,
  keyPlaceholder = '키 (Key)',
  valuePlaceholder = '값 (Value)',
}) => {
  // Always pad displayItems to have at least 5 rows in UI
  const displayItems = [...(items || [])];
  while (displayItems.length < 5) {
    displayItems.push({
      id: `kv-blank-${displayItems.length}-${Math.random().toString(36).substring(2, 6)}`,
      key: '',
      value: '',
      enabled: true,
    });
  }

  const handleToggle = (id: string) => {
    const updated = displayItems.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onChange(updated);
  };

  const handleUpdate = (id: string, field: 'key' | 'value', value: string) => {
    const updated = displayItems.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    if (displayItems.length > 5) {
      onChange(displayItems.filter((item) => item.id !== id));
    } else {
      onChange(
        displayItems.map((item) =>
          item.id === id ? { ...item, key: '', value: '', enabled: true } : item
        )
      );
    }
  };

  const handleAddRow = () => {
    onChange([
      ...displayItems,
      { id: 'kv-' + Date.now() + Math.random().toString(36).substring(2, 6), key: '', value: '', enabled: true },
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
            <th style={{ width: '40px', padding: '6px' }}></th>
            <th style={{ padding: '6px 10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{keyPlaceholder}</th>
            <th style={{ padding: '6px 10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{valuePlaceholder}</th>
            <th style={{ width: '40px', padding: '6px' }}></th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ textAlign: 'center', padding: '6px' }}>
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => handleToggle(item.id)}
                  style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input
                  type="text"
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(e) => handleUpdate(item.id, 'key', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input
                  type="text"
                  placeholder={valuePlaceholder}
                  value={item.value}
                  onChange={(e) => handleUpdate(item.id, 'value', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </td>
              <td style={{ textAlign: 'center', padding: '6px' }}>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-subtle)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title="항목 초기화 / 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button
          className="btn-secondary"
          onClick={handleAddRow}
          style={{ fontSize: '0.8rem', padding: '6px 12px', marginTop: '4px' }}
        >
          <Plus size={14} /> 항목 추가
        </button>
      </div>
    </div>
  );
};
