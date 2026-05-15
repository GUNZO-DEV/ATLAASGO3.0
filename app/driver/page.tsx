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
import ZelligeBg from "@/components/atlas/ZelligeBg";
import {
  Clock,
  History,
  Banknote,
  User,
  Phone,
  Navigation,
  CheckCircle2,
  Bike,
  type LucideProps,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = "#1B2440";
const ORANGE = "#E55A26";
const MINT = "#2DC08A";
const CREAM = "#F5F0E8";

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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Online/offline pill toggle */
function OnlineToggle({
  online,
  onToggle,
}: {
  online: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 cursor-pointer select-none"
      aria-label={online ? "Go offline" : "Go online"}
    >
      <span
        className="text-[10px] font-bold tracking-widest uppercase"
        style={{ color: online ? MINT : "#9CA3AF" }}
      >
        {online ? "ONLINE" : "OFFLINE"}
      </span>
      {/* Pill */}
      <div
        className="relative transition-colors duration-200"
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: online ? MINT : "#D1D5DB",
        }}
      >
        <div
          className="absolute top-[3px] transition-transform duration-200"
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            transform: online ? "translateX(21px)" : "translateX(3px)",
          }}
        />
      </div>
    </button>
  );
}

/** Earnings stat chip */
function StatChip({
  label,
  amount,
  sub,
  accent,
}: {
  label: string;
  amount: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl px-2.5 py-2"
      style={{
        background: "rgba(255,255,255,0.12)",
        border: accent ? `1px solid ${ORANGE}` : "1px solid rgba(255,255,255,0.08)",
        minWidth: 0,
        flex: 1,
      }}
    >
      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider truncate">
        {label}
      </span>
      <span className="text-sm font-bold text-white leading-tight">{amount}</span>
      <span className="text-[10px] text-white/40 leading-tight">{sub}</span>
    </div>
  );
}

/** Countdown chip — green → yellow → red */
function CountdownChip({ secs }: { secs: number }) {
  const color =
    secs > 12 ? "#2DC08A" : secs > 6 ? "#F59E0B" : "#EF4444";
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1"
      style={{ background: `${color}22`, border: `1px solid ${color}55` }}
    >
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: color }}
      />
      <span className="text-xs font-bold tabular-nums" style={{ color }}>
        {secs}s
      </span>
    </div>
  );
}

/** Ride offer card (animated in) */
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
  // Derive a short delivery address label from deliveryAddress
  const rawAddr = order.deliveryAddress ?? order.dropoff ?? "";
  const addrParts = rawAddr.split(",");
  const dropLabel =
    addrParts.length > 1
      ? addrParts[addrParts.length - 1].trim()
      : rawAddr.slice(-30) || "Livraison";
  const pickupLabel = order.pickup ?? "Pickup";

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-4 duration-300"
      style={{ border: `2px solid ${ORANGE}`, background: "#fff" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: `${ORANGE}0F` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: ORANGE }}
          />
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
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {itemCount} article{itemCount !== 1 ? "s" : ""} · {order.total != null ? `${order.total} DH` : ""}
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
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            style={{ background: "#F3F4F6", color: "#6B7280" }}
          >
            Refuser
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-opacity"
            style={{ background: ORANGE, color: "#fff" }}
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

/** Active delivery card */
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
      ? "Se rendre chez Dar Naji"
      : `Livrer chez ${order?.dropoff ?? "Ahmed H."}`;
  const subtitle =
    stage === "heading_pickup"
      ? order?.pickup ?? "Médina, Marrakech"
      : order?.dropoff ?? "Maârif, Casablanca";
  const ctaLabel = stage === "heading_pickup" ? "Colis récupéré" : "Livré !";
  const onCta = stage === "heading_pickup" ? onPickedUp : onDelivered;
  const orderId = order?.id ?? "ATL-8742";

  return (
    <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "#fff" }}>
      {/* Map */}
      <div className="relative" style={{ height: 200 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/images/src-map.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Distance chip */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: MINT }}
          />
          <span className="text-xs font-semibold" style={{ color: NAVY }}>
            600 m · 3 min
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Stage badge */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: ORANGE }} />
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: ORANGE }}
          >
            COURSE ACTIVE · #{orderId.replace("orders/", "").slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <p className="text-lg font-extrabold leading-tight" style={{ color: NAVY, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          {title}
        </p>

        {/* Subtitle */}
        <p className="text-sm" style={{ color: "#6B7280" }}>{subtitle}</p>

        {/* Address chip */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: `${NAVY}08` }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: stage === "heading_pickup" ? `${MINT}22` : `${ORANGE}22` }}
          >
            <Navigation
              size={14}
              style={{ color: stage === "heading_pickup" ? MINT : ORANGE }}
              strokeWidth={2.2}
            />
          </div>
          <span className="flex-1 text-xs font-medium truncate" style={{ color: NAVY }}>
            {subtitle}
          </span>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: NAVY }}
            aria-label="Appeler"
          >
            <Phone size={15} color="#fff" strokeWidth={2} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-0.5">
          <button
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: CREAM, color: NAVY }}
          >
            Naviguer
          </button>
          <button
            onClick={onCta}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold"
            style={{ background: ORANGE, color: "#fff" }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Today's runs list */
function TodayRunsList({
  runs,
}: {
  runs: typeof MOCK_RUNS;
}) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "#fff" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color: NAVY }}>
          Courses aujourd&apos;hui
        </span>
        <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>
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
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
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

