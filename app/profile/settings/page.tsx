"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged, updateProfile, deleteUser,
} from "firebase/auth";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { User, MapPin, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [uid, setUid]           = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [zone, setZone]         = useState("ifrane");
  const [saving, setSaving]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
      setName(user.displayName ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phoneNumber ?? "");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (snap.exists()) setZone(snap.data().zone ?? "ifrane");
      })
      .catch((err) => console.error("Failed to load zone:", err));
  }, [uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, "users", uid), { name, zone });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!uid || !auth.currentUser) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", uid));
      await deleteUser(auth.currentUser);
      router.push("/");
    } catch {
      toast.error("Failed to delete account. Please re-login and try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16 space-y-5">
        <div className="mb-2">
          <h1
            className="text-2xl font-extrabold text-[#1B2440]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Paramètres
          </h1>
          <p className="text-sm text-[#6B7A9E] mt-1">Gérez votre profil et vos préférences</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Profile */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-full bg-[#FEF0E7] flex items-center justify-center">
                <User className="w-4 h-4 text-[#E55A26]" />
              </span>
              <h2
                className="font-extrabold text-[#1B2440] text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Profil
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#6B7A9E] mb-1">Nom affiché</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#1B2440] focus:border-[#E55A26]/30 focus:ring-0 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B7A9E] mb-1">Adresse email</label>
                <input
                  type="text"
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#6B7A9E] opacity-60"
                />
              </div>
              {phone && (
                <div>
                  <label className="block text-xs text-[#6B7A9E] mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    disabled
                    className="w-full px-3 py-2.5 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#6B7A9E] opacity-60"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Zone de livraison */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-full bg-[#FEF0E7] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#E55A26]" />
              </span>
              <h2
                className="font-extrabold text-[#1B2440] text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Zone de livraison
              </h2>
            </div>
            <div className="flex gap-2">
              {["ifrane", "oujda"].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(z)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors cursor-pointer ${
                    zone === z
                      ? "bg-[#E55A26] text-white"
                      : "bg-[#F5F0E8] text-[#1B2440] hover:bg-[#FEF0E7]"
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-[#E55A26] text-white rounded-2xl font-bold text-sm hover:bg-[#C94D20] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </form>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] border border-red-200/50">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2
              className="font-extrabold text-red-600 text-sm"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Zone de danger
            </h2>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 font-medium hover:underline cursor-pointer"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div>
              <p className="text-sm text-[#6B7A9E] mb-3">
                Cette action supprimera définitivement votre compte et toutes vos données. Cette opération est irréversible.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-[#F5F0E8] rounded-xl text-sm text-[#1B2440] font-medium hover:bg-[#FEF0E7] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? "Suppression..." : "Supprimer mon compte"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
