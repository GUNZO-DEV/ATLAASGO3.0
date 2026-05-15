"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Clock, Plus, Minus, X, ChevronLeft, Truck, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Sprite, ZelligeBg } from "@/components/atlas";
import { RestaurantSprite } from "@/components/atlas/RestaurantSprite";
import { useCart } from "@/contexts/CartContext";
import toast from "react-hot-toast";

// ─── Prototype restaurant + dish data ────────────────────────────────────────

const RESTAURANTS: Record<string, {
  id: string; name: string; tagline: string; city: string;
  rating: number; reviews: number; eta: string; fee: string;
  badges: string[]; tileHue: number; img: string; description: string;
  dishes: string[];
}> = {
  darnaji:     { id: "darnaji",     name: "Dar Naji",       tagline: "Cuisine marocaine traditionnelle", city: "Rabat · Médina",      rating: 4.8, reviews: 2340, eta: "20–30 min", fee: "12 DH", badges: ["Top-rated", "Halal"],   tileHue: 18,  img: "rest:darnaji",     description: "Découvrez la cuisine marocaine authentique préparée selon les recettes traditionnelles de nos grand-mères.", dishes: ["tagine-poulet", "couscous-royal", "pastilla", "harira", "briouates", "atay"] },
  cafeclock:   { id: "cafeclock",   name: "Café Clock",     tagline: "Camel burger & comfort food",      city: "Fès · Médina",         rating: 4.7, reviews: 1820, eta: "25–35 min", fee: "15 DH", badges: ["Beldi"],              tileHue: 38,  img: "rest:cafeclock",   description: "Le légendaire Café Clock vous propose son incontournable camel burger et cuisine de fusion marocaine.", dishes: ["camel-burger", "msemen", "atay", "jus-orange"] },
  snacktanjia: { id: "snacktanjia", name: "Snack Tanjia",   tagline: "Spécialités marrakchies",          city: "Marrakech · Jemâa",   rating: 4.9, reviews: 5210, eta: "15–25 min", fee: "9 DH",  badges: ["Bestseller"],         tileHue: 6,   img: "rest:snacktanjia", description: "La tanjia, spécialité emblématique de Marrakech, cuite lentement dans la cendre du hammam.", dishes: ["tanjia", "harira", "chebakia", "atay"] },
  atayco:      { id: "atayco",      name: "Atay & Co",      tagline: "Thé à la menthe & sucreries",     city: "Casablanca · Maârif", rating: 4.6, reviews: 980,  eta: "10–15 min", fee: "7 DH",  badges: ["Free delivery"],      tileHue: 150, img: "rest:atayco",      description: "L'art du thé à la menthe marocain dans toute sa splendeur, accompagné de chebakia et pâtisseries beldi.", dishes: ["atay", "chebakia", "msemen", "jus-orange"] },
  riadmogador: { id: "riadmogador", name: "Riad Mogador",   tagline: "Fine dining marocain",             city: "Essaouira · Port",     rating: 4.8, reviews: 1240, eta: "30–40 min", fee: "18 DH", badges: ["Premium"],            tileHue: 200, img: "rest:riadmogador", description: "Expérience gastronomique haut de gamme dans le cadre enchanteur d'Essaouira.", dishes: ["pastilla", "tagine-kefta", "briouates", "atay"] },
  baladi:      { id: "baladi",      name: "Baladi Healthy", tagline: "Bowls & jus pressés",              city: "Casablanca · Anfa",   rating: 4.5, reviews: 612,  eta: "20–25 min", fee: "10 DH", badges: ["Healthy"],            tileHue: 130, img: "rest:baladi",      description: "Cuisine saine inspirée des saveurs du terroir marocain. Bowls nutritifs, jus fraîchement pressés.", dishes: ["bowl-baladi", "jus-orange", "harira", "msemen"] },
};

