// app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Banknote,
  CreditCard,
  Smartphone,
  ShieldCheck,
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
import toast from "react-hot-toast";

type PaymentMethod = "cash" | "card" | "cashplus";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, checkOut } = useCart();

  const [userId, setUserId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [deliveryFee, setDeliveryFee] = useState(15);
  const [loading, setLoading] = useState(false);

  const { addresses } = useSavedAddresses(userId);
  const [referralCredits, setReferralCredits] = useState(0);
  const [useCredit, setUseCredit] = useState(false);

  // 1. Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUserId(user.uid);
    });
    return unsub;
  }, [router]);

  // 2. Surge-based delivery fee.
  // Falls back to base fee if either query fails (e.g. permission-denied
  // because the customer isn't allowed to count pending orders). The
  // pending-orders count is best-effort — surge gracefully degrades to
  // a flat 12 DH if we can't compute it.
  useEffect(() => {
    if (!cart) { router.push("/restaurants"); return; }
    async function fetchFee() {
      const zone = "ifrane";
      try {
        // Read drivers from /drivers collection (any signed-in user can read
        // online drivers) instead of /users which is owner-only.
        const driversSnap = await getDocs(
          query(
            collection(db, "drivers"),
            where("isOnline", "==", true),
            where("zone", "==", zone)
          )
        );
        // pendingOrders count requires admin/driver access — for customer
        // surge calculation we approximate using just driver count. If 0
        // drivers online, charge surge; otherwise flat fee.
        const onlineDrivers = driversSnap.size;
        const pendingOrders = 0; // estimated client-side
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

  // 5. Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !userId) return;
    if (!address.trim()) { toast.error("Veuillez entrer votre adresse de livraison"); return; }

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
          note: i.note ?? undefined,
        })),
        deliveryAddress: address.trim(),
        deliveryAddressNote: addressNote.trim() || undefined,
        orderNote: orderNote.trim() || undefined,
        zone: "ifrane",
        subtotal,
        fee: deliveryFee,
        total: finalTotal,
        creditUsed: creditApplied || undefined,
      });

      await checkOut();

      if (useCredit && creditApplied > 0) {
        await updateDoc(doc(db, "users", userId), {
          referralCredits: increment(-creditApplied),
        });
      }

      toast.success("Commande passée !");

      // 7. Card payment → add ?pay=card
      if (paymentMethod === "card") {
        router.push(`/orders/${orderId}?pay=card`);
      } else {
        router.push(`/orders/${orderId}`);
      }
    } catch {
      toast.error("Impossible de passer la commande. Réessayez.");
      setLoading(false);
    }
  };

  if (!cart) return null;

  const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "cash",     label: "Espèces",    icon: <Banknote className="w-5 h-5" /> },
    { id: "card",     label: "Carte CMI",  icon: <CreditCard className="w-5 h-5" /> },
    { id: "cashplus", label: "CashPlus",   icon: <Smartphone className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16">
        {/* Page title */}
        <h1 className="font-display font-extrabold text-[30px] text-navy mb-6">
          Finaliser la commande
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[1.4fr_1fr] gap-6 items-start">

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-4">

              {/* Card 1: Adresse de livraison */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
                <h2 className="font-semibold text-navy text-sm mb-3">
                  Adresse de livraison
                </h2>

                {/* Current address display */}
                {address && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-[#FEF0E7] rounded-xl">
                    <div className="w-11 h-11 rounded-xl bg-[#FEF0E7] border border-[#E55A26]/20 flex items-center justify-center shrink-0">
                      <Home className="w-5 h-5 text-[#E55A26]" />
                    </div>
                    <div>
                      <p className="font-bold text-navy text-sm leading-tight">Maison · Maârif</p>
                      <p className="text-navy-soft text-xs mt-0.5">{address}</p>
                    </div>
                  </div>
                )}

                {/* Saved address tiles */}
                {addresses.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAddress(a.address)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          address === a.address
                            ? "bg-[#FEF0E7] border-[#E55A26]"
                            : "bg-[#F5F0E8] border-transparent hover:border-[#E55A26]/30"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FEF0E7] flex items-center justify-center shrink-0">
                          <Home className="w-4 h-4 text-[#E55A26]" />
                        </div>
                        <div>
                          <p className="font-bold text-navy text-xs">{a.label}</p>
                          <p className="text-navy-soft text-xs">{a.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* New address input */}
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  placeholder="Rue, immeuble, résidence..."
                />

                {/* Address note */}
                <input
                  type="text"
                  value={addressNote}
                  onChange={(e) => setAddressNote(e.target.value)}
                  placeholder="Appartement, étage, repère (optionnel)"
                  className="mt-2 w-full px-4 py-3 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-[#F5F0E8]"
                />
              </div>

              {/* Card 2: Mode de paiement */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
                <h2 className="font-semibold text-navy text-sm mb-3">
                  Mode de paiement
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border font-bold text-sm text-navy transition-colors cursor-pointer ${
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

              {/* Card 3: Instructions livreur */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
                <h2 className="font-semibold text-navy text-sm mb-3">
                  Instructions livreur
                </h2>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Sonner 2 fois svp..."
                  className="w-full resize-none bg-[#F5F0E8] border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand min-h-[60px]"
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN: Sticky sidebar ── */}
            <div className="sticky top-[90px] bg-white rounded-2xl p-5 shadow-[0_4px_14px_rgba(27,36,64,0.06)]">
              <h2 className="font-display font-extrabold text-navy text-lg mb-3">
                Récapitulatif
              </h2>

              {/* Cart items */}
              <div className="space-y-1.5 mb-3">
                {cart.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-navy-soft">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-navy font-medium">
                      {item.price * item.quantity} DH
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-line my-3" />

              {/* Fee rows */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-navy-soft">Sous-total</span>
                  <span className="text-navy">{subtotal} DH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-navy-soft">Livraison</span>
                  <span className="text-navy">{deliveryFee} DH</span>
                </div>

                {/* Referral credits toggle */}
                {referralCredits > 0 && (
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="text-sm text-navy-soft">
                      Crédit parrainage ({referralCredits} DH)
                    </span>
                    <input
                      type="checkbox"
                      checked={useCredit}
                      onChange={(e) => setUseCredit(e.target.checked)}
                      className="w-4 h-4 accent-brand"
                    />
                  </label>
                )}

                {/* Promo / credit applied */}
                {useCredit && creditApplied > 0 && (
                  <div className="flex justify-between text-sm text-mint font-medium">
                    <span>Crédit appliqué</span>
                    <span>−{creditApplied} DH</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between font-display font-extrabold text-lg text-navy border-t border-line pt-2 mt-1">
                  <span>Total</span>
                  <span>{finalTotal} DH</span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-[#E55A26] text-white rounded-2xl py-3.5 font-bold text-base hover:bg-[#C94D20] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Commande en cours..." : "Confirmer la commande"}
              </button>

              {/* Security note */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-navy-soft">
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
