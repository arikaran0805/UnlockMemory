import { DevEnvironment } from "@/hooks/useDeveloperEnvironment";

interface Props {
  env: DevEnvironment;
  onChange: (env: DevEnvironment) => void;
}

export function EnvironmentToggle({ env, onChange }: Props) {
  return (
    <div
      className="inline-flex items-center rounded-lg p-0.5 gap-0.5"
      style={{
        background: "rgba(15,110,86,0.05)",
        border: "1px solid rgba(15,110,86,0.12)",
      }}
    >
      {(["test", "live"] as const).map((mode) => {
        const active = env === mode;
        const isTest = mode === "test";
        const activeColor   = isTest ? "#D97706" : "#0F6E56";
        const activeDot     = isTest ? "#F59E0B" : "#10B981";
        const inactiveDot   = "#CBD5E1";

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 outline-none"
            style={
              active
                ? {
                    background: "#FFFFFF",
                    color: activeColor,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
                  }
                : { color: "#8A9490" }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: active ? activeDot : inactiveDot }}
            />
            {mode === "test" ? "Test Mode" : "Live Mode"}
          </button>
        );
      })}
    </div>
  );
}
