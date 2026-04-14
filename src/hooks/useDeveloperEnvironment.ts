import { useState } from "react";

export type DevEnvironment = "test" | "live";

const STORAGE_KEY = "unlock_dev_env";

export function useDeveloperEnvironment() {
  const [env, setEnvState] = useState<DevEnvironment>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as DevEnvironment) || "test";
    } catch {
      return "test";
    }
  });

  const setEnv = (next: DevEnvironment) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    setEnvState(next);
  };

  return { env, setEnv, isTest: env === "test", isLive: env === "live" };
}
