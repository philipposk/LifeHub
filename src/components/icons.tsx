import type { SVGProps, ReactNode } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const ico = (path: ReactNode, opts: { sw?: number } = {}) =>
  function Icon(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={opts.sw || 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {path}
      </svg>
    );
  };

export const IconHome = ico(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>);
export const IconCheckSquare = ico(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.5 2.5L16 9.5" /></>);
export const IconNote = ico(<><path d="M5 4h11l3 3v13H5z" /><path d="M16 4v3h3" /><path d="M8 11h8M8 14h8M8 17h5" /></>);
export const IconCalendar = ico(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17" /><path d="M8 3v4M16 3v4" /></>);
export const IconInbox = ico(<><path d="M3.5 12.5 5 5h14l1.5 7.5" /><path d="M3.5 12.5V19h17v-6.5" /><path d="M3.5 12.5h5l1.5 2.5h4l1.5-2.5h5" /></>);
export const IconBookmark = ico(<><path d="M6 4h12v17l-6-4-6 4z" /></>);
export const IconCamera = ico(<><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);
export const IconSearch = ico(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></>);
export const IconSettings = ico(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>);
export const IconBell = ico(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const IconMenu = ico(<><path d="M4 7h16M4 12h16M4 17h16" /></>);
export const IconPlus = ico(<path d="M12 5v14M5 12h14" />);
export const IconChevron = ico(<path d="m9 6 6 6-6 6" />);
export const IconClock = ico(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const IconRun = ico(<><circle cx="14" cy="5" r="1.6" /><path d="m6 21 3-6 3 2-1 4M12 17l4-5-3-5-4 3-2 3" /></>);
export const IconBook = ico(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>);
export const IconDroplet = ico(<path d="M12 3.5c-3 4.5-6 7.5-6 11a6 6 0 0 0 12 0c0-3.5-3-6.5-6-11Z" />);
export const IconCheck = ico(<path d="m5 12 5 5L20 7" />, { sw: 2.4 });
export const IconCmd = ico(<path d="M9 9V6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v12a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z" />);
export const IconMic = ico(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const IconPaperclip = ico(<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5L10.5 17.5a2 2 0 0 1-3-3L16 6" />);
export const IconHash = ico(<path d="M4 9h16M4 15h16M10 4 8 20M16 4l-2 16" />);
export const IconArrow = ico(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconFilter = ico(<path d="M3 5h18l-7 9v6l-4-2v-4z" />);
export const IconSliders = ico(<><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M18 18h2" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>);

export const HABIT_ICON: Record<string, (p: IconProps) => JSX.Element> = {
  book: IconBook,
  run: IconRun,
  clock: IconClock,
  droplet: IconDroplet,
};
