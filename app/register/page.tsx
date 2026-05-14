"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { track, identifyUser } from "@/lib/analytics";
import PhoneLogin from "@/components/PhoneLogin";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

type Mode = "login" | "register";
type AuthTab = "email" | "phone";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease },
};

export default function RegisterPage() {
  const [mode, setMode]         = useState<Mode>("login");
  const [authTab, setAuthTab]   = useState<AuthTab>("email");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          createdAt: new Date().toISOString(),
          role: "customer",
        });
        identifyUser(user.uid, { email, name, role: "customer" });
        track("user_registered", { uid: user.uid, email });
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        identifyUser(user.uid, { email, name: data?.name, role: data?.role ?? "customer" });
        track("user_logged_in", { uid: user.uid, email });
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // Friendly Firebase error messages
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential"))
        setError("Invalid email or password.");
      else if (msg.includes("email-already-in-use"))
        setError("An account with this email already exists.");
      else if (msg.includes("weak-password"))
        setError("Password must be at least 6 characters.");
      else
        setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #1E2D4A 0%, #13203A 55%, #0D1628 100%)" }}
    >
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div {...fadeUp} className="flex flex-col items-center mb-8 gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo-icon.png"
              alt="AtlaasGo"
              width={44}
              height={44}
              className="rounded-2xl group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-extrabold text-white tracking-tight">
              Atlaas<span className="text-brand-light">Go</span>
            </span>
          </Link>
          <p className="text-white/50 text-sm">Morocco&apos;s fastest delivery platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-[0_24px_64px_rgba(0,0,0,0.3)]"
        >
          {/* Mode toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-7">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  mode === m
                    ? "bg-white text-emerald-atlaasgo shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Auth method tabs */}
          <div className="flex gap-2 mb-6">
            {(["email", "phone"] as AuthTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setAuthTab(t); setError(""); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  authTab === t
                    ? "border-brand bg-brand/8 text-brand"
                    : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                {t === "email" ? "✉ Email" : "📱 Phone (+212)"}
              </button>
            ))}
          </div>

          {authTab === "email" ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "register" && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm bg-gray-50 transition"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm bg-gray-50 transition"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder={mode === "register" ? "Password (min 6 characters)" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm bg-gray-50 transition"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3 px-6 rounded-xl border border-brand-light/40 shadow-[0_4px_16px_rgba(224,90,35,0.35)] transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "register" ? "Creating account…" : "Signing in…"}
                  </span>
                ) : (
                  <>
                    {mode === "register" ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <PhoneLogin onSuccess={() => router.push("/dashboard")} />
          )}

          {/* Driver CTA */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Want to deliver?{" "}
              <Link href="/driver" className="text-brand font-semibold hover:underline">
                Open Driver Dashboard →
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, ease, delay: 0.2 }}
          className="text-center text-white/30 text-xs mt-6"
        >
          By continuing, you agree to Atlaasgo&apos;s Terms &amp; Privacy Policy.
        </motion.p>
      </div>
    </main>
  );
}
