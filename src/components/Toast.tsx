"use client";
import { createContext, useCallback, useContext, useState, useRef } from "react";

type ToastKind = "info" | "success" | "error";
type Toast = { id: number; text: string; kind: ToastKind };

type ToastCtx = {
  toast: (text: string, kind?: ToastKind) => void;
  success: (text: string) => void;
  error: (text: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  // No-op fallback so components work even if rendered outside the provider.
  if (!ctx) {
    return { toast: () => {}, success: () => {}, error: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, kind: ToastKind = "info") => {
    const id = ++seq.current;
    setToasts(ts => [...ts, { id, text, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3600);
  }, []);

  const api: ToastCtx = {
    toast: push,
    success: t => push(t, "success"),
    error: t => push(t, "error"),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={"toast toast-" + t.kind}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
