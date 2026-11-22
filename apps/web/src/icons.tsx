type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Search = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const Plus = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const Grid = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" /><path d="M17 14v6M14 17h6" />
  </svg>
);
export const Mic = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);
export const Wave = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" /></svg>
);
export const Chevron = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="m7 10 5 5 5-5" /></svg>
);
