"use client";
import { usePathname, useRouter } from "next/navigation";
import { IconChevron, IconSearch, IconBell, IconCamera } from "./icons";

const TITLES: Record<string, string> = {
  "/today": "Today", "/tasks": "Tasks", "/calendar": "Calendar", "/notes": "Notes",
  "/inbox": "Inbox", "/captures": "Captures", "/saved": "Saved", "/tags": "Tags",
  "/settings": "Settings",
};

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = TITLES[pathname] || "LifeHub";
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Workspace</span>
        <IconChevron />
        <b>{title}</b>
      </div>
      <div className="search" onClick={onOpenSearch}>
        <IconSearch />
        <input placeholder="Search notes, tasks, captures…" readOnly />
        <kbd>⌘K</kbd>
      </div>
      <div className="top-actions">
        <button className="icon-btn" title="Inbox" onClick={() => router.push("/inbox")}><IconBell /></button>
        <button className="icon-btn" title="Quick capture" onClick={() => router.push("/today")}><IconCamera /></button>
        <div className="avatar">You</div>
      </div>
    </div>
  );
}
