import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { InlineCheckpointData, CheckpointOption } from '../types';
import { FloatingTextToolbar } from '@/components/ui/FloatingTextToolbar';

interface InlineCheckpointEditorProps {
  data: InlineCheckpointData;
  onChange: (data: InlineCheckpointData) => void;
}

const genId = () => Math.random().toString(36).slice(2, 8);
const CODE_LANGUAGES = ['python', 'javascript', 'typescript', 'sql', 'bash'];

const renderQuestionPreview = (data: InlineCheckpointData) => {
  if (!data.question?.trim()) {
    return <p className="text-sm text-muted-foreground italic">No question set</p>;
  }

  if (data.questionType === 'code') {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {data.questionLanguage || 'python'}
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground">
          <code>{data.question}</code>
        </pre>
      </div>
    );
  }

  return <p className="text-sm font-medium">{data.question}</p>;
};

const InlineCheckpointEditor = ({ data, onChange }: InlineCheckpointEditorProps) => {
  const [previewMode, setPreviewMode] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback((
    ref: React.RefObject<HTMLTextAreaElement>,
    currentValue: string,
    setter: (v: string) => void,
    prefix: string,
    suffix: string,
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = currentValue.slice(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
    const newValue = currentValue.slice(0, start) + replacement + currentValue.slice(end);
    setter(newValue);
    // Restore cursor after React re-render
    const newCursor = selected ? start + replacement.length : start + prefix.length;
    requestAnimationFrame(() => {
      el.setSelectionRange(newCursor, newCursor);
      el.focus();
    });
  }, []);

  const update = (partial: Partial<InlineCheckpointData>) =>
    onChange({ ...data, ...partial });

  const addOption = () => {
    const newOpt: CheckpointOption = { id: genId(), text: '' };
    update({ options: [...data.options, newOpt] });
  };

  const updateOption = (id: string, text: string) =>
    update({ options: data.options.map((o) => (o.id === id ? { ...o, text } : o)) });

  const removeOption = (id: string) => {
    const next = data.options.filter((o) => o.id !== id);
    update({
      options: next,
      correctOptionId: data.correctOptionId === id ? '' : data.correctOptionId,
    });
  };

  const setCorrect = (id: string) => update({ correctOptionId: id });

  if (previewMode) {
    // Inline lightweight preview while editing
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Preview
          </span>
          <Button size="sm" variant="ghost" onClick={() => setPreviewMode(false)}>
            Edit
          </Button>
        </div>
        {renderQuestionPreview(data)}
        <div className="space-y-1.5">
          {data.options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
                opt.id === data.correctOptionId
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-border',
              )}
            >
              <span
                className={cn(
                  'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0',
                  opt.id === data.correctOptionId
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-muted-foreground/30',
                )}
              />
              <span>{opt.text || <span className="italic text-muted-foreground">empty</span>}</span>
              {opt.id === data.correctOptionId && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Checkpoint
        </span>
        <Button size="sm" variant="ghost" onClick={() => setPreviewMode(true)}>
          Preview
        </Button>
      </div>

      {/* Question */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="cp-question" className="text-xs">
            Question
          </Label>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => update({ questionType: 'text' })}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  (data.questionType ?? 'text') === 'text'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => update({ questionType: 'code' })}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  data.questionType === 'code'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Code
              </button>
            </div>
            {data.questionType === 'code' && (
              <Select
                value={data.questionLanguage || 'python'}
                onValueChange={(value) => update({ questionLanguage: value })}
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {CODE_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {data.questionType === 'code' ? (
          <div className="space-y-2">
            <Textarea
              ref={questionRef}
              id="cp-question"
              value={data.question}
              onChange={(e) => update({ question: e.target.value })}
              placeholder="Enter your code question..."
              rows={5}
              className="resize-y border-border bg-muted/40 font-mono text-sm leading-6"
            />
          </div>
        ) : (
          <Textarea
            ref={questionRef}
            id="cp-question"
            value={data.question}
            onChange={(e) => update({ question: e.target.value })}
            placeholder="Enter your question..."
            rows={2}
            className="resize-none text-sm"
          />
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Options</Label>
          <span className="text-xs text-muted-foreground">Click circle to mark correct</span>
        </div>

        {data.options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            {/* Correct radio */}
            <button
              type="button"
              title="Mark as correct answer"
              onClick={() => setCorrect(opt.id)}
              className={cn(
                'flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                opt.id === data.correctOptionId
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-muted-foreground/40 hover:border-emerald-400',
              )}
            />
            <Input
              value={opt.text}
              onChange={(e) => updateOption(opt.id, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 h-8 text-sm"
            />
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove option"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addOption}
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Option
        </Button>
      </div>

      {/* Explanation */}
      <div className="space-y-1.5">
        <Label htmlFor="cp-explanation" className="text-xs">
          Explanation <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          ref={explanationRef}
          id="cp-explanation"
          value={data.explanation}
          onChange={(e) => update({ explanation: e.target.value })}
          placeholder="Shown after the learner answers…"
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Settings */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between">
          <Label htmlFor="cp-show-explanation" className="text-xs cursor-pointer">
            Show explanation after answer
          </Label>
          <Switch
            id="cp-show-explanation"
            checked={data.showExplanation}
            onCheckedChange={(v) => update({ showExplanation: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="cp-allow-retry" className="text-xs cursor-pointer">
            Allow retry on wrong answer
          </Label>
          <Switch
            id="cp-allow-retry"
            checked={data.allowRetry}
            onCheckedChange={(v) => update({ allowRetry: v })}
          />
        </div>
      </div>

      {/* Floating formatting toolbars for text fields */}
      <FloatingTextToolbar
        targetRef={questionRef}
        onApplyFormat={(prefix, suffix) =>
          applyFormat(questionRef, data.question, (v) => update({ question: v }), prefix, suffix)
        }
      />
      <FloatingTextToolbar
        targetRef={explanationRef}
        onApplyFormat={(prefix, suffix) =>
          applyFormat(explanationRef, data.explanation, (v) => update({ explanation: v }), prefix, suffix)
        }
      />
    </div>
  );
};

export default InlineCheckpointEditor;
