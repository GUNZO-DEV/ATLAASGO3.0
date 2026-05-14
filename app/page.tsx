"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  UtensilsCrossed, Navigation, CheckCircle2,
  Mountain, Building2, Store,
  ArrowDown, Zap, ShoppingBag,
} from "lucide-react";

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.727-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconFacebook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
import Link from "next/link";
import CityModal from "@/components/CityModal";
import FloatingNavbar from "@/components/FloatingNavbar";
import Hero3D from "@/components/Hero3D";
import ZoneCard3D from "@/components/3d/ZoneCard3D";

// ─── Animation helpers ────────────────────────────────────────────
const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.65, ease, delay },
  };
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

// ─── Data ─────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Choose your cravings",
    body: "Browse local restaurants and shops. Tell us exactly what you want — from a single sandwich to a full grocery run.",
    icon: <UtensilsCrossed className="w-6 h-6" />,
  },
  {
    n: "02",
    title: "Track your order live",
    body: "A nearby driver picks up your order. Watch them move toward you on a live map — no guessing, no waiting in the dark.",
    icon: <Navigation className="w-6 h-6" />,
  },
  {
    n: "03",
    title: "Enjoy at your door",
    body: "Your order arrives fresh. Pay the flat delivery fee in cash — no hidden charges, no subscriptions, no surprises.",
    icon: <CheckCircle2 className="w-6 h-6" />,
  },
];

const ZONES = [
  {
    id: "ifrane",
    name: "Ifrane",
    tagline: "The Mountain Capital",
    description:
      "Home to Al Akhawayn University, cedar forests, and Morocco's most charming European-style streets. We deliver everywhere in Ifrane.",
    fee: "15 MAD",
    icon: <Mountain className="w-6 h-6" />,
    accent: "from-[#E05A23] to-[#C44D1A]",
    badge: "Live now",
  },
  {
    id: "oujda",
    name: "Oujda",
    tagline: "The Eastern Pearl",
    description:
      "Morocco's gateway to the east — a vibrant university city packed with local restaurants, markets, and cafés ready for delivery.",
    fee: "10 MAD",
    icon: <Building2 className="w-6 h-6" />,
    accent: "from-[#1E2D4A] to-[#13203A]",
    badge: "Live now",
  },
];

