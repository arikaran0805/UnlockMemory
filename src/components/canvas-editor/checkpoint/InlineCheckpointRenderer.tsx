import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ListChecks } from 'lucide-react';
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

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid #d4d4d8',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 6px rgba(0,0,0,0.05)',
        background: '#fff',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'linear-gradient(to right, #f3f3f5, #efeff1)',
          borderBottom: '1px solid #dddde0',
        }}
      >
        {/* Accent dot */}
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5aaa82', flexShrink: 0 }} />
        <ListChecks style={{ width: 13, height: 13, color: '#8f8f99', flexShrink: 0 }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8f8f99', userSelect: 'none' }}>
          Knowledge Check
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: '#ffffff' }}>

        {/* Question */}
        {data.questionType === 'code' ? (
          <pre
            style={{
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-words',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 13.5,
              lineHeight: '24px',
              color: '#18181b',
              margin: 0,
            }}
          >
            <code>{data.question}</code>
          </pre>
        ) : (
          <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#18181b', margin: 0 }}>
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
          <Button
            size="sm"
            disabled={!selectedId}
            onClick={handleSubmit}
            className="rounded-xl mt-1"
          >
            Check Answer
          </Button>
        )}

        {submitted && !correct && data.allowRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            className="rounded-xl mt-1"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default InlineCheckpointRenderer;
