"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { subscribeLiveOrders } from "@/lib/orders";
import { subscribeAllDrivers } from "@/lib/drivers";
import type { Order } from "@/types/order";
import type { DriverProfile } from "@/lib/drivers";
import { useRouter } from "next/navigation";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY    = "#1B2440";
const ORANGE  = "#E55A26";
const MINT    = "#2DC08A";
const SAFFRON = "#F0A500";
const CREAM   = "#F5F0E8";

// ─── Hardcoded fallback data ───────────────────────────────────────────────────
interface DemoOrder {
  id: string;
  cust: string;
  rest: string;
  items: number;
  total: number;
  stage: "prep" | "pickup" | "deliv";
  eta: string;
  courier: string;
}

const DEMO_ORDERS: DemoOrder[] = [
  { id: "#ATL-8742", cust: "Ahmed H.",  rest: "Dar Naji",      items: 2, total: 158, stage: "pickup", eta: "14 min", courier: "Youssef E." },
  { id: "#ATL-8741", cust: "Salma B.",  rest: "Café Clock",    items: 3, total: 212, stage: "prep",   eta: "28 min", courier: "—" },
  { id: "#ATL-8740", cust: "Karim M.",  rest: "Snack Tanjia",  items: 1, total: 88,  stage: "deliv",  eta: "4 min",  courier: "Omar K." },
  { id: "#ATL-8739", cust: "Nadia Z.",  rest: "Atay & Co",     items: 5, total: 92,  stage: "pickup", eta: "11 min", courier: "Mehdi R." },
  { id: "#ATL-8738", cust: "Reda T.",   rest: "Baladi",        items: 2, total: 144, stage: "deliv",  eta: "2 min",  courier: "Hicham A." },
  { id: "#ATL-8737", cust: "Imane L.",  rest: "Riad Mogador",  items: 1, total: 95,  stage: "prep",   eta: "32 min", courier: "—" },
];

interface DemoDriver {
  name: string;
  city: string;
  status: "delivering" | "returning" | "idle" | "break";
  runs: number;
  rating: number;
}

const DEMO_DRIVERS: DemoDriver[] = [
  { name: "Youssef E.", city: "Casablanca", status: "delivering", runs: 8,  rating: 4.9 },
  { name: "Omar K.",    city: "Marrakech",  status: "delivering", runs: 12, rating: 4.8 },
  { name: "Mehdi R.",   city: "Casablanca", status: "delivering", runs: 6,  rating: 4.7 },
  { name: "Hicham A.", city: "Casablanca", status: "returning",  runs: 9,  rating: 4.9 },
  { name: "Bilal C.",   city: "Rabat",      status: "delivering", runs: 7,  rating: 4.6 },
  { name: "Tarik H.",   city: "Fès",        status: "idle",       runs: 4,  rating: 4.8 },
];

const CITY_DATA = [
  { city: "Casablanca", orders: 624, share: 48 },
  { city: "Rabat",      orders: 218, share: 17 },
  { city: "Marrakech",  orders: 196, share: 15 },
  { city: "Fès",        orders: 154, share: 12 },
  { city: "Tanger",     orders: 58,  share: 5  },
  { city: "Autres",     orders: 34,  share: 3  },
];

const KPI_DATA = [
  { label: "Commandes aujourd'hui", n: "1 284",       delta: "+12.4%", trend: "up",   accentColor: NAVY },
  { label: "Revenu",                n: "184 720 DH",  delta: "+8.9%",  trend: "up",   accentColor: ORANGE },
  { label: "Coursiers actifs",      n: "142 / 187",   delta: "76%",    trend: "flat", accentColor: MINT },
  { label: "Temps moyen",           n: "23 min",      delta: "−2 min", trend: "up",   accentColor: SAFFRON },
];

