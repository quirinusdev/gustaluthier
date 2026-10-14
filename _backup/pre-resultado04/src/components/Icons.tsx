/* Ícones de 05_ui (inline para herdar currentColor) + traços dos instrumentos do frame 02. */
type P = { className?: string };
const base = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": true } as const;

export const IconMenu = (p: P) => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconArrow = (p: P) => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconLocation = (p: P) => (
  <svg {...base} strokeWidth={1.8} {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconInstagram = (p: P) => (
  <svg {...base} strokeWidth={1.8} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" /></svg>
);
export const IconWhatsapp = (p: P) => (
  <svg {...base} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.6Z" />
    <path d="M8.3 7.8c.3-.4.7-.4 1-.1l1 1.7c.2.3.1.7-.1.9l-.7.8c.8 1.5 1.9 2.7 3.5 3.4l.8-.8c.2-.2.6-.3.9-.1l1.7.9c.4.2.5.6.3 1-.4.8-1.3 1.4-2.2 1.4-3.9-.3-7.3-3.7-7.7-7.6 0-.6.2-1.1.5-1.5Z" />
  </svg>
);
export const IconScroll = (p: P) => (
  <svg {...base} strokeWidth={1.4} {...p}><rect x="7" y="3" width="10" height="18" rx="5" /><path className="scroll-dot" d="M12 7v3" strokeLinecap="round" /></svg>
);
export const IconStar = (p: P) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />
  </svg>
);
export const IconExpand = (p: P) => (
  <svg {...base} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const IconPlay = (p: P) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
);

/* Instrumentos — traço fino, mesma linguagem dos ícones do storyboard */
const inst = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 48 72", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, "aria-hidden": true } as const;

export const IconGuitar = (p: P) => (
  <svg {...inst} {...p}>
    <path d="M33 4l4 2-1 4-3 1-8 22" />
    <path d="M25 33c-3-1-5 1-6 3-1 3-5 2-7 5-3 4-2 10 2 13 4 4 10 6 15 3 3-2 3-5 5-7 2-2 5-2 5-6 0-3-3-4-5-4-2-1-3-4-6-4-1 0-2-1-3-3Z" />
    <path d="M21 44l7 3M20 48l7 3M18 53h8" />
  </svg>
);
export const IconAcoustic = (p: P) => (
  <svg {...inst} {...p}>
    <path d="M21 3h6l-1 6h-4zM22 9h4v20h-4z" />
    <path d="M22 29c-4 0-7 3-7 7 0 3 2 4 2 6-3 2-6 5-6 11 0 8 6 15 13 15s13-7 13-15c0-6-3-9-6-11 0-2 2-3 2-6 0-4-3-7-7-7Z" />
    <circle cx="24" cy="46" r="4" /><path d="M19 58h10" />
  </svg>
);
export const IconBass = (p: P) => (
  <svg {...inst} {...p}>
    <path d="M22 3h5l1 8-2 2h-3l-2-2zM23 13h3v28h-3z" />
    <path d="M23 41c-3-1-6 1-6 4 0 2 1 3-1 5-3 2-4 6-3 10 2 6 8 9 13 8 5-1 8-5 7-10 0-3-3-5-3-8 0-2 2-3 1-6-1-2-4-3-6-2-1 0-2 0-2-1Z" />
    <path d="M20 54h9M21 58h8" />
  </svg>
);
