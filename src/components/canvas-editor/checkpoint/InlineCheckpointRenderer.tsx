import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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

  // Restore persisted state on mount
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

  if (!data.question || !hasOptions) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      {data.questionType === 'code' ? (
        <div className="rounded-xl border border-border bg-muted/35 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {data.questionLanguage || 'python'}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground">
            <code>{data.question}</code>
          </pre>
        </div>
      ) : (
        <p className="text-base font-medium leading-snug">{data.question}</p>
      )}

      {/* Options */}
      <InlineCheckpointOptions
        options={data.options}
        selectedId={selectedId}
        correctId={data.correctOptionId}
        submitted={submitted}
        onSelect={setSelectedId}
      />

      {/* Feedback */}
      <InlineCheckpointFeedback
        visible={submitted}
        correct={correct}
        explanation={data.explanation}
        showExplanation={data.showExplanation}
      />

      {/* Actions */}
      {!submitted && (
        <Button
          size="sm"
          disabled={!selectedId}
          onClick={handleSubmit}
          className="mt-1"
        >
          Check Answer
        </Button>
      )}

      {submitted && !correct && data.allowRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          className="mt-1"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default InlineCheckpointRenderer;
