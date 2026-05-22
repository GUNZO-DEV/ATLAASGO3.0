// app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Building2,
  Briefcase,
  Tag,
  Banknote,
  CreditCard,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useCart } from "@/contexts/CartContext";
import AddressInput from "@/components/AddressInput";
import { calculateSurgeFee } from "@/lib/pricing";
import { createOrder } from "@/lib/orders";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import type { SavedAddress } from "@/hooks/useSavedAddresses";
import toast from "react-hot-toast";

type PaymentMethod = "cash" | "card" | "cashplus";

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Maison:    <Home className="w-4 h-4" />,
  Résidence: <Building2 className="w-4 h-4" />,
  Bureau:    <Briefcase className="w-4 h-4" />,
};

function getLabelIcon(label: string) {
  return LABEL_ICONS[label] ?? <Tag className="w-4 h-4" />;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, checkOut } = useCart();

  const [userId, setUserId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [selectedSaved, setSelectedSaved] = useState<SavedAddress | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [deliveryFee, setDeliveryFee] = useState(15);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { addresses } = useSavedAddresses(userId);
  const [referralCredits, setReferralCredits] = useState(0);
  const [useCredit, setUseCredit] = useState(false);

  // Auto-select default saved address on load
  useEffect(() => {
    if (addresses.length > 0 && !address) {
      const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
      setAddress(defaultAddr.address);
      setSelectedSaved(defaultAddr);
      if (defaultAddr.note) setAddressNote(defaultAddr.note);
    }
  }, [addresses, address]);

  // 1. Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUserId(user.uid);
    });
    return unsub;
  }, [router]);

  // 2. Surge-based delivery fee
  useEffect(() => {
    if (!cart) { router.push("/restaurants"); return; }
    async function fetchFee() {
      const zone = "ifrane";
      try {
        const driversSnap = await getDocs(
          query(
            collection(db, "drivers"),
            where("isOnline", "==", true),
            where("zone", "==", zone)
          )
        );
        const onlineDrivers = driversSnap.size;
        const pendingOrders = 0;
        setDeliveryFee(calculateSurgeFee(zone, pendingOrders, onlineDrivers));
      } catch (err) {
        console.warn("surge fee fetch failed, using base fee:", err);
        setDeliveryFee(12);
      }
    }
    fetchFee();
  }, [cart, router]);

  // 3. Referral credits
  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId))
      .then((snap) => {
        if (snap.exists()) setReferralCredits(snap.data().referralCredits ?? 0);
      })
      .catch((err) => console.error("Failed to fetch referral credits:", err));
  }, [userId]);

  const total = subtotal + deliveryFee;
  const creditApplied = useCredit ? Math.min(referralCredits, total) : 0;
  const finalTotal = total - creditApplied;

  // When user picks a saved address
  const handlePickSaved = (saved: SavedAddress) => {
    setSelectedSaved(saved);
    setAddress(saved.address);
    setAddressNote(saved.note ?? "");
  };

  // When user types a manual address, clear saved selection
  const handleManualAddress = (val: string) => {
    setAddress(val);
    // If they edited away from the saved address, clear the link
    if (selectedSaved && val !== selectedSaved.address) {
      setSelectedSaved(null);
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !userId) return;
    if (!address.trim()) {
      toast.error("Veuillez entrer votre adresse de livraison");
      return;
    }

    setLoading(true);
    try {
      const orderId = await createOrder({
        customerId: userId,
        restaurantId: cart.restaurantId,
        restaurantName: cart.restaurantName,
        cartId: cart.id,
        items: cart.items.map((i) => ({
          itemId: i.itemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          ...(i.note ? { note: i.note } : {}),
        })),
        deliveryAddress: address.trim(),
        ...(addressNote.trim() ? { deliveryAddressNote: addressNote.trim() } : {}),
        ...(orderNote.trim() ? { orderNote: orderNote.trim() } : {}),
        zone: "ifrane",
        subtotal,
        fee: deliveryFee,
        total: finalTotal,
        ...(creditApplied > 0 ? { creditUsed: creditApplied } : {}),
      });

      await checkOut();

      if (useCredit && creditApplied > 0) {
        await updateDoc(doc(db, "users", userId), {
          referralCredits: increment(-creditApplied),
        });
      }

      toast.success("Commande passée !");

      if (paymentMethod === "card") {
        router.push(`/orders/${orderId}?pay=card`);
      } else {
        router.push(`/orders/${orderId}`);
      }
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error("Impossible de passer la commande. Réessayez.");
      setLoading(false);
    }
  };

  if (!cart) return null;

  const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "cash",     label: "Espèces",   icon: <Banknote className="w-5 h-5" /> },
    { id: "card",     label: "Carte CMI",  icon: <CreditCard className="w-5 h-5" /> },
    { id: "cashplus", label: "CashPlus",   icon: <Smartphone className="w-5 h-5" /> },
  ];

  const hasAddress = !!address.trim();

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16">
        {/* Page title */}
        <h1
          className="font-extrabold text-[30px] text-[#1B2440] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Finaliser la commande
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-4">

              {/* ═══ CARD 1: ADDRESS — Hero / Primary ═══ */}
              <div className={`bg-white rounded-2xl p-5 shadow-[0_4px_14px_rgba(27,36,64,0.06)] border-2 transition-colors ${
                hasAddress ? "border-[#2DC08A]" : "border-[#E55A26]"
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    hasAddress ? "bg-[#2DC08A]/10" : "bg-[#FEF0E7]"
                  }`}>
                    <MapPin className={`w-4 h-4 ${hasAddress ? "text-[#2DC08A]" : "text-[#E55A26]"}`} />
                  </div>
                  <h2
                    className="font-extrabold text-[#1B2440] text-base"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Où livrer ?
                  </h2>
                  {!hasAddress && (
                    <span className="ml-auto text-xs font-medium text-[#E55A26] bg-[#FEF0E7] px-2 py-0.5 rounded-full">
                      Requis
                    </span>
                  )}
                  {hasAddress && (
                    <span className="ml-auto text-xs font-medium text-[#2DC08A] bg-[#2DC08A]/10 px-2 py-0.5 rounded-full">
                      Confirmé
                    </span>
                  )}
                </div>

                {/* Selected address display */}
                {hasAddress && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-[#2DC08A]/5 border border-[#2DC08A]/20 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-[#2DC08A]/10 flex items-center justify-center shrink-0">
                      {selectedSaved ? getLabelIcon(selectedSaved.label) : <MapPin className="w-5 h-5 text-[#2DC08A]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#1B2440] text-sm leading-tight truncate">
                        {selectedSaved ? selectedSaved.label : "Adresse manuelle"}
                      </p>
                      <p className="text-[#6B7A9E] text-xs mt-0.5 truncate">{address}</p>
                      {addressNote && (
                        <p className="text-[#6B7A9E]/70 text-xs mt-0.5 truncate">{addressNote}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAddress(""); setAddressNote(""); setSelectedSaved(null); }}
                      className="text-xs text-[#E55A26] font-semibold hover:underline shrink-0 cursor-pointer"
                    >
                      Changer
                    </button>
                  </div>
                )}

                {/* Saved addresses — horizontal tiles */}
                {addresses.length > 0 && !hasAddress && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-[#6B7A9E] mb-2">Adresses enregistrées</p>
                    <div className="grid grid-cols-2 gap-2">
                      {addresses.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handlePickSaved(a)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedSaved?.id === a.id
                              ? "bg-[#FEF0E7] border-[#E55A26] shadow-sm"
                              : "bg-[#F5F0E8] border-transparent hover:border-[#E55A26]/30 hover:shadow-sm"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                            {getLabelIcon(a.label)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#1B2440] text-xs truncate">{a.label}</p>
                            <p className="text-[#6B7A9E] text-[11px] mt-0.5 truncate">{a.address}</p>
                          </div>
                          {a.isDefault && (
                            <span className="text-[9px] font-bold text-[#E55A26] bg-[#FEF0E7] px-1.5 py-0.5 rounded-full shrink-0">
                              Par défaut
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider when both saved + input are visible */}
                {addresses.length > 0 && !hasAddress && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-[#1B2440]/10" />
                    <span className="text-xs text-[#6B7A9E] font-medium">ou</span>
                    <div className="flex-1 h-px bg-[#1B2440]/10" />
                  </div>
                )}

                {/* Geolocate + Landmarks + Manual input */}
                {!hasAddress && (
                  <AddressInput
                    value={address}
                    onChange={handleManualAddress}
                    zone="ifrane"
                    placeholder="Rue, immeuble, résidence..."
                    showLandmarks
                    showGeolocate
                  />
                )}

                {/* Address note — always visible when address is set */}
                {hasAddress && (
                  <input
                    type="text"
                    value={addressNote}
                    onChange={(e) => setAddressNote(e.target.value)}
                    placeholder="Appt, étage, repère pour le livreur (optionnel)"
                    className="w-full px-4 py-3 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:border-[#E55A26]/30 focus:ring-2 focus:ring-[#E55A26]/20 focus:outline-none transition-colors"
                  />
                )}
              </div>

              {/* ═══ CARD 2: Payment ═══ */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
                <h2 className="font-semibold text-[#1B2440] text-sm mb-3">
                  Mode de paiement
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border font-bold text-sm text-[#1B2440] transition-colors cursor-pointer ${
                        paymentMethod === id
                          ? "bg-[#FEF0E7] border-[#E55A26]"
                          : "bg-[#F5F0E8] border-transparent hover:border-[#E55A26]/30"
                      }`}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ═══ CARD 3: Instructions ═══ */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
                <h2 className="font-semibold text-[#1B2440] text-sm mb-3">
                  Instructions livreur
                </h2>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Sonner 2 fois svp..."
                  className="w-full resize-none bg-[#F5F0E8] border border-transparent rounded-xl px-4 py-3 text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:border-[#E55A26]/30 focus:ring-2 focus:ring-[#E55A26]/20 focus:outline-none min-h-[60px] transition-colors"
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN: Sticky sidebar ── */}
            <div className="sticky top-[90px] bg-white rounded-2xl p-5 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
              <h2
                className="font-extrabold text-[#1B2440] text-lg mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Récapitulatif
              </h2>

              {/* Cart items — collapsible on mobile */}
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="lg:hidden flex items-center justify-between w-full text-sm text-[#6B7A9E] mb-2 cursor-pointer"
              >
                <span>{cart.items.length} article{cart.items.length > 1 ? "s" : ""}</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <div className={`space-y-1.5 mb-3 ${showDetails ? "" : "hidden lg:block"}`}>
                {cart.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-[#6B7A9E]">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-[#1B2440] font-medium">
                      {item.price * item.quantity} DH
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-[#1B2440]/10 my-3" />

              {/* Fee rows */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7A9E]">Sous-total</span>
                  <span className="text-[#1B2440]">{subtotal} DH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7A9E]">Livraison</span>
                  <span className="text-[#1B2440]">{deliveryFee} DH</span>
                </div>

                {/* Referral credits toggle */}
                {referralCredits > 0 && (
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="text-sm text-[#6B7A9E]">
                      Crédit parrainage ({referralCredits} DH)
                    </span>
                    <input
                      type="checkbox"
                      checked={useCredit}
                      onChange={(e) => setUseCredit(e.target.checked)}
                      className="w-4 h-4 accent-[#E55A26]"
                    />
                  </label>
                )}

                {useCredit && creditApplied > 0 && (
                  <div className="flex justify-between text-sm text-[#2DC08A] font-medium">
                    <span>Crédit appliqué</span>
                    <span>−{creditApplied} DH</span>
                  </div>
                )}

                {/* Total */}
                <div
                  className="flex justify-between font-extrabold text-lg text-[#1B2440] border-t border-[#1B2440]/10 pt-2 mt-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span>Total</span>
                  <span>{finalTotal} DH</span>
                </div>
              </div>

              {/* Delivery address summary in sidebar */}
              {hasAddress && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-[#F5F0E8] rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-[#E55A26] shrink-0" />
                  <p className="text-xs text-[#1B2440] truncate">{address}</p>
                </div>
              )}

              {/* Confirm button */}
              <button
                type="submit"
                disabled={loading || !hasAddress}
                className="mt-4 w-full bg-[#E55A26] text-white rounded-2xl py-3.5 font-bold text-base hover:bg-[#C94D20] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading
                  ? "Commande en cours..."
                  : !hasAddress
                    ? "Entrez votre adresse"
                    : "Confirmer la commande"
                }
              </button>

              {/* Security note */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6B7A9E]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Paiement sécurisé · Données protégées</span>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
