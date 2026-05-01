import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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
                border: isDark ? '1px solid rgba(90,170,130,0.35)' : '1px solid rgba(90,170,130,0.45)',
                borderLeft: '3px solid #5aaa82',
                background: isDark
                  ? 'linear-gradient(to right, #0e2318, #0c2015)'
                  : 'linear-gradient(to right, #eef9f4, #e8f7f0)',
                color: isDark ? '#5aaa82' : '#1c4d35',
                padding: '13px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
                boxShadow: isDark ? 'none' : '0 2px 12px rgba(80,160,120,0.10), 0 1px 3px rgba(80,160,120,0.06)',
              }
            : {
                borderRadius: 13,
                border: isDark ? '1px solid rgba(220,80,80,0.28)' : '1px solid rgba(220,80,80,0.38)',
                borderLeft: '3px solid #e06060',
                background: isDark
                  ? 'linear-gradient(to right, #1f1010, #1c0e0e)'
                  : 'linear-gradient(to right, #fef4f4, #fdf0f0)',
                color: isDark ? '#cc6666' : '#7a1e1e',
                padding: '13px 16px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
                boxShadow: isDark ? 'none' : '0 2px 10px rgba(210,60,60,0.08), 0 1px 3px rgba(210,60,60,0.04)',
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