// ─── Page ─────────────────────────────────────────────────────────
export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTextY   = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <main className="flex flex-col bg-white overflow-x-hidden">
      <FloatingNavbar />
      <CityModal />

      {/* ════════════════════════════════════════════════════════════
          HERO — full viewport height
      ════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E2D4A 0%, #13203A 55%, #0D1628 100%)" }}
      >
        {/* 3D background — fixed behind text */}
        <div className="absolute inset-0">
          <Hero3D />
        </div>

        <motion.div
          ref={heroRef}
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-4 pt-32 pb-16"
        >
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-8 max-w-2xl"
        >
          {/* Eyebrow badge */}
          <motion.div variants={staggerItem}>
            <span className="inline-flex items-center gap-2 bg-brand/20 backdrop-blur-sm border border-brand/30 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
              <Zap className="w-3 h-3 text-brand-light" />
              Morocco&apos;s fastest delivery
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            variants={staggerItem}
            className="text-5xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight"
          >
            Moroccan Delivery,{" "}
            <span
              className="block"
              style={{
                background: "linear-gradient(90deg, #F07848, #E05A23, #F07848)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Redefined.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={staggerItem}
            className="text-white/60 text-lg sm:text-xl leading-relaxed max-w-md"
          >
            From local restaurants to corner shops — delivered to your door in Ifrane and Oujda. Flat fee. No subscription.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none justify-center">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-2 bg-[#E05A23] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
              >
                <ShoppingBag className="w-5 h-5" />
                Browse Restaurants
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 px-8 rounded-2xl border border-brand-light/40 shadow-[0_4px_20px_rgba(224,90,35,0.5)] transition text-base"
              >
                Order Now
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/18 backdrop-blur-sm text-white font-bold py-3.5 px-8 rounded-2xl border border-white/25 transition text-base"
              >
                Become a Driver
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            variants={staggerItem}
            className="flex items-center gap-6 text-white/35 text-xs font-medium"
          >
            <span>✓ Flat delivery fee</span>
            <span className="w-px h-3 bg-white/20" />
            <span>✓ Cash on delivery</span>
            <span className="w-px h-3 bg-white/20" />
            <span>✓ Real-time tracking</span>
          </motion.div>
        </motion.div>
        </motion.div>

        {/* Scroll nudge */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 flex flex-col items-center gap-1"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[10px] tracking-widest uppercase font-medium">Scroll</span>
          <ArrowDown className="w-4 h-4" />
        </motion.div>

        {/* Wave into next section */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 64h1440V32C1200 12 960 0 720 0S240 12 0 32v32z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="px-6 py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <p className="text-[11px] font-bold text-brand tracking-[0.2em] uppercase mb-3">Simple process</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">How it Works</h2>
            <p className="text-gray-400 mt-4 text-lg max-w-md mx-auto">
              Three steps stand between you and your order at the door.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {STEPS.map((s) => (
              <motion.div
                key={s.n}
                variants={staggerItem}
                whileHover={{ scale: 1.02, y: -6 }}
                className="group relative bg-white rounded-3xl p-7 flex flex-col gap-5 border border-gray-100 shadow-[0_4px_32px_rgba(0,0,0,0.06)] cursor-default overflow-hidden"
              >
                {/* Large step number watermark */}
                <span className="absolute top-4 right-5 text-7xl font-black text-gray-50 select-none leading-none group-hover:text-emerald-atlaasgo/5 transition-colors">
                  {s.n}
                </span>

                <div className="w-12 h-12 rounded-2xl bg-emerald-atlaasgo/8 flex items-center justify-center text-emerald-atlaasgo relative z-10">
                  {s.icon}
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          LOCAL ZONES
      ════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24" style={{ background: "linear-gradient(180deg, #f4faf7 0%, #ffffff 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <p className="text-[11px] font-bold text-brand tracking-[0.2em] uppercase mb-3">Coverage</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Where we deliver</h2>
            <p className="text-gray-400 mt-4 text-lg">
              Exclusively live in two Moroccan cities — with more coming soon.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            {ZONES.map((z) => (
              <ZoneCard3D key={z.id} className="rounded-3xl cursor-pointer">
                <motion.div
                  variants={staggerItem}
                  whileHover={{ y: -4 }}
                  className="relative rounded-3xl overflow-hidden"
                >
                  {/* Gradient header */}
                  <div className={`bg-gradient-to-br ${z.accent} p-7 flex flex-col gap-3`}>
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-white">
                        {z.icon}
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full tracking-widest uppercase">
                        {z.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-white tracking-tight">{z.name}</h3>
                      <p className="text-white/70 text-sm font-medium mt-0.5">{z.tagline}</p>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="bg-white border border-t-0 border-gray-100 rounded-b-3xl px-7 py-5 flex flex-col gap-4">
                    <p className="text-gray-500 text-sm leading-relaxed">{z.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Delivery fee</p>
                        <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{z.fee}</p>
                      </div>
                      <Link
                        href="/register"
                        className="text-sm font-bold text-brand hover:text-brand-dark border border-brand/30 hover:border-brand px-4 py-2 rounded-xl transition"
                      >
                        Order here →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </ZoneCard3D>
            ))}
          </motion.div>

          <motion.p {...fadeUp(0.1)} className="text-center text-gray-300 text-sm mt-10">
            Azrou, Meknès, and Fès — coming 2026.
          </motion.p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          RESTAURANT PARTNER BANNER
      ════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0D1628 0%, #13203A 50%, #1E2D4A 100%)" }}
        />
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp()} className="flex flex-col items-center gap-8">
            <div className="w-16 h-16 rounded-3xl bg-gold/20 flex items-center justify-center text-gold-light">
              <Store className="w-8 h-8" />
            </div>

            <div>
              <p className="text-[11px] font-bold text-brand-light tracking-[0.2em] uppercase mb-4">For local businesses</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Partner with<br />
                <span
                  style={{
                    background: "linear-gradient(90deg, #F07848, #E05A23)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Atlaasgo
                </span>
              </h2>
            </div>

            <p className="text-white/55 text-lg max-w-xl leading-relaxed">
              List your restaurant, café, or shop on Atlaasgo and reach thousands of customers across Ifrane and Oujda. Zero setup fee. We bring the drivers — you bring the great food.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="mailto:partners@atlaasgo.com"
                  className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 px-8 rounded-2xl shadow-[0_4px_20px_rgba(224,90,35,0.4)] transition"
                >
                  Apply to Partner
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/driver"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/18 backdrop-blur-sm text-white font-bold py-3.5 px-8 rounded-2xl border border-white/20 transition"
                >
                  Drive with us
                </Link>
              </motion.div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-8 pt-4 border-t border-white/10 w-full max-w-sm">
              {[["15 MAD", "Flat fee"], ["< 30 min", "Avg. delivery"], ["2 cities", "Active now"]].map(([val, label]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-xl font-extrabold text-white tabular-nums">{val}</span>
                  <span className="text-[11px] text-white/40 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* Brand col */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="AtlaasGo" className="w-8 h-8 rounded-xl" />
              <span className="font-extrabold text-white tracking-tight">
                Atlaas<span className="text-brand">Go</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Morocco&apos;s premium local delivery platform. Fast, flat-rate, and built for Moroccan cities.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {[
                { icon: <IconX />, href: "#" },
                { icon: <IconInstagram />, href: "#" },
                { icon: <IconFacebook />, href: "#" },
              ].map(({ icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-brand flex items-center justify-center text-gray-400 hover:text-white transition"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links col */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Platform</p>
            {[
              { label: "Order Now", href: "/register" },
              { label: "Become a Driver", href: "/register" },
              { label: "Driver Dashboard", href: "/driver" },
              { label: "How it Works", href: "#how-it-works" },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="text-sm text-gray-500 hover:text-white transition w-fit">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Legal col */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Legal</p>
            {[
              { label: "Privacy Policy", href: "#" },
              { label: "Terms of Service", href: "#" },
              { label: "Cookie Policy", href: "#" },
              { label: "Partner with us", href: "mailto:partners@atlaasgo.com" },
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-gray-500 hover:text-white transition w-fit">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-600">© 2026 Atlaasgo. All rights reserved.</p>
            <p className="text-xs text-gray-700">Made with care in Morocco 🇲🇦</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
