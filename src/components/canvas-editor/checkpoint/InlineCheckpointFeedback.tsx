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
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={correct
            ? {
                borderRadius: 13,
                border: '1px solid rgba(90,170,130,0.35)',
                borderLeft: '3px solid #5aaa82',
                background: 'linear-gradient(to right, #0e2318, #0c2015)',
                color: '#5aaa82',
                padding: '13px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
              }
            : {
                borderRadius: 13,
                border: '1px solid rgba(220,80,80,0.28)',
                borderLeft: '3px solid #e06060',
                background: 'linear-gradient(to right, #1f1010, #1c0e0e)',
                color: '#cc6666',
                padding: '13px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
              }
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
            {correct
              ? <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0, color: '#5aaa82' }} />
              : <XCircle style={{ width: 16, height: 16, flexShrink: 0, color: '#e06060' }} />
            }
            {correct ? 'Correct!' : 'Not quite — give it another try.'}
          </div>
          {showExplanation && explanation && (
            <p style={{
              paddingLeft: 24,
              fontSize: 13,
              lineHeight: 1.65,
              margin: 0,
              opacity: 0.78,
            }}>
              {explanation}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InlineCheckpointFeedback;
