import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InlineCheckpointData } from '../types';

interface InlineCheckpointPreviewProps {
  data: InlineCheckpointData;
}

/**
 * Static, non-interactive preview shown in the admin block editor toolbar/header area.
 * Not used for learner rendering — that's InlineCheckpointRenderer.
 */
const InlineCheckpointPreview = ({ data }: InlineCheckpointPreviewProps) => {
  const hasQuestion = Boolean(data.question?.trim());
  const hasOptions = data.options && data.options.length > 0;

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
      {/* Label chip */}
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Checkpoint Preview
        </span>
      </div>

      {hasQuestion ? (
        data.questionType === 'code' ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {data.questionLanguage || 'python'}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground">
              <code>{data.question}</code>
            </pre>
          </div>
        ) : (
          <p className="text-sm font-medium">{data.question}</p>
        )
      ) : (
        <p className="text-sm text-muted-foreground italic">No question set</p>
      )}

      {hasOptions ? (
        <div className="space-y-1.5">
          {data.options.map((opt) => {
            const isCorrect = opt.id === data.correctOptionId;
            return (
              <div
                key={opt.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
                  isCorrect
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20'
                    : 'border-border bg-background',
                )}
              >
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0',
                    isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30',
                  )}
                />
                <span className={cn(!opt.text && 'italic text-muted-foreground')}>
                  {opt.text || 'empty option'}
                </span>
                {isCorrect && (
                  <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    correct
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No options added yet</p>
      )}
    </div>
  );
};

export default InlineCheckpointPreview;
