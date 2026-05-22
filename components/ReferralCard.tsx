"use client";

import { Copy, Share2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  code: string;
  credits: number;
}

export default function ReferralCard({ code, credits }: Props) {
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join AtlaasGo",
        text: `Use my code ${code} to get a discount on your first order!`,
        url: shareLink,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#E05A23] to-orange-400 rounded-3xl p-6 text-white shadow-xl shadow-orange-200">
      {credits > 0 && (
        <div className="bg-white/20 rounded-2xl px-4 py-2.5 mb-5 text-center">
          <p className="text-sm font-medium text-white/80">Available credits</p>
          <p className="text-3xl font-bold">{credits} MAD</p>
        </div>
      )}

      <p className="text-sm font-medium text-white/80 mb-2 text-center">Your referral code</p>
      <div className="flex items-center justify-between bg-white/20 rounded-2xl px-5 py-3 mb-5">
        <span className="text-2xl font-bold tracking-widest">{code}</span>
        <button
          onClick={copyCode}
          className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors cursor-pointer"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={shareNative}
        className="w-full flex items-center justify-center gap-2 bg-white text-[#E05A23] py-3 rounded-2xl font-bold text-sm hover:bg-orange-50 transition-colors cursor-pointer"
      >
        <Share2 className="w-4 h-4" />
        Share with friends
      </button>
    </div>
  );
}
