// app/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  ChevronLeft,
  Star,
  MessageCircle,
  X,
  MapPin,
  User,
  Share2,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToOrder, cancelOrder, expireStaleOrders } from "@/lib/orders";
import type { Order, OrderStatus } from "@/types/order";

// ─── Stage config ─────────────────────────────────────────────────────────────

type Stage = {
  index: number;
  title: (restaurantName?: string) => string;
  subtitle: string;
  eta: string;
};

const STAGES: Record<string, Stage> = {
  pending:   { index: 0, title: () => "Commande passée",                         subtitle: "Votre commande a été envoyée au restaurant.",  eta: "30–35 min" },
  accepted:  { index: 1, title: (r) => `Acceptée par ${r ?? "le restaurant"}`,   subtitle: "Le restaurant a accepté votre commande.",      eta: "25–30 min" },
  preparing: { index: 2, title: () => "En préparation",                           subtitle: "Le restaurant prépare votre commande.",         eta: "20–25 min" },
  ready:     { index: 3, title: () => "Prête !",                                  subtitle: "Votre commande attend le coursier.",            eta: "15–20 min" },
  picked_up: { index: 4, title: () => "Coursier en route !",                      subtitle: "Votre commande est en chemin.",                 eta: "10–15 min" },
  delivered: { index: 5, title: () => "Livré ! Bon appétit 🎉",                   subtitle: "Votre commande est arrivée.",                   eta: "Livré !"   },
};

const STEP_LABELS = ["Passée", "Acceptée", "Préparation", "Prête", "En route", "Livré"];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#E55A26] border-t-transparent animate-spin" />
        <p className="text-[#6B7A9E] text-sm font-medium">Chargement de votre commande…</p>
      </div>
    </div>
  );
}

// ─── Celebration card (delivered) ────────────────────────────────────────────

function CelebrationCard({ orderId, alreadyReviewed }: { orderId: string; alreadyReviewed: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_10px_rgba(27,36,64,0.06)] border border-[#2DC08A]/20">
      <div className="text-5xl mb-3 inline-block">🎉</div>
      <h2 className="text-[#1B2440] font-extrabold text-2xl mb-1" style={{ fontFamily: "var(--font-display)" }}>
        Bon appétit !
      </h2>
      <p className="text-[#6B7A9E] text-sm mb-5">Votre commande a été livrée avec succès.</p>
      <div className="flex flex-col gap-2 items-center">
        {!alreadyReviewed && (
          <Link
            href={`/orders/${orderId}/review`}
            className="inline-flex items-center gap-2 bg-[#E55A26] hover:bg-[#c94d20] text-white font-semibold text-sm px-6 py-2.5 rounded-full transition shadow-[0_2px_10px_rgba(229,90,38,0.3)] hover:shadow-[0_4px_16px_rgba(229,90,38,0.45)]"
          >
            <Star className="w-4 h-4 fill-white" />
            Noter cette commande
          </Link>
        )}
        <Link
          href="/restaurants"
          className={`inline-flex items-center gap-2 text-sm font-semibold transition px-6 py-2.5 rounded-full ${
            alreadyReviewed
              ? "bg-[#E55A26] hover:bg-[#c94d20] text-white shadow-[0_2px_10px_rgba(229,90,38,0.3)] hover:shadow-[0_4px_16px_rgba(229,90,38,0.45)]"
              : "border border-[#1B2440]/15 text-[#1B2440] hover:bg-[#1B2440]/5"
          }`}
        >
          Commander à nouveau
        </Link>
      </div>
    </div>
  );
}

