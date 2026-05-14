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
  { label: "Accueil",     href: "/" },
  { label: "Recherche",   href: "/restaurants" },
  { label: "Commandes",   href: "/dashboard" },
  { label: "Profil",      href: "/profile/settings" },
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
    <div className="sticky top-0 left-0 right-0 z-50">
      <motion.nav
        animate={{
          boxShadow: scrolled
            ? "0 2px 12px rgba(0,0,0,0.06)"
            : "none",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full h-[70px] bg-white border-b border-gray-100 px-8 flex items-center gap-7 relative"
      >
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <AtlasLogo size={32} className="group-hover:scale-105 transition-transform" />
          <AtlasWordmark size={16} className="font-[family-name:var(--font-display)]" />
        </Link>

        {/* ── Address chip ── */}
        <button className="hidden md:flex items-center gap-2 bg-cream rounded-full px-3.5 py-2 hover:bg-cream/80 transition shrink-0 cursor-pointer border-none">
          <svg className="w-4 h-4 text-brand shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div className="text-left">
            <div className="text-[9px] text-navy-soft uppercase tracking-wider font-bold leading-none">Livrer à</div>
            <div className="text-[13px] font-bold text-navy leading-tight">Maârif, Casablanca</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-navy-soft" />
        </button>

        {/* ── Search pill ── */}
        <div className="flex-1 min-w-0 max-w-[540px] hidden lg:flex items-center gap-2.5 bg-cream-2 border border-gray-100 rounded-full px-[18px] py-2.5 cursor-text">
          <Search className="w-[18px] h-[18px] text-navy-soft shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un resto, un plat..."
            className="flex-1 bg-transparent text-sm text-navy placeholder:text-navy-soft/60 outline-none min-w-0 font-[family-name:var(--font-body)]"
          />
          <kbd className="text-[10px] text-navy-soft bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shrink-0 hidden xl:block font-mono">⌘K</kbd>
        </div>

        {/* ── Nav pills ── */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-[13px] font-bold px-3.5 py-2 rounded-full transition cursor-pointer ${
                  isActive
                    ? "bg-cream text-navy"
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
            className="flex items-center gap-2.5 bg-navy hover:bg-navy/90 text-white rounded-full px-[18px] py-2.5 transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[13px] font-bold">Panier</span>
            {CART_COUNT > 0 && (
              <span className="min-w-[20px] h-5 bg-brand text-white text-[11px] font-extrabold rounded-full flex items-center justify-center px-1.5">
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
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
