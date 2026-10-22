// Plain module (no "use client") so the server layout can inline the string.
/** Mirror of the look in localStorage so the pre-paint script in layout.tsx can apply it with no flash. */
export const BOOT_KEY = "lifehub.look.v1";

export const THEME_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(BOOT_KEY)})||"{}");var m=s.mode||"auto";var d=m==="dark"||(m==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",d?"dark":"light");if(s.accent)r.style.setProperty("--accent",s.accent);if(s.density)r.setAttribute("data-density",s.density);}catch(e){}})();`;

