"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Clock, Check, Phone, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import FloatingNavbar from "@/components/FloatingNavbar";
import {
  AtlasLogo,
  AtlasWordmark,
  AtlasButton,
  ZelligeBg,
  DishTile,
  RestaurantBanner,
} from "@/components/atlas";

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
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

// ─── Prototype-exact data ────────────────────────────────────────
const FOOD_CATS = [
  { id: "tagine", name: "Tagines", hue: 18 },
  { id: "couscous", name: "Couscous", hue: 38 },
  { id: "sandwich", name: "Bocadillo", hue: 200 },
  { id: "patisserie", name: "Pâtisseries", hue: 340 },
  { id: "atay", name: "Atay & Café", hue: 150 },
  { id: "pizza", name: "Pizza", hue: 6 },
  { id: "petitdej", name: "Petit Déj", hue: 50 },
  { id: "healthy", name: "Healthy", hue: 130 },
  { id: "grill", name: "Grillades", hue: 24 },
  { id: "friture", name: "Friture", hue: 210 },
  { id: "rotisserie", name: "Poulet Rôti", hue: 48 },
  { id: "zaazaa", name: "Zâazâa", hue: 90 },
  { id: "boulangerie", name: "Pâtisserie Fr.", hue: 330 },
  { id: "international", name: "Tacos & Burger", hue: 12 },
];

const MARKET_CATS = [
  { id: "marche", name: "Marché", hue: 120 },
  { id: "poissonnerie", name: "Poissonnerie", hue: 190 },
  { id: "boucherie", name: "Boucherie", hue: 4 },
  { id: "cremerie", name: "Crèmerie", hue: 60 },
  { id: "epicerie", name: "Épicerie", hue: 30 },
  { id: "maison", name: "Maison", hue: 215 },
];

const DEALS = [
  { id: "d1", title: "Atay offert", sub: "Avec toute commande > 80 DH", cta: "Profiter", tone: "mint" },
  { id: "d2", title: "−25% sur les Tagines", sub: "Tous les vendredis chez Dar Naji", cta: "Voir", tone: "orange" },
  { id: "d3", title: "Livraison gratuite", sub: "Jusqu’à 21h ce soir", cta: "Commander", tone: "navy" },
];

const RESTAURANTS = [
  { id: "darnaji", name: "Dar Naji", tagline: "Cuisine marocaine traditionnelle", city: "Rabat · Médina", rating: 4.8, reviews: 2340, eta: "20–30 min", fee: "12 DH", distance: "1.2 km", badges: ["Top-rated", "Halal"], tileHue: 18 },
  { id: "cafeclock", name: "Café Clock", tagline: "Camel burger & comfort food", city: "Fès · Médina", rating: 4.7, reviews: 1820, eta: "25–35 min", fee: "15 DH", distance: "0.8 km", badges: ["Beldi"], tileHue: 38 },
  { id: "snacktanjia", name: "Snack Tanjia", tagline: "Spécialités marrakchies", city: "Marrakech · Jemâa", rating: 4.9, reviews: 5210, eta: "15–25 min", fee: "9 DH", distance: "0.5 km", badges: ["Bestseller"], tileHue: 6 },
  { id: "atayco", name: "Atay & Co", tagline: "Thé à la menthe & sucreries", city: "Casablanca · Maârif", rating: 4.6, reviews: 980, eta: "10–15 min", fee: "7 DH", distance: "0.3 km", badges: ["Free delivery"], tileHue: 150 },
  { id: "riadmogador", name: "Riad Mogador", tagline: "Fine dining marocain", city: "Essaouira · Port", rating: 4.8, reviews: 1240, eta: "30–40 min", fee: "18 DH", distance: "2.1 km", badges: ["Premium"], tileHue: 200 },
  { id: "baladi", name: "Baladi Healthy", tagline: "Bowls & jus pressés", city: "Casablanca · Anfa", rating: 4.5, reviews: 612, eta: "20–25 min", fee: "10 DH", distance: "1.0 km", badges: ["Healthy"], tileHue: 130 },
];

const TONES: Record<string, string> = {
  mint: "#2EC089",
  orange: "#E55A26",
  navy: "#1B2440",
};

