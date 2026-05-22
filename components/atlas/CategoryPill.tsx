"use client";

export default function CategoryPill({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all cursor-pointer shrink-0 min-w-[72px]
        ${
          active
            ? "bg-brand text-white shadow-[0_4px_14px_rgba(229,90,38,0.3)]"
            : "bg-white text-navy hover:bg-cream-2"
        }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] font-bold leading-tight">{label}</span>
    </button>
  );
}
