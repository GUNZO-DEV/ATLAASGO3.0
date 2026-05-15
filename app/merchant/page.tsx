"use client";

import Link from "next/link";
import {
  Home,
  LayoutGrid,
  ClipboardList,
  ChefHat,
  UtensilsCrossed,
  Users,
  BarChart3,
  MoreHorizontal,
} from "lucide-react";

const TILES = [
  { icon: LayoutGrid,     label: "Tables",     count: "3/12",      color: "#E55A26", href: "/merchant/tables"    },
  { icon: ClipboardList,  label: "Commandes",  count: "8",         color: "#1B2440", href: "/merchant/orders"    },
  { icon: ChefHat,        label: "Cuisine",    count: "5 en cours",color: "#F0A500", href: "/merchant/kitchen"   },
  { icon: UtensilsCrossed,label: "Menu",       count: "42 items",  color: "#2DC08A", href: "/merchant/menu"      },
  { icon: Users,          label: "Personnel",  count: "6 actifs",  color: "#6B7A9E", href: "/merchant/staff"     },
  { icon: BarChart3,      label: "Analytics",  count: "Voir",      color: "#E55A26", href: "/merchant/analytics" },
];

const STATS = [
  { label: "Aujourd'hui", value: "2,450 DH", sub: "revenu"      },
  { label: "Commandes",   value: "32",        sub: "traitées"    },
  { label: "Temps moyen", value: "22 min",    sub: "préparation" },
];

const NAV_ITEMS = [
  { icon: Home,          label: "Accueil",   href: "/merchant",         active: true  },
  { icon: LayoutGrid,    label: "Tables",    href: "/merchant/tables",  active: false },
  { icon: ChefHat,       label: "Cuisine",   href: "/merchant/kitchen", active: false },
  { icon: ClipboardList, label: "Commandes", href: "/merchant/orders",  active: false },
  { icon: MoreHorizontal,label: "Plus",      href: "/merchant",         active: false },
];

export default function MerchantHomePage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[600px] mx-auto px-6 pt-8 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7A9E]">
              Restaurant
            </p>
            <h1
              className="font-extrabold text-[28px] text-[#1B2440]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Café Tanjia
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-[#2DC08A]/10 text-[#2DC08A] text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#2DC08A] animate-pulse" />
            En ligne
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(27,36,64,0.06)] text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A9E]">
                {s.label}
              </p>
              <p
                className="text-xl font-extrabold text-[#1B2440]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </p>
              <p className="text-[10px] text-[#6B7A9E]">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-2 gap-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex flex-col gap-3 hover:shadow-lg transition-shadow group cursor-pointer"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${tile.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: tile.color }} />
                </div>
                <div>
                  <p className="font-extrabold text-[#1B2440] text-lg">{tile.label}</p>
                  <p className="text-sm text-[#6B7A9E]">{tile.count}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F0E8] z-50">
        <div className="max-w-[600px] mx-auto flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: item.active ? "#E55A26" : "#6B7A9E" }}
                />
                <span
                  className="text-[10px] font-bold"
                  style={{ color: item.active ? "#E55A26" : "#6B7A9E" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
