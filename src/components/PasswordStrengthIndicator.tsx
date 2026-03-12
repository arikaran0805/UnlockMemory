import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const passed = rules.filter((r) => r.test(password)).length;
  const strength = passed / rules.length;

  return (
    <div className="space-y-2 pt-1">
      {/* Strength bar */}
      <div className="flex gap-1">
        {rules.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < passed
                ? strength === 1
                  ? "bg-emerald-500"
                  : strength >= 0.66
                  ? "bg-amber-500"
                  : "bg-destructive"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {rules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                ok ? "text-emerald-500" : "text-muted-foreground"
              }`}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
