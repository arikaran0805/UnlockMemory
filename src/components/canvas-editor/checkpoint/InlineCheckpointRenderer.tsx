import { useState, useEffect } from 'react';
import type { InlineCheckpointData } from '../types';
import InlineCheckpointOptions from './InlineCheckpointOptions';
import InlineCheckpointFeedback from './InlineCheckpointFeedback';

interface InlineCheckpointRendererProps {
  data: InlineCheckpointData;
  blockId: string;
}

interface PersistedState {
  selectedId: string;
  submitted: boolean;
  correct: boolean;
}

const storageKey = (blockId: string) => `checkpoint_${blockId}`;

const InlineCheckpointRenderer = ({ data, blockId }: InlineCheckpointRendererProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(blockId));
      if (raw) {
        const saved: PersistedState = JSON.parse(raw);
        setSelectedId(saved.selectedId);
        setSubmitted(saved.submitted);
        setCorrect(saved.correct);
      }
    } catch {
      // ignore corrupt storage
    }
  }, [blockId]);

  const handleSubmit = () => {
    if (!selectedId) return;
    const isCorrect = selectedId === data.correctOptionId;
    setSubmitted(true);
    setCorrect(isCorrect);
    try {
      const state: PersistedState = { selectedId, submitted: true, correct: isCorrect };
      localStorage.setItem(storageKey(blockId), JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  };

  const handleRetry = () => {
    setSelectedId(null);
    setSubmitted(false);
    setCorrect(false);
    try {
      localStorage.removeItem(storageKey(blockId));
    } catch {
      // ignore
    }
  };

  const hasOptions = data.options && data.options.length > 0;
  if (!data.question || !hasOptions) return null;

  const canSubmit = !!selectedId && !submitted;

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid #1e3428',
        background: '#0f1c14',
      }}
    >
      {/* ── Title ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '20px 20px 4px',
        }}
      >
        <span style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#e2e8f0',
          letterSpacing: '-0.01em',
        }}>
          Exercise
        </span>
        <span style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#2a4535',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>?</span>
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '12px 20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Question */}
        {data.questionType === 'code' ? (
          <pre style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 13.5,
            lineHeight: '22px',
            color: '#c8e2d2',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-words',
            overflow: 'auto',
            textAlign: 'center',
          }}>
            <code>{data.question}</code>
          </pre>
        ) : (
          <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: '#d4ead9', margin: 0, textAlign: 'center' }}>
            {data.question}
          </p>
        )}

        {/* Options */}
        <InlineCheckpointOptions
          options={data.options}
          selectedId={selectedId}
          correctId={data.correctOptionId}
          submitted={submitted}
          onSelect={setSelectedId}
        />

        {/* Explanation only shown on wrong answer */}
        {submitted && !correct && data.showExplanation && data.explanation && (
          <InlineCheckpointFeedback
            visible={true}
            correct={false}
            explanation={data.explanation}
            showExplanation={true}
          />
        )}

        {/* Actions */}
        {!submitted && (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              alignSelf: 'center',
              marginTop: 2,
              padding: '10px 28px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              background: canSubmit
                ? (btnHover
                  ? 'linear-gradient(135deg, #45a06e, #338055)'
                  : 'linear-gradient(135deg, #4daa78, #3a9066)')
                : '#1a2a1e',
              color: canSubmit ? '#fff' : '#3d5e47',
              boxShadow: canSubmit
                ? (btnHover
                  ? '0 4px 14px rgba(55,140,90,0.32)'
                  : '0 2px 10px rgba(55,140,90,0.22)')
                : 'none',
            }}
          >
            Submit Answer »
          </button>
        )}

        {submitted && !correct && data.allowRetry && (
          <button
            type="button"
            onClick={handleRetry}
            style={{
              alignSelf: 'center',
              marginTop: 2,
              padding: '9px 22px',
              borderRadius: 11,
              border: '1px solid #2a4535',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: '#111f17',
              color: '#8dbfa0',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = '#162118';
              el.style.borderColor = '#3a5e47';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = '#111f17';
              el.style.borderColor = '#2a4535';
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default InlineCheckpointRenderer;
