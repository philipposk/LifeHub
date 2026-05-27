"use client";
import { useState } from "react";
import { useTweaksLive, useApplyTweaks } from "@/lib/tweaks";
import { IconSliders } from "./icons";

const ACCENT_OPTIONS = ["#5C6B4A", "#8C6F4A", "#4A6FA5", "#9A4F5C", "#3D3D3D"];

export function TweaksPanel() {
  const [t, setTweak] = useTweaksLive();
  const [open, setOpen] = useState(false);
  useApplyTweaks(t);

  return (
    <>
      <button className="tweaks-fab" title="Tweaks" onClick={() => setOpen(o => !o)}>
        <IconSliders />
      </button>
      {open && (
        <div className="tweaks-panel">
          <div className="tweak-section">Theme</div>
          <div className="tweak-row">
            <span>Accent</span>
            <div className="swatch-row">
              {ACCENT_OPTIONS.map(c => (
                <button
                  key={c}
                  className={"swatch" + (t.accent === c ? " on" : "")}
                  style={{ background: c }}
                  onClick={() => setTweak("accent", c)}
                  aria-label={`Accent ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="tweak-row">
            <span>Dark mode</span>
            <div className={"toggle" + (t.dark ? " on" : "")} onClick={() => setTweak("dark", !t.dark)} />
          </div>

          <div className="tweak-section">Layout</div>
          <div className="tweak-row">
            <span>Density</span>
            <select value={t.density} onChange={e => setTweak("density", e.target.value)}>
              <option value="compact">compact</option>
              <option value="regular">regular</option>
              <option value="comfy">comfy</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
}
