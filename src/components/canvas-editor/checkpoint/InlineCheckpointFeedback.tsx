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
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex flex-col gap-1.5 px-4 py-3 rounded-lg border text-sm',
            correct
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            {correct ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {correct ? 'Correct!' : 'Not quite — give it another try.'}
          </div>
          {showExplanation && explanation && (
            <p className="pl-6 text-sm leading-relaxed opacity-90">{explanation}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InlineCheckpointFeedback;
