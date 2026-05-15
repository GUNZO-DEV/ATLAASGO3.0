"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged, updateProfile, deleteUser,
} from "firebase/auth";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import FloatingNavbar from "@/components/FloatingNavbar";
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
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Profile */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-[#E05A23]" />
              <h2 className="font-semibold text-gray-900 text-sm">Profile</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400"
                />
              </div>
              {phone && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    disabled
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-[#E05A23]" />
              <h2 className="font-semibold text-gray-900 text-sm">Delivery zone</h2>
            </div>
            <div className="flex gap-2">
              {["ifrane", "oujda"].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(z)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors cursor-pointer border ${
                    zone === z
                      ? "border-[#E05A23] bg-orange-50 text-[#E05A23]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
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
            className="w-full py-3.5 bg-[#E05A23] text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-red-600 text-sm">Danger zone</h2>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 font-medium hover:underline cursor-pointer"
            >
              Delete my account
            </button>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                This will permanently delete your account and all data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
