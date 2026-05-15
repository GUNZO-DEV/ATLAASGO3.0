"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type TableStatus = "free" | "occupied" | "bill";

interface TableData {
  id: number;
  seats: number;
  status: TableStatus;
  guest?: string;
}

const TABLES: TableData[] = [
  { id: 1,  seats: 2, status: "free"                          },
  { id: 2,  seats: 4, status: "occupied", guest: "Ahmed"      },
  { id: 3,  seats: 2, status: "bill",     guest: "Sarah"      },
  { id: 4,  seats: 6, status: "occupied", guest: "Groupe AUI" },
  { id: 5,  seats: 2, status: "free"                          },
  { id: 6,  seats: 4, status: "free"                          },
  { id: 7,  seats: 8, status: "occupied", guest: "Famille"    },
  { id: 8,  seats: 2, status: "free"                          },
  { id: 9,  seats: 4, status: "free"                          },
  { id: 10, seats: 2, status: "free"                          },
  { id: 11, seats: 6, status: "free"                          },
  { id: 12, seats: 4, status: "free"                          },
];

const STATUS_CONFIG: Record<TableStatus, {
  bg: string;
  border: string;
  label: string;
  dot: string;
  textColor: string;
}> = {
  free:     { bg: "bg-[#2DC08A]/10", border: "border-[#2DC08A]/30", label: "Libre",    dot: "bg-[#2DC08A]", textColor: "#2DC08A" },
  occupied: { bg: "bg-[#E55A26]/10", border: "border-[#E55A26]/30", label: "Occupée",  dot: "bg-[#E55A26]", textColor: "#E55A26" },
  bill:     { bg: "bg-[#1B2440]/10", border: "border-[#1B2440]/30", label: "Addition", dot: "bg-[#1B2440]", textColor: "#1B2440" },
};

export default function TablesPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-24">

        {/* Back link */}
        <Link
          href="/merchant"
          className="inline-flex items-center gap-1.5 text-[#6B7A9E] hover:text-[#1B2440] text-sm font-medium transition mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Link>

        {/* Page header */}
        <h1
          className="font-extrabold text-[28px] text-[#1B2440] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Plan de salle
        </h1>
        <p className="text-sm text-[#6B7A9E] mb-6">12 tables · 3 occupées</p>

        {/* Table grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {TABLES.map((table) => {
            const cfg = STATUS_CONFIG[table.status];
            return (
              <div
                key={table.id}
                className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-extrabold text-[#1B2440] text-lg"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    T{table.id}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                </div>
                <p className="text-xs text-[#6B7A9E]">{table.seats} places</p>
                {table.guest && (
                  <p className="text-xs font-bold text-[#1B2440] mt-1">{table.guest}</p>
                )}
                <p
                  className="text-[10px] font-bold mt-2"
                  style={{ color: cfg.textColor }}
                >
                  {cfg.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6">
          {(Object.entries(STATUS_CONFIG) as [TableStatus, typeof STATUS_CONFIG[TableStatus]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-[#6B7A9E]">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