const DISHES: Record<string, { name: string; sub: string; price: number; hue: number; img: string }> = {
  "tagine-poulet":  { name: "Tagine Poulet Citron",    sub: "Olives Beldi · oignons confits",     price: 68,  hue: 38,  img: "dish:tagine-poulet" },
  "couscous-royal": { name: "Couscous Royal",           sub: "Agneau, poulet, merguez",            price: 95,  hue: 24,  img: "dish:couscous-royal" },
  "pastilla":       { name: "Pastilla au Poulet",       sub: "Amandes, cannelle, ouarka",          price: 75,  hue: 18,  img: "dish:pastilla" },
  "harira":         { name: "Harira Traditionnelle",    sub: "Avec dattes & chebakia",             price: 28,  hue: 6,   img: "dish:harira" },
  "camel-burger":   { name: "Camel Burger",             sub: "Avec frites maison",                 price: 110, hue: 38,  img: "dish:camel-burger" },
  "msemen":         { name: "Msemen au Miel",           sub: "3 pièces · miel & beurre",           price: 22,  hue: 50,  img: "dish:msemen" },
  "atay":           { name: "Atay à la Menthe",         sub: "Théière de 4 verres",                price: 18,  hue: 150, img: "dish:atay" },
  "tanjia":         { name: "Tanjia Marrakchia",        sub: "Cuite au four traditionnel",         price: 88,  hue: 18,  img: "dish:tanjia" },
  "tagine-kefta":   { name: "Tagine Kefta & Œuf",       sub: "Sauce tomate épicée",                price: 58,  hue: 6,   img: "dish:tagine-kefta" },
  "briouates":      { name: "Briouates Crevettes",      sub: "6 pièces croustillantes",            price: 45,  hue: 38,  img: "dish:briouates" },
  "chebakia":       { name: "Chebakia au Miel",         sub: "Pâtisserie marocaine · 250g",        price: 35,  hue: 340, img: "dish:chebakia" },
  "bowl-baladi":    { name: "Bowl Baladi",              sub: "Quinoa, avocat, grenade",            price: 72,  hue: 130, img: "dish:bowl-baladi" },
  "jus-orange":     { name: "Jus d'Orange Frais",       sub: "Pressé minute",                      price: 16,  hue: 50,  img: "dish:jus-orange" },
};

