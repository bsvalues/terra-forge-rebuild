import { useSearchParams } from "react-router-dom";

/** Keep tool choice in the window's URL, independently of other windows. */
export function useWorkspaceTool<T extends string>(key: string, choices: readonly T[], fallback: T) {
  const [params, setParams] = useSearchParams();
  const requested = params.get(key);
  const active = choices.find(choice => choice === requested) ?? fallback;
  const select = (value: string) => {
    if (!choices.some(choice => choice === value)) return;
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set(key, value);
      return next;
    }, { replace: true });
  };
  return [active, select] as const;
}