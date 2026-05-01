import React from 'react';
import { Check, X } from 'lucide-react';
import type { CheckpointOption } from '../types';
import { useTheme } from 'next-themes';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }} role="radiogroup">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        const isCorrect = opt.id === correctId;

        // ── Compute state ─────────────────────────────────────────────────────
        let containerStyle: React.CSSProperties = isDark ? {
          border: '1px solid #1e3428',
          background: '#111f17',
          boxShadow: 'none',
        } : {
          border: '1px solid #e4e4e9',
          background: '#fafafa',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        };
        let textColor = isDark ? '#8dbfa0' : '#3f3f46';
        let textWeight: React.CSSProperties['fontWeight'] = 400;
        let cursor = 'pointer';

        type IndicatorType = 'radio-empty' | 'radio-filled' | 'check' | 'cross';
        let indicator: IndicatorType = 'radio-empty';

        if (submitted) {
          cursor = 'default';
          if (isCorrect) {
            containerStyle = isDark ? {
              border: '1px solid rgba(90,170,130,0.45)',
              background: 'linear-gradient(to right, #0e2318, #0c2015)',
              boxShadow: '0 2px 12px rgba(80,160,120,0.10)',
            } : {
              border: '1px solid rgba(90,170,130,0.55)',
              background: 'linear-gradient(to right, #eef9f4, #e8f7f0)',
              boxShadow: '0 2px 12px rgba(80,160,120,0.12), 0 1px 3px rgba(80,160,120,0.07)',
            };
            textColor = isDark ? '#5aaa82' : '#1c4d35';
            textWeight = 500;
            indicator = 'check';
          } else if (isSelected && !isCorrect) {
            containerStyle = isDark ? {
              border: '1px solid rgba(220,80,80,0.35)',
              background: 'linear-gradient(to right, #1f1010, #1c0e0e)',
              boxShadow: '0 2px 8px rgba(200,60,60,0.08)',
            } : {
              border: '1px solid rgba(220,80,80,0.45)',
              background: 'linear-gradient(to right, #fef4f4, #fdf0f0)',
              boxShadow: '0 2px 10px rgba(210,60,60,0.08), 0 1px 3px rgba(210,60,60,0.05)',
            };
            textColor = isDark ? '#cc6666' : '#7a1e1e';
            textWeight = 500;
            indicator = 'cross';
          } else {
            containerStyle = isDark ? {
              border: '1px solid #182818',
              background: '#0d1810',
              opacity: 0.45,
            } : {
              border: '1px solid #ebebef',
              background: '#f8f8fb',
              opacity: 0.45,
            };
            textColor = isDark ? '#3d5e47' : '#71717a';
          }
        } else if (isSelected) {
          containerStyle = isDark ? {
            border: '1px solid rgba(90,170,130,0.50)',
            background: 'linear-gradient(to right, #0f2219, #0d1e16)',
            boxShadow: '0 2px 12px rgba(80,160,120,0.10), 0 0 0 3px rgba(90,170,130,0.08)',
          } : {
            border: '1px solid rgba(90,170,130,0.60)',
            background: 'linear-gradient(to right, #f2fbf6, #edf8f2)',
            boxShadow: '0 2px 12px rgba(80,160,120,0.12), 0 0 0 3px rgba(90,170,130,0.10)',
          };
          textColor = isDark ? '#c8e2d2' : '#18181b';
          textWeight = 500;
          indicator = 'radio-filled';
        }

        // ── Indicator renderer ────────────────────────────────────────────────
        const renderIndicator = () => {
          if (indicator === 'check') {
            return (
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, #5aaa82, #3d9268)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(60,145,100,0.28)',
              }}>
                <Check style={{ width: 11, height: 11, color: '#fff', strokeWidth: 3 }} />
              </span>
            );
          }
          if (indicator === 'cross') {
            return (
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, #e86060, #cc4040)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(200,60,60,0.25)',
              }}>
                <X style={{ width: 11, height: 11, color: '#fff', strokeWidth: 3 }} />
              </span>
            );
          }
          if (indicator === 'radio-filled') {
            return (
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid #3d9970',
                background: '#3d9970',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 1px 4px rgba(55,145,100,0.25)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />
              </span>
            );
          }
          // radio-empty
          return (
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              border: isDark ? '1.5px solid #2a4535' : '1.5px solid #c8c8d0',
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
              gap: 13,
              padding: '12px 18px',
              borderRadius: 13,
              textAlign: 'left',
              cursor,
              transition: 'all 0.14s ease',
              outline: 'none',
              ...containerStyle,
            }}
            onMouseEnter={(e) => {
              if (!submitted && !isSelected) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.border = isDark ? '1px solid #2a4535' : '1px solid #c0c0ca';
                el.style.background = isDark ? '#162118' : '#f4f4f7';
                el.style.boxShadow = isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.07)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitted && !isSelected) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.border = isDark ? '1px solid #1e3428' : '1px solid #e4e4e9';
                el.style.background = isDark ? '#111f17' : '#fafafa';
                el.style.boxShadow = isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)';
              }
            }}
          >
            {renderIndicator()}
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: textColor, fontWeight: textWeight }}>
              {opt.text}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default InlineCheckpointOptions;