// ─── Courier dot positions on the map ─────────────────────────────────────────
const COURIER_DOTS = [
  { left: "22%", top: "38%", status: "delivering" as const },
  { left: "48%", top: "25%", status: "delivering" as const },
  { left: "61%", top: "55%", status: "returning"  as const },
  { left: "35%", top: "62%", status: "delivering" as const },
  { left: "75%", top: "40%", status: "idle"       as const },
  { left: "55%", top: "72%", status: "delivering" as const },
  { left: "28%", top: "50%", status: "returning"  as const },
  { left: "82%", top: "60%", status: "delivering" as const },
  { left: "14%", top: "70%", status: "idle"       as const },
];

// ─── Helper: avatar hue from name ────────────────────────────────────────────
function nameToHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return h % 360;
}

// ─── Helper: format today's date in French ───────────────────────────────────
function frenchDate(): string {
  return new Intl.DateTimeFormat("fr-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// ─── Stage chip ───────────────────────────────────────────────────────────────
function StageChip({ stage }: { stage: "prep" | "pickup" | "deliv" }) {
  if (stage === "prep")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: `${SAFFRON}22`, color: SAFFRON }}>
        Préparation
      </span>
    );
  if (stage === "pickup")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: `${ORANGE}22`, color: ORANGE }}>
        Coursier
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${MINT}22`, color: MINT }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: MINT }} />
      Livraison
    </span>
  );
}

// ─── Driver status dot ────────────────────────────────────────────────────────
function StatusDot({ status }: { status: DemoDriver["status"] }) {
  const color =
    status === "delivering" ? MINT :
    status === "returning"  ? SAFFRON :
    NAVY;
  const pulse = status === "delivering";
  return (
    <span className="relative inline-flex">
      {pulse && (
        <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ background: color }} />
      )}
      <span className="relative inline-flex w-2 h-2 rounded-full"
        style={{ background: color }} />
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Live Firestore data
  const [liveOrders, setLiveOrders]   = useState<Order[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<DriverProfile[]>([]);

  // Cancellation in-progress tracker
  const [cancelling, setCancelling] = useState<string | null>(null);

  // ── Auth + role check ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists() || snap.data()?.role !== "admin") {
          router.push("/");
          return;
        }
      } catch {
        router.push("/");
        return;
      }
      setChecking(false);
    });
    return () => unsubAuth();
  }, [router]);

  // ── Firestore subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (checking) return;
    const unsubOrders  = subscribeLiveOrders((orders)  => setLiveOrders(orders));
    const unsubDrivers = subscribeAllDrivers((drivers) => setLiveDrivers(drivers));
    return () => {
      unsubOrders();
      unsubDrivers();
    };
  }, [checking]);

  // ── Cancel order ──────────────────────────────────────────────────────────
  async function cancelOrder(orderId: string) {
    setCancelling(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "cancelled" });
    } finally {
      setCancelling(null);
    }
  }

  // ── Derive display data ────────────────────────────────────────────────────

  // Map live Order → DemoOrder shape for the table
  function mapOrderToDemo(o: Order): DemoOrder {
    const stage: DemoOrder["stage"] =
      o.status === "picked_up" ? "deliv" :
      o.status === "accepted"  ? "pickup" : "prep";
    return {
      id:      o.id ?? "",
      cust:    o.customerId,
      rest:    o.restaurantName ?? "—",
      items:   o.items.length,
      total:   o.total ?? o.subtotal ?? 0,
      stage,
      eta:     "—",
      courier: o.driverId ?? "—",
    };
  }

  const displayOrders: DemoOrder[] =
    liveOrders.length > 0 ? liveOrders.map(mapOrderToDemo) : DEMO_ORDERS;

  // Map live DriverProfile → DemoDriver shape
  function mapDriverToDemo(d: DriverProfile): DemoDriver {
    const status: DemoDriver["status"] = d.currentOrderId
      ? "delivering"
      : d.isOnline
        ? "idle"
        : "break";
    return {
      name:   d.name,
      city:   d.zone,
      status,
      runs:   d.runsToday,
      rating: d.rating,
    };
  }

  const displayDrivers: DemoDriver[] =
    liveDrivers.length > 0 ? liveDrivers.map(mapDriverToDemo) : DEMO_DRIVERS;

  const onlineCount = displayDrivers.filter(
    (d) => d.status === "delivering" || d.status === "returning" || d.status === "idle"
  ).length;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: ORANGE, borderTopColor: "transparent" }} />
          <span className="text-sm font-medium" style={{ color: NAVY }}>Vérification…</span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: CREAM }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 overflow-y-auto"
        style={{ width: 260, background: "#fff", borderRight: "1px solid #e8e3d9" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-6">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg"
            style={{ background: ORANGE }}
          >
            A
          </span>
          <div>
            <p className="font-extrabold text-sm leading-tight" style={{ color: NAVY }}>AtlaasGo</p>
            <p className="text-xs font-medium" style={{ color: `${NAVY}88` }}>Admin Ops</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 flex-1">
          {[
            { label: "Tableau de bord", icon: "▦", active: true  },
            { label: "Commandes",       icon: "≡", active: false },
            { label: "Coursiers",       icon: "⊕", active: false },
            { label: "Restaurants",     icon: "⊞", active: false },
            { label: "Paramètres",      icon: "⚙", active: false },
          ].map(({ label, icon, active }) => (
            <button
              key={label}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-colors"
              style={
                active
                  ? { background: `${ORANGE}18`, color: ORANGE }
                  : { color: NAVY }
              }
            >
              <span className="text-base leading-none opacity-70">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-5 border-t" style={{ borderColor: "#e8e3d9" }}>
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: NAVY }}
            >
              A
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>Admin</p>
              <p className="text-xs truncate" style={{ color: `${NAVY}66` }}>Operations</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 flex flex-col gap-6 min-h-full">

          {/* Top bar */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1
                className="text-[28px] font-extrabold leading-tight"
                style={{ color: NAVY, fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Tableau de bord
              </h1>
              <p className="text-sm mt-0.5 capitalize" style={{ color: `${NAVY}88` }}>{frenchDate()}</p>
            </div>
            <span
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${ORANGE}18`, color: ORANGE }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              En direct
            </span>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-4">
            {KPI_DATA.map(({ label, n, delta, trend, accentColor }) => (
              <div
                key={label}
                className="rounded-2xl p-5 flex flex-col gap-2"
                style={{ background: "#fff", boxShadow: "0 1px 4px #1b244010" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: `${NAVY}77` }}
                >
                  {label}
                </p>
                <p
                  className="text-[28px] font-extrabold leading-none"
                  style={{ color: accentColor, fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {n}
                </p>
                <span
                  className="self-start text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={
                    trend === "up"
                      ? { background: "#2DC08A18", color: MINT }
                      : trend === "down"
                        ? { background: "#ef444418", color: "#ef4444" }
                        : { background: "#1B244018", color: `${NAVY}99` }
                  }
                >
                  {delta}
                </span>
              </div>
            ))}
          </div>

          {/* Middle row */}
          <div className="flex gap-4">

            {/* Live orders table */}
            <div
              className="flex-1 rounded-2xl overflow-hidden flex flex-col"
              style={{ background: "#fff", boxShadow: "0 1px 4px #1b244010" }}
            >
              {/* Table header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#f0ebe3" }}>
                <span className="font-bold text-sm" style={{ color: NAVY }}>Commandes en direct</span>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: `${ORANGE}18`, color: ORANGE }}
                >
                  {displayOrders.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: `${CREAM}`, color: `${NAVY}88` }}>
                      {["ID", "Client", "Restaurant", "Articles", "Total", "Statut", "ETA", "Coursier", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ fontSize: 10 }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayOrders.map((order, i) => (
                      <tr
                        key={order.id || i}
                        className="border-t transition-colors hover:bg-orange-50/40"
                        style={{ borderColor: "#f0ebe3" }}
                      >
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: NAVY }}>{order.id}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: NAVY }}>{order.cust}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: `${NAVY}bb` }}>{order.rest}</td>
                        <td className="px-4 py-3 text-center" style={{ color: `${NAVY}bb` }}>{order.items}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: NAVY }}>{order.total} DH</td>
                        <td className="px-4 py-3">
                          <StageChip stage={order.stage} />
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: `${NAVY}99` }}>{order.eta}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: `${NAVY}bb` }}>{order.courier}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => order.id && order.id.startsWith("#") ? undefined : cancelOrder(order.id)}
                            disabled={cancelling === order.id}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-40"
                            style={{
                              borderColor: "#ef444433",
                              color: "#ef4444",
                            }}
                          >
                            {cancelling === order.id ? "…" : "Annuler"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Courier fleet list */}
            <div
              className="shrink-0 rounded-2xl flex flex-col overflow-hidden"
              style={{ width: 400, background: "#fff", boxShadow: "0 1px 4px #1b244010" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#f0ebe3" }}>
                <span className="font-bold text-sm" style={{ color: NAVY }}>Flotte coursiers</span>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: `${MINT}18`, color: MINT }}
                >
                  {onlineCount} en ligne
                </span>
              </div>

              <div className="flex flex-col divide-y overflow-y-auto" style={{ borderColor: "#f0ebe3" }}>
                {displayDrivers.map((driver, i) => {
                  const hue = nameToHue(driver.name);
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      {/* Avatar */}
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: `hsl(${hue},55%,50%)` }}
                      >
                        {driver.name.charAt(0)}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{driver.name}</p>
                        <p className="text-xs truncate" style={{ color: `${NAVY}77` }}>{driver.city}</p>
                      </div>

                      {/* Status dot */}
                      <StatusDot status={driver.status} />

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold" style={{ color: NAVY }}>{driver.runs} courses</p>
                        <p className="text-[11px]" style={{ color: `${NAVY}77` }}>★ {driver.rating}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom row: Fleet map + City breakdown */}
          <div className="flex gap-4">

            {/* Fleet map */}
            <div
              className="flex-1 rounded-2xl overflow-hidden relative"
              style={{
                height: 400,
                backgroundImage: "url(/images/src-map.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                background: "#e8f0f8",
                boxShadow: "0 1px 4px #1b244010",
              }}
            >
              {/* Fallback gradient if image missing */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundImage: "url(/images/src-map.png), linear-gradient(135deg, #d4e6f5 0%, #b8d4e8 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {/* Header chip */}
              <div className="absolute top-3 left-3 z-10">
                <span
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm"
                  style={{ background: "rgba(27,36,64,0.75)", color: "#fff" }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: MINT }} />
                  142 coursiers en temps réel
                </span>
              </div>

              {/* Courier dots */}
              {COURIER_DOTS.map((dot, i) => {
                const color =
                  dot.status === "delivering" ? MINT :
                  dot.status === "returning"  ? SAFFRON :
                  NAVY;
                return (
                  <div key={i} className="absolute z-10" style={{ left: dot.left, top: dot.top }}>
                    <span className="relative inline-flex">
                      <span
                        className="absolute inline-flex h-3 w-3 rounded-full opacity-60 animate-ping"
                        style={{ background: color }}
                      />
                      <span
                        className="relative inline-flex w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ background: color }}
                      />
                    </span>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 z-10">
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium backdrop-blur-sm"
                  style={{ background: "rgba(255,255,255,0.85)", color: NAVY }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: MINT }} />
                    Livraison
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SAFFRON }} />
                    Retour
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: NAVY }} />
                    Inactif
                  </span>
                </div>
              </div>
            </div>

            {/* City breakdown */}
            <div
              className="shrink-0 rounded-2xl flex flex-col overflow-hidden"
              style={{ width: 300, background: "#fff", boxShadow: "0 1px 4px #1b244010" }}
            >
              <div className="px-5 py-4 border-b" style={{ borderColor: "#f0ebe3" }}>
                <span className="font-bold text-sm" style={{ color: NAVY }}>Répartition par ville</span>
              </div>

              <div className="flex flex-col gap-0 px-5 py-4 flex-1 justify-center gap-3">
                {CITY_DATA.map(({ city, orders, share }) => (
                  <div key={city} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold" style={{ color: NAVY }}>{city}</span>
                      <div className="flex items-center gap-3" style={{ color: `${NAVY}99` }}>
                        <span>{orders}</span>
                        <span className="font-semibold w-8 text-right" style={{ color: NAVY }}>{share}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${NAVY}12` }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${share}%`, background: ORANGE }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
