import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean };

const base = (size: number): SVGProps<SVGSVGElement> => ({
  viewBox: '0 0 24 24',
  width: size,
  height: size,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const Logo = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}>
    <path d="M3 19 L9 8 L13 14 L16 10 L21 19 Z" fill="currentColor" stroke="none" />
  </svg>
);
export const Sun = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
export const Moon = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
export const Bag = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 2 L4 6 v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2 V6 L18 2z" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
export const Box = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
);
export const Arrow = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);
export const Star = ({ size = 14, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <path d="M12 .587l3.668 7.568L24 9.75l-6 5.853 1.417 8.27L12 19.771l-7.417 4.103L6 15.604 0 9.75l8.332-1.595z" />
  </svg>
);
export const Search = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
export const Mic = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3" />
  </svg>
);
export const Pin = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
export const Bike = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="6" cy="17" r="4" />
    <circle cx="18" cy="17" r="4" />
    <path d="M6 17l4-9h4l3 5M14 8h3" />
  </svg>
);
export const Check = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={3} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
export const Heart = ({ size = 14, filled, ...p }: IconProps) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
export const Apple = ({ size = 22, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <path d="M17.05 12.04c-.03-2.5 2.04-3.7 2.14-3.76-1.17-1.71-2.99-1.94-3.63-1.97-1.55-.16-3.03.91-3.81.91-.79 0-2-.89-3.29-.86-1.69.02-3.26.98-4.13 2.5-1.77 3.06-.45 7.57 1.26 10.05.84 1.21 1.84 2.57 3.13 2.52 1.26-.05 1.73-.81 3.25-.81 1.52 0 1.95.81 3.27.79 1.35-.02 2.21-1.23 3.04-2.45.96-1.41 1.35-2.78 1.37-2.85-.03-.01-2.62-1.01-2.64-3.99zM14.59 4.58c.69-.83 1.15-1.99 1.02-3.14-.99.04-2.18.66-2.89 1.49-.64.74-1.2 1.92-1.05 3.05 1.1.09 2.23-.56 2.92-1.4z" />
  </svg>
);
export const Android = ({ size = 22, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <path d="M17.6 9.48l1.84-3.18a.39.39 0 0 0-.14-.53.39.39 0 0 0-.54.13l-1.86 3.23a11.42 11.42 0 0 0-9.8 0L5.24 5.9a.39.39 0 0 0-.54-.13.39.39 0 0 0-.14.53L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52zM7 15.25A1.25 1.25 0 1 1 8.25 14 1.25 1.25 0 0 1 7 15.25zm10 0A1.25 1.25 0 1 1 18.25 14 1.25 1.25 0 0 1 17 15.25z" />
  </svg>
);
export const Lightning = ({ size = 16, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
  </svg>
);
export const Shield = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
export const Clock = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
export const Wallet = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    <path d="M21 12h-4a2 2 0 0 0 0 4h4" />
  </svg>
);
export const Home = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 9.5L12 2l9 7.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
  </svg>
);
export const Receipt = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 2v20l3-2 3 2 3-2 3 2V2z" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);
export const User = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
export const Signal = ({ size = 10, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <rect x="1" y="14" width="3" height="6" rx="1" />
    <rect x="6" y="11" width="3" height="9" rx="1" />
    <rect x="11" y="7" width="3" height="13" rx="1" />
    <rect x="16" y="3" width="3" height="17" rx="1" />
  </svg>
);
export const Battery = ({ size = 16, ...p }: IconProps) => (
  <svg viewBox="0 0 24 12" width={size} height={size / 2} fill="currentColor" {...p}>
    <rect x="0" y="0" width="20" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <rect x="2" y="2" width="14" height="8" rx="1.5" />
    <rect x="21" y="4" width="2" height="4" rx="1" />
  </svg>
);
export const Wifi = ({ size = 12, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...p}>
    <path d="M12 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5.2 11.3l-1.6-1.7C7.6 5.4 16.4 5.4 20.4 9.6l-1.6 1.7c-3.1-3.3-10.5-3.3-13.6 0zm-3.2-3.4L.4 6.3c5.6-5.7 17.6-5.7 23.2 0l-1.6 1.6c-4.7-4.7-15.3-4.7-20 0z" />
  </svg>
);
export const Plus = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
export const Minus = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
export const Trash = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
export const Chat = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
export const Phone = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
export const Trending = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
export const Menu = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
export const Close = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
