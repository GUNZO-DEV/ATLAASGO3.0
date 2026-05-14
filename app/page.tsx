"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  MapPin,
  Check,
  Phone,
  Truck,
  ChevronRight,
  Search,
  UtensilsCrossed,
  Bike,
} from "lucide-react";
import Link from "next/link";
import CityModal from "@/components/CityModal";
import FloatingNavbar from "@/components/FloatingNavbar";
import {
  AtlasLogo,
  AtlasWordmark,
  AtlasButton,
  ZelligeBg,
  CategoryPill,
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
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

// ─── Data ─────────────────────────────────────────────────────────
const FOOD_CATEGORIES = [
  { icon: "🍲", label: "Tagines" },
  { icon: "🥘", label: "Couscous" },
  { icon: "🫓", label: "Msemen" },
  { icon: "🍰", label: "Pâtisseries" },
  { icon: "🥗", label: "Salades" },
  { icon: "🍕", label: "Pizza" },
  { icon: "🍔", label: "Burgers" },
  { icon: "🌮", label: "Tacos" },
  { icon: "🥤", label: "Jus frais" },
  { icon: "🫖", label: "Thé" },
];

const MARKET_CATEGORIES = [
  { icon: "🛒", label: "Marché" },
  { icon: "🥖", label: "Boulangerie" },
  { icon: "🧴", label: "Hygiène" },
  { icon: "🧺", label: "Épicerie fine" },
  { icon: "💊", label: "Pharmacie" },
  { icon: "🐱", label: "Animaux" },
];

const DEALS = [
  {
    bg: "linear-gradient(135deg, #E55A26 0%, #C8481A 100%)",
    discount: "−20%",
    title: "sur les tagines",
    condition: "Min. 80 DH · Ce soir seulement",
    textColor: "text-white",
  },
  {
    bg: "linear-gradient(135deg, #2EC089 0%, #1EA070 100%)",
    discount: "Livraison",
    title: "gratuite",
    condition: "Commande > 120 DH · Tous restos",
    textColor: "text-white",
  },
  {
    bg: "linear-gradient(135deg, #F2B53A 0%, #E09A20 100%)",
    discount: "Menu",
    title: "à 49 DH",
    condition: "Plat + boisson · Sélection du jour",
    textColor: "text-white",
  },
];

const RESTAURANTS = [
  {
    name: "Dar Naji",
    tagline: "Cuisine beldi authentique",
    city: "Rabat",
    rating: 4.8,
    reviews: 547,
    eta: "20–30 min",
    fee: "12 DH",
    badges: ["Halal", "Popular"],
    bannerHue: 25,
  },
  {
    name: "Café Clock",
    tagline: "Fusion marocaine-moderne",
    city: "Fès",
    rating: 4.7,
    reviews: 312,
    eta: "25–35 min",
    fee: "15 DH",
    badges: ["Healthy"],
    bannerHue: 160,
  },
  {
    name: "Snack Tanjia",
    tagline: "Street food Marrakech",
    city: "Marrakech",
    rating: 4.5,
    reviews: 189,
    eta: "15–25 min",
    fee: "10 DH",
    badges: ["Halal", "Livraison offerte"],
    bannerHue: 340,
  },
  {
    name: "Atay & Co",
    tagline: "Thé, jus, brunch",
    city: "Casa",
    rating: 4.9,
    reviews: 723,
    eta: "10–20 min",
    fee: "8 DH",
    badges: ["Popular"],
    bannerHue: 200,
  },
  {
    name: "Baladi Market",
    tagline: "Épicerie bio locale",
    city: "Casa",
    rating: 4.6,
    reviews: 256,
    eta: "30–40 min",
    fee: "Gratuit",
    badges: ["Bio"],
    bannerHue: 120,
  },
  {
    name: "Riad Mogador",
    tagline: "Saveurs d'Essaouira",
    city: "Essaouira",
    rating: 4.8,
    reviews: 401,
    eta: "35–45 min",
    fee: "18 DH",
    badges: ["Halal", "Healthy"],
    bannerHue: 260,
  },
];

const BADGE_COLORS: Record<string, string> = {
  Halal: "bg-[#FBD9C6] text-[#C8481A]",
  Healthy: "bg-[#D4F5E7] text-[#1A7A52]",
  Popular: "bg-[#FEF0CC] text-[#9A6B0A]",
  Bio: "bg-[#D4F5E7] text-[#1A7A52]",
  "Livraison offerte": "bg-[#E3F2FF] text-[#1565C0]",
};

const FOOTER_LINKS = {
  Atlaas: [
    { label: "Commander", href: "/restaurants" },
    { label: "Nos villes", href: "#" },
    { label: "Offres du jour", href: "#" },
    { label: "Application mobile", href: "#" },
  ],
  Restaurants: [
    { label: "Devenir partenaire", href: "#" },
    { label: "Espace partenaire", href: "#" },
    { label: "FAQ partenaires", href: "#" },
  ],
  Aide: [
    { label: "Centre d'aide", href: "#" },
    { label: "Conditions d'utilisation", href: "#" },
    { label: "Politique de confidentialité", href: "#" },
    { label: "Contact", href: "mailto:salam@atlaasgo.com" },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────
export default function Home() {
  const [activeFoodCategory, setActiveFoodCategory] = useState(0);
  const [activeMarketCategory, setActiveMarketCategory] = useState(0);

  return (
    <main className="flex flex-col bg-white overflow-x-hidden">
      <FloatingNavbar />
      <CityModal />

      {/* ══════════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[580px] flex flex-col justify-center overflow-hidden pt-20"
        style={{ background: "linear-gradient(135deg, #E55A26 0%, #C8481A 100%)" }}
      >
        <ZelligeBg opacity={0.08} color="white" />

        <div
          className="relative z-10 mx-auto w-full px-6"
          style={{ maxWidth: 1200 }}
        >
          <div
            className="grid items-center"
            style={{ gridTemplateColumns: "1.1fr 1fr", gap: 56 }}
          >
            {/* Left: copy */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-6 py-16"
            >
              <motion.h1
                variants={staggerItem}
                className="text-5xl font-extrabold text-white leading-[1.08] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Commandez ce que vous aimez, livré en 30 min.
              </motion.h1>

              <motion.p
                variants={staggerItem}
                className="text-white/75 text-lg leading-relaxed max-w-md"
              >
                Des restaurants locaux aux épiceries — livraison rapide, prix fixe, paiement à la livraison.
              </motion.p>

              <motion.div
                variants={staggerItem}
                className="flex flex-wrap gap-3"
              >
                <AtlasButton variant="primary" className="!bg-white !text-brand hover:!bg-cream">
                  Commander maintenant
                </AtlasButton>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full font-bold text-sm px-6 py-3 border-[1.5px] border-white/70 text-white hover:bg-white/10 transition-all duration-200"
                >
                  Devenir coursier
                </button>
              </motion.div>

              {/* Stats row */}
              <motion.div
                variants={staggerItem}
                className="flex flex-wrap items-center gap-6 pt-2"
              >
                {[
                  { val: "1 284", label: "commandes aujourd'hui" },
                  { val: "23 min", label: "temps moyen" },
                  { val: "320+", label: "restaurants" },
                ].map(({ val, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-xl tabular-nums">{val}</span>
                    <span className="text-white/60 text-sm">{label}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: food cards placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, ease, delay: 0.2 }}
              className="relative py-16 flex items-center justify-center"
            >
              <div className="relative w-full max-w-sm h-72">
                {/* Floating card 1 */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-4 w-44 h-36 rounded-2xl shadow-2xl"
                  style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.4)" }}
                >
                  <div className="w-full h-20 rounded-t-2xl" style={{ background: "linear-gradient(135deg, #F2B53A, #E55A26)" }} />
                  <div className="px-3 py-2">
                    <p className="text-white text-xs font-bold">Tagine Beldi</p>
                    <p className="text-white/70 text-[10px]">Dar Naji · 25 DH</p>
                  </div>
                </motion.div>
                {/* Floating card 2 */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                  className="absolute top-16 right-0 w-44 h-36 rounded-2xl shadow-2xl"
                  style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.4)" }}
                >
                  <div className="w-full h-20 rounded-t-2xl" style={{ background: "linear-gradient(135deg, #2EC089, #1B2440)" }} />
                  <div className="px-3 py-2">
                    <p className="text-white text-xs font-bold">Couscous Royal</p>
                    <p className="text-white/70 text-[10px]">Café Clock · 55 DH</p>
                  </div>
                </motion.div>
                {/* Floating card 3 */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
                  className="absolute bottom-0 left-16 w-44 h-36 rounded-2xl shadow-2xl"
                  style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.4)" }}
                >
                  <div className="w-full h-20 rounded-t-2xl" style={{ background: "linear-gradient(135deg, #D9486F, #F2B53A)" }} />
                  <div className="px-3 py-2">
                    <p className="text-white text-xs font-bold">Jus d'Avocat</p>
                    <p className="text-white/70 text-[10px]">Atay & Co · 18 DH</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. CATEGORY CAROUSEL
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-cream-2">
        <div className="mx-auto px-6" style={{ maxWidth: 1200 }}>
          <motion.div {...fadeUp()} className="mb-8">
            <h2
              className="text-3xl font-extrabold text-navy tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Qu'est-ce qui te fait envie ?
            </h2>
            <p className="text-navy-soft text-base mt-1">
              Explore par catégorie, commande en quelques taps.
            </p>
          </motion.div>

          {/* Food categories */}
          <motion.div {...fadeUp(0.1)} className="mb-6">
            <p className="text-xs font-bold text-navy-soft uppercase tracking-widest mb-3">
              🍽 À manger
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {FOOD_CATEGORIES.map((cat, i) => (
                <CategoryPill
                  key={cat.label}
                  icon={cat.icon}
                  label={cat.label}
                  active={activeFoodCategory === i}
                  onClick={() => setActiveFoodCategory(i)}
                />
              ))}
            </div>
          </motion.div>

          {/* Market categories */}
          <motion.div {...fadeUp(0.15)}>
            <p className="text-xs font-bold text-navy-soft uppercase tracking-widest mb-3">
              🛒 Marché
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {MARKET_CATEGORIES.map((cat, i) => (
                <CategoryPill
                  key={cat.label}
                  icon={cat.icon}
                  label={cat.label}
                  active={activeMarketCategory === i}
                  onClick={() => setActiveMarketCategory(i)}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. DEALS
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="mx-auto px-6" style={{ maxWidth: 1200 }}>
          <motion.div {...fadeUp()} className="mb-8">
            <h2
              className="text-3xl font-extrabold text-navy tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Les bons plans du jour
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            {DEALS.map((deal) => (
              <motion.div
                key={deal.title}
                variants={staggerItem}
                whileHover={{ y: -4, scale: 1.02 }}
                className="rounded-3xl p-7 cursor-pointer relative overflow-hidden"
                style={{ background: deal.bg }}
              >
                <ZelligeBg opacity={0.1} color="white" />
                <div className="relative z-10">
                  <p className="text-white/70 text-sm font-medium mb-1">{deal.discount}</p>
                  <p className="text-white text-3xl font-extrabold leading-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
                    {deal.title}
                  </p>
                  <p className="text-white/65 text-xs">{deal.condition}</p>
                  <button className="mt-4 inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition">
                    Profiter <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. RESTAURANT GRID
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-cream-2">
        <div className="mx-auto px-6" style={{ maxWidth: 1200 }}>
          <motion.div {...fadeUp()} className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="text-3xl font-extrabold text-navy tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Populaires autour de toi
              </h2>
              <p className="text-navy-soft text-base mt-1">Les restaurants les plus commandés cette semaine.</p>
            </div>
            <button className="hidden sm:inline-flex items-center gap-1 text-brand font-bold text-sm hover:text-brand-dark transition">
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {RESTAURANTS.map((r) => (
              <motion.div
                key={r.name}
                variants={staggerItem}
                whileHover={{ y: -4, boxShadow: "0 20px 48px rgba(27,36,64,0.14)" }}
                className="bg-white rounded-3xl overflow-hidden cursor-pointer border"
                style={{ borderColor: "rgba(27,36,64,0.08)" }}
              >
                {/* Banner */}
                <div
                  className="h-32 relative"
                  style={{
                    background: `linear-gradient(135deg, hsl(${r.bannerHue}, 60%, 55%) 0%, hsl(${r.bannerHue + 20}, 55%, 40%) 100%)`,
                  }}
                >
                  <div className="absolute top-3 right-3 flex gap-1.5 flex-wrap justify-end">
                    {r.badges.map((badge) => (
                      <span
                        key={badge}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${BADGE_COLORS[badge] ?? "bg-white/20 text-white"}`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-extrabold text-navy text-base">{r.name}</h3>
                    <div className="flex items-center gap-1 text-saffron">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold text-navy">{r.rating}</span>
                      <span className="text-xs text-navy-soft">({r.reviews})</span>
                    </div>
                  </div>
                  <p className="text-navy-soft text-xs mb-3">{r.tagline}</p>

                  <div className="flex items-center gap-4 text-navy-soft text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {r.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.eta}
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {r.fee}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. MADE IN MOROCCO
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-cream-2 border-t" style={{ borderColor: "rgba(27,36,64,0.08)" }}>
        <div className="mx-auto px-6" style={{ maxWidth: 1200 }}>
          <div
            className="grid items-center gap-14"
            style={{ gridTemplateColumns: "1.1fr 1fr" }}
          >
            {/* Left */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="flex flex-col gap-6"
            >
              <motion.div variants={staggerItem}>
                <span className="inline-flex items-center gap-2 bg-brand-tint text-brand text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
                  🇲🇦 MADE IN MOROCCO · BY MOROCCANS
                </span>
              </motion.div>

              <motion.h2
                variants={staggerItem}
                className="text-4xl font-extrabold text-navy leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Une plateforme marocaine,{" "}
                <span className="text-brand">pensée pour le Maroc.</span>
              </motion.h2>

              <motion.p variants={staggerItem} className="text-navy-soft text-lg leading-relaxed">
                Atlaas Go a été conçu à partir de zéro au Maroc, pour les Marocains. Nous comprenons les habitudes locales, les attentes des clients, et les besoins des restaurateurs de chez nous.
              </motion.p>

              {/* Stats */}
              <motion.div
                variants={staggerItem}
                className="grid grid-cols-2 gap-4 pt-2"
              >
                {[
                  { val: "100%", label: "Capital marocain" },
                  { val: "320+", label: "Restaurants partenaires" },
                  { val: "187", label: "Coursiers actifs" },
                  { val: "8", label: "Villes couvertes" },
                ].map(({ val, label }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl px-5 py-4 border"
                    style={{ borderColor: "rgba(27,36,64,0.08)" }}
                  >
                    <p
                      className="text-2xl font-extrabold text-navy tabular-nums"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {val}
                    </p>
                    <p className="text-navy-soft text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: collage + quote */}
            <motion.div {...fadeUp(0.15)} className="relative">
              <div className="relative h-80 flex items-center justify-center">
                {/* Decorative cards */}
                <div
                  className="absolute top-4 left-0 w-36 h-28 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #E55A26, #F2B53A)", transform: "rotate(-4deg)", boxShadow: "0 8px 24px rgba(229,90,38,0.25)" }}
                />
                <div
                  className="absolute top-0 right-8 w-28 h-24 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #2EC089, #1B2440)", transform: "rotate(3deg)", boxShadow: "0 8px 24px rgba(46,192,137,0.2)" }}
                />
                <div
                  className="absolute bottom-8 left-12 w-32 h-24 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #D9486F, #1B2440)", transform: "rotate(2deg)", boxShadow: "0 8px 24px rgba(217,72,111,0.2)" }}
                />
                <div
                  className="absolute bottom-4 right-4 w-28 h-20 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #F2B53A, #2EC089)", transform: "rotate(-2deg)", boxShadow: "0 8px 24px rgba(242,181,58,0.2)" }}
                />

                {/* Quote card */}
                <div
                  className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 max-w-xs"
                  style={{ border: "1px solid rgba(27,36,64,0.08)" }}
                >
                  <p className="text-navy font-bold text-base mb-2" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                    &ldquo;Mzyan f Atlaas, koulchi b Darija&rdquo;
                  </p>
                  <p className="text-navy-soft text-sm">— Hicham, coursier à Casa</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. JOIN US
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-cream">
        <div className="mx-auto px-6" style={{ maxWidth: 1200 }}>
          <motion.div {...fadeUp()} className="text-center mb-12">
            <p className="text-xs font-bold text-brand uppercase tracking-widest mb-2">Rejoignez-nous</p>
            <h2
              className="text-4xl font-extrabold text-navy tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Atlaas Go, c'est aussi vous.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Restaurant card */}
            <motion.div
              {...fadeUp(0.05)}
              className="bg-white rounded-3xl p-8 border flex flex-col gap-6"
              style={{ borderColor: "rgba(27,36,64,0.08)" }}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-2xl">
                🍽️
              </div>
              <div>
                <h3
                  className="text-2xl font-extrabold text-navy mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Vous êtes un restaurant ?
                </h3>
                <p className="text-navy-soft leading-relaxed">
                  Rejoignez la plus grande plateforme de livraison locale au Maroc et touchez des milliers de nouveaux clients chaque semaine.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  "Commission à partir de 15%",
                  "Tablette + formation offertes",
                  "Paiement sous 7 jours",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-navy text-sm font-medium">
                    <span className="w-5 h-5 rounded-full bg-mint/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-mint" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 mt-auto">
                <AtlasButton variant="dark">Devenir partenaire</AtlasButton>
                <AtlasButton variant="ghost">Parler à un manager</AtlasButton>
              </div>
            </motion.div>

            {/* Driver card */}
            <motion.div
              {...fadeUp(0.1)}
              className="relative rounded-3xl p-8 overflow-hidden flex flex-col gap-6"
              style={{ background: "#1B2440" }}
            >
              <ZelligeBg opacity={0.06} color="white" />
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Bike className="w-7 h-7 text-white" />
              </div>
              <div className="relative z-10">
                <h3
                  className="text-2xl font-extrabold text-white mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Devenez coursier Atlaas
                </h3>
                <p className="text-white/65 leading-relaxed">
                  Travaillez à votre rythme, gagnez bien. Rejoignez nos 187 coursiers actifs dans 8 villes.
                </p>
              </div>
              <ul className="relative z-10 flex flex-col gap-3">
                {[
                  "Jusqu'à 4 500 DH / semaine",
                  "Bonus heures de pointe",
                  "Assurance accident incluse",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white text-sm font-medium">
                    <span className="w-5 h-5 rounded-full bg-mint/25 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-mint" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* Earnings preview */}
              <div
                className="relative z-10 bg-white/10 rounded-2xl p-4 border border-white/15"
              >
                <p className="text-white/50 text-xs mb-1">Gains cette semaine</p>
                <p className="text-white text-3xl font-extrabold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                  2 184 DH
                </p>
                <p className="text-white/50 text-xs mt-0.5">76 courses · 32h</p>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-4/5 rounded-full bg-mint" />
                </div>
              </div>

              <div className="relative z-10 flex gap-3 mt-auto">
                <AtlasButton variant="primary">Postuler coursier</AtlasButton>
                <button className="inline-flex items-center justify-center gap-2 rounded-full font-bold text-sm px-5 py-3 border-[1.5px] border-white/30 text-white hover:bg-white/10 transition-all duration-200">
                  Comment ça marche
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. SUPPORT / CONTACT
      ══════════════════════════════════════════════════════════ */}
      <section
        className="py-20 bg-cream-2 border-t"
        style={{ borderColor: "rgba(27,36,64,0.08)" }}
      >
        <div className="mx-auto px-6" style={{ maxWidth: 1200 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            {/* Left */}
            <motion.div {...fadeUp()} className="flex flex-col gap-4">
              <p className="text-xs font-bold text-brand uppercase tracking-widest">Support · 7j/7</p>
              <h2
                className="text-4xl font-extrabold text-navy leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                On est là si t'as besoin.
              </h2>
              <p className="text-navy-soft text-lg leading-relaxed max-w-sm">
                Une question sur ta commande, un problème avec un paiement, ou juste un retour ? Notre équipe répond 7j/7, en darija ou en français.
              </p>
            </motion.div>

            {/* Right: contact cards */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="flex flex-col gap-4"
            >
              {/* 2x2 email grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Général", email: "salam@atlaasgo.com" },
                  { label: "Support", email: "support@atlaasgo.com" },
                  { label: "Coursiers", email: "coursiers@atlaasgo.com" },
                  { label: "Partenaires", email: "partenaires@atlaasgo.com" },
                ].map(({ label, email }) => (
                  <motion.a
                    key={email}
                    variants={staggerItem}
                    href={`mailto:${email}`}
                    className="bg-white rounded-2xl px-4 py-3.5 border hover:border-brand transition group"
                    style={{ borderColor: "rgba(27,36,64,0.08)" }}
                  >
                    <p className="text-[10px] font-bold text-navy-soft uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-navy text-xs font-semibold group-hover:text-brand transition truncate">{email}</p>
                  </motion.a>
                ))}
              </div>

              {/* Hotline banner */}
              <motion.div
                variants={staggerItem}
                className="relative rounded-2xl p-5 overflow-hidden flex items-center gap-4"
                style={{ background: "#1B2440" }}
              >
                <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center shrink-0 text-lg">
                  📞
                </div>
                <div className="flex-1">
                  <p className="text-white/50 text-xs mb-0.5">Hotline gratuite</p>
                  <p className="text-white font-extrabold text-lg tabular-nums">+212 8 02 00 99 99</p>
                </div>
                <button className="inline-flex items-center gap-2 bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition shrink-0">
                  <Phone className="w-3.5 h-3.5" /> Appeler
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#1B2440" }}>
        <div
          className="mx-auto px-6 py-16 grid gap-10"
          style={{
            maxWidth: 1200,
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          }}
        >
          {/* Brand col */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <AtlasLogo size={36} color="#E55A26" />
              <AtlasWordmark size={18} color="#ffffff" />
            </div>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              La plateforme de livraison locale 100% marocaine. Rapide, prix fixe, paiement à la livraison.
            </p>
            <div className="flex gap-2.5">
              {["𝕏", "IG", "FB"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-brand flex items-center justify-center text-white/50 hover:text-white text-xs font-bold transition"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="flex flex-col gap-3">
              <p className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
              {links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-white/55 hover:text-white text-sm transition w-fit"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2"
            style={{ maxWidth: 1200 }}
          >
            <p className="text-white/30 text-xs">
              © 2026 Atlaas Go · Made with ❤️ au Maroc
            </p>
            <p className="text-white/20 text-xs">v2.4.1</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
