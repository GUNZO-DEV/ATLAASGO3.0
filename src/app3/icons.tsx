// AtlaasGo 3.0 — line icon set (faithful port of ag-icons.jsx + ag-ui2 extras).
// Stroke inherits currentColor, 2px-ish round caps. ES modules (no window globals).
import type { CSSProperties, ReactNode } from 'react';

export interface IconProps {
  size?: number;
  sw?: number;
  fill?: string;
  /** viewBox size (square) */
  vb?: number;
  style?: CSSProperties;
  className?: string;
  'aria-hidden'?: boolean;
}

/** Base icon — renders either a single `d` path or arbitrary children. */
export function AGIcon({
  d,
  size = 24,
  sw = 1.9,
  fill = 'none',
  vb = 24,
  children,
  style,
  className,
  ...p
}: IconProps & { d?: string; children?: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      {...p}
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

/* ── base set ───────────────────────────────────────────────────────────── */
export const IHome = (p: IconProps) => <AGIcon {...p} d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />;
export const ISearch = (p: IconProps) => <AGIcon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></AGIcon>;
export const IBag = (p: IconProps) => <AGIcon {...p}><path d="M5.5 8h13l-1 12a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1l-1-12Z" /><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" /></AGIcon>;
export const IUser = (p: IconProps) => <AGIcon {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></AGIcon>;
export const IPin = (p: IconProps) => <AGIcon {...p}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></AGIcon>;
export const IChevD = (p: IconProps) => <AGIcon {...p} d="m6 9 6 6 6-6" />;
export const IChevR = (p: IconProps) => <AGIcon {...p} d="m9 6 6 6-6 6" />;
export const IChevL = (p: IconProps) => <AGIcon {...p} d="m15 6-6 6 6 6" />;
export const IStar = (p: IconProps) => <AGIcon {...p} fill="currentColor" sw={0} d="M12 3.2l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.9 6.9 18.9 8 13.2 3.7 9.2l5.8-.7L12 3.2Z" />;
export const IClock = (p: IconProps) => <AGIcon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></AGIcon>;
export const IPlus = (p: IconProps) => <AGIcon {...p} d="M12 5v14M5 12h14" />;
export const IHeart = (p: IconProps) => <AGIcon {...p} d="M12 20s-7-4.6-7-9.7A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7 3.3C19 15.4 12 20 12 20Z" />;
export const ISlider = (p: IconProps) => <AGIcon {...p}><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="9" cy="7" r="2.2" fill="var(--bg)" /><circle cx="15" cy="12" r="2.2" fill="var(--bg)" /><circle cx="8" cy="17" r="2.2" fill="var(--bg)" /></AGIcon>;
export const IBolt = (p: IconProps) => <AGIcon {...p} fill="currentColor" sw={0} d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />;
export const ISnow = (p: IconProps) => <AGIcon {...p}><path d="M12 3v18M5 7l14 10M19 7 5 17M12 3l-2.4 2.4M12 3l2.4 2.4M12 21l-2.4-2.4M12 21l2.4-2.4" strokeWidth={1.6} /></AGIcon>;
export const IWind = (p: IconProps) => <AGIcon {...p}><path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 14h15a2.5 2.5 0 1 1-2.5 2.5M3 11.5h8" /></AGIcon>;
export const IPhone = (p: IconProps) => <AGIcon {...p}><path d="M5 4h4l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1Z" /></AGIcon>;
export const IMsg = (p: IconProps) => <AGIcon {...p}><path d="M4 5h16v11H9l-4 3.5V16H4Z" /></AGIcon>;
export const IBack = (p: IconProps) => <AGIcon {...p} d="m15 5-7 7 7 7" />;
export const IClose = (p: IconProps) => <AGIcon {...p} d="M6 6l12 12M18 6 6 18" />;
export const ICart = (p: IconProps) => <AGIcon {...p}><path d="M4 5h2l2 11h9l2-7H7" /><circle cx="9.5" cy="20" r="1.4" fill="currentColor" strokeWidth={0} /><circle cx="17" cy="20" r="1.4" fill="currentColor" strokeWidth={0} /></AGIcon>;
export const ITag = (p: IconProps) => <AGIcon {...p}><path d="M4 11.5 11.5 4H20v8.5L12.5 20Z" /><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" strokeWidth={0} /></AGIcon>;
export const ITruck = (p: IconProps) => <AGIcon {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></AGIcon>;
export const ILeaf = (p: IconProps) => <AGIcon {...p}><path d="M5 19c0-8 6-13 14-13 0 8-5 14-13 14a8 8 0 0 1-1-1Z" /><path d="M9 15c2-3 4-4 7-5" /></AGIcon>;
export const IWallet = (p: IconProps) => <AGIcon {...p}><path d="M4 7h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4Z" /><path d="M4 7V6a2 2 0 0 1 2-2h9" /><circle cx="16.5" cy="13" r="1.4" fill="currentColor" strokeWidth={0} /></AGIcon>;
export const IGift = (p: IconProps) => <AGIcon {...p}><path d="M4 11h16v9H4zM4 8h16v3H4zM12 8v12M12 8S9 3 7 5s5 3 5 3 3-5 5-3-5 3-5 3" /></AGIcon>;
export const IGroup = (p: IconProps) => <AGIcon {...p}><circle cx="9" cy="9" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 7.2a3 3 0 0 1 0 5.6M16.5 14c2.4.4 4 2.4 4 5" /></AGIcon>;
export const ICheck = (p: IconProps) => <AGIcon {...p} d="m5 12.5 4.5 4.5L19 7" />;
export const IReceipt = (p: IconProps) => <AGIcon {...p}><path d="M6 3h12v18l-2.2-1.4L13.5 21l-2.3-1.4L9 21l-2.3-1.4L4.5 21V3Z" /><path d="M9 8h6M9 12h6" /></AGIcon>;

/* ── extras (from ag-ui2.jsx, used across screens) ──────────────────────── */
export const IBell = (p: IconProps) => <AGIcon {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></AGIcon>;
export const IFire = (p: IconProps) => <AGIcon {...p}><path d="M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c1.5-1 1-3 1-3 2 1.5 3 3.7 3 6a5 5 0 0 1-10 0c0-3 2.5-4.5 2.5-7 0-1.5 1-3 2.5-5Z" fill="currentColor" strokeWidth={0} /></AGIcon>;
export const IGlobe = (p: IconProps) => <AGIcon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></AGIcon>;
export const ISun = (p: IconProps) => <AGIcon {...p}><circle cx="12" cy="12" r="4.4" /><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" /></AGIcon>;
export const IMoon = (p: IconProps) => <AGIcon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" /></AGIcon>;
