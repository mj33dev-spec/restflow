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
  items,
  onChange,
  keyPlaceholder = '키 (Key)',
  valuePlaceholder = '값 (Value)',
}) => {
  const handleToggle = (id: string) => {
    onChange(
      items.map(item => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleUpdate = (id: string, field: 'key' | 'value', value: string) => {
    onChange(
      items.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDelete = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleAddRow = () => {
    onChange([
      ...items,
      { id: 'kv-' + Date.now() + Math.random(), key: '', value: '', enabled: true },
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
          {items.map((item) => (
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
                  title="항목 삭제"
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