// ─── Confetti dots ────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#E55A26", "#2DC08A", "#F0A500", "#D9486F", "#1B2440"];

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm animate-bounce"
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
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-[#6B7A9E] text-base">Commande introuvable.</p>
        <Link href="/restaurants" className="text-[#E55A26] text-sm font-semibold underline underline-offset-2">
          Découvrir les restaurants
        </Link>
      </div>
    );
  }

  // ── Cancelled / expired ──
  if (order.status === "cancelled" || order.status === "expired") {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center gap-4 p-6">
        <div className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_10px_rgba(27,36,64,0.06)] max-w-sm w-full">
          <div className="text-4xl mb-3">😔</div>
          <h2 className="text-[#1B2440] font-extrabold text-xl mb-1">
            Commande {order.status === "cancelled" ? "annulée" : "expirée"}
          </h2>
          <p className="text-[#6B7A9E] text-sm mb-5">
            Votre commande #{orderId?.slice(-6).toUpperCase()} n&apos;est plus active.
          </p>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 bg-[#E55A26] text-white font-semibold text-sm px-6 py-2.5 rounded-full"
          >
            Commander à nouveau
          </Link>
        </div>
      </div>
    );
  }

  const currentStage = STAGES[order.status as string];
  const currentIdx = currentStage?.index ?? 0;
  const isDelivered = order.status === "delivered";
  const restaurantName = order.restaurantName ?? order.pickup ?? "Le restaurant";

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* ─── Back bar ──────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-6 pb-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[#6B7A9E] hover:text-[#1B2440] text-sm font-medium transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Tableau de bord
        </Link>
      </div>

      {/* ─── Main layout ───────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5">

          {/* ══════════════════════════════════════════════════════
              Column 1 — Order Status + Timeline (mobile-first)
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
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
              {/* Live pulse indicator */}
              {!isDelivered && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#2DC08A] animate-pulse inline-block" />
                  <span className="text-[#2DC08A] font-bold text-[10px] tracking-widest uppercase">
                    Commande en cours
                  </span>
                </div>
              )}

              {/* Stage title */}
              <h1
                className="text-[#1B2440] font-extrabold text-2xl leading-tight mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {currentStage?.title(restaurantName) ?? "—"}
              </h1>

              {/* Stage subtitle */}
              <p className="text-[#6B7A9E] text-[13px] mb-4 leading-relaxed">
                {currentStage?.subtitle}
              </p>

              {/* ETA */}
              {!isDelivered && (
                <div className="mb-1">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#6B7A9E] mb-0.5">
                    Arrivée estimée
                  </p>
                  <p
                    className="text-[#E55A26] font-extrabold text-[36px] leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {currentStage?.eta}
                  </p>
                </div>
              )}
            </div>

            {/* ── Map placeholder ── */}
            <div className="bg-gradient-to-b from-[#1B2440] to-[#0D1628] rounded-2xl h-[200px] mb-0 flex items-center justify-center relative overflow-hidden shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.08]"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative text-center">
                <MapPin className="w-8 h-8 text-[#E55A26] mx-auto mb-2" />
                <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Carte en temps réel</p>
                <p className="text-white/40 text-[11px] mt-0.5">Google Maps bientôt disponible</p>
              </div>
              {/* ETA countdown */}
              <div className="absolute top-4 right-4 bg-white/10 backdrop-blur rounded-xl px-3 py-2">
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">ETA</p>
                <p
                  className="text-lg font-extrabold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {currentStage?.eta ?? "—"}
                </p>
              </div>
            </div>

            {/* ── Rider card — shown when accepted or picked_up ── */}
            {(order.status === "accepted" || order.status === "picked_up") && (
              <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E55A26]/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-[#E55A26]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#1B2440] text-sm">Youssef M.</p>
                  <div className="flex items-center gap-2 text-[11px] text-[#6B7A9E] mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-[#F0A500] text-[#F0A500]" /> 4.8
                    </span>
                    <span>·</span>
                    <span>Scooter</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-label="Appeler le coursier"
                    className="w-10 h-10 rounded-xl bg-[#2DC08A]/10 flex items-center justify-center cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-[#2DC08A]" />
                  </button>
                  <Link
                    href={`/orders/${orderId}/chat`}
                    className="w-10 h-10 rounded-xl bg-[#E55A26]/10 flex items-center justify-center"
                    aria-label="Chat avec le coursier"
                  >
                    <MessageCircle className="w-4 h-4 text-[#E55A26]" />
                  </Link>
                </div>
              </div>
            )}

            {/* ── 6-stage vertical timeline ── */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7A9E] mb-4">
                Suivi de commande
              </p>
              <div className="space-y-0">
                {STEP_LABELS.map((label, i) => {
                  const reached = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={[
                            "w-3 h-3 rounded-full border-2",
                            reached
                              ? "bg-[#E55A26] border-[#E55A26]"
                              : "bg-white border-[#6B7A9E]/30",
                            isCurrent ? "ring-4 ring-[#E55A26]/20" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        />
                        {i < STEP_LABELS.length - 1 && (
                          <div
                            className={`w-0.5 h-8 ${reached ? "bg-[#E55A26]" : "bg-[#6B7A9E]/20"}`}
                          />
                        )}
                      </div>
                      <div className="pb-6">
                        <p
                          className={`text-sm font-bold ${
                            reached ? "text-[#1B2440]" : "text-[#6B7A9E]/60"
                          }`}
                        >
                          {label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-[#6B7A9E] mt-0.5">{currentStage?.subtitle}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Share location button ── */}
            {!isDelivered && (
              <button
                type="button"
                className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex items-center justify-center gap-2.5 text-sm font-bold text-[#1B2440] hover:bg-[#FEF0E7] transition cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#E55A26]" />
                Partager le suivi de ma commande
              </button>
            )}

            {/* ── Order items card ── */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#6B7A9E]">
                    Commande
                  </p>
                  <p className="text-[#1B2440] font-bold text-sm leading-tight">
                    #{orderId?.slice(-6).toUpperCase()}
                  </p>
                </div>
                <p className="text-[#6B7A9E] text-xs text-right leading-tight">{restaurantName}</p>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-baseline gap-2">
                      <span className="text-[#6B7A9E] text-sm leading-tight truncate">
                        <span className="text-[#1B2440] font-semibold mr-1">
                          {item.quantity ?? 1}×
                        </span>
                        {item.name ?? item.description ?? "Article"}
                      </span>
                      {item.price != null && (
                        <span className="text-[#1B2440] text-sm font-medium shrink-0">
                          {(item.price * (item.quantity ?? 1)).toFixed(0)} MAD
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Divider + totals */}
                  <div className="border-t border-[rgba(27,36,64,0.08)] pt-2 mt-1">
                    {order.fee != null && (
                      <div className="flex justify-between text-[12px] text-[#6B7A9E] mb-1">
                        <span>Frais de livraison</span>
                        <span>{order.fee} MAD</span>
                      </div>
                    )}
                    {(order.total ?? order.subtotal) != null && (
                      <div className="flex justify-between text-sm font-bold text-[#1B2440]">
                        <span>Total payé</span>
                        <span>{order.total ?? order.subtotal} MAD</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Cancel order — only available while still pending ── */}
            {order.status === "pending" && uid === order.customerId && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex items-center justify-center gap-2 text-sm font-bold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X className="w-4 h-4" />
                {cancelling ? "Annulation…" : "Annuler la commande"}
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              Column 2 — Chat Panel (desktop only)
          ══════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex flex-col bg-white rounded-2xl shadow-[0_2px_10px_rgba(27,36,64,0.06)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[rgba(27,36,64,0.08)]">
              <div className="w-8 h-8 rounded-full bg-[#E55A26]/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-[#E55A26]" />
              </div>
              <div>
                <p className="text-[#1B2440] font-bold text-sm leading-none">Support & Chat</p>
                <p className="text-[#2DC08A] text-[11px] font-medium mt-0.5">En ligne</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[440px]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={[
                    "flex gap-2",
                    msg.from === "user" ? "flex-row-reverse" : "",
                  ].join(" ")}
                >
                  {msg.from === "support" && (
                    <div className="w-7 h-7 rounded-full bg-[#E55A26] flex items-center justify-center shrink-0 text-white text-[10px] font-bold">
                      A
                    </div>
                  )}
                  <div
                    className={[
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.from === "support"
                        ? "bg-[rgba(27,36,64,0.05)] text-[#1B2440] rounded-tl-none"
                        : "bg-[#E55A26] text-white rounded-tr-none",
                    ].join(" ")}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={[
                        "text-[10px] mt-1 text-right",
                        msg.from === "support" ? "text-[#6B7A9E]/60" : "text-white/70",
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
                className="flex-1 text-sm bg-[rgba(27,36,64,0.04)] rounded-xl px-3 py-2 text-[#1B2440] placeholder:text-[#6B7A9E]/50 outline-none focus:ring-1 focus:ring-[#E55A26]/40 transition"
              />
              <button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-full bg-[#E55A26] disabled:opacity-40 flex items-center justify-center transition hover:bg-[#c94d20]"
                aria-label="Envoyer"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M12.5 1.5L1.5 7l4.5 1.5L12.5 1.5zm0 0L6 9"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
