"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Zap, ChevronDown, Bell, Search, ShoppingBag } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AtlasLogo, AtlasWordmark } from "@/components/atlas";

interface UserInfo {
  name: string;
  role: string;
}

const NAV_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Offres",  href: "/offres" },
  { label: "Restaurants", href: "/restaurants" },
];

// Placeholder cart count — swap for real cart state/context as needed
const CART_COUNT = 0;

export default function FloatingNavbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [user, setUser]             = useState<UserInfo | null>(null);
  const [uid, setUid]               = useState<string | null>(null);
  const [authReady, setAuthReady]   = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { unreadCount } = useNotifications(uid);
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
        setUid(firebaseUser.uid);
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          const data = snap.data();
          setUser({ name: data?.name ?? firebaseUser.email ?? "User", role: data?.role ?? "customer" });
        } catch {
          setUser({ name: firebaseUser.email ?? "User", role: "customer" });
        }
      } else {
        setUid(null);
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
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
      <motion.nav
        animate={{
          boxShadow: scrolled
            ? "0 8px 32px rgba(0,0,0,0.14)"
            : "0 2px 12px rgba(0,0,0,0.06)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-[1200px] bg-white rounded-2xl px-5 py-2.5 flex items-center gap-3 relative"
      >
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <AtlasLogo size={32} className="group-hover:scale-105 transition-transform" />
          <AtlasWordmark size={16} className="font-[family-name:var(--font-display)]" />
        </Link>

        {/* ── Address chip ── */}
        <button className="hidden md:flex items-center gap-1.5 bg-cream-2 text-navy-soft text-xs font-medium px-3 py-1.5 rounded-full hover:bg-cream-2/80 transition shrink-0">
          <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Maârif, Casablanca</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* ── Search pill ── */}
        <div className="flex-1 min-w-0 max-w-sm hidden lg:flex items-center gap-2 bg-cream-2 rounded-full px-4 py-2 cursor-text group">
          <Search className="w-4 h-4 text-navy-soft shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un resto, un plat..."
            className="flex-1 bg-transparent text-sm text-navy placeholder:text-navy-soft/60 outline-none min-w-0"
          />
          <span className="text-[10px] font-medium text-navy-soft/50 bg-white/60 px-1.5 py-0.5 rounded-md shrink-0 hidden xl:block">⌘K</span>
        </div>

        {/* ── Nav pills ── */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium px-4 py-1.5 rounded-full transition ${
                  isActive
                    ? "bg-navy text-white"
                    : "text-navy-soft hover:bg-cream-2"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* ── Right section ── */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Cart button */}
          <Link
            href="/checkout"
            className="relative flex items-center justify-center w-9 h-9 bg-brand hover:bg-brand/90 text-white rounded-full transition shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            {CART_COUNT > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-navy text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {CART_COUNT > 9 ? "9+" : CART_COUNT}
              </span>
            )}
          </Link>

          {authReady && (
            <>
              {user ? (
                /* ── Logged-in user menu ── */
                <>
                  {/* Notification bell */}
                  <Link
                    href="/notifications"
                    className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-cream-2 transition"
                  >
                    <Bell className="w-4 h-4 text-navy-soft" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* User avatar / dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      className="flex items-center gap-2 bg-cream-2 hover:bg-cream-2/80 text-navy rounded-full pl-1.5 pr-3 py-1.5 transition cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <span className="text-sm font-semibold hidden sm:block max-w-[80px] truncate">
                        {user.name.split(" ")[0]}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-navy-soft transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
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
                            <p className="text-xs font-bold text-navy truncate">{user.name}</p>
                            <p className="text-[11px] text-navy-soft capitalize">{user.role}</p>
                          </div>

                          {/* Dashboard link */}
                          <Link
                            href={dashboardHref}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-soft hover:bg-cream-2 hover:text-navy transition"
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
                </>
              ) : (
                /* ── Not logged in ── */
                <Link
                  href="/register"
                  className="text-sm bg-brand text-white font-semibold px-4 py-2 rounded-full hover:bg-brand/90 transition shadow-sm"
                >
                  Se connecter
                </Link>
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
