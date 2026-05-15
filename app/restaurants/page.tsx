"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Star, Clock } from "lucide-react";
import { motion } from "framer-motion";
import FloatingNavbar from "@/components/FloatingNavbar";
import { RestaurantSprite } from "@/components/atlas/RestaurantSprite";
import { ZelligeBg } from "@/components/atlas";

const RESTAURANTS = [
  { id: "darnaji",     name: "Dar Naji",       tagline: "Cuisine marocaine traditionnelle", city: "Rabat · Médina",      rating: 4.8, reviews: 2340, eta: "20–30 min", fee: "12 DH", distance: "1.2 km", badges: ["Top-rated", "Halal"],   tileHue: 18,  img: "rest:darnaji" },
  { id: "cafeclock",   name: "Café Clock",     tagline: "Camel burger & comfort food",      city: "Fès · Médina",         rating: 4.7, reviews: 1820, eta: "25–35 min", fee: "15 DH", distance: "0.8 km", badges: ["Beldi"],              tileHue: 38,  img: "rest:cafeclock" },
  { id: "snacktanjia", name: "Snack Tanjia",   tagline: "Spécialités marrakchies",          city: "Marrakech · Jemâa",   rating: 4.9, reviews: 5210, eta: "15–25 min", fee: "9 DH",  distance: "0.5 km", badges: ["Bestseller"],         tileHue: 6,   img: "rest:snacktanjia" },
  { id: "atayco",      name: "Atay & Co",      tagline: "Thé à la menthe & sucreries",     city: "Casablanca · Maârif", rating: 4.6, reviews: 980,  eta: "10–15 min", fee: "7 DH",  distance: "0.3 km", badges: ["Free delivery"],      tileHue: 150, img: "rest:atayco" },
  { id: "riadmogador", name: "Riad Mogador",   tagline: "Fine dining marocain",             city: "Essaouira · Port",     rating: 4.8, reviews: 1240, eta: "30–40 min", fee: "18 DH", distance: "2.1 km", badges: ["Premium"],            tileHue: 200, img: "rest:riadmogador" },
  { id: "baladi",      name: "Baladi Healthy", tagline: "Bowls & jus pressés",              city: "Casablanca · Anfa",   rating: 4.5, reviews: 612,  eta: "20–25 min", fee: "10 DH", distance: "1.0 km", badges: ["Healthy"],            tileHue: 130, img: "rest:baladi" },
];

export default function RestaurantsPage() {
  const [q, setQ]         = useState("");
  const [sort, setSort]   = useState<"reco" | "rating" | "eta">("reco");
  const [filters, setFilters] = useState({ halal: false, healthy: false, free: false });
  const [maxFee, setMaxFee]   = useState(25);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("rest-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    let list = RESTAURANTS.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.tagline.toLowerCase().includes(q.toLowerCase())) return false;
      if (filters.halal   && !r.badges.some((b) => b.toLowerCase().includes("halal")))   return false;
      if (filters.healthy && !r.badges.some((b) => b.toLowerCase().includes("healthy"))) return false;
      if (filters.free    && !r.badges.some((b) => b.toLowerCase().includes("free")))    return false;
      if (parseInt(r.fee) > maxFee) return false;
      return true;
    });
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "eta")    list = [...list].sort((a, b) => parseInt(a.eta) - parseInt(b.eta));
    return list;
  }, [q, sort, filters, maxFee]);

  return (
    <div className="min-h-screen" style={{ background: "#F6EEDC" }}>
      <FloatingNavbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 28 }}>

        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "flex-start" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 18 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "#1B2440", marginBottom: 14 }}>Filtres</div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6584", marginBottom: 10 }}>Trier par</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[{ id: "reco", label: "Recommandé" }, { id: "rating", label: "Mieux notés" }, { id: "eta", label: "Livraison rapide" }].map((o) => (
                <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1B2440", cursor: "pointer" }}>
                  <input type="radio" name="sort" checked={sort === o.id} onChange={() => setSort(o.id as typeof sort)} style={{ accentColor: "#E55A26" }} />
                  {o.label}
                </label>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6584", marginBottom: 10 }}>Préférences</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[{ k: "halal", l: "Halal certifié" }, { k: "healthy", l: "Healthy" }, { k: "free", l: "Livraison gratuite" }].map((o) => (
                <label key={o.k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1B2440", cursor: "pointer" }}>
                  <input type="checkbox" checked={filters[o.k as keyof typeof filters]} onChange={() => setFilters((p) => ({ ...p, [o.k]: !p[o.k as keyof typeof filters] }))} style={{ accentColor: "#E55A26" }} />
                  {o.l}
                </label>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6584", marginBottom: 10 }}>Frais max</div>
            <input type="range" min={5} max={25} value={maxFee} onChange={(e) => setMaxFee(+e.target.value)} style={{ width: "100%", accentColor: "#E55A26" }} />
            <div style={{ fontSize: 12, color: "#1B2440", fontWeight: 700, marginTop: 6 }}>≤ {maxFee} DH</div>
          </div>

          <div className="relative overflow-hidden mt-4 text-white" style={{ borderRadius: 16, padding: "18px 16px", background: "#E55A26" }}>
            <ZelligeBg opacity={0.15} color="#fff" />
            <div className="relative">
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>Offre du moment</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, marginTop: 4 }}>Atay offert</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Avec toute commande &gt; 80 DH</div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 999, padding: "12px 20px", boxShadow: "0 1px 4px rgba(27,36,64,0.06)", marginBottom: 16 }}>
            <Search size={18} color="#5A6584" />
            <input
              id="rest-search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tagine, briouates, Dar Naji…"
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 15, color: "#1B2440", background: "transparent" }}
            />
            <kbd style={{ fontSize: 11, color: "#5A6584", background: "#F6EEDC", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(27,36,64,0.1)", fontFamily: "ui-monospace, monospace" }}>⌘K</kbd>
          </div>

          <div style={{ fontSize: 13, color: "#5A6584", marginBottom: 16 }}>
            <strong style={{ color: "#1B2440" }}>{results.length}</strong> restaurant{results.length !== 1 ? "s" : ""}{q && <> pour « {q} »</>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {results.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
                <Link
                  href={`/restaurants/${r.id}`}
                  className="block no-underline bg-white overflow-hidden transition-all duration-200"
                  style={{ borderRadius: 18, boxShadow: "0 1px 4px rgba(27,36,64,0.04)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 30px rgba(27,36,64,0.10)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(27,36,64,0.04)"; }}
                >
                  <RestaurantSprite id={r.img} height={120} />
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#1B2440" }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "#5A6584", marginTop: 2 }}>{r.tagline}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F6EEDC", padding: "4px 8px", borderRadius: 999, flexShrink: 0, marginLeft: 8 }}>
                        <Star size={11} color="#F2B53A" fill="#F2B53A" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1B2440" }}>{r.rating}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: "#5A6584" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {r.eta}</span>
                      <span>·</span><span>{r.fee}</span>
                      <span>·</span><span>{r.distance}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {r.badges.map((b) => (
                        <span key={b} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "#FFF0EA", color: "#C8481A", padding: "4px 8px", borderRadius: 999 }}>{b}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {results.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "#1B2440" }}>Aucun résultat</div>
              <div style={{ fontSize: 14, color: "#5A6584", marginTop: 6 }}>Essaie un autre nom de plat ou de restaurant</div>
              <button onClick={() => { setQ(""); setFilters({ halal: false, healthy: false, free: false }); setMaxFee(25); }} style={{ marginTop: 16, background: "#E55A26", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px", fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
