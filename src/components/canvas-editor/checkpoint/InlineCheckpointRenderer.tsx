import { useState, useEffect } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    } catch { /* ignore corrupt storage */ }
  }, [blockId]);

  const handleSubmit = () => {
    if (!selectedId) return;
    const isCorrect = selectedId === data.correctOptionId;
    setSubmitted(true);
    setCorrect(isCorrect);
    try {
      localStorage.setItem(storageKey(blockId), JSON.stringify({ selectedId, submitted: true, correct: isCorrect }));
    } catch { /* ignore */ }
  };

  const handleRetry = () => {
    setSelectedId(null);
    setSubmitted(false);
    setCorrect(false);
    try { localStorage.removeItem(storageKey(blockId)); } catch { /* ignore */ }
  };

  if (!data.question || !data.options?.length) return null;

  const canSubmit = !!selectedId && !submitted;

  return (
    <div className="border-l-[3px] border-primary bg-muted/[0.35] pl-5 pr-4 py-4 my-1">

      {/* ── Label ────────────────────────────────────────────────────── */}
      <p className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-primary mb-3 select-none">
        Quick Check
      </p>

      {/* ── Question ─────────────────────────────────────────────────── */}
      {data.questionType === 'code' ? (
        <pre
          className="m-0 mb-4 text-[13px] leading-[1.7] text-foreground/80 whitespace-pre-wrap break-words overflow-auto"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
        >
          <code>{data.question}</code>
        </pre>
      ) : (
        <p className="text-[14.5px] font-medium text-foreground/90 leading-relaxed mb-4">
          {data.question}
        </p>
      )}

      {/* ── Options ──────────────────────────────────────────────────── */}
      <InlineCheckpointOptions
        options={data.options}
        selectedId={selectedId}
        correctId={data.correctOptionId}
        submitted={submitted}
        onSelect={setSelectedId}
      />

      {/* ── Feedback ─────────────────────────────────────────────────── */}
      {submitted && (
        <InlineCheckpointFeedback
          visible={true}
          correct={correct}
          explanation={data.explanation}
          showExplanation={!correct && !!data.showExplanation}
        />
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="flex justify-end mt-3">
        {!submitted && (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'flex items-center gap-1 text-[13px] font-semibold transition-opacity duration-150',
              canSubmit
                ? 'text-primary cursor-pointer hover:opacity-75'
                : 'text-muted-foreground/40 cursor-default'
            )}
          >
            Check Answer
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}

        {submitted && !correct && data.allowRetry && (
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-primary cursor-pointer hover:opacity-75 transition-opacity duration-150"
          >
            <RotateCcw className="h-3 w-3" />
            Try again
          </button>
        )}
      </div>

    </div>
  );
};

export default InlineCheckpointRenderer;
