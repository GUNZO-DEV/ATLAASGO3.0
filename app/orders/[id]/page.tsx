// app/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Phone, ChevronLeft, Star, MessageCircle, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToOrder, cancelOrder, expireStaleOrders } from "@/lib/orders";
import Sprite from "@/components/atlas/Sprite";
import type { Order, OrderStatus } from "@/types/order";

// ─── Stage config ─────────────────────────────────────────────────────────────

type Stage = {
  index: number;
  title: (restaurantName?: string) => string;
  subtitle: string;
  eta: string;
};

const STAGES: Record<Exclude<OrderStatus, "cancelled" | "expired">, Stage> = {
  pending: {
    index: 0,
    title: () => "En attente de confirmation",
    subtitle: "Nous cherchons un restaurant pour accepter votre commande.",
    eta: "30–35 min",
  },
  accepted: {
    index: 1,
    title: (r) => `Préparation chez ${r ?? "le restaurant"}`,
    subtitle: "Le restaurant prépare votre commande avec soin.",
    eta: "20–25 min",
  },
  picked_up: {
    index: 2,
    title: () => "Coursier en route !",
    subtitle: "Votre commande est entre les mains de votre coursier.",
    eta: "10–15 min",
  },
  delivered: {
    index: 3,
    title: () => "Livré ! Bon appétit 🎉",
    subtitle: "Votre commande est arrivée. Régalez-vous !",
    eta: "Livré !",
  },
};

const STEP_LABELS = ["En attente", "Préparation", "Coursier en route", "Livré !"];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-brand border-t-transparent animate-atlas-spin" />
        <p className="text-navy-soft text-sm font-medium">Chargement de votre commande…</p>
      </div>
    </div>
  );
}

// ─── Celebration card (delivered) ────────────────────────────────────────────

function CelebrationCard({ orderId, alreadyReviewed }: { orderId: string; alreadyReviewed: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-6 text-center animate-atlas-success-pop shadow-sm border border-mint/20">
      <div className="text-5xl mb-3 animate-atlas-float inline-block">🎉</div>
      <h2 className="text-navy font-extrabold text-2xl mb-1" style={{ fontFamily: "var(--font-display)" }}>
        Bon appétit !
      </h2>
      <p className="text-navy-soft text-sm mb-5">Votre commande a été livrée avec succès.</p>
      <div className="flex flex-col gap-2 items-center">
        {!alreadyReviewed && (
          <Link
            href={`/orders/${orderId}/review`}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-6 py-2.5 rounded-full transition shadow-[0_2px_10px_rgba(229,90,38,0.3)] hover:shadow-[0_4px_16px_rgba(229,90,38,0.45)]"
          >
            <Star className="w-4 h-4 fill-white" />
            Noter cette commande
          </Link>
        )}
        <Link
          href="/restaurants"
          className={`inline-flex items-center gap-2 text-sm font-semibold transition px-6 py-2.5 rounded-full ${
            alreadyReviewed
              ? "bg-brand hover:bg-brand-dark text-white shadow-[0_2px_10px_rgba(229,90,38,0.3)] hover:shadow-[0_4px_16px_rgba(229,90,38,0.45)]"
              : "border border-navy/15 text-navy hover:bg-navy/5"
          }`}
        >
          Commander à nouveau
        </Link>
      </div>
    </div>
  );
}

