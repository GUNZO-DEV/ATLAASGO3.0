"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { track, identifyUser } from "@/lib/analytics";
import PhoneLogin from "@/components/PhoneLogin";

type Tab = "email" | "phone";

export default function RegisterPage() {
  const [tab, setTab]           = useState<Tab>("email");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
        role: "customer",
      });
      identifyUser(user.uid, { email, name, role: "customer" });
      track("user_registered", { uid: user.uid, email });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">

        {/* Logo / brand */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-atlaasgo">Atlaasgo</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
          {(["email", "phone"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === t
                  ? "bg-emerald-atlaasgo text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "email" ? "✉️ Email" : "📱 Phone (+212)"}
            </button>
          ))}
        </div>

        {tab === "email" ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>
        ) : (
          <PhoneLogin onSuccess={() => router.push("/dashboard")} />
        )}

        <p className="text-xs text-center text-gray-400 mt-6">
          Already have an account?{" "}
          <a href="/dashboard" className="text-emerald-atlaasgo font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
