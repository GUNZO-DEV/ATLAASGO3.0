// components/GroupOrderBanner.tsx
"use client";

import { Users, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  shareLink: string;
  participants: Record<string, string>;
}

export default function GroupOrderBanner({ shareLink, participants }: Props) {
  const names = Object.values(participants);

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Group order link copied!");
  };

  return (
    <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#E05A23]" />
          <span className="text-xs font-medium text-gray-700">
            {names.length === 1
              ? "Just you"
              : `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`}
          </span>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 text-xs text-[#E05A23] font-medium hover:underline cursor-pointer"
        >
          <Copy className="w-3 h-3" />
          Invite
        </button>
      </div>
    </div>
  );
}