// ─── Confetti dots ────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#E55A26", "#2EC089", "#F2B53A", "#D9486F", "#1B2440"];

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm animate-atlas-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${i * 0.06}s`,
            animationDuration: `${0.7 + Math.random() * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Progress stepper ─────────────────────────────────────────────────────────

function ProgressStepper({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex gap-1.5 mt-4">
      {STEP_LABELS.map((label, i) => {
        const filled = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={label} className="flex-1 flex flex-col gap-1">
            <div
              className={[
                "h-1.5 rounded-full transition-all duration-500",
                filled
                  ? "bg-brand"
                  : active
                  ? "bg-[length:200%_100%] animate-atlas-shimmer"
                  : "bg-[rgba(27,36,64,0.10)]",
              ].join(" ")}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(90deg, #E55A26 0%, #FCEAD9 50%, #E55A26 100%)",
                      backgroundSize: "200% 100%",
                    }
                  : undefined
              }
            />
            <span
              className={[
                "text-[10px] font-medium leading-none truncate",
                filled || active ? "text-brand" : "text-navy-soft/60",
              ].join(" ")}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Chat message type ────────────────────────────────────────────────────────

interface ChatMessage {
  from: "support" | "user";
  text: string;
  time: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    from: "support",
    text: "Votre commande est confirmée ! Nous vous tiendrons informé à chaque étape.",
    time: "maintenant",
  },
  {
    from: "support",
    text: "Besoin d'aide ? N'hésitez pas à nous écrire ici.",
    time: "maintenant",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Resolve async params (Next.js 16)
  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  // Auth guard + capture uid for cancel/expire operations
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
      // Sweep any stale pending orders this customer left behind.
      // Fires once per session per page load — best-effort, errors ignored.
      expireStaleOrders(user.uid).catch(() => {});
    });
    return unsub;
  }, [router]);

  // Track whether this order has been reviewed so we can hide the Rate CTA.
  useEffect(() => {
    if (!uid || !orderId) return;
    let active = true;
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const snap = await getDoc(doc(db, "users", uid));
        if (!active) return;
        const reviewed = (snap.data()?.reviewedOrderIds ?? []) as string[];
        setAlreadyReviewed(reviewed.includes(orderId));
      } catch {
        // Not critical — defaults to false (Rate button visible)
      }
    })();
    return () => { active = false; };
  }, [uid, orderId]);

  // Cancel handler — only valid while the order is still pending.
  const handleCancel = async () => {
    if (!orderId || !uid || cancelling) return;
    if (!order || order.status !== "pending") return;
    if (!confirm("Annuler cette commande ?")) return;
    setCancelling(true);
    try {
      await cancelOrder(orderId, uid);
    } catch (err) {
      console.error("Cancel failed:", err);
      alert("Impossible d'annuler. Réessayez.");
    } finally {
      setCancelling(false);
    }
  };

  // Real-time Firebase subscription
  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeToOrder(orderId, (o) => {
      setOrder(o);
      setLoading(false);
    });
    return unsub;
  }, [orderId]);

  // Card payment redirect: ?pay=card on a pending order → card payment screen
  useEffect(() => {
    if (!orderId || !order || loading) return;
    if (searchParams.get("pay") === "card" && order.status === "pending") {
      router.replace(`/orders/${orderId}/card-payment`);
    }
  }, [orderId, order, loading, searchParams, router]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString("fr-MA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [...prev, { from: "user", text, time: now }]);
    setChatInput("");
    // Simulate a support reply after 1.5s
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: "support",
          text: "Merci pour votre message. Un agent vous répondra bientôt.",
          time: new Date().toLocaleTimeString("fr-MA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }, 1500);
  }

  // ── Loading state ──
  if (loading) return <LoadingSkeleton />;

  // ── Not found ──
  if (!order) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-navy-soft text-base">Commande introuvable.</p>
        <Link href="/restaurants" className="text-brand text-sm font-semibold underline underline-offset-2">
          Découvrir les restaurants
        </Link>
      </div>
    );
  }

  // ── Cancelled / expired ──
  if (order.status === "cancelled" || order.status === "expired") {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 p-6">
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm max-w-sm w-full">
          <div className="text-4xl mb-3">😔</div>
          <h2 className="text-navy font-extrabold text-xl mb-1">
            Commande {order.status === "cancelled" ? "annulée" : "expirée"}
          </h2>
          <p className="text-navy-soft text-sm mb-5">
            Votre commande #{orderId?.slice(-6).toUpperCase()} n&apos;est plus active.
          </p>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-sm px-6 py-2.5 rounded-full"
          >
            Commander à nouveau
          </Link>
        </div>
      </div>
    );
  }

  const stage = STAGES[order.status as Exclude<OrderStatus, "cancelled" | "expired">];
  const currentIndex = stage.index;
  const isDelivered = order.status === "delivered";
  const restaurantName = order.restaurantName ?? order.pickup ?? "Le restaurant";

  return (
    <div className="min-h-screen bg-cream">
      {/* ─── Back bar ──────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-8 pt-6 pb-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-navy-soft hover:text-navy text-sm font-medium transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Tableau de bord
        </Link>
      </div>

      {/* ─── Main layout ───────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto p-8">
        {/* Desktop: 3-col grid | Mobile: single column (status card only visible on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_380px_1fr] gap-5">

          {/* ══════════════════════════════════════════════════════
              Column 1 — Order Status
          ══════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">

            {/* Delivered celebration */}
            {isDelivered && (
              <div className="relative">
                <Confetti />
                <CelebrationCard orderId={orderId ?? ""} alreadyReviewed={alreadyReviewed} />
              </div>
            )}

            {/* Status card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm animate-atlas-fade-up">
              {/* Live pulse indicator */}
              {!isDelivered && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-mint animate-pulse inline-block" />
                  <span className="text-mint font-bold text-[10px] tracking-widest uppercase">
                    Commande en cours
                  </span>
                </div>
              )}

              {/* Stage title */}
              <h1
                className="text-navy font-extrabold text-2xl leading-tight mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {stage.title(restaurantName)}
              </h1>

              {/* Stage subtitle */}
              <p className="text-navy-soft text-[13px] mb-4 leading-relaxed">
                {stage.subtitle}
              </p>

              {/* ETA */}
              {!isDelivered && (
                <div className="mb-1">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-navy-soft mb-0.5">
                    Arrivée estimée
                  </p>
                  <p
                    className="text-brand font-extrabold text-[36px] leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {stage.eta}
                  </p>
                </div>
              )}

              {/* Progress stepper */}
              <ProgressStepper currentIndex={currentIndex} />
            </div>

            {/* Driver card */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <Sprite id="avatar:youssef" width={50} height={50} radius={25} />
              <div className="flex-1 min-w-0">
                <p className="text-navy font-bold text-sm leading-tight">Youssef El Fassi</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-saffron fill-saffron" />
                  <span className="text-navy-soft text-xs font-medium">4.9</span>
                  <span className="text-navy-soft/50 text-xs">·</span>
                  <span className="text-navy-soft text-xs">342 livraisons</span>
                </div>
              </div>
              <button
                aria-label="Appeler le coursier"
                className="w-[38px] h-[38px] rounded-full bg-navy flex items-center justify-center shrink-0 hover:bg-navy-2 transition"
              >
                <Phone className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Order details card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-navy-soft">
                    Commande
                  </p>
                  <p className="text-navy font-bold text-sm leading-tight">
                    #{orderId?.slice(-6).toUpperCase()}
                  </p>
                </div>
                <p className="text-navy-soft text-xs text-right leading-tight">
                  {restaurantName}
                </p>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-baseline gap-2">
                      <span className="text-navy-soft text-sm leading-tight truncate">
                        <span className="text-navy font-semibold mr-1">
                          {item.quantity ?? 1}×
                        </span>
                        {item.name ?? item.description ?? "Article"}
                      </span>
                      {item.price != null && (
                        <span className="text-navy text-sm font-medium shrink-0">
                          {(item.price * (item.quantity ?? 1)).toFixed(0)} MAD
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Divider */}
                  <div className="border-t border-[rgba(27,36,64,0.08)] pt-2 mt-1">
                    {order.fee != null && (
                      <div className="flex justify-between text-[12px] text-navy-soft mb-1">
                        <span>Frais de livraison</span>
                        <span>{order.fee} MAD</span>
                      </div>
                    )}
                    {(order.total ?? order.subtotal) != null && (
                      <div className="flex justify-between text-sm font-bold text-navy">
                        <span>Total payé</span>
                        <span>{order.total ?? order.subtotal} MAD</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cancel order — only available while still pending */}
            {order.status === "pending" && uid === order.customerId && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-center gap-2 text-sm font-bold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X className="w-4 h-4" />
                {cancelling ? "Annulation…" : "Annuler la commande"}
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              Column 2 — Chat Panel
              Hidden on mobile (< lg) — not critical tracking info
          ══════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[rgba(27,36,64,0.08)]">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-navy font-bold text-sm leading-none">Support & Chat</p>
                <p className="text-mint text-[11px] font-medium mt-0.5">En ligne</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[440px]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={[
                    "flex gap-2 animate-atlas-fade-up",
                    msg.from === "user" ? "flex-row-reverse" : "",
                  ].join(" ")}
                >
                  {msg.from === "support" && (
                    <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 text-white text-[10px] font-bold">
                      A
                    </div>
                  )}
                  <div
                    className={[
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.from === "support"
                        ? "bg-[rgba(27,36,64,0.05)] text-navy rounded-tl-none"
                        : "bg-brand text-white rounded-tr-none",
                    ].join(" ")}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={[
                        "text-[10px] mt-1 text-right",
                        msg.from === "support" ? "text-navy-soft/60" : "text-white/70",
                      ].join(" ")}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[rgba(27,36,64,0.08)] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Écrire un message…"
                className="flex-1 text-sm bg-[rgba(27,36,64,0.04)] rounded-xl px-3 py-2 text-navy placeholder:text-navy-soft/50 outline-none focus:ring-1 focus:ring-brand/40 transition"
              />
              <button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-full bg-brand disabled:opacity-40 flex items-center justify-center transition hover:bg-brand-dark"
                aria-label="Envoyer"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M12.5 1.5L1.5 7l4.5 1.5L12.5 1.5zm0 0L6 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              Column 3 — Map
              Hidden on mobile (< lg)
          ══════════════════════════════════════════════════════ */}
          <div className="hidden lg:block relative bg-white rounded-2xl overflow-hidden shadow-sm min-h-[520px]">
            {/* Map background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/images/src-map.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-hidden
            />

            {/* Vignette overlay */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(27,36,64,0.06) 0%, transparent 40%)",
              }}
              aria-hidden
            />

            {/* Info chip — top left */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
              <div>
                <p className="text-navy font-bold text-xs leading-none">{restaurantName}</p>
                <p className="text-navy-soft text-[10px] mt-0.5 font-medium">
                  ~{order.zone ?? "2.4 km"}
                </p>
              </div>
            </div>

            {/* Live indicator — bottom right */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
              <span className="text-navy text-[11px] font-semibold">Suivi en direct</span>
            </div>

            {/* Animated map pin */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full animate-atlas-marker-drop"
              aria-hidden
            >
              <div className="w-10 h-10 rounded-full bg-brand border-2 border-white shadow-lg flex items-center justify-center text-white text-lg">
                🛵
              </div>
              <div className="w-3 h-3 bg-brand/30 rounded-full mx-auto -mt-1 blur-sm" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
