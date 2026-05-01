import { useState, useEffect } from 'react';
import { ListChecks } from 'lucide-react';
import type { InlineCheckpointData } from '../types';
import InlineCheckpointOptions from './InlineCheckpointOptions';
import InlineCheckpointFeedback from './InlineCheckpointFeedback';
import { useTheme } from 'next-themes';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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
        border: isDark ? '1px solid #1e3428' : '1px solid #e2e2e7',
        background: isDark ? '#0f1c14' : '#fff',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 20px',
          background: isDark ? 'linear-gradient(to right, #111f17, #0f1c14)' : 'linear-gradient(to right, #f5f5f7, #f1f1f4)',
          borderBottom: isDark ? '1px solid #1e3428' : '1px solid #e4e4e9',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#5aaa82',
          flexShrink: 0,
          boxShadow: '0 0 0 2px rgba(90,170,130,0.18)',
        }} />
        <ListChecks style={{ width: 13, height: 13, color: isDark ? '#5d8a6a' : '#86868e', flexShrink: 0 }} />
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: isDark ? '#5d8a6a' : '#86868e', userSelect: 'none',
        }}>
          Knowledge Check
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Question */}
        {data.questionType === 'code' ? (
          <pre style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 13.5,
            lineHeight: '22px',
            color: isDark ? '#c8e2d2' : '#1a1a2e',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-words',
            overflow: 'auto',
          }}>
            <code>{data.question}</code>
          </pre>
        ) : (
          <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: isDark ? '#d4ead9' : '#18181b', margin: 0 }}>
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
              alignSelf: 'flex-start',
              marginTop: 2,
              padding: '9px 22px',
              borderRadius: 11,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              background: canSubmit
                ? (btnHover
                  ? 'linear-gradient(135deg, #45a06e, #338055)'
                  : 'linear-gradient(135deg, #4daa78, #3a9066)')
                : (isDark ? '#1a2a1e' : '#ebebef'),
              color: canSubmit ? '#fff' : (isDark ? '#3d5e47' : '#a8a8b0'),
              boxShadow: canSubmit
                ? (btnHover
                  ? '0 4px 14px rgba(55,140,90,0.32)'
                  : '0 2px 10px rgba(55,140,90,0.22)')
                : 'none',
            }}
          >
            Check Answer
          </button>
        )}

        {submitted && !correct && data.allowRetry && (
          <button
            type="button"
            onClick={handleRetry}
            style={{
              alignSelf: 'flex-start',
              marginTop: 2,
              padding: '9px 22px',
              borderRadius: 11,
              border: isDark ? '1px solid #2a4535' : '1px solid #d0d0d8',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isDark ? '#111f17' : '#fff',
              color: isDark ? '#8dbfa0' : '#3f3f46',
              boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = isDark ? '#162118' : '#f5f5f8';
              el.style.borderColor = isDark ? '#3a5e47' : '#b8b8c2';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = isDark ? '#111f17' : '#fff';
              el.style.borderColor = isDark ? '#2a4535' : '#d0d0d8';
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
