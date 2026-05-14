"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Zap, ChevronDown } from "lucide-react";
import Image from "next/image";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserInfo {
  name: string;
  role: string;
}

export default function FloatingNavbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [user, setUser]             = useState<UserInfo | null>(null);
  const [authReady, setAuthReady]   = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          const data = snap.data();
          setUser({ name: data?.name ?? firebaseUser.email ?? "User", role: data?.role ?? "customer" });
        } catch {
          setUser({ name: firebaseUser.email ?? "User", role: "customer" });
        }
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    setMenuOpen(false);
    await signOut(auth);
    setSigningOut(false);
    router.push("/");
  };

  const dashboardHref = user?.role === "driver" ? "/driver" : "/dashboard";
  const initials = user?.name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <motion.nav
        animate={{
          paddingTop:    scrolled ? "10px" : "14px",
          paddingBottom: scrolled ? "10px" : "14px",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0,0,0,0.14)"
            : "0 2px 12px rgba(0,0,0,0.06)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-2xl bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl px-5 flex items-center justify-between relative"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo-icon.png"
            alt="Atlaasgo"
            width={32}
            height={32}
            className="rounded-lg group-hover:scale-105 transition-transform"
          />
          <span className="font-extrabold text-navy tracking-tight text-sm">
            Atlaas<span className="text-brand">Go</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/#how-it-works"
            className="text-sm text-gray-500 hover:text-emerald-atlaasgo font-medium transition px-3 py-1.5 rounded-xl hover:bg-emerald-atlaasgo/5"
          >
            How it works
          </Link>

          {authReady && (
            <>
              {user ? (
                /* ── Logged-in user menu ── */
                <div className="relative ml-1">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex items-center gap-2 bg-brand/8 hover:bg-brand/14 text-brand rounded-xl px-3 py-1.5 transition cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                      {initials}
                    </div>
                    <span className="text-sm font-semibold hidden sm:block max-w-[100px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs font-bold text-gray-800 truncate">{user.name}</p>
                          <p className="text-[11px] text-gray-400 capitalize">{user.role}</p>
                        </div>

                        {/* Dashboard link */}
                        <Link
                          href={dashboardHref}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand/5 hover:text-brand transition"
                        >
                          {user.role === "driver" ? (
                            <Zap className="w-4 h-4" strokeWidth={1.8} />
                          ) : (
                            <LayoutDashboard className="w-4 h-4" strokeWidth={1.8} />
                          )}
                          {user.role === "driver" ? "Driver Dashboard" : "My Dashboard"}
                        </Link>

                        {/* Sign out */}
                        <button
                          onClick={handleSignOut}
                          disabled={signingOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4" strokeWidth={1.8} />
                          {signingOut ? "Signing out…" : "Sign Out"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* ── Not logged in ── */
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-500 hover:text-emerald-atlaasgo font-medium transition px-3 py-1.5 rounded-xl hover:bg-emerald-atlaasgo/5"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm bg-brand text-white font-semibold px-4 py-1.5 rounded-xl hover:bg-brand-dark transition ml-1 border border-brand-light/40 shadow-[0_2px_8px_rgba(224,90,35,0.3)]"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </motion.nav>

      {/* Backdrop to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
