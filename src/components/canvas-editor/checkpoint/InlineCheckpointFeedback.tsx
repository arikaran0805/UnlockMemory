import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineCheckpointFeedbackProps {
  visible: boolean;
  correct: boolean;
  explanation?: string;
  showExplanation: boolean;
}

const InlineCheckpointFeedback = ({
  visible,
  correct,
  explanation,
  showExplanation,
}: InlineCheckpointFeedbackProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3"
        >
          <div className={cn(
            'flex flex-col gap-1.5',
            correct ? 'text-primary' : 'text-destructive'
          )}>
            <div className="flex items-center gap-1.5 text-[13px] font-semibold">
              {correct
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                : <XCircle className="h-4 w-4 flex-shrink-0" />
              }
              {correct
                ? 'Correct — well done!'
                : 'Not quite. See the highlighted answer above.'
              }
            </div>
            {showExplanation && explanation && (
              <p className="pl-[22px] text-[12.5px] leading-relaxed text-muted-foreground">
                {explanation}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InlineCheckpointFeedback;
