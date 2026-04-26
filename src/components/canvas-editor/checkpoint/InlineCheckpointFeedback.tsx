import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

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
          style={correct
            ? {
                borderRadius: 12,
                border: '1px solid #86c9a8',
                borderLeft: '3px solid #5aaa82',
                background: '#f0faf5',
                color: '#1d5e3a',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
                boxShadow: '0 2px 10px rgba(90,170,130,0.10)',
              }
            : {
                borderRadius: 12,
                border: '1px solid #f0a0a0',
                borderLeft: '3px solid #e06060',
                background: '#fef5f5',
                color: '#8b1a1a',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
                boxShadow: '0 2px 8px rgba(220,60,60,0.07)',
              }
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
            {correct
              ? <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
              : <XCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            }
            {correct ? 'Correct!' : 'Not quite — give it another try.'}
          </div>
          {showExplanation && explanation && (
            <p style={{ paddingLeft: 24, fontSize: 13, lineHeight: 1.6, opacity: 0.82, margin: 0 }}>
              {explanation}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InlineCheckpointFeedback;
