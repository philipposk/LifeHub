"use client";
import { useState } from "react";
import { useAreas } from "@/lib/db/hooks";
import { db } from "@/lib/db/schema";

export default function AreasPage() {
  const areas = useAreas() || [];
  const [edit, setEdit] = useState<Record<string, { name: string; color: string }>>({});

  const save = async (id: string) => {
    const e = edit[id];
    if (!e) return;
    await db().areas.update(id, { name: e.name, color: e.color });
    setEdit(rest => { const c = { ...rest }; delete c[id]; return c; });
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Areas</div>
          <div className="view-sub">{areas.length} area{areas.length === 1 ? "" : "s"} · used as task chips</div>
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        {areas.map(a => {
          const e = edit[a.id];
          return (
            <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 4px", borderBottom: "1px solid var(--line-2)" }}>
              <span className={"chip " + a.cls}>{a.name}</span>
              <input
                type="text"
                value={e?.name ?? a.name}
                onChange={ev => setEdit({ ...edit, [a.id]: { name: ev.target.value, color: e?.color ?? a.color } })}
                style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "var(--ink)", outline: "none" }}
              />
              <input
                type="color"
                value={e?.color ?? a.color}
                onChange={ev => setEdit({ ...edit, [a.id]: { name: e?.name ?? a.name, color: ev.target.value } })}
              />
              {e && <button className="btn-primary" onClick={() => save(a.id)}>Save</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}
