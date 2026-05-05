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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }} role="radiogroup">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        const isCorrect = opt.id === correctId;

        let containerStyle: React.CSSProperties = {
          border: '1px solid rgba(255,255,255,0.07)',
          background: '#1e3228',
          boxShadow: 'none',
        };
        let textColor = '#b8d4c0';
        let textWeight: React.CSSProperties['fontWeight'] = 400;
        let cursor = 'pointer';

        type IndicatorType = 'radio-empty' | 'radio-filled' | 'check' | 'cross';
        let indicator: IndicatorType = 'radio-empty';

        if (submitted) {
          cursor = 'default';
          if (isCorrect) {
            containerStyle = {
              border: '1px solid rgba(90,170,130,0.45)',
              background: 'linear-gradient(to right, #0e2318, #0c2015)',
              boxShadow: '0 2px 12px rgba(80,160,120,0.10)',
            };
            textColor = '#5aaa82';
            textWeight = 500;
            indicator = 'check';
          } else if (isSelected && !isCorrect) {
            containerStyle = {
              border: '1px solid rgba(220,80,80,0.35)',
              background: 'linear-gradient(to right, #1f1010, #1c0e0e)',
              boxShadow: '0 2px 8px rgba(200,60,60,0.08)',
            };
            textColor = '#cc6666';
            textWeight = 500;
            indicator = 'cross';
          } else {
            containerStyle = {
              border: '1px solid rgba(255,255,255,0.04)',
              background: '#172318',
              opacity: 0.4,
            };
            textColor = '#7aaa8e';
          }
        } else if (isSelected) {
          containerStyle = {
            border: '1px solid rgba(90,170,130,0.50)',
            background: 'linear-gradient(to right, #0f2219, #0d1e16)',
            boxShadow: '0 2px 12px rgba(80,160,120,0.10), 0 0 0 3px rgba(90,170,130,0.08)',
          };
          textColor = '#c8e2d2';
          textWeight = 500;
          indicator = 'radio-filled';
        }

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
          return (
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.22)',
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
                el.style.border = '1px solid rgba(255,255,255,0.13)';
                el.style.background = '#253d2e';
                el.style.boxShadow = 'none';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitted && !isSelected) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.border = '1px solid rgba(255,255,255,0.07)';
                el.style.background = '#1e3228';
                el.style.boxShadow = 'none';
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
