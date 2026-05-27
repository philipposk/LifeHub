"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAll, SearchResult } from "@/lib/search";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await searchAll(q);
      if (!cancelled) {
        setResults(r);
        setActive(0);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) {
      router.push(results[active].href);
      onClose();
    }
  };

  return (
    <div className="cp-backdrop" onClick={onClose}>
      <div className="cp-panel" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cp-input"
          placeholder="Search tasks, notes, captures…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="cp-list">
          {results.length === 0 && q && <div className="cp-empty">No matches</div>}
          {results.length === 0 && !q && <div className="cp-empty">Type to search across your stuff.</div>}
          {results.map((r, i) => (
            <div
              key={r.type + r.id}
              className={"cp-row" + (i === active ? " on" : "")}
              onClick={() => { router.push(r.href); onClose(); }}
              onMouseEnter={() => setActive(i)}
            >
              <div className="type">{r.type}</div>
              <div className="label">{r.label}{r.sub && <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12 }}>· {r.sub}</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
