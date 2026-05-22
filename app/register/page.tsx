"use client";

import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { track, identifyUser } from "@/lib/analytics";
import { generateReferralCode } from "@/lib/referral";
import { requestFcmToken, saveFcmToken } from "@/lib/notifications";
import PhoneLogin from "@/components/PhoneLogin";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, ArrowRight, ShoppingBag, Store, Bike } from "lucide-react";
import React from "react";

type Mode = "login" | "register";
type AuthTab = "email" | "phone";
type Role = "customer" | "admin" | "rider";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease },
};

export default function RegisterPage() {
  const [mode, setMode]         = useState<Mode>("login");
  const [authTab, setAuthTab]   = useState<AuthTab>("email");
  const [role, setRole]         = useState<Role>("customer");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [refCode, setRefCode]   = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setRefCode(ref);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        const referralCode = generateReferralCode();
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          createdAt: new Date().toISOString(),
          role,
          referralCode,
          referralCredits: 0,
          reviewedOrderIds: [],
          favorites: [],
          savedAddresses: [],
        });

        // Publish a public referralCodes mapping so this user's code
        // can be resolved by future signups using ?ref=CODE.
        try {
          const { registerReferralCode } = await import("@/lib/referral");
          await registerReferralCode(referralCode, user.uid);
        } catch (refErr) {
          console.warn("Failed to register referral code mapping:", refErr);
        }

        if (refCode) {
          const { applyReferralOnRegister } = await import("@/lib/referral");
          await applyReferralOnRegister(refCode, user.uid);
        }
        identifyUser(user.uid, { email, name, role });
        track("user_registered", { uid: user.uid, email });
        // Request FCM token in background — don't block redirect
        requestFcmToken().then((token) => {
          if (token) saveFcmToken(user.uid, token);
        }).catch(() => {/* notifications are optional */});
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        identifyUser(user.uid, { email, name: data?.name, role: data?.role ?? "customer" });
        track("user_logged_in", { uid: user.uid, email });
        // Request FCM token in background — don't block redirect
        requestFcmToken().then((token) => {
          if (token) saveFcmToken(user.uid, token);
        }).catch(() => {/* notifications are optional */});
      }
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "rider") router.push("/driver");
      else router.push("/dashboard");
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

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      // Check if user doc exists, if not create one
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        const referralCode = generateReferralCode();
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName ?? "",
          email: user.email ?? "",
          createdAt: new Date().toISOString(),
          role,
          referralCode,
          referralCredits: 0,
          reviewedOrderIds: [],
          favorites: [],
          savedAddresses: [],
        });
        try {
          const { registerReferralCode } = await import("@/lib/referral");
          await registerReferralCode(referralCode, user.uid);
        } catch (refErr) { console.warn("Failed to register referral code:", refErr); }
        if (refCode) {
          const { applyReferralOnRegister } = await import("@/lib/referral");
          await applyReferralOnRegister(refCode, user.uid);
        }
        identifyUser(user.uid, { email: user.email ?? "", name: user.displayName ?? "", role });
        track("user_registered", { uid: user.uid, email: user.email ?? "" });
      } else {
        const data = snap.data();
        identifyUser(user.uid, { email: user.email ?? "", name: data?.name, role: data?.role ?? "customer" });
        track("user_logged_in", { uid: user.uid, email: user.email ?? "" });
      }
      requestFcmToken().then((token) => { if (token) saveFcmToken(user.uid, token); }).catch(() => {});
      // Route based on role
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "rider") router.push("/driver");
      else router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
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

          {/* Role selector */}
          <div className="flex gap-2 mb-6">
            {([
              { value: "customer", label: "Client", icon: ShoppingBag },
              { value: "admin", label: "Admin", icon: Store },
              { value: "rider", label: "Coursier", icon: Bike },
            ] as { value: Role; label: string; icon: React.ComponentType<{ className?: string }> }[]).map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.value} type="button" onClick={() => setRole(r.value as Role)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    role === r.value
                      ? "bg-brand/10 text-brand border border-brand/30"
                      : "text-gray-400 border border-gray-200 hover:border-gray-300"
                  }`}>
                  <Icon className="w-4 h-4" />
                  {r.label}
                </button>
              );
            })}
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
            <>
              {/* Google OAuth button */}
              <button type="button" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 shadow-sm transition mb-4 cursor-pointer">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

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
            </>
          ) : (
            <PhoneLogin onSuccess={() => {
              if (role === "admin") router.push("/admin/dashboard");
              else if (role === "rider") router.push("/driver");
              else router.push("/dashboard");
            }} />
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
