import { cn } from '@/lib/utils';
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
    <div className="space-y-2.5" role="radiogroup">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        const isCorrect = opt.id === correctId;

        let stateClass = 'border-border bg-background hover:border-primary/50 hover:bg-primary/5';
        let indicatorClass = 'border-muted-foreground/40';

        if (submitted) {
          if (isCorrect) {
            stateClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
            indicatorClass = 'border-emerald-500 bg-emerald-500';
          } else if (isSelected && !isCorrect) {
            stateClass = 'border-red-400 bg-red-50 dark:bg-red-950/30';
            indicatorClass = 'border-red-400 bg-red-400';
          } else {
            stateClass = 'border-border bg-background opacity-60';
          }
        } else if (isSelected) {
          stateClass = 'border-primary bg-primary/5';
          indicatorClass = 'border-primary bg-primary';
        }

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={submitted}
            onClick={() => !submitted && onSelect(opt.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-default',
              stateClass,
            )}
          >
            {/* Radio indicator */}
            <span
              className={cn(
                'flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center',
                indicatorClass,
              )}
            >
              {(isSelected || (submitted && isCorrect)) && (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </span>
            <span className="text-sm leading-snug">{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
};

export default InlineCheckpointOptions;