// ─── Category carousel tile ─────────────────────────────────────
function CatTile({ name, hue, size = 66, radius = 16 }: { name: string; hue: number; size?: number; radius?: number }) {
  return (
    <button className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group">
      <DishTile hue={hue} size={size} radius={radius} />
      <span className="text-[11px] font-bold text-navy group-hover:text-brand transition leading-tight text-center max-w-[72px]">
        {name}
      </span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="flex flex-col overflow-x-hidden" style={{ background: "#F6EEDC" }}>
      <FloatingNavbar />

      {/* ══════════════════════════════════════════════════════════
          1. HERO — orange gradient, exact prototype match
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ borderBottom: "1px solid rgba(27,36,64,0.08)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, #E55A26 0%, #C8481A 100%)" }} />
        <ZelligeBg opacity={0.14} color="#fff" />

        <div className="relative" style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px 56px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "center" }}>
          {/* Left copy */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col">
            {/* Badge */}
            <motion.div variants={staggerItem} className="mb-3.5">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-mint" />
                Livraison en 25 min en moyenne
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={staggerItem}
              className="text-white leading-none"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 56, letterSpacing: "-0.03em", lineHeight: 1.02 }}
            >
              Le goût du Maroc,<br />livré en un clic.
            </motion.h1>

            {/* Subtext */}
            <motion.p variants={staggerItem} className="mt-3.5" style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", maxWidth: 460, lineHeight: 1.5 }}>
              Tagines, couscous, atay, pastilla — des cuisines locales jusqu&apos;à ta porte, à Casa, Rabat, Marrakech et Fès.
            </motion.p>

            {/* Buttons */}
            <motion.div variants={staggerItem} className="flex gap-2.5 mt-6">
              <AtlasButton variant="dark">
                <Search className="w-4 h-4" />
                Découvrir
              </AtlasButton>
              <button className="inline-flex items-center justify-center gap-2 rounded-full font-bold text-[15px] cursor-pointer" style={{ background: "#fff", color: "#1B2440", border: "none", padding: "14px 22px" }}>
                Atay offert · &gt; 80 DH
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={staggerItem} className="flex gap-8 mt-8 text-white">
              {[
                { n: "320+", l: "restaurants" },
                { n: "8", l: "villes" },
                { n: "4.8★", l: "satisfaction" },
              ].map((s, i) => (
                <div key={s.l} style={{ animation: `atlasFadeUp 700ms ${300 + i * 120}ms both` }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, fontVariantNumeric: "tabular-nums" }}>
                    {s.n}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: floating dish cards */}
          <div className="relative" style={{ height: 380 }}>
            <div className="absolute" style={{ top: 20, right: 80, transform: "rotate(-6deg)", animation: "atlasFloat 6s ease-in-out infinite" }}>
              <div className="bg-white rounded-3xl shadow-2xl" style={{ padding: 14 }}>
                <DishTile hue={38} size={160} radius={18} label="tagine-poulet" />
                <div className="mt-2.5 font-bold text-navy">Tagine Poulet</div>
                <div className="text-xs text-navy-soft">Dar Naji · 68 DH</div>
              </div>
            </div>
            <div className="absolute" style={{ top: 130, right: 250, transform: "rotate(8deg)", animation: "atlasFloat 7s ease-in-out infinite reverse" }}>
              <div className="bg-white rounded-[20px] shadow-xl" style={{ padding: 12 }}>
                <DishTile hue={150} size={100} radius={14} label="atay" />
                <div className="mt-2 text-xs font-bold text-navy">Atay · 18 DH</div>
              </div>
            </div>
            <div className="absolute" style={{ top: 200, right: 30, transform: "rotate(-4deg)", animation: "atlasFloat 5s ease-in-out infinite" }}>
              <div className="bg-white rounded-[20px] shadow-xl" style={{ padding: 12 }}>
                <DishTile hue={18} size={120} radius={14} label="pastilla" />
                <div className="mt-2 text-xs font-bold text-navy">Pastilla · 75 DH</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. CATEGORIES — À manger
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 8px", width: "100%" }}>
        <div className="flex items-baseline justify-between mb-3.5">
          <div>
            <h2 className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
              À manger
            </h2>
            <p className="text-navy-soft text-[13px] mt-0.5">Restaurants & cuisines locales</p>
          </div>
          <span className="text-xs text-navy-soft font-semibold">{FOOD_CATS.length} catégories</span>
        </div>
        <div className="flex gap-3.5 overflow-x-auto pb-2">
          {FOOD_CATS.map((c) => (
            <CatTile key={c.id} name={c.name} hue={c.hue} size={66} radius={16} />
          ))}
        </div>
      </section>

      {/* Categories — Marché Atlaas */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 8px", width: "100%" }}>
        <div className="bg-white relative overflow-hidden" style={{ borderRadius: 22, padding: "22px 24px", border: "1.5px solid rgba(27,36,64,0.08)" }}>
          <div className="absolute top-0 right-0 w-[200px] h-full pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(46,192,137,0.08))" }} />
          <div className="flex items-baseline justify-between mb-3.5 relative">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>
                Marché Atlaas
              </h2>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-mint text-white px-2 py-1 rounded-full">
                Livré en 15 min
              </span>
            </div>
            <span className="text-xs text-navy-soft">Courses, primeur & dépannage · 7j/7</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {MARKET_CATS.map((c) => (
              <CatTile key={c.id} name={c.name} hue={c.hue} size={60} radius={14} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. DEALS — Offres du moment
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 12px", width: "100%" }}>
        <h2 className="text-navy mb-3.5" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
          Offres du moment
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {DEALS.map((d) => {
            const tone = TONES[d.tone] ?? TONES.navy;
            return (
              <div
                key={d.id}
                className="relative overflow-hidden text-white cursor-pointer"
                style={{ borderRadius: 22, padding: 22, background: `linear-gradient(135deg, ${tone}, ${tone}dd)`, minHeight: 150 }}
              >
                <ZelligeBg opacity={0.16} color="#fff" />
                <div className="relative">
                  <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Offre</div>
                  <div className="mt-1.5" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }}>{d.title}</div>
                  <div className="mt-1 text-[13px]" style={{ opacity: 0.92 }}>{d.sub}</div>
                  <button className="mt-4 bg-white font-bold border-none cursor-pointer" style={{ color: tone, padding: "8px 16px", borderRadius: 999, fontSize: 13, fontFamily: "inherit" }}>
                    {d.cta} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. RESTAURANT GRID
      ══════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 64px", width: "100%" }}>
        <div className="flex items-baseline justify-between mb-3.5">
          <div>
            <h2 className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
              Populaires autour de toi
            </h2>
            <p className="text-navy-soft text-[13px] mt-0.5">Les restaurants les plus commandés cette semaine</p>
          </div>
          <button className="bg-transparent border-none text-brand font-bold text-sm cursor-pointer" style={{ fontFamily: "inherit" }}>
            Voir tout →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-[18px]">
          {RESTAURANTS.map((r) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className="bg-white border-none overflow-hidden text-left cursor-pointer block no-underline transition-all duration-200 hover:-translate-y-1.5"
              style={{
                borderRadius: 22,
                boxShadow: "0 2px 8px rgba(27,36,64,0.05)",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 24px 50px rgba(27,36,64,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(27,36,64,0.05)"; }}
            >
              <RestaurantBanner hue={r.tileHue} height={150} />
              <div style={{ padding: 18 }}>
                <div className="flex justify-between items-start gap-2.5">
                  <div>
                    <div className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
                      {r.name}
                    </div>
                    <div className="text-navy-soft text-[13px] mt-0.5">{r.tagline}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-cream px-2.5 py-1 rounded-full shrink-0">
                    <Star className="w-3 h-3 fill-saffron text-saffron" />
                    <span className="text-[13px] font-bold text-navy">{r.rating}</span>
                  </div>
                </div>
                <div className="flex gap-3.5 mt-3 text-xs text-navy-soft">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.eta}</span>
                  <span className="flex items-center gap-1">🛵 {r.fee}</span>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {r.badges.map((b) => (
                    <span
                      key={b}
                      className="text-[10px] font-bold uppercase tracking-wider bg-brand-tint text-brand-dark px-2 py-1 rounded-full"
                      style={{ letterSpacing: "0.06em" }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. MADE IN MOROCCO
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "#FBF6E7", padding: "64px 0", borderTop: "1px solid rgba(27,36,64,0.08)" }}>
        {/* Decorative blobs */}
        <div className="absolute pointer-events-none" style={{ top: -120, left: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(229,90,38,0.13), transparent 70%)" }} />
        <div className="absolute pointer-events-none" style={{ bottom: -180, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(46,192,137,0.1), transparent 70%)" }} />

        <div className="relative" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {/* Badge */}
            <motion.div variants={staggerItem} className="mb-4">
              <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-full text-xs font-extrabold text-brand tracking-wider shadow-sm">
                <span className="text-sm">🇲🇦</span>
                MADE IN MOROCCO · BY MOROCCANS
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h2 variants={staggerItem} className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 48, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
              Une plateforme marocaine,<br /><span className="text-brand">pensée pour le Maroc.</span>
            </motion.h2>

            {/* Body */}
            <motion.p variants={staggerItem} className="text-navy-soft mt-[18px] leading-relaxed" style={{ fontSize: 16, maxWidth: 520 }}>
              Atlaas Go est née à Casablanca en 2023. Notre équipe — designers, ingénieurs, opérateurs — travaille à Maârif, Rabat et Marrakech. Nous payons en dirhams, parlons en darija, et privilégions chaque jour les restaurants beldi de nos quartiers.
            </motion.p>

            {/* Stats — inline like prototype */}
            <motion.div variants={staggerItem} className="flex gap-8 mt-7">
              {[
                { v: "100%", l: "capital marocain" },
                { v: "320+", l: "restaurants partenaires" },
                { v: "187", l: "coursiers actifs" },
                { v: "8", l: "villes couvertes" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em" }}>{s.v}</div>
                  <div className="text-navy-soft text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: photo collage + floating quote */}
          <motion.div {...fadeUp(0.15)} className="relative" style={{ height: 380 }}>
            <div className="absolute overflow-hidden" style={{ top: 0, right: 80, transform: "rotate(-3deg)", boxShadow: "0 14px 32px rgba(27,36,64,0.14)", borderRadius: 18 }}>
              <RestaurantBanner hue={18} height={160} />
              <div style={{ width: 240 }} />
            </div>
            <div className="absolute overflow-hidden" style={{ top: 130, right: 240, transform: "rotate(4deg)", boxShadow: "0 14px 32px rgba(27,36,64,0.14)", borderRadius: 18 }}>
              <RestaurantBanner hue={150} height={140} />
              <div style={{ width: 220 }} />
            </div>
            <div className="absolute overflow-hidden" style={{ top: 200, right: 30, transform: "rotate(-2deg)", boxShadow: "0 14px 32px rgba(27,36,64,0.14)", borderRadius: 18 }}>
              <RestaurantBanner hue={130} height={150} />
              <div style={{ width: 230 }} />
            </div>
            {/* Floating quote */}
            <div
              className="absolute bg-white shadow-xl animate-atlas-float"
              style={{ bottom: 0, left: 0, padding: "16px 20px", borderRadius: 18, maxWidth: 280, borderLeft: "4px solid #E55A26" }}
            >
              <p className="text-navy font-bold leading-snug" style={{ fontFamily: '"Cairo", system-ui', fontSize: 18 }}>
                « Mzyan f Atlaas, koulchi b Darija »
              </p>
              <p className="text-navy-soft text-[11px] mt-1.5">— Hicham, coursier à Casa</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. JOIN US — restaurant + driver CTAs
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "#F6EEDC", padding: "64px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          {/* Header */}
          <motion.div {...fadeUp()} className="text-center mb-10">
            <div className="text-xs font-extrabold text-brand uppercase tracking-widest">Rejoignez-nous</div>
            <h2 className="text-navy mt-2" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, letterSpacing: "-0.03em" }}>
              Atlaas Go, c&apos;est aussi vous.
            </h2>
            <p className="text-navy-soft text-[15px] mt-2 mx-auto" style={{ maxWidth: 560 }}>
              Restaurant, coursier ou entreprise — il y a une place pour chacun dans l&apos;écosystème Atlaas.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-5">
            {/* Restaurant card */}
            <motion.div
              {...fadeUp(0.05)}
              className="bg-white relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              style={{ borderRadius: 24, padding: 36, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center", boxShadow: "0 4px 14px rgba(27,36,64,0.06)" }}
            >
              <div>
                <div className="w-[52px] h-[52px] rounded-[14px] bg-brand-tint text-brand-dark flex items-center justify-center text-2xl mb-4">🍽️</div>
                <h3 className="text-navy" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
                  Vous êtes un restaurant ?
                </h3>
                <p className="text-navy-soft text-sm mt-2 leading-relaxed">
                  Faites livrer vos plats à Casa, Rabat, Marrakech et plus. Tablette gratuite, support en darija, commission claire.
                </p>
                <ul className="list-none p-0 my-4 flex flex-col gap-2">
                  {["Commission à partir de 15%", "Tablette + formation offertes", "Paiement sous 7 jours"].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-navy text-[13px]">
                      <Check className="w-3.5 h-3.5 text-mint" strokeWidth={2.4} /> {b}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2.5">
                  <AtlasButton variant="dark">Devenir partenaire →</AtlasButton>
                  <AtlasButton variant="ghost">Parler à un manager</AtlasButton>
                </div>
              </div>
              <div style={{ width: 200 }} className="relative">
                <div style={{ transform: "rotate(-4deg)", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 22px rgba(27,36,64,0.10)" }}>
                  <RestaurantBanner hue={18} height={180} />
                </div>
                <div className="absolute bg-brand text-white text-[11px] font-extrabold rounded-full shadow-lg" style={{ top: 12, right: -8, padding: "6px 12px", transform: "rotate(4deg)", boxShadow: "0 4px 10px rgba(229,90,38,0.35)" }}>
                  +25% revenu
                </div>
              </div>
            </motion.div>

            {/* Driver card */}
            <motion.div
              {...fadeUp(0.1)}
              className="text-white relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              style={{ background: "#1B2440", borderRadius: 24, padding: 36, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center", boxShadow: "0 4px 14px rgba(27,36,64,0.06)" }}
            >
              <ZelligeBg opacity={0.07} color="#fff" />
              <div className="relative">
                <div className="w-[52px] h-[52px] rounded-[14px] bg-brand text-white flex items-center justify-center mb-4 text-xl">
                  🛵
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
                  Devenez coursier Atlaas
                </h3>
                <p className="text-sm mt-2 leading-relaxed" style={{ opacity: 0.8 }}>
                  Vos horaires, votre moto, vos gains. Bonus de zone chaude, support 7j/7, paiement chaque semaine.
                </p>
                <ul className="list-none p-0 my-4 flex flex-col gap-2">
                  {["Jusqu’à 4 500 DH / semaine", "Bonus heures de pointe", "Assurance accident incluse"].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-[13px]">
                      <Check className="w-3.5 h-3.5 text-mint" strokeWidth={2.4} /> {b}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2.5">
                  <AtlasButton variant="primary">Postuler coursier →</AtlasButton>
                  <button className="inline-flex items-center justify-center gap-2 rounded-full font-bold text-sm px-[18px] py-3 cursor-pointer" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)", fontFamily: "inherit", fontSize: 14 }}>
                    Comment ça marche
                  </button>
                </div>
              </div>
              {/* Earnings widget */}
              <div style={{ width: 200 }} className="relative">
                <div style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(8px)", borderRadius: 18, padding: 18, border: "1.5px solid rgba(255,255,255,0.14)", transform: "rotate(3deg)" }}>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ opacity: 0.7 }}>Cette semaine</div>
                  <div className="mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30 }}>2 184 DH</div>
                  <div className="text-[11px] mt-0.5" style={{ opacity: 0.75 }}>76 courses · 32h</div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.16)" }}>
                    <div className="h-full rounded-full bg-brand" style={{ width: "78%" }} />
                  </div>
                  <div className="text-[10px] mt-1.5" style={{ opacity: 0.7 }}>Objectif 2 800 DH</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. SUPPORT / CONTACT
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "#FBF6E7", padding: "56px 0", borderTop: "1px solid rgba(27,36,64,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
          {/* Left */}
          <motion.div {...fadeUp()}>
            <div className="text-xs font-extrabold text-brand uppercase tracking-widest">Support · 7j/7</div>
            <h2 className="text-navy mt-1.5" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em" }}>
              On est là si t&apos;as besoin.
            </h2>
            <p className="text-navy-soft text-[15px] mt-2" style={{ maxWidth: 480 }}>
              Une question sur ta commande, un coursier qu&apos;on n&apos;a pas reçu, un partenariat — réponds-nous, on revient en moins d&apos;une heure.
            </p>
          </motion.div>

          {/* Right: contact grid */}
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { icon: "✉️", label: "Email général", value: "salam@atlaasgo.com", href: "mailto:salam@atlaasgo.com" },
                { icon: "🛟", label: "Support client", value: "support@atlaasgo.com", href: "mailto:support@atlaasgo.com" },
                { icon: "🛵", label: "Devenir coursier", value: "coursiers@atlaasgo.com", href: "mailto:coursiers@atlaasgo.com" },
                { icon: "🍽️", label: "Restaurants", value: "partenaires@atlaasgo.com", href: "mailto:partenaires@atlaasgo.com" },
              ].map((c) => (
                <motion.a
                  key={c.label}
                  variants={staggerItem}
                  href={c.href}
                  className="bg-white flex flex-col gap-1 no-underline transition-all duration-200 hover:-translate-y-0.5"
                  style={{ borderRadius: 14, padding: 16, border: "1px solid rgba(27,36,64,0.08)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#E55A26"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(27,36,64,0.08)"; }}
                >
                  <span className="text-xl">{c.icon}</span>
                  <span className="text-[11px] font-bold text-navy-soft uppercase tracking-wider mt-1">{c.label}</span>
                  <span className="text-sm font-bold text-navy" style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>{c.value}</span>
                </motion.a>
              ))}

              {/* Hotline — spans full width */}
              <motion.div
                variants={staggerItem}
                className="col-span-2 flex items-center gap-3.5"
                style={{ background: "#1B2440", color: "#fff", borderRadius: 14, padding: 16 }}
              >
                <div className="w-11 h-11 rounded-full bg-mint flex items-center justify-center text-xl shrink-0">📞</div>
                <div className="flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ opacity: 0.7 }}>Hotline gratuite · 7j/7 · 7h–minuit</div>
                  <div className="font-extrabold text-lg mt-0.5" style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>+212 8 02 00 99 99</div>
                </div>
                <button className="bg-brand text-white border-none rounded-full px-[18px] py-2.5 font-bold text-[13px] cursor-pointer flex items-center gap-2" style={{ fontFamily: "inherit" }}>
                  <Phone className="w-3.5 h-3.5" /> Appeler
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#1B2440", color: "#fff", padding: "40px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 32 }}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AtlasLogo size={32} color="#E55A26" />
              <AtlasWordmark size={20} color="#fff" />
            </div>
            <p className="text-[13px] leading-relaxed max-w-[280px]" style={{ opacity: 0.7 }}>
              La livraison marocaine, pensée pour les Marocains. Des saveurs authentiques, à toute heure.
            </p>
          </div>
          {[
            { t: "Atlaas", l: ["À propos", "Carrières", "Presse", "Blog"] },
            { t: "Restaurants", l: ["Devenir partenaire", "Portail Pro", "Aide partenaire"] },
            { t: "Aide", l: ["FAQ", "Contact", "Suivi", "Conditions"] },
          ].map((col) => (
            <div key={col.t}>
              <div className="font-extrabold mb-3">{col.t}</div>
              {col.l.map((x) => (
                <div key={x} className="text-[13px] py-1" style={{ opacity: 0.7 }}>{x}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "24px 32px 0", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12, opacity: 0.5, display: "flex", justifyContent: "space-between" }}>
          <span>© 2026 Atlaas Go · Made with ❤️ au Maroc</span>
          <span>v2.4.1</span>
        </div>
      </footer>
    </main>
  );
}