// Local simple cart (no Firestore required for browsing)
interface LocalCartItem { dishKey: string; qty: number }

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const r = RESTAURANTS[id as string];

  const [cartItems, setCartItems] = useState<LocalCartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addedKey, setAddedKey]     = useState<string | null>(null);

  const { addItem } = useCart();

  useEffect(() => {
    if (!r) router.replace("/restaurants");
  }, [r, router]);

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
    setCartItems((prev) => {
      const updated = prev.map((i) => i.dishKey === dishKey ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0);
      return updated;
    });
  }, []);

  const subtotal   = cartItems.reduce((s, i) => s + (DISHES[i.dishKey]?.price ?? 0) * i.qty, 0);
  const itemCount  = cartItems.reduce((s, i) => s + i.qty, 0);
  const deliveryFee = parseInt(r?.fee ?? "12") || 12;
  const total       = subtotal + deliveryFee;

  const handleCheckout = async () => {
    // Push items to Firestore CartContext then navigate to checkout
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
      // Not signed in — still navigate, checkout will handle auth
    }
    router.push("/checkout");
  };

  if (!r) return null;

  const menuSections = [
    { title: "Populaires", dishes: r.dishes.slice(0, 4) },
    { title: "Tous les plats", dishes: r.dishes },
  ].filter((s, i, arr) => i === 0 || arr[0].dishes.length !== r.dishes.length);

  return (
    <div style={{ background: "#F6EEDC", minHeight: "100vh" }}>
      <FloatingNavbar />

      {/* Hero banner */}
      <RestaurantSprite id={r.img} height={280} />

      {/* Info card */}
      <div style={{ maxWidth: 1200, margin: "-50px auto 0", padding: "0 32px", position: "relative", zIndex: 2 }}>
        <div style={{ background: "#fff", borderRadius: 22, padding: 28, display: "flex", gap: 24, alignItems: "flex-start", boxShadow: "0 12px 28px rgba(27,36,64,0.08)" }}>
          <Link href="/restaurants" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", background: "#F6EEDC", flexShrink: 0, marginTop: 4 }}>
            <ChevronLeft size={18} color="#1B2440" />
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38, color: "#1B2440", letterSpacing: "-0.02em" }}>{r.name}</div>
            <div style={{ fontSize: 15, color: "#5A6584", marginTop: 4 }}>{r.tagline}</div>
            <div style={{ fontSize: 13, color: "#5A6584", marginTop: 2 }}>{r.city}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
              {r.badges.map((b) => (
                <span key={b} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "#FFF0EA", color: "#C8481A", padding: "5px 10px", borderRadius: 999 }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 22, alignItems: "center", flexShrink: 0 }}>
            {[
              { icon: "⭐", val: r.rating.toString(), label: `${r.reviews.toLocaleString("fr")} avis` },
              { icon: "🕐", val: r.eta,              label: "Livraison" },
              { icon: "🛵", val: r.fee,              label: "Frais" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", minWidth: 76 }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, color: "#1B2440", marginTop: 2, fontSize: 15 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#5A6584" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu grid */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28, marginTop: 28, paddingBottom: 60 }}>
          {/* Sticky sidebar nav */}
          <aside style={{ position: "sticky", top: 90, alignSelf: "flex-start" }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6584", padding: "6px 8px 10px" }}>Menu</div>
              {["Populaires", "Tagines", "Couscous", "Entrées", "Pâtisseries", "Boissons"].map((s, i) => (
                <a key={s} href={`#sec-${i}`} style={{ display: "block", padding: "8px 10px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: i === 0 ? "#1B2440" : "#5A6584", background: i === 0 ? "#FBF6E7" : "transparent", textDecoration: "none", transition: "background 150ms ease" }}
                  onMouseEnter={(e) => { if (i !== 0) (e.currentTarget as HTMLElement).style.background = "#F6EEDC"; }}
                  onMouseLeave={(e) => { if (i !== 0) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >{s}</a>
              ))}
            </div>

            {/* Cart summary in sidebar */}
            {itemCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 14, background: "#1B2440", borderRadius: 18, padding: 16, color: "#fff", cursor: "pointer" }}
                onClick={() => setDrawerOpen(true)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E55A26", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{itemCount}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Voir le panier</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{subtotal} DH</div>
                  </div>
                  <ShoppingBag size={18} color="#E55A26" />
                </div>
              </motion.div>
            )}
          </aside>

          {/* Dishes */}
          <div>
            <div id="sec-0" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "#1B2440", marginBottom: 14 }}>Populaires</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {r.dishes.map((dishKey) => {
                const dish = DISHES[dishKey];
                if (!dish) return null;
                const inCart = cartItems.find((i) => i.dishKey === dishKey);
                const justAdded = addedKey === dishKey;

                return (
                  <motion.div
                    key={dishKey}
                    whileHover={{ y: -2, boxShadow: "0 14px 24px rgba(27,36,64,0.08)" }}
                    style={{ background: "#fff", borderRadius: 18, padding: 14, display: "flex", gap: 14, alignItems: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(27,36,64,0.04)", transition: "box-shadow 160ms ease" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1B2440" }}>{dish.name}</div>
                      <div style={{ fontSize: 12, color: "#5A6584", marginTop: 4 }}>{dish.sub}</div>
                      <div style={{ marginTop: 10, fontWeight: 800, color: "#1B2440", fontSize: 15 }}>{dish.price} DH</div>
                    </div>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Sprite id={dish.img} width={100} height={100} radius={14} />
                      <AnimatePresence>
                        {inCart ? (
                          <motion.div
                            key="counter"
                            initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                            style={{ position: "absolute", bottom: -8, right: -8, display: "flex", alignItems: "center", background: "#fff", borderRadius: 999, border: "1.5px solid #E55A26", overflow: "hidden" }}
                          >
                            <button onClick={() => updateQty(dishKey, -1)} style={{ width: 28, height: 28, border: "none", background: "transparent", color: "#E55A26", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Minus size={12} strokeWidth={2.5} color="#E55A26" />
                            </button>
                            <span style={{ width: 20, textAlign: "center", fontWeight: 800, color: "#1B2440", fontSize: 13 }}>{inCart.qty}</span>
                            <button onClick={() => addToCart(dishKey)} style={{ width: 28, height: 28, border: "none", background: "#E55A26", color: "#fff", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Plus size={12} strokeWidth={2.5} color="#fff" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="add"
                            initial={{ scale: 0.8 }} animate={{ scale: justAdded ? 1.15 : 1 }} exit={{ scale: 0.8 }}
                            onClick={() => addToCart(dishKey)}
                            style={{ position: "absolute", bottom: -8, right: -8, width: 34, height: 34, background: "#E55A26", borderRadius: 999, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(229,90,38,0.40)" }}
                          >
                            <Plus size={18} strokeWidth={2.4} color="#fff" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(27,36,64,0.4)", backdropFilter: "blur(2px)", zIndex: 60 }}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, background: "#F6EEDC", display: "flex", flexDirection: "column", zIndex: 61, boxShadow: "-20px 0 60px rgba(0,0,0,0.18)" }}
            >
              {/* Drawer header */}
              <div style={{ padding: "20px 24px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(27,36,64,0.08)", background: "#fff" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "#1B2440" }}>Ton panier</div>
                  <div style={{ fontSize: 12, color: "#5A6584" }}>Chez {r.name} · {r.eta}</div>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={{ width: 36, height: 36, borderRadius: 999, background: "#F6EEDC", border: "none", cursor: "pointer", fontSize: 18, color: "#1B2440", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Items */}
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 24px" }}>
                {cartItems.length === 0 && (
                  <div style={{ background: "#fff", padding: 24, borderRadius: 16, textAlign: "center", color: "#5A6584" }}>Panier vide.</div>
                )}
                {cartItems.map(({ dishKey, qty }) => {
                  const dish = DISHES[dishKey];
                  if (!dish) return null;
                  return (
                    <div key={dishKey} style={{ background: "#fff", borderRadius: 14, padding: 12, display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <Sprite id={dish.img} width={56} height={56} radius={12} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#1B2440", fontSize: 14 }}>{dish.name}</div>
                        <div style={{ fontSize: 12, color: "#5A6584" }}>{dish.price} DH</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", background: "#F6EEDC", borderRadius: 999 }}>
                        <button onClick={() => updateQty(dishKey, -1)} style={{ width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {qty === 1 ? <X size={12} /> : <Minus size={12} />}
                        </button>
                        <div style={{ width: 22, textAlign: "center", fontWeight: 800, color: "#1B2440", fontSize: 14 }}>{qty}</div>
                        <button onClick={() => addToCart(dishKey)} style={{ width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {cartItems.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginTop: 14 }}>
                    {[
                      ["Sous-total", `${subtotal} DH`],
                      ["Livraison", `${deliveryFee} DH`],
                      ["Code BSSLAMA10", "−10 DH"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: k.includes("Code") ? "#2EC089" : "#5A6584" }}>
                        <span>{k}</span>
                        <span style={{ color: k.includes("Code") ? "#2EC089" : "#1B2440" }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 8, borderTop: "1px solid rgba(27,36,64,0.08)", fontWeight: 800, fontSize: 16, color: "#1B2440" }}>
                      <span>Total</span>
                      <span>{total - 10} DH</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout button */}
              {cartItems.length > 0 && (
                <div style={{ padding: 20, background: "#fff", borderTop: "1px solid rgba(27,36,64,0.08)" }}>
                  <button
                    onClick={handleCheckout}
                    style={{ width: "100%", background: "#E55A26", color: "#fff", border: "none", borderRadius: 999, padding: "16px 24px", fontFamily: "inherit", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 20px rgba(229,90,38,0.35)" }}
                  >
                    <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "2px 10px", fontSize: 13 }}>{itemCount}</span>
                    <span>Commander maintenant</span>
                    <span>{total - 10} DH</span>
                  </button>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, fontSize: 11, color: "#5A6584" }}>
                    <Truck size={12} /> Livraison estimée · {r.eta}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile sticky bar */}
      {itemCount > 0 && (
        <div className="lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "#fff", borderTop: "1px solid rgba(27,36,64,0.08)", zIndex: 50 }}>
          <button
            onClick={handleCheckout}
            style={{ width: "100%", background: "#E55A26", color: "#fff", border: "none", borderRadius: 999, padding: "14px 20px", fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>{itemCount}</span>
            <span>Commander</span>
            <span>{total} DH</span>
          </button>
        </div>
      )}
    </div>
  );
}
