"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star, Clock, Plus, Minus, X, ChevronLeft, Truck,
  ShoppingBag, Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Sprite } from "@/components/atlas";
import { useCart } from "@/contexts/CartContext";
import toast from "react-hot-toast";

// ─── Prototype restaurant + dish data ────────────────────────────────────────

const RESTAURANTS: Record<string, {
  id: string; name: string; tagline: string; city: string;
  rating: number; reviews: number; eta: string; fee: string;
  badges: string[]; tileHue: number; img: string; description: string;
  dishes: string[];
  estimatedDeliveryMins: number;
  deliveryFee: number;
  cuisine: string;
}> = {
  darnaji:     { id: "darnaji",     name: "Dar Naji",       tagline: "Cuisine marocaine traditionnelle", city: "Rabat · Médina",      rating: 4.8, reviews: 2340, eta: "20–30 min", fee: "12 DH", badges: ["Top-rated", "Halal"],   tileHue: 18,  img: "rest:darnaji",     description: "Découvrez la cuisine marocaine authentique.", dishes: ["tagine-poulet", "couscous-royal", "pastilla", "harira", "briouates", "atay"], estimatedDeliveryMins: 25, deliveryFee: 12, cuisine: "Marocaine" },
  cafeclock:   { id: "cafeclock",   name: "Café Clock",     tagline: "Camel burger & comfort food",      city: "Fès · Médina",         rating: 4.7, reviews: 1820, eta: "25–35 min", fee: "15 DH", badges: ["Beldi"],              tileHue: 38,  img: "rest:cafeclock",   description: "Le légendaire Café Clock.", dishes: ["camel-burger", "msemen", "atay", "jus-orange"], estimatedDeliveryMins: 30, deliveryFee: 15, cuisine: "Fusion" },
  snacktanjia: { id: "snacktanjia", name: "Snack Tanjia",   tagline: "Spécialités marrakchies",          city: "Marrakech · Jemâa",   rating: 4.9, reviews: 5210, eta: "15–25 min", fee: "9 DH",  badges: ["Bestseller"],         tileHue: 6,   img: "rest:snacktanjia", description: "La tanjia emblématique.", dishes: ["tanjia", "harira", "chebakia", "atay"], estimatedDeliveryMins: 20, deliveryFee: 9, cuisine: "Marocaine" },
  atayco:      { id: "atayco",      name: "Atay & Co",      tagline: "Thé à la menthe & sucreries",     city: "Casablanca · Maârif", rating: 4.6, reviews: 980,  eta: "10–15 min", fee: "7 DH",  badges: ["Free delivery"],      tileHue: 150, img: "rest:atayco",      description: "L'art du thé marocain.", dishes: ["atay", "chebakia", "msemen", "jus-orange"], estimatedDeliveryMins: 12, deliveryFee: 7, cuisine: "Pâtisserie" },
  riadmogador: { id: "riadmogador", name: "Riad Mogador",   tagline: "Fine dining marocain",             city: "Essaouira · Port",     rating: 4.8, reviews: 1240, eta: "30–40 min", fee: "18 DH", badges: ["Premium"],            tileHue: 200, img: "rest:riadmogador", description: "Gastronomie haut de gamme.", dishes: ["pastilla", "tagine-kefta", "briouates", "atay"], estimatedDeliveryMins: 35, deliveryFee: 18, cuisine: "Gastronomie" },
  baladi:      { id: "baladi",      name: "Baladi Healthy", tagline: "Bowls & jus pressés",              city: "Casablanca · Anfa",   rating: 4.5, reviews: 612,  eta: "20–25 min", fee: "10 DH", badges: ["Healthy"],            tileHue: 130, img: "rest:baladi",      description: "Cuisine saine marocaine.", dishes: ["bowl-baladi", "jus-orange", "harira", "msemen"], estimatedDeliveryMins: 22, deliveryFee: 10, cuisine: "Healthy" },
};

