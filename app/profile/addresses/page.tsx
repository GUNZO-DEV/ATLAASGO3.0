"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import AddressCard from "@/components/AddressCard";
import AddressForm from "@/components/AddressForm";
import FloatingNavbar from "@/components/FloatingNavbar";
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
    await add(addr);
    setShowForm(false);
    toast.success("Address saved");
  };

  const handleUpdate = async (addr: Omit<SavedAddress, "id">) => {
    if (!editing) return;
    await update(editing.id, addr);
    setEditing(null);
    toast.success("Address updated");
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success("Address removed");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
          {addresses.length < 5 && !showForm && !editing && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm text-[#E05A23] font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        <div className="space-y-3">
          {showForm && (
            <AddressForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
          )}

          {addresses.length === 0 && !showForm ? (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No saved addresses</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Save your dorm, home, or office for faster checkout
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#E05A23] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 cursor-pointer"
              >
                Add address
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
