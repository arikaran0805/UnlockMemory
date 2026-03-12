import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const rules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "1 uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 number", test: (p: string) => /[0-9]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const passed = rules.filter((r) => r.test(password)).length;
  const strength = passed / rules.length;

  return (
    <div className="space-y-2.5 pt-1">
      {/* Strength bars */}
      <div className="grid grid-cols-3 gap-1">
        {rules.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-colors duration-300 ${
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

      {/* Rules checklist — each label centered under its bar on sm+ */}
      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-y-1">
        {rules.map((rule) => {
          const ok = rule.test(password);
          return (
            <div
              key={rule.label}
              className={`flex items-center sm:justify-center gap-1.5 text-xs transition-colors duration-200 ${
                ok ? "text-emerald-500" : "text-muted-foreground"
              }`}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