const DISHES: Record<string, {
  name: string; sub: string; price: number; hue: number; img: string; category: string;
}> = {
  "tagine-poulet":  { name: "Tagine Poulet Citron",    sub: "Olives Beldi · oignons confits",     price: 68,  hue: 38,  img: "dish:tagine-poulet",  category: "Tagines" },
  "couscous-royal": { name: "Couscous Royal",           sub: "Agneau, poulet, merguez",            price: 95,  hue: 24,  img: "dish:couscous-royal", category: "Couscous" },
  "pastilla":       { name: "Pastilla au Poulet",       sub: "Amandes, cannelle, ouarka",          price: 75,  hue: 18,  img: "dish:pastilla",       category: "Entrées" },
  "harira":         { name: "Harira Traditionnelle",    sub: "Avec dattes & chebakia",             price: 28,  hue: 6,   img: "dish:harira",         category: "Soupes" },
  "camel-burger":   { name: "Camel Burger",             sub: "Avec frites maison",                 price: 110, hue: 38,  img: "dish:camel-burger",   category: "Burgers" },
  "msemen":         { name: "Msemen au Miel",           sub: "3 pièces · miel & beurre",           price: 22,  hue: 50,  img: "dish:msemen",         category: "Petits-déjeuners" },
  "atay":           { name: "Atay à la Menthe",         sub: "Théière de 4 verres",                price: 18,  hue: 150, img: "dish:atay",           category: "Boissons" },
  "tanjia":         { name: "Tanjia Marrakchia",        sub: "Cuite au four traditionnel",         price: 88,  hue: 18,  img: "dish:tanjia",         category: "Spécialités" },
  "tagine-kefta":   { name: "Tagine Kefta & Œuf",       sub: "Sauce tomate épicée",                price: 58,  hue: 6,   img: "dish:tagine-kefta",   category: "Tagines" },
  "briouates":      { name: "Briouates Crevettes",      sub: "6 pièces croustillantes",            price: 45,  hue: 38,  img: "dish:briouates",      category: "Entrées" },
  "chebakia":       { name: "Chebakia au Miel",         sub: "Pâtisserie marocaine · 250g",        price: 35,  hue: 340, img: "dish:chebakia",       category: "Pâtisseries" },
  "bowl-baladi":    { name: "Bowl Baladi",              sub: "Quinoa, avocat, grenade",            price: 72,  hue: 130, img: "dish:bowl-baladi",    category: "Bowls" },
  "jus-orange":     { name: "Jus d'Orange Frais",       sub: "Pressé minute",                      price: 16,  hue: 50,  img: "dish:jus-orange",     category: "Boissons" },
};

// ─── Local cart (no Firestore required for browsing) ─────────────────────────

