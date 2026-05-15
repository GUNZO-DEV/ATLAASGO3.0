"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { setDriverOnline, acceptOrder } from "@/lib/drivers";
import { subscribeToOrder, subscribeToPendingOrders } from "@/lib/orders";
import type { DriverProfile } from "@/lib/drivers";
import type { Order } from "@/types/order";
import Sprite from "@/components/atlas/Sprite";
import {
  Clock,
  History,
  Banknote,
  User,
  Phone,
  Navigation,
  CheckCircle2,
  Bike,
  Zap,
  Shield,
  Star,
  AlertTriangle,
  MapPin,
  Package,
  type LucideProps,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = "#1B2440";
const ORANGE = "#E55A26";
const MINT = "#2DC08A";
const CREAM = "#F5F0E8";
const MUTED = "#6B7A9E";
const GOLD = "#F0A500";
const LIGHT_ORANGE = "#FEF0E7";

// ─── Mock data (shown when no Firestore driver profile) ────────────────────────

const MOCK_PROFILE: DriverProfile = {
  uid: "demo",
  name: "Youssef E.",
  avatar: "avatar:youssef",
  rating: 4.92,
  totalDeliveries: 1240,
  isOnline: true,
  zone: "casablanca",
  currentOrderId: null,
  earningsToday: 348,
  earningsWeek: 2184,
  tipsTotal: 74,
  runsToday: 12,
  runsWeek: 76,
  createdAt: "2024-01-01T00:00:00Z",
};

const MOCK_RUNS = [
  { id: "1", restaurant: "Dar Naji", city: "Médina", mins: 18, earn: 42 },
  { id: "2", restaurant: "Café Clock", city: "Maârif", mins: 22, earn: 38 },
  { id: "3", restaurant: "Snack Tanjia", city: "Guéliz", mins: 15, earn: 35 },
  { id: "4", restaurant: "Atay Co.", city: "Bourgogne", mins: 28, earn: 45 },
];

// ─── Performance badges config ─────────────────────────────────────────────────

const BADGES = [
  { label: "Rapide", icon: Zap, value: "12 min", sub: "temps moyen", color: GOLD },
  { label: "Fiable", icon: Shield, value: "98%", sub: "taux acceptation", color: MINT },
  { label: "Étoiles", icon: Star, value: "4.9", sub: "note moyenne", color: ORANGE },
  { label: "Courses", icon: Bike, value: "156", sub: "ce mois", color: NAVY },
];

// ─── Countdown chip — green → yellow → red ────────────────────────────────────

function CountdownChip({ secs }: { secs: number }) {
  const color = secs > 12 ? MINT : secs > 6 ? "#F59E0B" : "#EF4444";
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1"
      style={{ background: `${color}22`, border: `1px solid ${color}55` }}
    >
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      <span className="text-xs font-bold tabular-nums" style={{ color }}>
        {secs}s
      </span>
    </div>
  );
}

// ─── Ride offer card ───────────────────────────────────────────────────────────

function RideOfferCard({
  order,
  secs,
  onAccept,
  onDecline,
}: {
  order: Order;
  secs: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const spriteId = order.restaurantId
    ? (`rest:${order.restaurantId}` as const)
    : "rest:darnaji";
  const restaurantName = order.restaurantName ?? "Restaurant";
  const earn = order.fee ?? 12;
  const itemCount = order.items.length;
  const rawAddr = order.deliveryAddress ?? order.dropoff ?? "";
  const addrParts = rawAddr.split(",");
  const dropLabel =
    addrParts.length > 1
      ? addrParts[addrParts.length - 1].trim()
      : rawAddr.slice(-30) || "Livraison";
  const pickupLabel = order.pickup ?? "Pickup";

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(27,36,64,0.06)] animate-in slide-in-from-bottom-4 duration-300"
      style={{ border: `2px solid ${ORANGE}`, background: "#fff" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: LIGHT_ORANGE }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ORANGE }} />
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: ORANGE }}
          >
            NOUVELLE COURSE
          </span>
        </div>
        <CountdownChip secs={secs} />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Sprite id={spriteId} width={56} height={56} radius={12} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate" style={{ color: NAVY }}>
              {restaurantName}
            </p>
            <p className="text-sm" style={{ color: MUTED }}>
              {itemCount} article{itemCount !== 1 ? "s" : ""}{order.total != null ? ` · ${order.total} DH` : ""}
            </p>
          </div>
          <span className="text-xl font-extrabold" style={{ color: NAVY }}>
            {earn} DH
          </span>
        </div>

        {/* Mini route diagram */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex flex-col items-center">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: NAVY, border: "2px solid #fff", boxShadow: `0 0 0 2px ${NAVY}` }}
            />
            <p className="text-[10px] font-medium mt-1" style={{ color: NAVY }}>
              {pickupLabel.split(",")[0]}
            </p>
          </div>
          <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: "#D1D5DB", marginTop: -12 }} />
          <div className="flex flex-col items-center">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: ORANGE, border: "2px solid #fff", boxShadow: `0 0 0 2px ${ORANGE}` }}
            />
            <p className="text-[10px] font-medium mt-1" style={{ color: ORANGE }}>
              {dropLabel}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            style={{ background: "#F3F4F6", color: MUTED }}
          >
            Refuser
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-opacity cursor-pointer"
            style={{ background: ORANGE, color: "#fff" }}
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Active delivery card ──────────────────────────────────────────────────────

