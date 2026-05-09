import { Check, X } from 'lucide-react';
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
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        const isCorrect = opt.id === correctId;

        type VisualState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

        let state: VisualState = 'idle';
        if (submitted) {
          if (isCorrect)        state = 'correct';
          else if (isSelected)  state = 'wrong';
          else                  state = 'dimmed';
        } else if (isSelected) {
          state = 'selected';
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
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
              'text-[13.5px] font-medium border outline-none',
              'transition-all duration-150',
              state === 'idle' && [
                'bg-background border-border text-foreground/70',
                'hover:border-primary/60 hover:text-foreground cursor-pointer',
              ],
              state === 'selected' && [
                'bg-primary border-primary text-primary-foreground font-semibold cursor-pointer',
              ],
              state === 'correct' && [
                'bg-primary border-primary text-primary-foreground font-semibold cursor-default',
              ],
              state === 'wrong' && [
                'bg-destructive border-destructive text-destructive-foreground font-semibold cursor-default',
              ],
              state === 'dimmed' && [
                'bg-background border-border/40 text-foreground/25 cursor-default',
              ],
            )}
          >
            {/* Show icon after submission */}
            {submitted && isCorrect && (
              <Check className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3} />
            )}
            {submitted && isSelected && !isCorrect && (
              <X className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3} />
            )}
            {opt.text}
          </button>
        );
      })}
    </div>
  );
};

export default InlineCheckpointOptions;
