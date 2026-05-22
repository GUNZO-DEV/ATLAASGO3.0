"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import AddressCard from "@/components/AddressCard";
import AddressForm from "@/components/AddressForm";
import type { SavedAddress } from "@/hooks/useSavedAddresses";
import { Plus, MapPin } from "lucide-react";
import toast from "react-hot-toast";

export default function AddressesPage() {
  const router = useRouter();
  const [uid, setUid]           = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<SavedAddress | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { addresses, add, remove, update } = useSavedAddresses(uid);

  const handleAdd = async (addr: Omit<SavedAddress, "id">) => {
    if (addresses.length >= 5) return;
    try {
      await add(addr);
      setShowForm(false);
      toast.success("Address saved");
    } catch {
      toast.error("Failed to save address");
    }
  };

  const handleUpdate = async (addr: Omit<SavedAddress, "id">) => {
    if (!editing) return;
    try {
      await update(editing.id, addr);
      setEditing(null);
      toast.success("Address updated");
    } catch {
      toast.error("Failed to update address");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Address removed");
    } catch {
      toast.error("Failed to remove address");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-extrabold text-[#1B2440]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mes adresses
            </h1>
            <p className="text-sm text-[#6B7A9E] mt-1">
              {addresses.length} / 5 adresses enregistrées
            </p>
          </div>
          {addresses.length < 5 && !showForm && !editing && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-[#E55A26] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#C94D20] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          )}
        </div>

        <div className="space-y-3">
          {showForm && (
            <AddressForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
          )}

          {addresses.length === 0 && !showForm ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#FEF0E7] flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-[#E55A26]" />
              </div>
              <p
                className="font-extrabold text-[#1B2440] text-base"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Aucune adresse enregistrée
              </p>
              <p className="text-[#6B7A9E] text-sm mt-1 mb-5">
                Enregistrez votre résidence, domicile ou bureau pour commander plus vite
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#E55A26] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#C94D20] transition-colors cursor-pointer"
              >
                Ajouter une adresse
              </button>
            </div>
          ) : (
            addresses.map((addr) =>
              editing?.id === addr.id ? (
                <AddressForm
                  key={addr.id}
                  initial={addr}
                  onSave={handleUpdate}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  onEdit={() => setEditing(addr)}
                  onDelete={() => handleDelete(addr.id)}
                />
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