interface LocalCartItem { dishKey: string; qty: number }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const r = RESTAURANTS[id as string];

  // ── Local cart state ──────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<LocalCartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addedKey, setAddedKey]    = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isFavorited, setIsFavorited]     = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeCuisine, setActiveCuisine]   = useState<string>("Tous");

  // ── Refs for scroll-spy ───────────────────────────────────────────────────
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── CartContext (used at checkout) ────────────────────────────────────────
  const { addItem } = useCart();

  // ── Redirect if restaurant not found ─────────────────────────────────────
  useEffect(() => {
    if (!r) router.replace("/restaurants");
  }, [r, router]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = useCallback((dishKey: string) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.dishKey === dishKey);
      if (idx >= 0) return prev.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { dishKey, qty: 1 }];
    });
    setAddedKey(dishKey);
    setTimeout(() => setAddedKey(null), 800);
    const dish = DISHES[dishKey];
    if (dish) toast.success(`${dish.name} ajouté`, { icon: "✅", duration: 1400 });
  }, []);

  const updateQty = useCallback((dishKey: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((i) => i.dishKey === dishKey ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  }, []);

  const subtotal    = cartItems.reduce((s, i) => s + (DISHES[i.dishKey]?.price ?? 0) * i.qty, 0);
  const itemCount   = cartItems.reduce((s, i) => s + i.qty, 0);
  const deliveryFee = parseInt(r?.fee ?? "12") || 12;
  const total       = subtotal + deliveryFee;

  // ── Checkout — push to Firestore CartContext then navigate ────────────────
  const handleCheckout = async () => {
    if (!r || cartItems.length === 0) return;
    try {
      for (const item of cartItems) {
        const dish = DISHES[item.dishKey];
        if (!dish) continue;
        for (let i = 0; i < item.qty; i++) {
          await addItem(r.id, r.name, { itemId: item.dishKey, name: dish.name, price: dish.price });
        }
      }
    } catch {
      // Not signed in — checkout page will handle auth
    }
    router.push("/checkout");
  };

  // ── Favorite toggle ───────────────────────────────────────────────────────
  const handleFavoriteToggle = () => {
    setIsFavorited((prev) => !prev);
    toast.success(isFavorited ? "Retiré des favoris" : "Ajouté aux favoris", { duration: 1200 });
  };

  // ── Category scroll ───────────────────────────────────────────────────────
  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!r) return null;

  // ── Build category sections from this restaurant's dishes ─────────────────
  const categoryOrder = ["Populaires", "Tagines", "Couscous", "Spécialités", "Entrées", "Soupes", "Bowls", "Petits-déjeuners", "Pâtisseries", "Boissons", "Burgers"];

  // Unique categories present in this restaurant
  const popularDishKeys = r.dishes.slice(0, 4);
  const sections: { id: string; name: string; dishKeys: string[] }[] = [];

  // Always add "Populaires" first if there are dishes
  if (r.dishes.length > 0) {
    sections.push({ id: "Populaires", name: "Populaires", dishKeys: popularDishKeys });
  }

  // Then group remaining dishes by category
  const byCategory: Record<string, string[]> = {};
  for (const dishKey of r.dishes) {
    const cat = DISHES[dishKey]?.category ?? "Autres";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(dishKey);
  }
  for (const cat of categoryOrder) {
    if (byCategory[cat] && byCategory[cat].length > 0) {
      sections.push({ id: cat, name: cat, dishKeys: byCategory[cat] });
    }
  }
  // Any leftover categories not in categoryOrder
  for (const [cat, keys] of Object.entries(byCategory)) {
    if (!categoryOrder.includes(cat) && keys.length > 0) {
      sections.push({ id: cat, name: cat, dishKeys: keys });
    }
  }

  // Initialize activeCategory on first render
  const firstCategoryId = sections[0]?.id ?? "";

  // ── Cuisine filter chips (unique cuisines across all restaurants for discovery) ──
  const cuisineOptions = ["Tous", ...Array.from(new Set(Object.values(RESTAURANTS).map((rest) => rest.cuisine)))];

  // ── Filtered dishes (within this restaurant) ─────────────────────────────
  // When a cuisine filter is active, hide dishes whose restaurant doesn't match
  // (for a single-restaurant page this means showing all or none — so we keep all dishes
  //  and filter sections by whether the restaurant cuisine matches)
  const restaurantMatchesCuisine = activeCuisine === "Tous" || r.cuisine === activeCuisine;
  const visibleSections = restaurantMatchesCuisine ? sections : [];

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <FloatingNavbar />

      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-24">

        {/* ── Back link ── */}
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7A9E] mb-4 hover:text-[#1B2440] transition"
        >
          <ChevronLeft className="w-4 h-4" /> Restaurants
        </Link>

        {/* ── Hero image with restaurant info overlay ── */}
        <div className="relative h-[220px] bg-[#1B2440] rounded-2xl overflow-hidden mb-6">
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {/* Gradient overlay + info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#1B2440] to-transparent">
            <h1
              className="text-2xl font-extrabold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {r.name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-white/70 flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#F0A500] text-[#F0A500]" />
                {r.rating}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {r.estimatedDeliveryMins} min
              </span>
              <span>·</span>
              <span>{r.deliveryFee} DH livraison</span>
              <span>·</span>
              <span className="text-white/50">{r.city}</span>
            </div>
            {/* Badges */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {r.badges.map((b) => (
                <span
                  key={b}
                  className="text-[10px] font-bold uppercase tracking-wider bg-[#E55A26]/80 text-white px-2.5 py-0.5 rounded-full"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavoriteToggle}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white transition"
          >
            <Heart
              className={`w-5 h-5 transition ${
                isFavorited ? "fill-[#E55A26] text-[#E55A26]" : "text-[#1B2440]"
              }`}
            />
          </button>
        </div>

        {/* ── Cuisine filter chips ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {cuisineOptions.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setActiveCuisine(cuisine)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeCuisine === cuisine
                  ? "bg-[#E55A26] text-white"
                  : "bg-white text-[#6B7A9E] shadow-[0_2px_10px_rgba(27,36,64,0.06)] hover:text-[#1B2440]"
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>

        {/* ── Sticky category nav ── */}
        <div className="sticky top-0 z-30 bg-[#F5F0E8] py-3 -mx-6 px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToCategory(sec.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer ${
                  (activeCategory || firstCategoryId) === sec.id
                    ? "bg-[#1B2440] text-white"
                    : "bg-white text-[#1B2440] shadow-[0_2px_10px_rgba(27,36,64,0.06)] hover:shadow-md"
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Two-column layout: menu + desktop sidebar cart ── */}
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">

          {/* ── Menu sections ── */}
          <div>
            {visibleSections.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-[#6B7A9E] shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
                Aucun plat disponible pour cette catégorie.
              </div>
            )}

            {visibleSections.map((sec) => (
              <div
                key={sec.id}
                id={`sec-${sec.id}`}
                ref={(el) => { categoryRefs.current[sec.id] = el; }}
                className="mb-8 scroll-mt-20"
              >
                <h2
                  className="text-lg font-extrabold text-[#1B2440] mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {sec.name}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sec.dishKeys.map((dishKey) => {
                    const dish = DISHES[dishKey];
                    if (!dish) return null;
                    const inCart  = cartItems.find((i) => i.dishKey === dishKey);
                    const justAdded = addedKey === dishKey;

                    return (
                      <div
                        key={dishKey}
                        className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex gap-3 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        {/* Dish image */}
                        <div className="w-20 h-20 rounded-xl bg-[#F5F0E8] shrink-0 overflow-hidden">
                          <Sprite id={dish.img} width={80} height={80} radius={12} />
                        </div>

                        {/* Dish info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-[#1B2440] text-sm truncate">{dish.name}</p>
                          <p className="text-[11px] text-[#6B7A9E] mt-0.5 line-clamp-2">{dish.sub}</p>

                          <div className="flex items-center justify-between mt-2">
                            <p className="font-extrabold text-[#E55A26] text-sm">{dish.price} DH</p>

                            {/* Add / qty controls */}
                            <AnimatePresence mode="wait">
                              {inCart ? (
                                <motion.div
                                  key="counter"
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  className="flex items-center bg-[#F5F0E8] rounded-xl overflow-hidden"
                                >
                                  <button
                                    onClick={() => updateQty(dishKey, -1)}
                                    className="w-7 h-7 flex items-center justify-center cursor-pointer"
                                  >
                                    {inCart.qty === 1
                                      ? <X className="w-3 h-3 text-[#E55A26]" />
                                      : <Minus className="w-3 h-3 text-[#E55A26]" />
                                    }
                                  </button>
                                  <span className="w-5 text-center text-xs font-extrabold text-[#1B2440]">
                                    {inCart.qty}
                                  </span>
                                  <button
                                    onClick={() => addToCart(dishKey)}
                                    className="w-7 h-7 flex items-center justify-center cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-[#E55A26]" />
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.button
                                  key="add"
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: justAdded ? 1.15 : 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  onClick={() => addToCart(dishKey)}
                                  className="w-8 h-8 rounded-xl bg-[#E55A26] flex items-center justify-center cursor-pointer hover:bg-[#C94D20] transition"
                                >
                                  <Plus className="w-4 h-4 text-white" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop sidebar cart ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-4 bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
              <p className="font-extrabold text-[#1B2440] text-sm mb-3">
                Votre panier ({itemCount})
              </p>

              {cartItems.length === 0 ? (
                <p className="text-[#6B7A9E] text-xs text-center py-4">
                  Votre panier est vide
                </p>
              ) : (
                <>
                  {cartItems.map(({ dishKey, qty }) => {
                    const dish = DISHES[dishKey];
                    if (!dish) return null;
                    return (
                      <div
                        key={dishKey}
                        className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1B2440] font-medium truncate">{dish.name}</p>
                          <p className="text-xs text-[#6B7A9E]">x{qty}</p>
                        </div>
                        <p className="text-sm font-bold text-[#1B2440] ml-2 shrink-0">
                          {dish.price * qty} DH
                        </p>
                      </div>
                    );
                  })}

                  {/* Delivery row */}
                  <div className="flex items-center justify-between py-2 text-xs text-[#6B7A9E]">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Livraison
                    </span>
                    <span>{deliveryFee} DH</span>
                  </div>

                  <div className="border-t border-[#F5F0E8] pt-3 mt-1 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#1B2440]">Total</p>
                    <p
                      className="text-lg font-extrabold text-[#E55A26]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {total} DH
                    </p>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="block w-full py-3 bg-[#E55A26] hover:bg-[#C94D20] text-white rounded-xl font-bold text-sm text-center transition mt-3 cursor-pointer"
                  >
                    Commander
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Cart slide-in drawer (mobile / tablet) ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-[#1B2440]/40 backdrop-blur-sm z-60"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[440px] max-w-full bg-[#F5F0E8] flex flex-col z-[61] shadow-[-20px_0_60px_rgba(0,0,0,0.18)]"
            >
              {/* Drawer header */}
              <div className="p-5 flex justify-between items-center border-b border-[#1B2440]/[0.08] bg-white">
                <div>
                  <div
                    className="font-extrabold text-[#1B2440] text-xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Ton panier
                  </div>
                  <div className="text-xs text-[#6B7A9E]">Chez {r.name} · {r.eta}</div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#F5F0E8] border-none flex items-center justify-center cursor-pointer hover:bg-[#EDE8DC] transition"
                >
                  <X className="w-4 h-4 text-[#1B2440]" />
                </button>
              </div>

              {/* Drawer items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {cartItems.length === 0 && (
                  <div className="bg-white rounded-2xl p-6 text-center text-[#6B7A9E] text-sm">
                    Panier vide.
                  </div>
                )}
                {cartItems.map(({ dishKey, qty }) => {
                  const dish = DISHES[dishKey];
                  if (!dish) return null;
                  return (
                    <div
                      key={dishKey}
                      className="bg-white rounded-2xl p-3 flex gap-3 items-center"
                    >
                      <Sprite id={dish.img} width={56} height={56} radius={12} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1B2440] text-sm truncate">{dish.name}</p>
                        <p className="text-xs text-[#6B7A9E]">{dish.price} DH</p>
                      </div>
                      <div className="flex items-center bg-[#F5F0E8] rounded-full">
                        <button
                          onClick={() => updateQty(dishKey, -1)}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer"
                        >
                          {qty === 1 ? <X className="w-3 h-3 text-[#1B2440]" /> : <Minus className="w-3 h-3 text-[#1B2440]" />}
                        </button>
                        <span className="w-5 text-center font-extrabold text-[#1B2440] text-sm">{qty}</span>
                        <button
                          onClick={() => addToCart(dishKey)}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-[#1B2440]" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {cartItems.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 mt-2 space-y-1.5">
                    {[
                      { label: "Sous-total", value: `${subtotal} DH`, accent: false },
                      { label: "Livraison",  value: `${deliveryFee} DH`, accent: false },
                      { label: "Code BSSLAMA10", value: "−10 DH", accent: true },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className={accent ? "text-[#2DC08A]" : "text-[#6B7A9E]"}>{label}</span>
                        <span className={accent ? "text-[#2DC08A] font-bold" : "text-[#1B2440]"}>{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-extrabold text-[#1B2440] text-base pt-2 border-t border-[#F5F0E8]">
                      <span>Total</span>
                      <span>{total - 10} DH</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer checkout button */}
              {cartItems.length > 0 && (
                <div className="p-5 bg-white border-t border-[#1B2440]/[0.08]">
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-[#E55A26] hover:bg-[#C94D20] text-white rounded-full py-4 font-extrabold text-base flex items-center justify-between px-5 transition cursor-pointer shadow-[0_8px_20px_rgba(229,90,38,0.35)]"
                  >
                    <span className="bg-white/20 rounded-full px-3 py-0.5 text-sm">{itemCount}</span>
                    <span>Commander maintenant</span>
                    <span>{total - 10} DH</span>
                  </button>
                  <div className="flex items-center justify-center gap-1.5 mt-2.5 text-xs text-[#6B7A9E]">
                    <Truck className="w-3 h-3" /> Livraison estimée · {r.eta}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile floating cart trigger (when drawer is closed) ── */}
      {itemCount > 0 && !drawerOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 right-4 z-50 lg:hidden"
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-[#1B2440] text-white rounded-full px-4 py-2.5 shadow-xl cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-[#E55A26] flex items-center justify-center text-xs font-extrabold">
              {itemCount}
            </span>
            <span className="text-sm font-bold">Panier</span>
            <span className="text-sm font-extrabold text-[#E55A26]">{subtotal} DH</span>
          </button>
        </motion.div>
      )}

      {/* ── Mobile bottom sheet CTA ── */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F0E8] p-4 z-40 lg:hidden">
          <button
            onClick={handleCheckout}
            className="flex w-full items-center justify-between bg-[#E55A26] hover:bg-[#C94D20] text-white rounded-2xl px-5 py-3.5 font-bold text-sm transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Voir le panier ({itemCount})
            </span>
            <span>{total} DH</span>
          </button>
        </div>
      )}
    </div>
  );
}