/** Offline empty state */
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
        <p className="text-xl font-extrabold mb-1" style={{ color: NAVY, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          Hors-ligne
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
          Tu n&apos;es pas visible pour recevoir des courses. Active ton statut pour commencer à livrer.
        </p>
      </div>
      <button
        onClick={onGoOnline}
        className="rounded-xl px-6 py-3 text-sm font-bold"
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

function BottomTabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const activeIdx = TABS.findIndex((t) => t.id === active);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
        borderColor: "#E5E7EB",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Sliding orange indicator */}
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

      <div className="flex">
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: CREAM }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full animate-pulse"
            style={{ background: `${NAVY}22` }}
          />
          <div
            className="w-24 h-3 rounded-full animate-pulse"
            style={{ background: `${NAVY}18` }}
          />
        </div>
      </div>
    );
  }

  const prof = profile ?? MOCK_PROFILE;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative flex flex-col min-h-screen overflow-hidden"
      style={{ background: CREAM, maxWidth: 480, margin: "0 auto" }}
    >
      {/* ── 1. Header ── */}
      <header
        className="flex items-center justify-between px-4 border-b shrink-0"
        style={{
          background: "#fff",
          borderColor: "#E5E7EB",
          padding: "14px 16px",
          zIndex: 40,
        }}
      >
        {/* Left: avatar + name + rating */}
        <div className="flex items-center gap-3">
          <Sprite id={prof.avatar ?? "avatar:youssef"} width={44} height={44} radius={22} />
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: NAVY }}>
              {prof.name}
            </p>
            <p className="text-[11px] leading-tight" style={{ color: `${NAVY}80` }}>
              {prof.rating.toFixed(2)} · {prof.totalDeliveries.toLocaleString("fr-MA")} livraisons
            </p>
          </div>
        </div>

        {/* Right: online toggle */}
        <OnlineToggle online={isOnline} onToggle={togglingOnline ? () => {} : handleToggle} />
      </header>

      {/* ── 2. Earnings Strip ── */}
      <div
        className="relative overflow-hidden shrink-0"
        style={{ background: NAVY, padding: "14px 16px" }}
      >
        {/* Zellige overlay */}
        <div className="absolute inset-0 opacity-[0.12]">
          <ZelligeBg opacity={1} color="#fff" />
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          {/* Top row: label + amount + withdraw */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                GAINS
              </p>
              <p
                className="text-[28px] font-extrabold text-white leading-none"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {prof.earningsToday} DH
              </p>
            </div>
            <button
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold"
              style={{ background: ORANGE, color: "#fff" }}
            >
              <Banknote size={16} strokeWidth={2} />
              Retirer
            </button>
          </div>

          {/* 3 stat chips */}
          <div className="flex gap-2">
            <StatChip
              label="Aujourd'hui"
              amount={`${prof.earningsToday} DH`}
              sub={`${prof.runsToday} courses`}
            />
            <StatChip
              label="Semaine"
              amount={`${prof.earningsWeek} DH`}
              sub={`${prof.runsWeek} courses`}
            />
            <StatChip
              label="Pourboires"
              amount={`${prof.tipsTotal} DH`}
              sub={`avg ${prof.runsToday > 0 ? Math.round(prof.tipsTotal / prof.runsToday) : 6} DH`}
              accent
            />
          </div>
        </div>
      </div>

      {/* ── 3. Scrollable main content ── */}
      <main className="flex-1 overflow-y-auto pb-24" style={{ padding: "14px 16px" }}>
        <div className="flex flex-col gap-3">
          {isOnline ? (
            <>
              {/* Active delivery */}
              {stage !== "none" && (
                <ActiveDeliveryCard
                  order={activeOrder}
                  stage={stage as "heading_pickup" | "heading_dropoff"}
                  onPickedUp={handlePickedUp}
                  onDelivered={handleDelivered}
                />
              )}

              {/* Ride offer */}
              {currentOffer && !activeOrder && (
                <RideOfferCard
                  order={currentOffer}
                  secs={offerSecs}
                  onAccept={handleAcceptOffer}
                  onDecline={handleDeclineOffer}
                />
              )}

              {/* Today's runs */}
              <TodayRunsList runs={MOCK_RUNS} />
            </>
          ) : (
            <OfflineState onGoOnline={handleToggle} />
          )}
        </div>
      </main>

      {/* ── 4. Bottom Tab Bar ── */}
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}