function ActiveDeliveryCard({
  order,
  stage,
  onPickedUp,
  onDelivered,
}: {
  order: Order | null;
  stage: "heading_pickup" | "heading_dropoff";
  onPickedUp: () => void;
  onDelivered: () => void;
}) {
  const title =
    stage === "heading_pickup"
      ? `Récupérer chez ${order?.restaurantName ?? "Restaurant"}`
      : `Livrer chez ${order?.dropoff ?? "Ahmed H."}`;
  const pickupAddr = order?.pickup ?? "Médina, Marrakech";
  const dropoffAddr = order?.dropoff ?? "Maârif, Casablanca";
  const ctaLabel = stage === "heading_pickup" ? "Colis récupéré" : "Livré !";
  const onCta = stage === "heading_pickup" ? onPickedUp : onDelivered;
  const orderId = order?.id ?? "ATL-8742";

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(27,36,64,0.06)]"
      style={{ borderLeft: `4px solid ${ORANGE}` }}
    >
      {/* Stage badge */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ORANGE }} />
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: ORANGE }}
          >
            COURSE ACTIVE · #{orderId.replace("orders/", "").slice(0, 8).toUpperCase()}
          </span>
        </div>
        <Package size={16} style={{ color: MUTED }} strokeWidth={2} />
      </div>

      {/* Title */}
      <p
        className="px-4 pb-1 text-lg font-extrabold leading-tight"
        style={{ color: NAVY, fontFamily: "var(--font-display)" }}
      >
        {title}
      </p>

      {/* Map placeholder */}
      <div
        className="mx-4 my-3 rounded-xl overflow-hidden relative"
        style={{ height: 120, background: "linear-gradient(135deg, #e8eaf0 0%, #d1d5de 100%)" }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(/images/src-map.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
        {/* Distance chip */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: MINT }} />
          <span className="text-xs font-semibold" style={{ color: NAVY }}>
            600 m · 3 min
          </span>
        </div>
        {/* Navigation CTA */}
        <button
          className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer"
          style={{ background: NAVY, color: "#fff" }}
        >
          <Navigation size={12} strokeWidth={2.2} />
          Naviguer
        </button>
      </div>

      {/* Pickup / dropoff addresses */}
      <div className="px-4 pb-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${MINT}22` }}
          >
            <MapPin size={13} style={{ color: MINT }} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
              Ramassage
            </p>
            <p className="text-xs font-medium truncate" style={{ color: NAVY }}>
              {pickupAddr}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${ORANGE}22` }}
          >
            <MapPin size={13} style={{ color: ORANGE }} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
              Livraison
            </p>
            <p className="text-xs font-medium truncate" style={{ color: NAVY }}>
              {dropoffAddr}
            </p>
          </div>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            style={{ background: NAVY }}
            aria-label="Appeler"
          >
            <Phone size={15} color="#fff" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Progress buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold cursor-pointer"
          style={{ background: CREAM, color: NAVY }}
        >
          Signaler
        </button>
        <button
          onClick={onCta}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold cursor-pointer"
          style={{ background: ORANGE, color: "#fff" }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Today's runs list ─────────────────────────────────────────────────────────

function TodayRunsList({ runs }: { runs: typeof MOCK_RUNS }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
          Courses aujourd&apos;hui
        </p>
        <span className="text-xs font-medium" style={{ color: MUTED }}>
          {runs.length} courses
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {runs.map((run) => (
          <div key={run.id} className="flex items-center gap-3 py-2">
            <CheckCircle2 size={18} style={{ color: MINT }} strokeWidth={2.2} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                {run.restaurant}
              </p>
              <p className="text-[11px]" style={{ color: MUTED }}>
                {run.city} · {run.mins} min
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: ORANGE }}>
              +{run.earn} DH
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Offline empty state ───────────────────────────────────────────────────────

function OfflineState({ onGoOnline }: { onGoOnline: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: CREAM }}
      >
        <Bike size={36} style={{ color: NAVY }} strokeWidth={1.6} />
      </div>
      <div>
        <p
          className="text-xl font-extrabold mb-1"
          style={{ color: NAVY, fontFamily: "var(--font-display)" }}
        >
          Hors-ligne
        </p>
        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
          Tu n&apos;es pas visible pour recevoir des courses. Active ton statut pour commencer à livrer.
        </p>
      </div>
      <button
        onClick={onGoOnline}
        className="rounded-xl px-6 py-3 text-sm font-bold cursor-pointer"
        style={{ background: ORANGE, color: "#fff" }}
      >
        Passer en ligne
      </button>
    </div>
  );
}

// ─── Bottom Tab Bar ────────────────────────────────────────────────────────────

type Tab = "courses" | "historique" | "gains" | "profil";

const TABS: { id: Tab; label: string; Icon: React.FC<LucideProps> }[] = [
  { id: "courses", label: "Courses", Icon: Clock },
  { id: "historique", label: "Historique", Icon: History },
  { id: "gains", label: "Gains", Icon: Banknote },
  { id: "profil", label: "Profil", Icon: User },
];

function BottomTabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const activeIdx = TABS.findIndex((t) => t.id === active);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
        borderColor: "#E5E7EB",
      }}
    >
      <div className="relative h-0.5" style={{ background: "#F3F4F6" }}>
        <div
          className="absolute top-0 h-0.5 transition-transform duration-200"
          style={{
            width: `${100 / TABS.length}%`,
            background: ORANGE,
            transform: `translateX(${activeIdx * 100}%)`,
          }}
        />
      </div>
      <div className="flex max-w-[700px] mx-auto">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-transform duration-150 cursor-pointer"
              style={{
                color: isActive ? ORANGE : "#9CA3AF",
                transform: isActive ? "translateY(-1px)" : "none",
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DriverPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [stage, setStage] = useState<"none" | "heading_pickup" | "heading_dropoff">("none");
  const [tab, setTab] = useState<Tab>("courses");
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  // Offer countdown — keyed so it resets when the first pending order changes
  const [offerSecs, setOfferSecs] = useState(18);
  const offerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track the last offer id to detect when the front-of-queue changes
  const offerKeyRef = useRef<string | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/register");
        return;
      }
      setUid(user.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // ── Real-time driver profile ─────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "drivers", uid),
      (snap) => {
        if (!snap.exists()) {
          // Doc doesn't exist yet — use mock so the page renders
          setProfile(MOCK_PROFILE);
          setIsOnline(MOCK_PROFILE.isOnline);
        } else {
          const p = { uid, ...snap.data() } as DriverProfile;
          setProfile(p);
          setIsOnline(p.isOnline);
        }
      },
      (err) => {
        console.warn("Driver profile snapshot failed:", err.code);
        // Fallback to mock on permission / network error
        setProfile(MOCK_PROFILE);
        setIsOnline(MOCK_PROFILE.isOnline);
      }
    );
    return () => unsub();
  }, [uid]);

  // ── Subscribe to pending orders ─────────────────────────────────────────────

  useEffect(() => {
    if (!isOnline || !uid || uid === "demo" || profile?.currentOrderId) {
      setPendingOrders([]);
      return;
    }
    const zone = profile?.zone ?? "casablanca";
    const unsub = subscribeToPendingOrders(zone, (orders) => {
      setPendingOrders(orders);
    });
    return unsub;
  }, [isOnline, uid, profile?.currentOrderId, profile?.zone]);

  // ── Subscribe to active order ───────────────────────────────────────────────

  useEffect(() => {
    const orderId = profile?.currentOrderId;
    if (!orderId) return;
    const unsub = subscribeToOrder(orderId, (order) => {
      setActiveOrder(order);
      if (!order) { setStage("none"); return; }
      if (order.status === "accepted") setStage("heading_pickup");
      else if (order.status === "picked_up") setStage("heading_dropoff");
      else setStage("none");
    });
    return unsub;
  }, [profile?.currentOrderId]);

  // ── Offer countdown ─────────────────────────────────────────────────────────
  // Resets whenever the front-of-queue order changes.

  const currentOffer = pendingOrders[0] ?? null;

  useEffect(() => {
    const offerId = currentOffer?.id ?? null;
    if (!currentOffer) {
      if (offerTimerRef.current) clearInterval(offerTimerRef.current);
      setOfferSecs(18);
      offerKeyRef.current = null;
      return;
    }
    // Reset countdown when a new order appears at the front of the queue
    if (offerId !== offerKeyRef.current) {
      offerKeyRef.current = offerId ?? null;
      setOfferSecs(18);
      if (offerTimerRef.current) clearInterval(offerTimerRef.current);
    }
    offerTimerRef.current = setInterval(() => {
      setOfferSecs((s) => {
        if (s <= 1) {
          clearInterval(offerTimerRef.current!);
          // Countdown expired — just stop counting; driver can still accept/decline
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (offerTimerRef.current) clearInterval(offerTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOffer?.id]);

  // ── Toggle online ───────────────────────────────────────────────────────────

  const handleToggle = useCallback(async () => {
    const next = !isOnline;
    setIsOnline(next);
    setTogglingOnline(true);
    try {
      if (uid && uid !== "demo") {
        await setDriverOnline(uid, next);
      }
    } catch {
      // Revert on error
      setIsOnline(!next);
    } finally {
      setTogglingOnline(false);
    }
  }, [isOnline, uid]);

  // ── Delivery actions ────────────────────────────────────────────────────────

  const handlePickedUp = useCallback(async () => {
    if (!uid || !activeOrder?.id) return;
    try {
      const { markPickedUp } = await import("@/lib/drivers");
      await markPickedUp(activeOrder.id, uid);
      setStage("heading_dropoff");
    } catch {
      // For demo mode, just advance stage
      setStage("heading_dropoff");
    }
  }, [uid, activeOrder]);

  const handleDelivered = useCallback(async () => {
    if (!uid || !activeOrder?.id) return;
    const earnAmount = activeOrder.fee ?? 12;
    try {
      const { markDelivered } = await import("@/lib/drivers");
      await markDelivered(activeOrder.id, uid, earnAmount, activeOrder.customerId);
      setActiveOrder(null);
      setStage("none");
    } catch {
      setActiveOrder(null);
      setStage("none");
    }
  }, [uid, activeOrder]);

  const handleAcceptOffer = useCallback(async () => {
    if (!uid || uid === "demo" || !currentOffer) return;
    try {
      await acceptOrder(currentOffer.id!, uid, currentOffer.customerId);
      // Profile snapshot listener will update currentOrderId,
      // which triggers the active-order subscription automatically.
    } catch (err) {
      console.error("Failed to accept order:", err);
    }
  }, [uid, currentOffer]);

  const handleDeclineOffer = useCallback(() => {
    // Clear local state — the pending order remains in Firestore for other drivers
    setPendingOrders((prev) => prev.slice(1));
  }, []);

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: `${NAVY}22` }} />
          <div className="w-24 h-3 rounded-full animate-pulse" style={{ background: `${NAVY}18` }} />
        </div>
      </div>
    );
  }

  const prof = profile ?? MOCK_PROFILE;

  // Derived earnings for the today card
  const earnings = {
    today: prof.earningsToday,
    deliveries: prof.runsToday,
    tips: prof.tipsTotal,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen" style={{ background: CREAM }}>
      {/* ── Scrollable content ── */}
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16">

        {/* ── 1. Online / Offline Hero Toggle ── */}
        <div
          className={`rounded-2xl p-6 mb-6 relative overflow-hidden transition-colors`}
          style={{ background: isOnline ? MINT : NAVY }}
        >
          {/* Dot-grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">
                Statut
              </p>
              <p
                className="text-white text-2xl font-extrabold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {isOnline ? "En ligne" : "Hors ligne"}
              </p>
              <p className="text-white/60 text-xs mt-1">
                {isOnline
                  ? "Vous recevez des commandes"
                  : "Activez pour recevoir des commandes"}
              </p>
            </div>
            <button
              onClick={togglingOnline ? undefined : handleToggle}
              disabled={togglingOnline}
              className="w-16 h-9 rounded-full relative transition-colors cursor-pointer"
              style={{
                backgroundColor: isOnline ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)",
              }}
            >
              <div
                className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow transition-all ${
                  isOnline ? "left-8" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* ── 2. Today's Earnings Card ── */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
            Gains du jour
          </p>
          <p
            className="text-4xl font-extrabold"
            style={{ color: NAVY, fontFamily: "var(--font-display)" }}
          >
            {earnings.today}{" "}
            <span className="text-xl" style={{ color: MUTED }}>
              DH
            </span>
          </p>
          <div className="flex gap-4 mt-3 text-sm">
            <div>
              <span style={{ color: MUTED }}>Livraisons:</span>{" "}
              <span className="font-bold" style={{ color: NAVY }}>
                {earnings.deliveries}
              </span>
            </div>
            <div>
              <span style={{ color: MUTED }}>Pourboires:</span>{" "}
              <span className="font-bold" style={{ color: MINT }}>
                {earnings.tips} DH
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Active Delivery Card ── */}
        {stage !== "none" && (
          <div className="mb-6">
            <ActiveDeliveryCard
              order={activeOrder}
              stage={stage as "heading_pickup" | "heading_dropoff"}
              onPickedUp={handlePickedUp}
              onDelivered={handleDelivered}
            />
          </div>
        )}

        {/* ── 4. Performance Badges Row ── */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
            Performance
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {BADGES.map(({ label, icon: Icon, value, sub, color }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex flex-col gap-2 shrink-0"
                style={{ minWidth: 110 }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={18} style={{ color }} strokeWidth={2} />
                </div>
                <div>
                  <p
                    className="text-lg font-extrabold leading-none"
                    style={{ color: NAVY, fontFamily: "var(--font-display)" }}
                  >
                    {value}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                    {sub}
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Pending Orders / Content based on online state ── */}
        {isOnline ? (
          <>
            {/* Ride offer */}
            {currentOffer && !activeOrder && (
              <div className="mb-6">
                <RideOfferCard
                  order={currentOffer}
                  secs={offerSecs}
                  onAccept={handleAcceptOffer}
                  onDecline={handleDeclineOffer}
                />
              </div>
            )}

            {/* Pending orders list header */}
            {pendingOrders.length > 1 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
                  Commandes en attente ({pendingOrders.length - 1})
                </p>
                <div className="flex flex-col gap-3">
                  {pendingOrders.slice(1).map((order) => {
                    const restaurantName = order.restaurantName ?? "Restaurant";
                    const earn = order.fee ?? 12;
                    const rawAddr = order.deliveryAddress ?? order.dropoff ?? "";
                    const dropLabel = (rawAddr.split(",").at(-1)?.trim() ?? rawAddr.slice(-24)) || "Livraison";
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl px-4 py-3 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex items-center gap-3"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: LIGHT_ORANGE }}
                        >
                          <Package size={16} style={{ color: ORANGE }} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                            {restaurantName}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: MUTED }}>
                            {dropLabel}
                          </p>
                        </div>
                        <span className="text-sm font-extrabold shrink-0" style={{ color: NAVY }}>
                          {earn} DH
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's runs */}
            <TodayRunsList runs={MOCK_RUNS} />
          </>
        ) : (
          <OfflineState onGoOnline={handleToggle} />
        )}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <BottomTabBar active={tab} onChange={setTab} />

      {/* ── SOS Emergency Button ── */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(239,68,68,0.4)] z-50 cursor-pointer"
        aria-label="SOS Urgence"
      >
        <AlertTriangle className="w-6 h-6" />
      </button>
    </div>
  );
}
