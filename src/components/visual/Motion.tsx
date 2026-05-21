/**
 * Framer Motion primitives for AtlaasGo.
 *
 * Drop-in animated wrappers:
 *   <MotionButton>   — scale tap + hover lift, spring physics
 *   <MotionLink>     — same spring feel on <a>/<Link> tags
 *   <MotionCard>     — lift + shadow on hover, fade-in on mount
 *   <MotionFade>     — fade + slide on viewport enter
 *   <MotionStagger>  — staggers children one by one
 *   <MotionPop>      — spring pop on mount (badges, toasts)
 */
import { type ReactNode, type CSSProperties, type ButtonHTMLAttributes } from 'react';
import {
  motion,
  AnimatePresence,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';

/* ── Shared easings ── */
const smooth = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ── Shared spring config ── */
const btnSpring = { type: 'spring' as const, stiffness: 500, damping: 28 };

/* ───────────── Button with tap spring ───────────── */
export function MotionButton({
  children,
  className,
  style,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <motion.button
      className={className}
      style={style}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.025, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={btnSpring}
      {...(rest as HTMLMotionProps<'button'>)}
    >
      {children}
    </motion.button>
  );
}

/* ───────────── Animated anchor / Link ───────────── */
export function MotionLink({
  children,
  className,
  style,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <motion.a
      className={className}
      style={style}
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={btnSpring}
      {...(rest as HTMLMotionProps<'a'>)}
    >
      {children}
    </motion.a>
  );
}

/* ───────────── Card with hover lift ───────────── */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: smooth } },
};

export function MotionCard({
  children,
  className,
  style,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay }}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 32px rgba(26,20,16,0.10)',
        transition: { duration: 0.25 },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ───────────── Fade-in on viewport ───────────── */
export function MotionFade({
  children,
  className,
  style,
  delay = 0,
  y = 20,
  direction,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  y?: number;
  direction?: 'left' | 'right';
}) {
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === 'left') initial.x = -30;
  else if (direction === 'right') initial.x = 30;
  else initial.y = y;

  return (
    <motion.div
      className={className}
      style={style}
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.6, ease: smooth, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ───────────── Stagger container ───────────── */
const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: smooth } },
};

export function MotionStagger({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div className={className} style={style} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/* ───────────── Pop (badges, toasts) ───────────── */
export function MotionPop({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

/* ───────────── AnimatePresence re-export ───────────── */
export { AnimatePresence, motion };
