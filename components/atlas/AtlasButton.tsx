"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface AtlasButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "dark";
  full?: boolean;
  children: ReactNode;
}

export default function AtlasButton({
  variant = "primary",
  full = false,
  children,
  className = "",
  ...props
}: AtlasButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer select-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-brand text-white px-6 py-3 shadow-[0_4px_14px_rgba(229,90,38,0.35)] hover:shadow-[0_8px_24px_rgba(229,90,38,0.45)] hover:brightness-110",
    ghost:
      "bg-transparent text-navy border-[1.5px] border-line-2 px-5 py-3 hover:border-brand hover:text-brand",
    dark: "bg-navy text-white px-6 py-3 hover:bg-navy-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
