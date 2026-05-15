// app/orders/[id]/card-payment/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck, Check } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getOrder } from "@/lib/orders";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Order } from "@/types/order";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "form" | "3ds" | "processing" | "success";
type Brand = "visa" | "mastercard" | "amex" | "generic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(v: string): string {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function fmtExp(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 3) return d;
  return d.slice(0, 2) + "/" + d.slice(2);
}

function detectBrand(numClean: string): Brand {
  if (numClean.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(numClean)) return "mastercard";
  if (/^3[47]/.test(numClean)) return "amex";
  return "generic";
}

// ─── Brand pill ───────────────────────────────────────────────────────────────

function BrandMark({ brand }: { brand: Brand }) {
  const label =
    brand === "visa"
      ? "VISA"
      : brand === "mastercard"
      ? "MC"
      : brand === "amex"
      ? "AMEX"
      : "CARD";
  return (
    <div className="px-2.5 py-1 rounded-md text-white text-xs font-extrabold tracking-wider backdrop-blur-sm bg-white/20"
      style={{ fontFamily: "var(--font-display)" }}>
      {label}
    </div>
  );
}

// ─── Input field wrapper ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] font-extrabold uppercase tracking-widest text-navy-soft mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Card preview ─────────────────────────────────────────────────────────────

function CardPreview({
  displayNum,
  displayName,
  displayExp,
  brand,
}: {
  displayNum: string;
  displayName: string;
  displayExp: string;
  brand: Brand;
}) {
  const gradientClass =
    brand === "visa"
      ? "from-[#1B2B5C] via-[#1E2E66] to-[#1A1F3A]"
      : brand === "mastercard"
      ? "from-[#6B1717] via-[#4A1212] to-[#2B0E0E]"
      : "from-[#1B2440] via-[#243057] to-[#0F1729]";

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden text-white bg-gradient-to-br ${gradientClass} shadow-[0_20px_50px_rgba(27,36,64,0.30)] transition-all duration-300`}
      style={{ minHeight: 200, padding: "24px 26px" }}
    >
      {/* Zellige pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          opacity: 0.5,
        }}
        aria-hidden
      />

      {/* Top row */}
      <div className="relative flex justify-between items-start">
        <div>
          <div className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
            AtlaasGo
          </div>
          <div className="text-[12px] opacity-80 mt-0.5">CMI · Carte bancaire</div>
        </div>
        <BrandMark brand={brand} />
      </div>

      {/* Chip */}
      <div
        className="relative mt-5 rounded-md"
        style={{
          width: 40,
          height: 30,
          background: "linear-gradient(135deg, #E8C56B, #B8862E)",
        }}
      >
        <div className="absolute inset-[4px_6px] rounded-sm border border-black/18" />
      </div>

      {/* Card number */}
      <div
        className="relative mt-4 text-[22px] font-semibold tracking-[0.12em]"
        style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}
      >
        {displayNum}
      </div>

      {/* Bottom row */}
      <div className="relative flex justify-between mt-4">
        <div>
          <div className="text-[9px] opacity-60 uppercase tracking-widest">Titulaire</div>
          <div
            className="text-[13px] font-bold mt-0.5 tracking-[0.06em]"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {displayName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] opacity-60 uppercase tracking-widest">Expire</div>
          <div
            className="text-[13px] font-bold mt-0.5 tracking-[0.06em]"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {displayExp}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CardPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  // Params
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Card form
  const [useSaved, setUseSaved] = useState(true);
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [save, setSave] = useState(true);
  const [stage, setStage] = useState<Stage>("form");
  const [otp, setOtp] = useState("");

  // Derived
  const numClean = num.replace(/\s/g, "");
  const brand = detectBrand(numClean);
  const valid =
    useSaved ||
    (numClean.length === 16 &&
      name.length > 2 &&
      /^\d{2}\/\d{2}$/.test(exp) &&
      cvc.length >= 3);

  const displayNum = useSaved
    ? "4287 •••• •••• 4287"
    : num || "•••• •••• •••• ••••";
  const displayName = useSaved
    ? "A. HASSANI"
    : name.toUpperCase() || "NOM SUR LA CARTE";
  const displayExp = useSaved ? "11/27" : exp || "MM/YY";
  const displayBrand: Brand = useSaved ? "visa" : brand;

  // ── Resolve async params ──
  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  // ── Auth guard ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  // ── Load order ──
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      const o = await getOrder(orderId);
      if (cancelled) return;
      if (!o) {
        router.push("/dashboard");
        return;
      }
      // Auth check: compare after auth settles (done via onAuthStateChanged above)
      setOrder(o);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId, router]);

  // ── Auth + ownership guard (runs after both order and auth are resolved) ──
  useEffect(() => {
    if (!order || loading) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user || user.uid !== order.customerId) {
        router.push("/dashboard");
      }
    });
    return unsub;
  }, [order, loading, router]);

  // ── Form submit ──
  function submit() {
    if (!valid) return;
    setStage("3ds");
  }

  // ── OTP confirm ──
  async function confirmOtp() {
    if (otp.length !== 6 || !orderId) return;
    setStage("processing");
    // Mark payment in Firestore
    try {
      await updateDoc(doc(db, "orders", orderId), {
        paymentStatus: "paid",
        paymentMethod: "card",
        paidAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Failed to update payment status:", e);
    }
    setTimeout(() => setStage("success"), 1400);
    setTimeout(() => router.push(`/orders/${orderId}`), 2900);
  }

  const total = order?.total ?? order?.subtotal ?? 0;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-brand border-t-transparent animate-atlas-spin" />
          <p className="text-navy-soft text-sm font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] relative">
      <div className="max-w-[1100px] mx-auto p-8">

        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-navy-soft hover:text-navy text-sm font-semibold transition mb-5"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Page header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs font-extrabold text-brand uppercase tracking-widest mb-1">
              Paiement sécurisé
            </div>
            <h1
              className="text-[#1B2440] font-extrabold text-[30px] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Paiement par carte
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-1.5 border border-line text-[11px] font-bold text-navy">
              <span>🔒</span> TLS 1.3
            </div>
            <div className="bg-white rounded-xl px-3 py-2 border border-line text-[11px] font-extrabold text-navy"
              style={{ fontFamily: "var(--font-display)" }}>
              CMI · 3-D SECURE
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

          {/* ══ Left column: Card form ══ */}
          <div className="flex flex-col gap-5">

            {/* Saved / new toggle */}
            <div className="bg-white rounded-2xl p-1.5 flex gap-1">
              <button
                onClick={() => setUseSaved(true)}
                className={[
                  "flex-1 py-2.5 px-4 rounded-xl font-bold text-[13px] transition",
                  useSaved
                    ? "bg-[#1B2440] text-white"
                    : "text-[#1B2440] hover:bg-[rgba(27,36,64,0.05)]",
                ].join(" ")}
              >
                Utiliser ma carte enregistrée
              </button>
              <button
                onClick={() => setUseSaved(false)}
                className={[
                  "flex-1 py-2.5 px-4 rounded-xl font-bold text-[13px] transition",
                  !useSaved
                    ? "bg-[#1B2440] text-white"
                    : "text-[#1B2440] hover:bg-[rgba(27,36,64,0.05)]",
                ].join(" ")}
              >
                + Ajouter une nouvelle carte
              </button>
            </div>

            {/* Saved card display */}
            {useSaved && (
              <div className="bg-white rounded-2xl p-5">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-navy-soft mb-3">
                  Carte enregistrée
                </div>
                <div className="flex items-center gap-4 p-4 bg-[rgba(27,36,64,0.04)] rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1B2440] to-[#243057] flex items-center justify-center text-white text-xs font-extrabold">
                    VISA
                  </div>
                  <div className="flex-1">
                    <p className="text-navy font-bold text-sm">4287 •••• •••• 4287</p>
                    <p className="text-navy-soft text-xs mt-0.5">A. HASSANI · 11/27</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-brand flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand" />
                  </div>
                </div>
                <button
                  onClick={() => setUseSaved(false)}
                  className="mt-3 text-[13px] text-brand font-semibold hover:underline underline-offset-2 transition"
                >
                  Utiliser une autre carte
                </button>
              </div>
            )}

            {/* New card form */}
            <div
              className="bg-white rounded-2xl p-6 transition-opacity duration-200"
              style={{ opacity: useSaved ? 0.5 : 1, pointerEvents: useSaved ? "none" : "auto" }}
            >
              <div className="text-sm font-extrabold text-[#1B2440] mb-4">
                {useSaved ? "Carte sélectionnée" : "Détails de la carte"}
              </div>

              <Field label="Numéro de carte">
                <input
                  value={num}
                  onChange={(e) => setNum(fmtNum(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  className="w-full bg-cream-2 border border-transparent focus:border-brand/40 rounded-xl px-3.5 py-3 text-[14px] text-navy outline-none transition placeholder:text-navy-soft/50"
                />
              </Field>

              <Field label="Nom sur la carte">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmed Hassani"
                  className="w-full bg-cream-2 border border-transparent focus:border-brand/40 rounded-xl px-3.5 py-3 text-[14px] text-navy outline-none transition placeholder:text-navy-soft/50"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date d'expiration">
                  <input
                    value={exp}
                    onChange={(e) => setExp(fmtExp(e.target.value))}
                    placeholder="MM/YY"
                    inputMode="numeric"
                    className="w-full bg-cream-2 border border-transparent focus:border-brand/40 rounded-xl px-3.5 py-3 text-[14px] text-navy outline-none transition placeholder:text-navy-soft/50"
                  />
                </Field>
                <Field label="CVC / CVV">
                  <input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    className="w-full bg-cream-2 border border-transparent focus:border-brand/40 rounded-xl px-3.5 py-3 text-[14px] text-navy outline-none transition placeholder:text-navy-soft/50"
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2.5 mt-3 text-[13px] text-navy cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={save}
                  onChange={(e) => setSave(e.target.checked)}
                  className="w-4 h-4 accent-[#E55A26] cursor-pointer"
                />
                Enregistrer cette carte pour mes prochaines commandes
              </label>
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-navy-soft py-1">
              <span>🛡️ Chiffrement bout-en-bout</span>
              <span>·</span>
              <span>PCI-DSS Level 1</span>
              <span>·</span>
              <span>Conformité Bank Al-Maghrib</span>
            </div>
          </div>

          {/* ══ Right column: Card preview + Summary ══ */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24 self-start">

            {/* Live card preview */}
            <CardPreview
              displayNum={displayNum}
              displayName={displayName}
              displayExp={displayExp}
              brand={displayBrand}
            />

            {/* Order summary */}
            <div className="bg-white rounded-2xl p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-navy-soft mb-3">
                Récapitulatif
              </div>

              {order?.items && order.items.length > 0 && (
                <div className="space-y-1 mb-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[13px] text-navy">
                      <span className="text-navy-soft">
                        <span className="text-navy font-semibold mr-1">{item.quantity ?? 1}×</span>
                        {item.name ?? item.description ?? "Article"}
                      </span>
                      {item.price != null && (
                        <span className="font-semibold">
                          {(item.price * (item.quantity ?? 1)).toFixed(0)} DH
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-line pt-3 mt-2">
                {order?.fee != null && (
                  <div className="flex justify-between text-[12px] text-navy-soft mb-1">
                    <span>Frais de livraison</span>
                    <span>{order.fee} DH</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-[13px] text-navy-soft">Total à payer</span>
                  <span
                    className="text-[28px] font-extrabold text-[#1B2440] leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {total} DH
                  </span>
                </div>
              </div>

              {/* 3DS badge */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line text-[11px] text-navy-soft font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#2DC08A] shrink-0" />
                Carte sécurisée · 3D Secure
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={submit}
              disabled={!valid}
              className="w-full py-4 rounded-full font-extrabold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                background: valid ? "#E55A26" : "rgba(27,36,64,0.14)",
                cursor: valid ? "pointer" : "not-allowed",
                boxShadow: valid ? "0 10px 24px rgba(229,90,38,0.34)" : "none",
              }}
            >
              <span>🔒</span> Payer · {total} DH
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          3DS Modal
      ══════════════════════════════════════════════════ */}
      {stage === "3ds" && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[440px] mx-4 p-7 animate-atlas-fade-up">

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#1B2440] flex items-center justify-center text-lg shrink-0">
                🛡️
              </div>
              <div>
                <p
                  className="font-extrabold text-[17px] text-[#1B2440]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Vérification 3D Secure
                </p>
                <p className="text-[11px] text-navy-soft">BMCE Bank · CMI</p>
              </div>
            </div>

            <p className="text-[13px] text-navy leading-relaxed mb-5">
              Un code a été envoyé au{" "}
              <strong>+212 6•• ••• 287</strong>. Saisissez-le pour confirmer
              votre paiement de <strong>{total} DH</strong>.
            </p>

            {/* OTP input */}
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="• • • • • •"
              autoFocus
              inputMode="numeric"
              className="w-full bg-cream-2 border-[1.5px] border-line-2 rounded-xl px-4 py-4 text-[28px] font-mono tracking-[0.4em] text-center text-navy outline-none focus:border-brand/50 transition"
            />

            <div className="flex items-center justify-between mt-2 text-[11px] text-navy-soft">
              <span>Code valable 5 minutes</span>
              <button className="text-[#E55A26] font-bold hover:underline underline-offset-1 transition">
                Renvoyer
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStage("form")}
                className="flex-1 py-3 rounded-full border border-line-2 text-navy-soft text-[13px] font-semibold hover:bg-[rgba(27,36,64,0.04)] transition"
              >
                Annuler
              </button>
              <button
                onClick={confirmOtp}
                disabled={otp.length !== 6}
                className="flex-[2] py-3 rounded-full font-bold text-[14px] text-white transition-all duration-200"
                style={{
                  background: otp.length === 6 ? "#E55A26" : "rgba(27,36,64,0.14)",
                  cursor: otp.length === 6 ? "pointer" : "not-allowed",
                  boxShadow: otp.length === 6 ? "0 8px 20px rgba(229,90,38,0.32)" : "none",
                }}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          Processing overlay
      ══════════════════════════════════════════════════ */}
      {stage === "processing" && (
        <div className="fixed inset-0 bg-[rgba(246,238,220,0.92)] backdrop-blur-md flex flex-col items-center justify-center gap-5 z-50">
          <div className="w-18 h-18 rounded-full border-4 border-[rgba(27,36,64,0.12)] border-t-[#E55A26] animate-atlas-spin"
            style={{ width: 72, height: 72 }} />
          <div>
            <p
              className="font-extrabold text-[22px] text-[#1B2440] text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Vérification du paiement...
            </p>
            <p className="text-[13px] text-navy-soft text-center mt-1">
              Vérification auprès de la banque émettrice
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          Success overlay
      ══════════════════════════════════════════════════ */}
      {stage === "success" && (
        <div className="fixed inset-0 bg-[rgba(246,238,220,0.96)] backdrop-blur-md flex flex-col items-center justify-center gap-5 z-50">
          <div
            className="w-24 h-24 rounded-full bg-[#2DC08A] flex items-center justify-center shadow-[0_12px_32px_rgba(45,192,138,0.34)] animate-atlas-success-pop"
          >
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
          <div className="text-center">
            <p
              className="font-extrabold text-[26px] text-[#1B2440]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Paiement réussi !
            </p>
            <p className="text-[13px] text-navy-soft mt-1.5">
              Vous allez être redirigé…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
