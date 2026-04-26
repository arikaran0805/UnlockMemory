import React from 'react';
import { Check, X } from 'lucide-react';
import type { CheckpointOption } from '../types';

interface InlineCheckpointOptionsProps {
  options: CheckpointOption[];
  selectedId: string | null;
  correctId: string;
  submitted: boolean;
  onSelect: (id: string) => void;
}

const InlineCheckpointOptions = ({
  options,
  selectedId,
  correctId,
  submitted,
  onSelect,
}: InlineCheckpointOptionsProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="radiogroup">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        const isCorrect = opt.id === correctId;

        // ── Compute state ─────────────────────────────────────────────────────
        let containerStyle: React.CSSProperties = {
          border: '1px solid #dddde0',
          background: '#fafafa',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        };
        let textColor = '#3f3f46';
        let textWeight: React.CSSProperties['fontWeight'] = 400;
        let cursor = 'pointer';

        // What to render as the leading indicator
        type IndicatorType = 'radio-empty' | 'radio-filled' | 'check' | 'cross';
        let indicator: IndicatorType = 'radio-empty';

        if (submitted) {
          cursor = 'default';
          if (isCorrect) {
            containerStyle = {
              border: '1px solid #86c9a8',
              background: '#f0faf5',
              boxShadow: '0 2px 10px rgba(90,170,130,0.12)',
            };
            textColor = '#1d4e35';
            textWeight = 500;
            indicator = 'check';
          } else if (isSelected && !isCorrect) {
            containerStyle = {
              border: '1px solid #f0a0a0',
              background: '#fef5f5',
              boxShadow: '0 2px 8px rgba(220,60,60,0.07)',
            };
            textColor = '#7a1f1f';
            textWeight = 500;
            indicator = 'cross';
          } else {
            containerStyle = {
              border: '1px solid #e8e8ec',
              background: '#fafafa',
              opacity: 0.4,
            };
            textColor = '#71717a';
          }
        } else if (isSelected) {
          containerStyle = {
            border: '1px solid #7ab5a0',
            background: '#f2fbf6',
            boxShadow: '0 2px 12px rgba(90,170,130,0.14), 0 0 0 3px rgba(90,170,130,0.09)',
          };
          textColor = '#18181b';
          textWeight = 500;
          indicator = 'radio-filled';
        }

        // ── Indicator renderer ────────────────────────────────────────────────
        const renderIndicator = () => {
          if (indicator === 'check') {
            return (
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#5aaa82',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Check style={{ width: 11, height: 11, color: '#fff', strokeWidth: 2.8 }} />
              </span>
            );
          }
          if (indicator === 'cross') {
            return (
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#e06060',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <X style={{ width: 11, height: 11, color: '#fff', strokeWidth: 2.8 }} />
              </span>
            );
          }
          if (indicator === 'radio-filled') {
            return (
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '2px solid #3d9970',
                background: '#3d9970',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />
              </span>
            );
          }
          // radio-empty (default idle)
          return (
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2px solid #c4c4cc',
              background: 'transparent',
              flexShrink: 0,
              display: 'block',
            }} />
          );
        };

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={submitted}
            onClick={() => !submitted && onSelect(opt.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 16px',
              borderRadius: 12,
              textAlign: 'left',
              cursor,
              transition: 'all 0.15s ease',
              outline: 'none',
              ...containerStyle,
            }}
            onMouseEnter={(e) => {
              if (!submitted && !isSelected) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.border = '1px solid #b0b0b8';
                el.style.background = '#f5f5f7';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitted && !isSelected) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.border = '1px solid #dddde0';
                el.style.background = '#fafafa';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              }
            }}
          >
            {renderIndicator()}
            <span style={{ fontSize: 13.5, lineHeight: 1.45, color: textColor, fontWeight: textWeight }}>
              {opt.text}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default InlineCheckpointOptions;
